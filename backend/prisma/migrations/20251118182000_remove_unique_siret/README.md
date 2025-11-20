# Migration: Suppression de la contrainte UNIQUE sur SIRET

## Date
2025-11-18

## Description
Supprime la contrainte UNIQUE sur le champ `siret` de la table `Company`.

## Raison
Le champ SIRET est nullable. Dans SQLite, une contrainte UNIQUE sur un champ nullable peut causer des problèmes car :
- NULL est traité différemment selon les bases de données
- Plusieurs entreprises peuvent avoir un SIRET NULL (non renseigné)

La validation de l'unicité des SIRET non-null est gérée au niveau applicatif.

## Impact
- Permet d'avoir plusieurs entreprises avec SIRET = NULL
- La validation de l'unicité des SIRET renseignés reste assurée par le code applicatif
