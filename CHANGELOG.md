# 📝 Historique des Modifications (Changelog) pour Marssel

Ce document liste les changements notables, les correctifs et les nouvelles fonctionnalités introduites dans la librairie **marssel-npm**.

## Version 1.0.9 - 16/03/2026 (Actuelle)

### 🐛 Corrections de Bugs (Bug Fixes)

- **`managers/IconManager.js` — Correction du warning "Icons manifest not loaded yet"** : Ajout d'un `initPromise` dans le constructor et d'un guard dans `init()` pour éviter les doubles appels et garantir que `getIconContent()` n'est jamais invoqué avant la fin du chargement du manifest.

- **`core/Marssel.js` — Déplacement de `setupObservers()` après l'initialisation complète** : Le `MutationObserver` était démarré trop tôt, avant que le manifest des icônes soit chargé. Il est désormais lancé dans le `setTimeout` aux côtés des autres managers, éliminant les appels prématurés à `getIconContent()`.

---

## Version 1.0.8 - 13/03/2026

### 🐛 Corrections de Bugs (Bug Fixes)

- **`managers/ModalManager.js` — Suppression du warning "Modal overlay element not found"** : Le `console.warn` émis lors de l'initialisation du `ModalManager` sur des pages ne contenant pas d'élément `#modal-overlay` a été supprimé. Ce comportement étant attendu sur certaines pages, l'absence de l'overlay n'est plus considérée comme une anomalie et le manager s'arrête silencieusement.

---

## Version 1.0.6 - 11/03/2026

### 📚 Documentation

- **README** : Modification du fichier README.

---

## Version 1.0.5 - 11/03/2026

### 📚 Documentation

- **README** : Modification du fichier README.

---

## Version 1.0.4 - 11/03/2026

### 🔧 CI/CD

- **`publish.yml`** : Modification du workflow de publication GitHub Actions.

---

## Version 1.0.3 - 11/03/2026

### 🔧 CI/CD

- **`publish.yml`** : Création du fichier de workflow `.github/workflows/publish.yml` pour automatiser la publication sur npm.

---

## Version 1.0.2 - 11/03/2026

### 🔧 CI/CD

- **Test** : Test de push GitHub vers npmjs.

---

## Version 1.0.1 - 11/03/2026

### 🔧 Configuration

- **`package.json`** : Remplacement du registry GitHub Packages (`https://npm.pkg.github.com/`) par le registry npmjs public (`https://registry.npmjs.org/`) avec accès public.

---

## Version 1.0.0 - 10/03/2026

### 🚀 Première version publique

- Publication officielle sur npm sous `@marssel-vb/marssel`

---

## Version v0.10.6 - 06/03/2026

### 🐛 Corrections de Bugs (Bug Fixes)

- **`core/Marssel.js` — Fix du FOUC sur le header et le footer** : Correction d'un bug d'affichage visuel (Flash of Unstyled Content) où le `header` et le `footer` apparaissaient brièvement sans styles au chargement de la page. Le problème venait du fait que `processCriticalElementsFirst()` appelait `updateStyles()` (asynchrone via `requestAnimationFrame`), ce qui retardait l'injection des styles critiques dans le DOM. La méthode est désormais remplacée par `updateStylesSync()` pour garantir une injection immédiate et synchrone des styles des éléments critiques avant que `marssel-ready` ne soit appliqué sur le `body`.
- **`core/Marssel.js` — Garantie de styles prêts avant révélation du body** : Ajout d'un appel à `updateStylesSync()` juste avant le double `requestAnimationFrame` qui ajoute la classe `marssel-ready`. Cela garantit que tous les styles critiques sont présents dans la feuille de style au moment où le body devient visible, éliminant tout flash visuel résiduel.

### 📚 Documentation

- **Guide d'installation** : Ajout du bloc CSS recommandé pour prévenir le FOUC spécifiquement sur le `header` et le `footer` via les règles `body:not(.marssel-ready) header / footer`.

---

## Version v0.10.5 - 04/03/2026

