/**
 * Connecteur QuickBooks Online - Export des données de paie via l'API QuickBooks
 * Utilise OAuth 2.0 pour l'authentification
 */

import prisma from '../lib/db';
import fetch from 'node-fetch';

/**
 * Configuration du connecteur QuickBooks
 */
export interface QuickBooksConfig {
  clientId: string;           // Client ID de l'application QuickBooks
  clientSecret: string;       // Client Secret de l'application QuickBooks
  realmId: string;           // Company ID QuickBooks
  accessToken: string;       // Token d'accès OAuth 2.0
  refreshToken: string;      // Token de rafraîchissement
  tokenExpiry: number;       // Timestamp d'expiration du token
  accountMapping: {
    salaryExpense: string;      // ID du compte de charges de salaires
    socialCharges: string;      // ID du compte de cotisations patronales
    socialDebt: string;         // ID du compte de dettes sociales
    employeeDebt: string;       // ID du compte de dettes envers employés
  };
  sandbox?: boolean;          // Utiliser l'environnement sandbox
}

/**
 * URLs de l'API QuickBooks
 */
const QUICKBOOKS_API = {
  production: 'https://quickbooks.api.intuit.com',
  sandbox: 'https://sandbox-quickbooks.api.intuit.com',
  oauth: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
};

/**
 * Écriture de journal QuickBooks
 */
interface QuickBooksJournalEntry {
  Line: Array<{
    Description: string;
    Amount: number;
    DetailType: 'JournalEntryLineDetail';
    JournalEntryLineDetail: {
      PostingType: 'Debit' | 'Credit';
      AccountRef: {
        value: string;
      };
    };
  }>;
  TxnDate: string;
  DocNumber?: string;
}

/**
 * Rafraîchit le token d'accès QuickBooks
 */
export async function refreshQuickBooksToken(config: QuickBooksConfig): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const response = await fetch(QUICKBOOKS_API.oauth, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Échec du rafraîchissement du token QuickBooks: ${error}`);
  }

  const data = await response.json() as any;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in
  };
}

/**
 * Résultat de la vérification du token
 */
interface TokenValidationResult {
  accessToken: string;
  tokensRefreshed: boolean;
  newTokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

/**
 * Vérifie et rafraîchit le token si nécessaire
 * Retourne les nouveaux tokens s'ils ont été rafraîchis pour permettre la persistance
 */
async function ensureValidToken(config: QuickBooksConfig): Promise<TokenValidationResult> {
  const now = Date.now() / 1000;

  // Si le token expire dans moins de 5 minutes, le rafraîchir
  if (config.tokenExpiry - now < 300) {
    const tokens = await refreshQuickBooksToken(config);
    return {
      accessToken: tokens.accessToken,
      tokensRefreshed: true,
      newTokens: tokens
    };
  }

  return {
    accessToken: config.accessToken,
    tokensRefreshed: false
  };
}

/**
 * Crée une écriture de journal dans QuickBooks
 */
async function createJournalEntry(
  config: QuickBooksConfig,
  entry: QuickBooksJournalEntry
): Promise<{ result: any; tokenValidation: TokenValidationResult }> {
  const tokenValidation = await ensureValidToken(config);
  const baseUrl = config.sandbox ? QUICKBOOKS_API.sandbox : QUICKBOOKS_API.production;
  const url = `${baseUrl}/v3/company/${config.realmId}/journalentry?minorversion=65`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenValidation.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(entry)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Échec de création de l'écriture QuickBooks: ${error}`);
  }

  return {
    result: await response.json(),
    tokenValidation
  };
}

/**
 * Exporte les données de paie d'une période vers QuickBooks
 */
