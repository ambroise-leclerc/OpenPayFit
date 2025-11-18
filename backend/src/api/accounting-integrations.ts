/**
 * Routes API pour les intégrations comptables (Sage, QuickBooks)
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/db';
import {
  exportPayrollToSage,
  validateSageConfig,
  SageConfig
} from '../services/sage-connector';
import {
  exportPayrollToQuickBooks,
  validateQuickBooksConfig,
  generateAuthorizationUrl,
  exchangeAuthorizationCode,
  QuickBooksConfig
} from '../services/quickbooks-connector';

const router = Router();

/**
 * Fonction helper pour transformer et masquer les credentials
 */
function transformIntegration(integration: any, sanitize: boolean = true) {
  return {
    id: integration.id,
    companyId: integration.compagnieId,
    type: integration.typeIntegration,
    status: integration.statut,
    configuration: sanitize ? '***' : integration.configuration,
    lastSyncAt: integration.dateDerniereSynchro,
    lastError: integration.derniereErreur,
    createdAt: integration.dateCreation,
    updatedAt: integration.dateModification,
    exportLogs: integration.journauxExport ? integration.journauxExport.map((log: any) => ({
      id: log.id,
      integrationId: log.integrationId,
      status: log.statut,
      payPeriod: log.periodeVersement,
      recordCount: log.nombreEnregistrements,
      filePath: log.cheminFichier,
      errorMessage: log.messageErreur,
      retryCount: log.nombreTentatives,
      createdAt: log.dateCreation,
      updatedAt: log.dateModification,
    })) : undefined
  };
}

/**
 * Fonction helper pour transformer un log d'export
 */
function transformExportLog(log: any) {
  return {
    id: log.id,
    integrationId: log.integrationId,
    status: log.statut,
    payPeriod: log.periodeVersement,
    recordCount: log.nombreEnregistrements,
    filePath: log.cheminFichier,
    errorMessage: log.messageErreur,
    retryCount: log.nombreTentatives,
    createdAt: log.dateCreation,
    updatedAt: log.dateModification,
  };
}

/**
 * Fonction helper pour masquer les credentials dans la configuration
 * @deprecated Utilisez transformIntegration() à la place
 */
function sanitizeIntegration(integration: any) {
  return transformIntegration(integration, true);
}

/**
 * Middleware pour vérifier que l'utilisateur est propriétaire de l'entreprise
 */
async function verifyCompanyOwnership(req: Request, res: Response, next: any) {
  const userId = (req as any).userId;
  const companyId = req.params.companyId;

  const company = await prisma.compagnie.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    return res.status(404).json({ error: 'Entreprise non trouvée' });
  }

  if (company.proprietaireId !== userId) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  next();
}

/**
 * GET /api/companies/:companyId/integrations
 * Liste toutes les intégrations comptables d'une entreprise
 */
