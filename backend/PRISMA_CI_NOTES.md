# Notes sur Prisma et CI/CD

## Problème connu : Génération du client Prisma en CI

### Symptôme
Les tests d'intégration DSN (`dsn.api.test.ts`) échouent en CI avec l'erreur :
```
TypeError: Cannot read properties of undefined (reading 'deleteMany')
  at prisma.dSNDeclaration.deleteMany()
```

### Cause
L'environnement CI/CD ne peut pas télécharger les binaires Prisma en raison de restrictions réseau (403 Forbidden). Le client Prisma existant ne connaît pas le nouveau modèle `DSNDeclaration` car il n'a pas été régénéré après l'ajout du modèle.

### Solution pour le développement local

1. Après avoir récupéré les dernières modifications :
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma migrate deploy
   npm test
   ```

2. Les tests DSN devraient maintenant passer localement.

### Solution pour CI/CD

Les options sont :
1. **Pré-générer le client Prisma** et le commiter (déconseillé)
2. **Utiliser un cache de binaires Prisma** en CI
3. **Migrer les tests vers better-sqlite3** directement (solution actuelle pour d'autres tests)

## Migrations Prisma récentes

### 20251118160000_add_dsn_support
Ajoute le support complet de la DSN :
- Nouveaux champs sur `Company` (SIRET, code NAF, adresse, etc.)
- Nouveaux champs sur `Employee` (numéro sécu, date naissance, type contrat, etc.)
- Nouvelle table `DSNDeclaration`
- Enums : `TypeContrat`, `TypeDeclarationDSN`, `StatutDSN`

### 20251118182000_remove_unique_siret
Supprime la contrainte UNIQUE sur `Company.siret` :
- Le SIRET est nullable
- La validation d'unicité se fait au niveau applicatif pour les SIRET non-null
- Évite les problèmes avec plusieurs entreprises ayant SIRET = NULL

## Tests unitaires vs tests d'intégration

### Tests unitaires (dsn.test.ts)
- ✅ Passent en CI
- Ne dépendent pas du client Prisma
- Testent le générateur et validateur DSN

### Tests d'intégration (dsn.api.test.ts)
- ❌ Échouent en CI (client Prisma non généré)
- ✅ Passent en local après `npx prisma generate`
- Testent les endpoints API avec la base de données

## Recommandation

Pour les nouveaux tests d'API, envisager d'utiliser `better-sqlite3` directement comme dans :
- `payroll.api.test.ts`
- `cotisations.api.test.ts`
- `analytics.api.test.ts`

Cela évite la dépendance au client Prisma généré.