export async function exportPayrollToQuickBooks(
  companyId: string,
  payPeriod: string,
  config: QuickBooksConfig
): Promise<{
  recordCount: number;
  journalEntryIds: string[];
  updatedTokens?: {
    accessToken: string;
    refreshToken: string;
    tokenExpiry: number;
  };
}> {
  // Récupérer toutes les fiches de paie de la période
  const fichesPaie = await prisma.fichePaie.findMany({
    where: {
      employee: {
        compagnieId: companyId
      },
      payPeriod: payPeriod
    },
    include: {
      employee: true,
      lignesCotisations: true
    }
  });

  if (fichesPaie.length === 0) {
    throw new Error(`Aucune fiche de paie trouvée pour la période ${payPeriod}`);
  }

  const journalEntryIds: string[] = [];
  const txnDate = `${payPeriod}-01`; // Format YYYY-MM-DD
  let updatedTokens: { accessToken: string; refreshToken: string; tokenExpiry: number } | undefined;

  // Créer une écriture de journal pour chaque employé
  for (const fiche of fichesPaie) {
    const lines: QuickBooksJournalEntry['Line'] = [];

    // 1. Débit : Charge de salaire brut
    lines.push({
      Description: `Salaire ${fiche.employee.prenom} ${fiche.employee.nom}`,
      Amount: fiche.salaireBrut,
      DetailType: 'JournalEntryLineDetail',
      JournalEntryLineDetail: {
        PostingType: 'Debit',
        AccountRef: {
          value: config.accountMapping.salaryExpense
        }
      }
    });

    // 2. Débit : Cotisations patronales
    if (fiche.totalCotisationsPatronales && fiche.totalCotisationsPatronales > 0) {
      lines.push({
        Description: `Cotisations patronales ${fiche.employee.prenom} ${fiche.employee.nom}`,
        Amount: fiche.totalCotisationsPatronales,
        DetailType: 'JournalEntryLineDetail',
        JournalEntryLineDetail: {
          PostingType: 'Debit',
          AccountRef: {
            value: config.accountMapping.socialCharges
          }
        }
      });

      // Crédit : Dette sociale (cotisations patronales)
      lines.push({
        Description: `Dette sociale patronale ${fiche.employee.prenom} ${fiche.employee.nom}`,
        Amount: fiche.totalCotisationsPatronales,
        DetailType: 'JournalEntryLineDetail',
        JournalEntryLineDetail: {
          PostingType: 'Credit',
          AccountRef: {
            value: config.accountMapping.socialDebt
          }
        }
      });
    }

    // 3. Crédit : Dette sociale (cotisations salariales)
    if (fiche.totalCotisationsSalariales && fiche.totalCotisationsSalariales > 0) {
      lines.push({
        Description: `Dette sociale salariale ${fiche.employee.prenom} ${fiche.employee.nom}`,
        Amount: fiche.totalCotisationsSalariales,
        DetailType: 'JournalEntryLineDetail',
        JournalEntryLineDetail: {
          PostingType: 'Credit',
          AccountRef: {
            value: config.accountMapping.socialDebt
          }
        }
      });
    }

    // 4. Crédit : Net à payer
    lines.push({
      Description: `Net à payer ${fiche.employee.prenom} ${fiche.employee.nom}`,
      Amount: fiche.salaireNet,
      DetailType: 'JournalEntryLineDetail',
      JournalEntryLineDetail: {
        PostingType: 'Credit',
        AccountRef: {
          value: config.accountMapping.employeeDebt
        }
      }
    });

    // Créer l'écriture de journal
    const journalEntry: QuickBooksJournalEntry = {
      Line: lines,
      TxnDate: txnDate,
      DocNumber: `PAIE-${payPeriod}-${fiche.employee.id.substring(0, 8)}`
    };

    const { result, tokenValidation } = await createJournalEntry(config, journalEntry);
    journalEntryIds.push(result.JournalEntry.Id);

    // Capturer les tokens mis à jour si rafraîchis (une seule fois)
    if (tokenValidation.tokensRefreshed && !updatedTokens && tokenValidation.newTokens) {
      updatedTokens = {
        accessToken: tokenValidation.newTokens.accessToken,
        refreshToken: tokenValidation.newTokens.refreshToken,
        tokenExpiry: Date.now() / 1000 + tokenValidation.newTokens.expiresIn
      };
    }
  }

  return {
    recordCount: journalEntryIds.length,
    journalEntryIds,
    ...(updatedTokens && { updatedTokens })
  };
}

/**
 * Génère l'URL d'autorisation OAuth 2.0 pour QuickBooks
 */
export function generateAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  sandbox: boolean = false
): string {
  // Note: L'URL OAuth est identique pour sandbox et production
  // La différence se fait via le realmId et les credentials
  const baseUrl = 'https://appcenter.intuit.com/connect/oauth2';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    state: state
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Échange le code d'autorisation contre des tokens
 */
export async function exchangeAuthorizationCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  realmId: string;
}> {
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(QUICKBOOKS_API.oauth, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Échec de l'échange du code d'autorisation: ${error}`);
  }

  const data = await response.json() as any;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    realmId: data.realmId || ''
  };
}

/**
 * Valide la configuration QuickBooks
 */
export function validateQuickBooksConfig(config: any): config is QuickBooksConfig {
  const required = ['clientId', 'clientSecret', 'realmId', 'accessToken', 'refreshToken'];
  for (const field of required) {
    if (!config[field]) {
      throw new Error(`Le champ ${field} est requis pour la configuration QuickBooks`);
    }
  }

  if (!config.accountMapping) {
    throw new Error('Le mapping des comptes est requis');
  }

  const requiredAccounts = ['salaryExpense', 'socialCharges', 'socialDebt', 'employeeDebt'];
  for (const field of requiredAccounts) {
    if (!config.accountMapping[field]) {
      throw new Error(`Le compte ${field} est requis dans le mapping`);
    }
  }

  return true;
}
