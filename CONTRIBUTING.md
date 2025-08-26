# Guide de Contribution pour OpenPayFit

Nous vous remercions de l'intérêt que vous portez à OpenPayFit ! Ce document a pour but de définir les règles et les bonnes pratiques à suivre pour contribuer au projet, afin de garantir une qualité, une cohérence et une lisibilité maximales du code.

## Philosophie

*   **Qualité avant tout :** Nous visons un code propre, lisible, maintenable et bien testé.
*   **Simplicité :** Préférez toujours une solution simple et explicite à une solution complexe et implicite.
*   **Cohérence :** Le code doit donner l'impression d'avoir été écrit par une seule personne. Suivez les conventions établies dans ce guide et dans le code existant.

## Langue

Pour assurer l'accessibilité et la cohérence du projet pour une communauté francophone, **toutes les contributions doivent être rédigées en français**.

Cela inclut :
*   Les commentaires dans le code.
*   La documentation (JSDoc, Markdown, etc.).
*   Les messages de commit.
*   Les descriptions des Pull Requests et les discussions associées.

## Conventions de Codage

### Workflow Git

1.  **Branches :** Le travail doit être effectué dans des branches dédiées, créées à partir de `develop`.
    *   Nommez vos branches de manière explicite en anglais (par convention pour les outils Git) : `feature/nom-de-la-feature`, `fix/description-du-bug`, etc.
2.  **Messages de Commit :** Nous suivons la spécification **Conventional Commits**. Chaque message de commit doit être préfixé par un type et rédigé en français.
    *   **`feat:`** (nouvelle fonctionnalité)
    *   **`fix:`** (correction de bug)
    *   **`docs:`** (changement dans la documentation)
    *   **`style:`** (formatage du code, point-virgule, etc.)
    *   **`refactor:`** (modification du code qui ne corrige ni bug ni n'ajoute de fonctionnalité)
    *   **`test:`** (ajout ou modification de tests)
    *   **`chore:`** (mise à jour de dépendances, tâches de build, etc.)

    *Exemple :* `feat: ajoute la connexion via email et mot de passe`

### Style de Code (TypeScript / React)

Le projet est configuré avec **ESLint** pour l'analyse statique et **Prettier** pour le formatage automatique du code. Ces outils sont les standards de l'écosystème TypeScript.

1.  **Formatage :** Avant de soumettre votre code, assurez-vous de le formater. La configuration de Prettier est intégrée au projet.
2.  **Linting :** Votre code ne doit générer aucune erreur ou avertissement ESLint. Lancez `npm run lint` dans le dossier concerné (`frontend` ou `backend`) pour vérifier.
3.  **Nomenclature :**
    *   Variables et fonctions : `camelCase`
    *   Classes, Interfaces, Types et Composants React : `PascalCase`
    *   Constantes : `UPPER_CASE`
4.  **Composants React :**
    *   Utilisez exclusivement des **composants fonctionnels** avec des **Hooks**.
    *   Définissez les `props` de vos composants avec des interfaces ou des types TypeScript.

### Tests

Toute nouvelle fonctionnalité ou correction de bug doit être accompagnée de tests unitaires ou d'intégration pertinents.

*   **Objectif :** Assurer la non-régression et valider le comportement du code.
*   **Framework :** Nous utiliserons **Vitest** avec **React Testing Library** pour le frontend, et une configuration similaire pour le backend.
*   Les tests doivent couvrir le cas nominal ("happy path") ainsi que les cas d'erreur et les cas limites.

## Processus de Pull Request (PR)

1.  **Forkez** le dépôt et créez une branche pour vos modifications.
2.  Effectuez vos modifications en respectant les conventions de ce guide.
3.  Assurez-vous que votre code est correctement formaté et ne présente aucune erreur de linting.
4.  Ajoutez les tests nécessaires pour valider vos changements.
5.  Assurez-vous que l'ensemble des tests passe avec succès.
6.  Soumettez une **Pull Request** sur la branche `develop`.
7.  Rédigez une description claire et concise (en français) de votre PR, expliquant le **quoi** et le **pourquoi** de vos changements.

Merci de votre contribution à rendre OpenPayFit meilleur !