### 🐛 Corrections de Bugs (Bug Fixes)

- **`helpers.js`** : Correction de l'échappement du caractère barre oblique (`/`) dans la fonction `escapeValue`. Le `/` est désormais correctement échappé en `\/` uniquement dans la valeur entre crochets, sans affecter le reste du sélecteur CSS. Cela permet l'utilisation de classes telles que `grid-column-[1/-1]` sans casser les autres styles.
- **`parsed.js`** : Le caractère `/` est également autorisé dans `normalizeClassName` pour que la classe ne soit pas filtrée avant d'atteindre le parser.

---

## Version v0.10.4 - 04/03/2026

### 🐛 Corrections de Bugs (Bug Fixes)

- **`parsed.js`** : Correction du filtrage du caractère barre oblique (`/`) dans la fonction `normalizeClassName`. Le caractère `/` est désormais inclus dans la liste des caractères autorisés, permettant l'utilisation correcte de classes telles que `grid-column-[1/-1]`.

---

## Version v0.10.3 - 25/02/2026

### 🐛 Corrections de Bugs (Bug Fixes)

- **ToastManager** : Correction du bug de superposition des toasts lorsque plusieurs notifications sont affichées simultanément à la même position. Les toasts s'empilent désormais verticalement les uns sous les autres grâce à un système de groupes flex par position.

### ✨ Nouvelles Fonctionnalités (Features)

- **ToastManager** : Introduction des groupes de position (`marssel-toast-group`). Chaque position (`top-right`, `bottom-left`, etc.) dispose maintenant d'un sous-conteneur flex dédié qui gère automatiquement l'empilement des toasts et se supprime du DOM quand il est vide.
- **ToastStyles** : Ajout des styles `POSITION_GROUP_STYLES` pour le conteneur flex par position. Les positions `bottom-*` utilisent `flex-direction: column-reverse` afin que les nouveaux toasts apparaissent toujours du bon côté.

### 🔨 Optimisation et Améliorations Internes

- **Marssel.js** : Ajout du chargement du cache de styles au démarrage via `styleManager.styleCache?.load()`, permettant de restaurer les `selectorDeclarations` mis en cache entre les navigations.
- **Marssel.js** : Centralisation et clarification de l'ordre d'initialisation des managers (`headerManager`, `dropdownManager`, `toastManager`, `domManager`) et ajout du double `requestAnimationFrame` pour l'application de la classe `marssel-ready` sur le `body`.
- **Nettoyage général** : Suppression des commentaires superflus dans les fichiers sources pour alléger le code.

---

## Version v0.10.2 - 18/02/2026

### 🐛 Corrections de Bugs (Bug Fixes)

- **Readme.md** : Amélioration du fichier.

## Version v0.10.1 - 17/02/2026

### 🔄 Gestion des versions

Marssel utilise un système de version centralisé. Lors de la mise à jour de la version du paquet :

1. Mettez à jour la version dans le fichier package.json.
2. Mettez à jour le fichier utils/version.js avec la même version.

Cela garantit que l'invalidation du cache fonctionne correctement lors des mises à jour.

### ✨ Nouvelles Fonctionnalités (Features)

- **Configuration des chemins de manifests** : Ajout de l'option `paths` dans le constructeur Marssel permettant de personnaliser les chemins des fichiers manifest pour les fonts et icons.
    ```javascript
    const app = new Marssel({
        paths: {
            fontsManifest: "/custom/fonts-manifest.json",
            iconsManifest: "/custom/icons-manifest.json",
        },
    });
    ```
- **Générateurs CLI améliorés** : Les générateurs `generate-fonts-manifest.mjs` et `generate-icons-manifest.mjs` supportent maintenant les options `--fonts`, `--icons`, `--manifest` et `--pretty` pour une personnalisation complète.

### 🔨 Optimisation et Améliorations Internes

