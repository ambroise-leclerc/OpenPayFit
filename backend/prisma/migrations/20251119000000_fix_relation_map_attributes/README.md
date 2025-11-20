# Migration : Correction des attributs @map sur les champs de relation

**Date** : 2025-11-19
**Type** : Correction du schéma (pas de modification SQL)

## Problème

Le schéma Prisma contenait des attributs `@map` sur des champs de relation, ce qui est invalide selon la spécification Prisma. L'attribut `@map` ne peut être utilisé que sur :
- Les champs scalaires (String, Int, etc.)
- Les modèles (@@map au niveau du modèle)

**Erreur Prisma** :
```
Error parsing attribute "@map": The attribute `@map` cannot be used on relation fields.
```

## Modifications apportées

Suppression de tous les `@map` inappropriés sur les champs de relation :

### Compagnie (ligne 54)
```diff
- integrationsComptables     AccountingIntegration[]  @map("accountingIntegrations")
+ integrationsComptables     AccountingIntegration[]
```

### Employe (lignes 89-92)
```diff
- conges           Leave[]        @map("leaves")
+ conges           Leave[]
- soldesConges     LeaveBalance[] @map("leaveBalances")
+ soldesConges     LeaveBalance[]
- frais            Expense[]      @map("expenses")
+ frais            Expense[]
- rapportsFrais    ExpenseReport[] @map("expenseReports")
+ rapportsFrais    ExpenseReport[]
```

### ExpenseReport (ligne 461)
```diff
- lignes           ExpenseItem[] @map("items")
+ lignes           ExpenseItem[]
```

### ExpenseItem (ligne 474)
```diff
- rapport          ExpenseReport   @relation(...) @map("report")
+ rapport          ExpenseReport   @relation(...)
```

### AccountingIntegration (ligne 515)
```diff
- journauxExport       AccountingExportLog[]        @map("exportLogs")
+ journauxExport       AccountingExportLog[]
```

## Impact

**Aucune modification de la structure de la base de données** :
- Les noms de colonnes ne changent pas
- Les relations restent identiques
- Les données existantes ne sont pas affectées

**Correction purement syntaxique** :
- Le schéma Prisma devient valide selon la spécification
- La génération du client Prisma peut maintenant se faire sans erreur de validation

## Note

Cette migration est vide (pas de SQL) car elle documente uniquement une correction du schéma Prisma qui n'a aucun impact sur la structure de la base de données.
