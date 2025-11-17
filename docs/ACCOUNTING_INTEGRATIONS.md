# Guide des Intégrations Comptables

> Documentation complète pour l'intégration de Sage et QuickBooks avec OpenPayFit

## Vue d'ensemble

OpenPayFit permet d'exporter automatiquement les données de paie vers les logiciels comptables Sage et QuickBooks Online, éliminant ainsi la ressaisie manuelle et réduisant les erreurs.

## Fonctionnalités

### Intégration Sage

L'intégration Sage permet d'exporter les écritures comptables de paie aux formats **TRA** (Transaction) et **PNM** (Plan de comptes).

**Formats supportés :**

- **TRA (Transaction)** : Format de fichier pour l'import des écritures comptables
  - Structure : `DATE|JOURNAL|COMPTE|LIBELLE|DEBIT|CREDIT|PIECE`
  - Exemple : `20251101|PAI|6411|Salaire Jean Dupont|3500,00|0,00|PAIE-2025-11`

- **PNM (Plan de comptes)** : Format de fichier pour l'import du plan comptable
  - Structure : `COMPTE|TYPE|LIBELLE`
  - Exemple : `6411|CHG|Salaires bruts`

**Configuration requise :**

```typescript
{
  formatType: 'TRA' | 'PNM',
  accountMapping: {
    salaryExpense: '6411',      // Compte de charges de salaires
    socialCharges: '6451',      // Compte de cotisations patronales
    socialDebt: '431',          // Compte de dettes sociales
    employeeDebt: '421',        // Compte de dettes envers employés
    taxCharges: '6311'          // Compte de charges fiscales
  },
  exportPath: './exports',      // Optionnel : chemin d'export
  journalCode: 'PAI'            // Optionnel : code journal (défaut : 'PAI')
}
```

**Plan comptable français (PCG) - Comptes recommandés :**

| Compte | Description                                    |
|--------|------------------------------------------------|
| 6411   | Salaires bruts                                 |
| 6451   | Cotisations sociales à la charge de l'employeur |
| 6311   | Taxes sur salaires                             |
| 421    | Personnel - rémunérations dues                  |
| 431    | Sécurité sociale                               |
| 437    | Autres organismes sociaux                       |

### Intégration QuickBooks Online

L'intégration QuickBooks utilise l'API REST de QuickBooks avec authentification OAuth 2.0 pour créer automatiquement des écritures de journal (Journal Entries).

**Configuration requise :**

```typescript
{
  clientId: 'votre-client-id',
  clientSecret: 'votre-client-secret',
  realmId: 'company-id',
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  tokenExpiry: 1234567890,
  accountMapping: {
    salaryExpense: '5000',      // ID du compte de charges de salaires
    socialCharges: '5100',      // ID du compte de cotisations patronales
    socialDebt: '2000',         // ID du compte de dettes sociales
    employeeDebt: '2010'        // ID du compte de dettes envers employés
  },
  sandbox: false                // true pour environnement de test
}
```

**Processus d'authentification OAuth 2.0 :**

1. **Générer l'URL d'autorisation** :
   ```typescript
   const { url } = await getQuickBooksAuthUrl(
     'client-id',
     'http://localhost:3000/callback',
     false, // sandbox
     token
   );
   // Rediriger l'utilisateur vers cette URL
   ```

2. **Échanger le code d'autorisation** :
   ```typescript
   const tokens = await exchangeQuickBooksToken(
     'client-id',
     'client-secret',
     'authorization-code',
     'redirect-uri',
     token
   );
   ```

3. **Utiliser les tokens** :
   - `accessToken` : valable 1 heure
   - `refreshToken` : utilisé pour renouveler l'accessToken

## API Backend

### Routes

**Gestion des intégrations :**

```
GET    /api/companies/:companyId/integrations
POST   /api/companies/:companyId/integrations
PUT    /api/companies/:companyId/integrations/:integrationId
DELETE /api/companies/:companyId/integrations/:integrationId
```

**Export de données :**

```
POST   /api/companies/:companyId/integrations/:integrationId/export
GET    /api/companies/:companyId/integrations/:integrationId/logs
```

**OAuth QuickBooks :**

```
GET    /api/integrations/quickbooks/auth-url
POST   /api/integrations/quickbooks/exchange-token
```

### Exemples d'utilisation

**Créer une intégration Sage :**

```typescript
const integration = await createAccountingIntegration(
  companyId,
  {
    type: 'SAGE',
    configuration: {
      formatType: 'TRA',
      accountMapping: {
        salaryExpense: '6411',
        socialCharges: '6451',
        socialDebt: '431',
        employeeDebt: '421',
        taxCharges: '6311'
      },
      journalCode: 'PAI'
    }
  },
  token
);
```

**Créer une intégration QuickBooks :**

```typescript
const integration = await createAccountingIntegration(
  companyId,
  {
    type: 'QUICKBOOKS',
    configuration: {
      clientId: 'qb-client-id',
      clientSecret: 'qb-client-secret',
      realmId: 'qb-realm-id',
      accessToken: 'qb-access-token',
      refreshToken: 'qb-refresh-token',
      tokenExpiry: Date.now() / 1000 + 3600,
      accountMapping: {
        salaryExpense: '5000',
        socialCharges: '5100',
        socialDebt: '2000',
        employeeDebt: '2010'
      },
      sandbox: false
    }
  },
  token
);
```

**Exporter les données de paie :**