- **FontManager** : Utilisation des chemins configurables via `this.marssel.config.paths.fontsManifest` au lieu du chemin hardcodé.
- **IconManager** : Utilisation des chemins configurables via `this.marssel.config.paths.iconsManifest` au lieu du chemin hardcodé.
- **Rétrocompatibilité** : Les chemins par défaut (`/js/fonts-manifest.json` et `/js/icons-manifest.json`) sont préservés si l'option `paths` n'est pas fournie.

### 📚 Documentation

- **Guide d'installation** : Ajout de la documentation complète sur la génération des manifests avec les commandes npm.
- **Guide de configuration** : Nouvelle section expliquant l'utilisation de l'option `paths`.
- **Section icons** : Mise à jour avec les commandes correctes depuis le package npm.

---

## Version v0.10.0 - 13/02/2026

### 🐛 Corrections de Bugs (Bug Fixes)

- **Ajout de nouvelles icones** : Ajout de l'icone `share-network`.
- **StyleManager** : Ajout d'un ordre des breakpoints `xxl` > `xl` > `lg` > `md` etc...
- **Readme.md** : Amélioration du fichier.

---

## Version v0.9.9 - 05/02/2026

### ✨ Nouvelles Fonctionnalités (Features)

- **Système de cache** : Gestionnaire de cache persistant pour les styles Marssel permet de conserver les styles générés entre les navigations de pages.

### 🐛 Corrections de Bugs (Bug Fixes)

- **Ajout de nouvelles icones** : Ajout de l'icone `gauge`.
- **Suppression d'icones** : Suppression des icones suivantes : `chevron-down`,`chevron-left`,`chevron-right`,`chevron-up`,`chevron-double-down`,`chevron-double-up`,`chevron-double-left`,`chevron-double-up`,`ear-fill`,`inbox`,`map`,`pin`,`zap`.
- **FontManager** : Utilisation des `()` pour renseigner la font-weight du font comme par exemple `font-[Sora(700)]`.
- **helpers.js** : Amélioration de `addHasToHex` et `cleanValue`.

---

## Version v0.9.8 - 25/01/2026

### ✨ Nouvelles Fonctionnalités (Features)

- **Gestion améliorée des éléments critiques** : Ajout de la détection automatique des éléments avec la classe `.no-lazy` comme éléments critiques, garantissant leur traitement immédiat même hors du viewport.
- **Traitement récursif des enfants critiques** : Les éléments enfants des conteneurs `.no-lazy` sont maintenant traités de manière récursive pour assurer un rendu complet et immédiat.

### 🐛 Corrections de Bugs (Bug Fixes)

- **Correction du lazy loading sur la sidebar** : Résolution d'un bug critique où les sidebars et accordéons mobiles ne s'affichaient pas correctement lors d'un rechargement de page en bas de scroll. Les éléments critiques avec `.no-lazy` et leurs enfants sont maintenant toujours traités immédiatement.
- **Amélioration de la détection des éléments critiques** : La méthode `getCriticalElements()` inclut désormais automatiquement tous les éléments portant la classe `.no-lazy` dans la liste des éléments critiques.
- **Optimisation du traitement parent-enfant** : Les éléments enfants héritent maintenant du statut critique de leur parent `.no-lazy`, évitant les problèmes de styles non appliqués dans les conteneurs critiques.

### 🔧 Améliorations Techniques (Technical Improvements)

- **Méthode `processElement()` optimisée** : Ajout d'une vérification récursive des parents pour détecter la classe `.no-lazy` et forcer le traitement immédiat des classes de style.
- **Méthode `processCriticalElements()` améliorée** : Traitement récursif de tous les enfants des éléments critiques pour garantir un rendu cohérent et complet.

---

## Version v0.9.7 - 14/12/2025

### ✨ Nouvelles Fonctionnalités (Features)

- **Nouvelles Icônes** : Ajout d'une nouvelle série d'icônes Marssel.

### 🐛 Corrections de Bugs (Bug Fixes)

- **Amélioration de la génération de svgs** : Ajout du paramètre `--onlynew` qui permet d'ajouter dans default.icons.mjs seulement les nouvelles icônes.

