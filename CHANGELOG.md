# 📝 Historique des Modifications (Changelog) pour Marssel

Ce document liste les changements notables, les correctifs et les nouvelles fonctionnalités introduites dans la librairie **marssel-npm**.

## Version v0.9.6 - 16/12/2025 (Actuelle)

### 🐛 Corrections de Bugs (Bug Fixes)

-   **Génération d'icônes de base** : Création d'un générateur permettant de créer une base d'icônes dans un fichier json en récupérant les icônes de [phosp](https://phosphoricons.com/).
-   **Correctif `Helpers`** : Le caractère barre oblique (/) est désormais correctement échappé dans les noms de classes CSS générés à partir de valeurs de style, permettant l'utilisation de classes telles que `grid-column-[1/-1]`.
-   **Correctif `DomManager`** : Le caractère point (.) est maintenant correctement échappé dans les sélecteurs CSS générés (ex: pour les classes avec des décimales), prévenant les ruptures de sélecteur.

---

## Version v0.9.5 - 10/12/2025 (Actuelle)

### ✨ Nouvelles Fonctionnalités (Features)

-   **Sélecteurs Enfants avec Groupes** : Ajout du support complet pour les sélecteurs enfants dans les groupes de styles avec syntaxe `[styles]>enfant` et `[styles>enfant]`. Permet désormais d'utiliser des patterns complexes comme `[fs-[40px]+c-[green]]>span:hover` ou `lg--[bg-[red]+p-[20px]]>div`.
-   **Support `!important` avec Breakpoints** : Correction et amélioration de la gestion du flag `!important` combiné avec les breakpoints responsives et les sélecteurs enfants (ex: `lg--[fs-[13px]]!>span`, `md--lg--[c-[blue]]!>div:hover`).
-   **Pseudo-classes sur Enfants** : Support complet des pseudo-classes appliquées aux sélecteurs enfants dans tous les contextes (groupes, breakpoints, classes compactes).

### 🔨 Optimisation et Améliorations Internes

-   **Refactorisation `DomManager`** : Amélioration significative du routage et de la priorisation du traitement des classes avec sélecteurs enfants dans `processClassOptimized()`.
-   **Nouvelles Méthodes** : Ajout de `processGroupChildAfterBracket()` et amélioration de `processInnerChildSelector()` pour une meilleure gestion des patterns complexes.
-   **Regex Optimisées** : Mise à jour des expressions régulières `BREAKPOINT_ROOT_GROUP`, `CHILD_STYLE_WITH_IMPORTANT` et `GROUP_CHILD_AFTER_BRACKET` pour capturer correctement tous les cas d'utilisation.

### 🐛 Corrections de Bugs (Bug Fixes)

-   **Flag `!important`** : Correction d'un bug majeur où le flag `!important` générait des règles CSS dupliquées (avec et sans `!important`). Désormais seules les règles avec `!important` sont générées quand le flag est présent.
-   **Breakpoints avec Enfants** : Fix de l'application des breakpoints responsives combinés avec des sélecteurs enfants qui ne généraient aucun style.
-   **Parsing des Pseudo-classes** : Correction de la détection du flag `!important` placé avant les pseudo-classes (pattern `]!:pseudo`).

---

## Version v0.9.4 - 05/12/2025

### 🐛 Corrections de Bugs (Bug Fixes)

-   **Responsives préfixes dans `DomManager`** : Correction d'un bug majeur dans le `DomManager` qui empêchait l'utilisation des préfixes responsives sans classe et pouvoir concaténer plusieurs classes, comme par exemple lg--[bg-[red]+c-[green]]. Ajout de la possibilité d'utiliser les pseudos-classes et !important.
-   **Header `HeaderStyle`** : Suppression de style menu responsive et menu-close.

---

## Version v0.9.3 - 04/12/2025

### ✨ Nouvelles Fonctionnalités (Features)

-   **Nouvelles Icônes** : Ajout d'une nouvelle série d'icônes Marssel.

---

## Version v0.9.2 - 04/12/2025

### ✨ Nouvelles Fonctionnalités (Features)

-   **Nouvelles Icônes** : Ajout d'une nouvelle série d'icônes Marssel.

---

## Version v0.9.1 - 02/12/2025

### ✨ Nouvelles Fonctionnalités (Features)

-   **Nouvelles Icônes** : Ajout d'une nouvelle série d'icônes Marssel.

### 🐛 Corrections de Bugs (Bug Fixes)

-   **Pseudo-classes dans `DomManager`** : Correction d'un bug majeur dans le `DomManager` qui empêchait l'application correcte des styles utilisant des pseudo-classes (comme `:hover`, `:focus`, `:active`) dans certains scénarios.
-   **Changelog** : Préparation et restructuration complète du fichier `CHANGELOG.md`.

---

