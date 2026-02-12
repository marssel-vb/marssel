# Marssel

Un framework CSS-in-JS moderne et performant pour créer rapidement des interfaces web élégantes et interactives.

## 📦 Installation

### Via NPM (Recommandé)

```bash
npm install @marssel-vb/marssel
```

### Via Yarn

```bash
yarn add @marssel-vb/marssel
```

## 🚀 Démarrage rapide

### 1. Import et initialisation de base

```javascript
import { Marssel } from "@marssel-vb/marssel";

// Initialiser Marssel avec la configuration par défaut
const app = new Marssel();
```

### 2. Avec options personnalisées

```javascript
import { Marssel } from "@marssel-vb/marssel";

const app = new Marssel({
    lazyload: true,
    theme: "dark",
    themes: {
        light: {
            primary: "#3b82f6",
            secondary: "#8b5cf6",
            peach: "#f97316",
        },
        dark: {
            primary: "#60a5fa",
            secondary: "#a78bfa",
            peach: "#fb923c",
        },
    },
    components: {
        btn: "px-[1rem] py-[0.5rem] rounded-[8px] bg-[theme-primary] c-[fff]",
        card: "bg-[fff] p-[1.5rem] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.1)]",
    },
});
```

## 📋 Configuration requise

### Fichiers manifest

Créez deux fichiers de configuration dans votre dossier `public/js` :

**fonts-manifest.json**

```json
{
    "fonts": []
}
```

**icons-manifest.json**

```json
{
    "icons": []
}
```

Ces fichiers permettent à Marssel de gérer efficacement le chargement des polices et icônes.

## 🎨 Prévention du FOUC (Flash of Unstyled Content)

Pour éviter le flash de contenu non stylisé, ajoutez ce CSS critique dans le `<head>` de votre HTML :

```html
<!DOCTYPE html>
<html lang="fr">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Mon projet Marssel</title>

        <style>
            * {
                box-sizing: border-box;
            }
            *::before,
            *::after {
                box-sizing: border-box;
            }
            body:not(.marssel-ready) {
                opacity: 0;
                visibility: hidden;
            }
            body.marssel-ready {
                opacity: 1;
                visibility: visible;
                transition: opacity 0.2s ease-in;
            }
            p,
            h1,
            h2,
            h3,
            h4,
            h5,
            h6,
            span {
                margin-block-start: 0;
                margin-block-end: 0;
            }
        </style>
    </head>
    <body>
        <script type="module" src="/js/app.js"></script>
    </body>
</html>
```

## 🧩 Utilisation de composants spécifiques

Si vous souhaitez utiliser uniquement certains managers sans initialiser tout le framework :

```javascript
import {
    CarouselManager,
    ModalManager,
    ToastManager,
} from "@marssel-vb/marssel";

const carousel = new CarouselManager();
const modal = new ModalManager();
const toast = new ToastManager();
```

## 💡 Exemples d'utilisation

### Classes utilitaires

```html
<!-- Couleurs -->
<div class="bg-[3b82f6] c-[fff]">Fond bleu, texte blanc</div>

<!-- Espacement -->
<div class="p-[2rem] m-[1rem]">Padding et margin</div>

<!-- Bordures -->
<div class="border-[1px_solid_e5e7eb] rounded-[8px]">Carte avec bordure</div>

<!-- Flexbox -->
<div class="d-[flex] justify-content-[center] align-items-[center]">
    Contenu centré
</div>

<!-- Responsive -->
<div class="fs-[16px] md--fs-[20px] lg--fs-[24px]">Texte responsive</div>

<!-- Classes compactes -->
<input
    class="input-form---[w-[100%]+p-[1rem]+rounded-[8px]+border-[1px_solid_ddd]]"
/>
```

### Thèmes

```javascript
// Changer de thème
app.themeManager.setTheme("dark");

// Écouter les changements de thème
app.themeManager.onThemeChange((theme) => {
    console.log(`Thème changé vers: ${theme}`);
});

// Utiliser les variables de thème dans les classes
<div class="bg-[theme-primary] c-[theme-text]">
    Utilise les couleurs du thème actif
</div>;
```

### Composants personnalisés

```javascript
const app = new Marssel({
    components: {
        "btn-primary":
            "px-[1.5rem] py-[0.75rem] bg-[theme-primary] c-[fff] rounded-[8px] fw-[600] transition-[all_0.2s]",
        "btn-primary:hover": "bg-[2563eb] transform-[scale(1.05)]",
        card: "bg-[fff] p-[2rem] rounded-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.1)]",
    },
});
```

```html
<button class="btn-primary">Mon bouton</button>
<div class="card">Ma carte</div>
```

## 📚 API Principales

### Marssel

```javascript
const app = new Marssel({
    lazyload: boolean, // Active le chargement paresseux (défaut: false)
    theme: string, // Thème par défaut ('light' | 'dark' | 'auto')
    themes: object, // Configuration des thèmes personnalisés
    components: object, // Styles des composants personnalisés
});
```

### Managers disponibles

- `fontManager` - Gestion des polices
- `iconManager` - Gestion des icônes
- `themeManager` - Gestion des thèmes
- `styleManager` - Gestion des styles CSS
- `modalManager` - Modales
- `carouselManager` - Carrousels
- `toastManager` - Notifications toast
- `tooltipManager` - Info-bulles
- `dropdownManager` - Menus déroulants
- `tabsManager` - Onglets
- `animationManager` - Animations

## 🔧 Options avancées

### Lazy Loading

```javascript
const app = new Marssel({
    lazyload: true, // Active le chargement paresseux des styles
});
```

### Nettoyage du cache

```javascript
// Nettoyer le cache des styles
app.clearStyleCache();
```

## 📦 Structure du projet

```
votre-projet/
├── public/
│   ├── js/
│   │   ├── app.js              # Votre fichier principal
│   │   ├── fonts-manifest.json
│   │   └── icons-manifest.json
│   └── index.html
├── node_modules/
│   └── @marssel-vb/marssel/
└── package.json
```

## 🌐 Compatibilité

- Navigateurs modernes supportant ES6+
- Chrome, Firefox, Safari, Edge (dernières versions)
- Node.js 14+ pour le développement

## 📖 Documentation

Pour une documentation complète, consultez [marssel.fr](https://marssel.dev)

## 🐛 Signaler un bug

Trouvé un bug ? [Créez une issue](https://github.com/marssel-vb/marssel/issues)

## 📄 Licence

MIT License - voir le fichier LICENSE pour plus de détails

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une pull request.

---

Créé avec ❤️ par [LVNS Studio](https://github.com/marssel-vb)