---

## Version v0.9.6 - 14/12/2025

### 🐛 Corrections de Bugs (Bug Fixes)

- **Génération d'icônes de base** : Création d'un générateur permettant de créer une base d'icônes dans un fichier json en récupérant les icônes de [phosphor](https://phosphoricons.com/).
- **Correctif `Helpers`** : Le caractère barre oblique (/) est désormais correctement échappé dans les noms de classes CSS générés à partir de valeurs de style, permettant l'utilisation de classes telles que `grid-column-[1/-1]`.
- **Correctif `DomManager`** : Le caractère point (.) est maintenant correctement échappé dans les sélecteurs CSS générés (ex: pour les classes avec des décimales), prévenant les ruptures de sélecteur.

---

## Version v0.9.5 - 07/12/2025

### ✨ Nouvelles Fonctionnalités (Features)

- **Nouveau Manager : `OffcanvasManager`** : Intégration du manager pour la gestion des panneaux offcanvas.

### 🐛 Corrections de Bugs (Bug Fixes)

- **Corrections diverses** : Multiples correctifs sur les managers existants.

---

## Version v0.9.4 - 07/12/2025

### 🐛 Corrections de Bugs (Bug Fixes)

- **Responsives préfixes dans `DomManager`** : Correction d'un bug majeur dans le `DomManager` qui empêchait l'utilisation des préfixes responsives sans classe et pouvoir concaténer plusieurs classes, comme par exemple lg--[bg-[red]+c-[green]]. Ajout de la possibilité d'utiliser les pseudos-classes et !important.
- **Header `HeaderStyle`** : Suppression de style menu responsive et menu-close.

---

## Version v0.9.3 - 30/11/2025

### ✨ Nouvelles Fonctionnalités (Features)

- **Nouvelles Icônes** : Ajout d'une nouvelle série d'icônes Marssel.

---

## Version v0.9.2 - 30/11/2025

### ✨ Nouvelles Fonctionnalités (Features)

- **Nouvelles Icônes** : Ajout d'une nouvelle série d'icônes Marssel.

---

## Version v0.9.1 - 02/12/2025

### ✨ Nouvelles Fonctionnalités (Features)

- **Nouvelles Icônes** : Ajout d'une nouvelle série d'icônes Marssel.

### 🐛 Corrections de Bugs (Bug Fixes)

- **Pseudo-classes dans `DomManager`** : Correction d'un bug majeur dans le `DomManager` qui empêchait l'application correcte des styles utilisant des pseudo-classes (comme `:hover`, `:focus`, `:active`) dans certains scénarios.
- **Changelog** : Préparation et restructuration complète du fichier `CHANGELOG.md`.

---

## Version v0.9.0 - 23/11/2025

### ✨ Nouvelles Fonctionnalités (Features)

- **Icônes** : Nouvelle série d'icônes ajoutée.

### 🐛 Corrections de Bugs (Bug Fixes)

- **Variables CSS** : Correction d'un bug dans l'utilisation des variables `bg` (background).
- **Animations, Tabs & Toasts** : Multiples corrections de bugs sur les managers d'animation, de Tabs, et de Toasts pour une meilleure stabilité.
- **`cleanValue`** : Amélioration de la fonction pour une meilleure normalisation des valeurs CSS.

---

## Version v0.8.0 - 16/11/2025

### ✨ Nouvelles Fonctionnalités (Features)

- **Icônes Marssel & CSS Critique** : Intégration d'un premier set d'icônes Marssel et mise en place d'un système pour récupérer le CSS critique **sans _lazy-loading_** (`no-lazy`).

### 🐛 Corrections de Bugs (Bug Fixes)

- **Composants** : Fix pour `borders`, `dropdown`, `scrollspy`, `tooltip` et correction de l'application des pseudo-classes.
- **Éléments Critiques** : Fix de l'application correcte des styles sur les éléments critiques (header, footer).

---

## Version v0.7.0 - 09/11/2025