```typescript
const result = await exportPayrollToAccounting(
  companyId,
  integrationId,
  {
    payPeriod: '2025-11' // Format YYYY-MM
  },
  token
);

console.log(`${result.recordCount} écritures exportées`);
if (result.filePath) {
  console.log(`Fichier généré : ${result.filePath}`);
}
```

**Consulter l'historique des exports :**

```typescript
const logs = await getAccountingExportLogs(
  companyId,
  integrationId,
  20, // limite à 20 entrées
  token
);

logs.forEach(log => {
  console.log(`${log.payPeriod} - ${log.status} - ${log.recordCount} écritures`);
  if (log.errorMessage) {
    console.error(`Erreur : ${log.errorMessage}`);
  }
});
```

## Modèle de données

### AccountingIntegration

```prisma
model AccountingIntegration {
  id                String                       @id @default(cuid())
  companyId         String
  type              AccountingIntegrationType    // SAGE | QUICKBOOKS
  status            AccountingIntegrationStatus  // ACTIVE | INACTIVE | ERROR
  configuration     String                       // JSON
  lastSyncAt        DateTime?
  lastError         String?
  exportLogs        AccountingExportLog[]
  createdAt         DateTime                     @default(now())
  updatedAt         DateTime                     @updatedAt
}
```

### AccountingExportLog

```prisma
model AccountingExportLog {
  id            String                 @id @default(cuid())
  integrationId String
  status        ExportStatus           // PENDING | SUCCESS | FAILED | RETRYING
  payPeriod     String?
  recordCount   Int                    @default(0)
  filePath      String?
  errorMessage  String?
  retryCount    Int                    @default(0)
  createdAt     DateTime               @default(now())
  updatedAt     DateTime               @updatedAt
}
```

## Écritures comptables générées

Pour chaque employé, les écritures suivantes sont créées :

### Débit (Charges)

1. **Salaire brut** : Montant du salaire brut de l'employé
2. **Cotisations patronales** : Charges sociales patronales

### Crédit (Dettes)

1. **Cotisations salariales** : Dettes envers organismes sociaux (part salariale)
2. **Cotisations patronales** : Dettes envers organismes sociaux (part patronale)
3. **Net à payer** : Dette envers l'employé

### Exemple d'écritures pour un salaire de 3500€

```
DEBIT  6411  Salaires bruts              3500,00
DEBIT  6451  Cotisations patronales       750,00
CREDIT 431   Sécurité sociale (sal)       650,00
CREDIT 431   Sécurité sociale (pat)       750,00
CREDIT 421   Net à payer                 2850,00
```

## Gestion des erreurs

### Erreurs courantes

**Sage :**
- Aucune fiche de paie trouvée pour la période
- Configuration invalide (comptes manquants)
- Erreur d'écriture du fichier

**QuickBooks :**
- Token expiré (renouvellement automatique)
- Échec de connexion à l'API QuickBooks
- Compte invalide dans le mapping
- Quota API dépassé

### Mécanisme de retry

Les exports échoués peuvent être retentés automatiquement :

1. **Statut initial** : `PENDING`
2. **En cas d'erreur** : `FAILED` → `RETRYING`
3. **Après 3 tentatives** : `FAILED` (définitif)
4. **En cas de succès** : `SUCCESS`

## Tests

### Tests Backend

Fichier : `/backend/src/tests/accounting-integrations.test.ts`

**Couverture :**
- Création d'intégrations Sage et QuickBooks
- Validation des configurations
- Gestion des permissions
- Mise à jour et suppression
- Génération d'URL OAuth
- Consultation des logs

**Lancer les tests :**

```bash
cd backend
npm test -- accounting-integrations.test.ts
```

## Sécurité

### Bonnes pratiques

1. **Credentials :** Ne jamais exposer les credentials en clair
   - Les configurations sont masquées dans l'API (retourne `***`)
   - Stockage sécurisé dans la base de données

2. **OAuth :** Toujours utiliser HTTPS pour les redirections OAuth
   - Valider le paramètre `state` pour prévenir les attaques CSRF

3. **Permissions :** Vérifier que l'utilisateur est propriétaire de l'entreprise
   - Middleware `verifyCompanyOwnership` sur toutes les routes

4. **Validation :** Valider toutes les entrées utilisateur
   - Fonctions `validateSageConfig` et `validateQuickBooksConfig`

## Dépendances

**Backend :**
- `node-fetch` : Pour les requêtes HTTP vers l'API QuickBooks
- `fs/promises` : Pour l'écriture des fichiers Sage

**Frontend :**
- Aucune dépendance supplémentaire requise

## Roadmap

### Fonctionnalités futures

- [ ] Support d'autres formats Sage (FEC, CSV)
- [ ] Export automatique programmé (cron)
- [ ] Webhooks pour notifications d'export
- [ ] Intégration avec d'autres logiciels (Cegid, EBP, etc.)
- [ ] Interface utilisateur complète
- [ ] Prévisualisation des écritures avant export
- [ ] Export des congés et notes de frais

## Support

Pour toute question ou problème :

1. Consulter les logs d'export via l'API
2. Vérifier la configuration du mapping des comptes
3. S'assurer que les fiches de paie existent pour la période
4. Consulter les issues GitHub du projet

## Ressources

- [API QuickBooks Online](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry)
- [OAuth 2.0 QuickBooks](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0)
- [Plan Comptable Général Français](https://www.plan-comptable.com/)
- [Format Sage TRA/PNM](https://support.sage.fr/)

---

**Version** : 1.0
**Dernière mise à jour** : 2025-11-17
**Auteur** : Équipe OpenPayFit