router.get(
  '/companies/:companyId/integrations',
  authenticateToken,
  verifyCompanyOwnership,
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.params;

      const integrations = await prisma.accountingIntegration.findMany({
        where: { compagnieId: companyId },
        include: {
          journauxExport: {
            orderBy: { dateCreation: 'desc' },
            take: 5
          }
        }
      });

      // Transformer et masquer les informations sensibles
      res.json(integrations.map((integration: any) => transformIntegration(integration, true)));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/companies/:companyId/integrations
 * Crée une nouvelle intégration comptable
 */
router.post(
  '/companies/:companyId/integrations',
  authenticateToken,
  verifyCompanyOwnership,
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.params;
      const { type, configuration } = req.body;

      if (!type || !['SAGE', 'QUICKBOOKS'].includes(type)) {
        return res.status(400).json({ error: 'Type d\'intégration invalide' });
      }

      // Valider la configuration selon le type
      if (type === 'SAGE') {
        validateSageConfig(configuration);
      } else if (type === 'QUICKBOOKS') {
        validateQuickBooksConfig(configuration);
      }

      // Vérifier qu'il n'existe pas déjà une intégration de ce type
      const existing = await prisma.accountingIntegration.findUnique({
        where: {
          compagnieId_typeIntegration: {
            compagnieId: companyId,
            typeIntegration: type
          }
        }
      });

      if (existing) {
        return res.status(400).json({
          error: 'Une intégration de ce type existe déjà pour cette entreprise'
        });
      }

      const integration = await prisma.accountingIntegration.create({
        data: {
          compagnieId: companyId,
          typeIntegration: type,
          configuration: JSON.stringify(configuration),
          statut: 'ACTIVE'
        }
      });

      // Masquer les credentials avant d'envoyer la réponse
      res.status(201).json(sanitizeIntegration(integration));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/companies/:companyId/integrations/:integrationId
 * Met à jour une intégration existante
 */
router.put(
  '/companies/:companyId/integrations/:integrationId',
  authenticateToken,
  verifyCompanyOwnership,
  async (req: Request, res: Response) => {
    try {
      const { integrationId } = req.params;
      const { configuration, status } = req.body;

      const integration = await prisma.accountingIntegration.findUnique({
        where: { id: integrationId }
      });

      if (!integration) {
        return res.status(404).json({ error: 'Intégration non trouvée' });
      }

      // Valider la nouvelle configuration si fournie
      if (configuration) {
        if (integration.typeIntegration === 'SAGE') {
          validateSageConfig(configuration);
        } else if (integration.typeIntegration === 'QUICKBOOKS') {
          validateQuickBooksConfig(configuration);
        }
      }

      const updated = await prisma.accountingIntegration.update({
        where: { id: integrationId },
        data: {
          ...(configuration && { configuration: JSON.stringify(configuration) }),
          ...(status && { statut: status })
        }
      });

      // Masquer les credentials avant d'envoyer la réponse
      res.json(sanitizeIntegration(updated));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/companies/:companyId/integrations/:integrationId
 * Supprime une intégration
 */
router.delete(
  '/companies/:companyId/integrations/:integrationId',
  authenticateToken,
  verifyCompanyOwnership,
  async (req: Request, res: Response) => {
    try {
      const { integrationId } = req.params;

      await prisma.accountingIntegration.delete({
        where: { id: integrationId }
      });

      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/companies/:companyId/integrations/:integrationId/export
 * Exporte les données de paie vers le logiciel comptable
 */
router.post(
  '/companies/:companyId/integrations/:integrationId/export',
  authenticateToken,
  verifyCompanyOwnership,
  async (req: Request, res: Response) => {
    try {
      const { companyId, integrationId } = req.params;
      const { payPeriod } = req.body;

      if (!payPeriod) {
        return res.status(400).json({ error: 'La période de paie est requise' });
      }

      const integration = await prisma.accountingIntegration.findUnique({
        where: { id: integrationId }
      });

      if (!integration) {
        return res.status(404).json({ error: 'Intégration non trouvée' });
      }

      if (integration.statut !== 'ACTIVE') {
        return res.status(400).json({ error: 'L\'intégration n\'est pas active' });
      }

      const config = JSON.parse(integration.configuration);

      // Créer un log d'export
      const log = await prisma.accountingExportLog.create({
        data: {
          integrationId,
          periodeVersement: payPeriod,
          statut: 'PENDING'
        }
      });

      try {
        let result: { recordCount: number; filePath?: string };

        // Exporter selon le type d'intégration
        if (integration.typeIntegration === 'SAGE') {
          result = await exportPayrollToSage(companyId, payPeriod, config as SageConfig);

          // Mettre à jour le log avec succès
          await prisma.accountingExportLog.update({
            where: { id: log.id },
            data: {
              statut: 'SUCCESS',
              nombreEnregistrements: result.recordCount,
              cheminFichier: result.filePath
            }
          });
        } else if (integration.typeIntegration === 'QUICKBOOKS') {
          const qbResult = await exportPayrollToQuickBooks(companyId, payPeriod, config as QuickBooksConfig);
          result = { recordCount: qbResult.recordCount };

          // Si les tokens ont été rafraîchis, mettre à jour la configuration
          if (qbResult.updatedTokens) {
            const updatedConfig = {
              ...config,
              accessToken: qbResult.updatedTokens.accessToken,
              refreshToken: qbResult.updatedTokens.refreshToken,
              tokenExpiry: qbResult.updatedTokens.tokenExpiry
            };

            await prisma.accountingIntegration.update({
              where: { id: integrationId },
              data: {
                configuration: JSON.stringify(updatedConfig)
              }
            });
          }

          // Mettre à jour le log avec succès
          await prisma.accountingExportLog.update({
            where: { id: log.id },
            data: {
              statut: 'SUCCESS',
              nombreEnregistrements: result.recordCount
            }
          });
        } else {
          throw new Error('Type d\'intégration non supporté');
        }

        // Mettre à jour la dernière synchronisation
        await prisma.accountingIntegration.update({
          where: { id: integrationId },
          data: {
            dateDerniereSynchro: new Date(),
            derniereErreur: null,
            statut: 'ACTIVE'
          }
        });

        res.json({
          success: true,
          recordCount: result.recordCount,
          ...(result.filePath && { filePath: result.filePath })
        });
      } catch (exportError: any) {
        // Mettre à jour le log avec l'erreur
        await prisma.accountingExportLog.update({
          where: { id: log.id },
          data: {
            statut: 'FAILED',
            messageErreur: exportError.message
          }
        });

        // Mettre à jour l'intégration avec l'erreur
        await prisma.accountingIntegration.update({
          where: { id: integrationId },
          data: {
            derniereErreur: exportError.message,
            statut: 'ERROR'
          }
        });

        throw exportError;
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/companies/:companyId/integrations/:integrationId/logs
 * Récupère l'historique des exports
 */
router.get(
  '/companies/:companyId/integrations/:integrationId/logs',
  authenticateToken,
  verifyCompanyOwnership,
  async (req: Request, res: Response) => {
    try {
      const { integrationId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const logs = await prisma.accountingExportLog.findMany({
        where: { integrationId },
        orderBy: { dateCreation: 'desc' },
        take: limit
      });

      res.json(logs.map(transformExportLog));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/integrations/quickbooks/auth-url
 * Génère l'URL d'autorisation OAuth pour QuickBooks
 */
router.get(
  '/integrations/quickbooks/auth-url',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { clientId, redirectUri, sandbox } = req.query;

      if (!clientId || !redirectUri) {
        return res.status(400).json({
          error: 'clientId et redirectUri sont requis'
        });
      }

      const state = `${(req as any).userId}-${Date.now()}`;
      const url = generateAuthorizationUrl(
        clientId as string,
        redirectUri as string,
        state,
        sandbox === 'true'
      );

      res.json({ url, state });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/integrations/quickbooks/exchange-token
 * Échange le code d'autorisation contre des tokens
 */
router.post(
  '/integrations/quickbooks/exchange-token',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { clientId, clientSecret, code, redirectUri } = req.body;

      if (!clientId || !clientSecret || !code || !redirectUri) {
        return res.status(400).json({
          error: 'Tous les champs sont requis'
        });
      }

      const tokens = await exchangeAuthorizationCode(
        clientId,
        clientSecret,
        code,
        redirectUri
      );

      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        realmId: tokens.realmId
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