### ✨ Nouvelles Fonctionnalités (Features)

- **Nouveau Manager : `TabsManager`** : Intégration du manager pour la gestion du comportement interactif des onglets.
- **Nouveau Manager : `AnimationManager`** : Ajout du manager pour contrôler les animations CSS de manière programmatique.

### 🐛 Corrections de Bugs (Bug Fixes)

- **Padding et Syntaxe** : Correction de l'application des paddings, de l'utilisation des crochets `[]`, et amélioration de la syntaxe interne.
- **`!important`** : Stabilisation de la gestion du drapeau `!important`.

---

## Version v0.6.0 - 19/10/2025

### 🐛 Corrections de Bugs (Bug Fixes)

- **Lazyload** : Corrections dans l'appel des classes avant et après le `lazyload`.
- **Columns** : Correction de la fonction `handleRegularColumn`.

---

## Version v0.5.0 - 28/09/2025

### 🔨 Optimisation et Améliorations Internes

- **Cache de Performance** : Introduction du **`LRUCache`** (Least Recently Used Cache) dans plusieurs managers (Dom, Style) pour accélérer le _parsing_ des classes et la génération des styles.
- **Général** : Optimisation du cœur de `marssel.js` et des fichiers internes.

### 🐛 Corrections de Bugs (Bug Fixes)

- **Thèmes** : Correction dans l'appel simplifié des couleurs de thème.
- **Managers** : Fix sur `dropdown style` et `domManager classname generate`.

---

## Version v0.4.0 - 21/09/2025

### 🐛 Corrections de Bugs (Bug Fixes)

- **Pseudo-classes** : Fix important sur la génération des styles des pseudo-classes et la génération automatique des noms de classes.
- **`marssel-critical-css`** : Fix sur l'application des styles critiques.

### 🧹 Maintenance et Configuration

- **Paquet** : Multiples corrections et mises à jour du `package.json`.

---

## Version v0.3.0 - 07/09/2025

### ✨ Nouvelles Fonctionnalités (Features)

- **Gestion `!important`** : Ajout du support pour la gestion du drapeau `!important` dans la génération des styles.

### 🐛 Corrections de Bugs (Bug Fixes)

- **Couleurs** : Fix des couleurs de thème.
- **`parseRGBA`** : Correction de la fonction.

---

## Version v0.2.0 - 13/07/2025

### ✨ Nouvelles Fonctionnalités (Features)

- **`ThemeManager`** : Ajout et stabilisation du **`ThemeManager`** pour une gestion dynamique des variables de thème.

### 🐛 Corrections de Bugs (Bug Fixes)

- **FontManager** : Fix des problèmes de manifestes vides.

---

## Version v0.1.0 - 29/06/2025

### 🔨 Optimisation et Améliorations Internes

- **Code Base** : Ajout d'un système générique pour la création de composants Marssel.

### 🐛 Corrections de Bugs (Bug Fixes)

- **Lazyload** : Correction du `lazyload` avec les ancres et le défilement.
- **DomManager & StyleManager** : Fixs sur le système **parent-enfant** et divers bugs de `lazyload`.

---

## Version v0.0.1 - Initialisation (11/05/2025)

- **Initialisation du projet** Marssel-npm.
- **Mise en place des Managers de base :** `Carousel`, `DOM`, `Dropdown`, `Font`, `Header`, `Modal`, `Offcanvas`, `Popover`, `Scrollspy`, `Style`, `Toast`, et `Tooltip`.

---

## 📖 Convention de Versioning

Marssel suit le [Semantic Versioning](https://semver.org/lang/fr/) :

- **MAJOR** (X.0.0) : Changements incompatibles avec les versions précédentes
- **MINOR** (0.X.0) : Ajout de fonctionnalités rétrocompatibles
- **PATCH** (0.0.X) : Corrections de bugs rétrocompatibles

---

## 🔗 Liens utiles

- [Documentation complète](https://marssel.dev/documentation)
- [GitHub Repository](https://github.com/marssel-vb/marssel)