## Version v0.9.0 - 25/11/2025

### ✨ Nouvelles Fonctionnalités (Features)

-   **Icônes** : Nouvelle série d'icônes ajoutée.

### 🐛 Corrections de Bugs (Bug Fixes)

-   **Variables CSS** : Correction d'un bug dans l'utilisation des variables `bg` (background).
-   **Animations, Tabs & Toasts** : Multiples corrections de bugs sur les managers d'animation, de Tabs, et de Toasts pour une meilleure stabilité.
-   **`cleanValue`** : Amélioration de la fonction pour une meilleure normalisation des valeurs CSS.

---

## Version v0.8.0 - 14/11/2025

### ✨ Nouvelles Fonctionnalités (Features)

-   **Icônes Marssel & CSS Critique** : Intégration d'un premier set d'icônes Marssel et mise en place d'un système pour récupérer le CSS critique **sans _lazy-loading_** (`no-lazy`).

### 🐛 Corrections de Bugs (Bug Fixes)

-   **Composants** : Fix pour `borders`, `dropdown`, `scrollspy`, `tooltip` et correction de l'application des pseudo-classes.
-   **Éléments Critiques** : Fix de l'application correcte des styles sur les éléments critiques (header, footer).

---

## Version v0.7.0 - 06/11/2025

### ✨ Nouvelles Fonctionnalités (Features)

-   **Nouveau Manager : `TabsManager`** : Intégration du manager pour la gestion du comportement interactif des onglets.
-   **Nouveau Manager : `AnimationManager`** : Ajout du manager pour contrôler les animations CSS de manière programmatique.

### 🐛 Corrections de Bugs (Bug Fixes)

-   **Padding et Syntaxe** : Correction de l'application des paddings, de l'utilisation des crochets `[]`, et amélioration de la syntaxe interne.
-   **`!important`** : Stabilisation de la gestion du drapeau `!important`.

---

## Version v0.6.0 - 17/10/2025

### 🐛 Corrections de Bugs (Bug Fixes)

-   **Lazyload** : Corrections dans l'appel des classes avant et après le `lazyload`.
-   **Columns** : Correction de la fonction `handleRegularColumn`.

---

## Version v0.5.0 - 30/09/2025

### 🔨 Optimisation et Améliorations Internes

-   **Cache de Performance** : Introduction du **`LRUCache`** (Least Recently Used Cache) dans plusieurs managers (Dom, Style) pour accélérer le _parsing_ des classes et la génération des styles.
-   **Général** : Optimisation du cœur de `marssel.js` et des fichiers internes.

### 🐛 Corrections de Bugs (Bug Fixes)

-   **Thèmes** : Correction dans l'appel simplifié des couleurs de thème.
-   **Managers** : Fix sur `dropdown style` et `domManager classname generate`.

---

## Version v0.4.0 - 24/09/2025

### 🐛 Corrections de Bugs (Bug Fixes)

-   **Pseudo-classes** : Fix important sur la génération des styles des pseudo-classes et la génération automatique des noms de classes.
-   **`marssel-critical-css`** : Fix sur l'application des styles critiques.

### 🧹 Maintenance et Configuration

-   **Paquet** : Multiples corrections et mises à jour du `package.json`.

---

## Version v0.3.0 - 04/09/2025

### ✨ Nouvelles Fonctionnalités (Features)

-   **Gestion `!important`** : Ajout du support pour la gestion du drapeau `!important` dans la génération des styles.

### 🐛 Corrections de Bugs (Bug Fixes)

-   **Couleurs** : Fix des couleurs de thème.
-   **`parseRGBA`** : Correction de la fonction.

---

## Version v0.2.0 - 16/07/2025

### ✨ Nouvelles Fonctionnalités (Features)

-   **`ThemeManager`** : Ajout et stabilisation du **`ThemeManager`** pour une gestion dynamique des variables de thème.

### 🐛 Corrections de Bugs (Bug Fixes)

-   **FontManager** : Fix des problèmes de manifestes vides.

---

## Version v0.1.0 - 27/06/2025

### 🔨 Optimisation et Améliorations Internes

-   **Code Base** : Ajout d'un système générique pour la création de composants Marssel.

### 🐛 Corrections de Bugs (Bug Fixes)

-   **Lazyload** : Correction du `lazyload` avec les ancres et le défilement.
-   **DomManager & StyleManager** : Fixs sur le système **parent-enfant** et divers bugs de `lazyload`.

---

## Version v0.0.1 - Initialisation (12/05/2025)

-   **Initialisation du projet** Marssel-npm.
-   **Mise en place des Managers de base :** `Carousel`, `DOM`, `Dropdown`, `Font`, `Header`, `Modal`, `Offcanvas`, `Popover`, `Scrollspy`, `Style`, `Toast`, et `Tooltip`.

---
