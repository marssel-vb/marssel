# Marssel

<p align="center">
  <a href="https://www.npmjs.com/package/@marssel-vb/marssel"><img src="https://img.shields.io/npm/v/@marssel-vb/marssel?color=3b82f6&label=npm" alt="npm version" /></a>

<a href="https://www.npmjs.com/package/@marssel-vb/marssel"><img src="https://img.shields.io/npm/dt/@marssel-vb/marssel?color=8b5cf6&label=downloads" alt="npm downloads" /></a>

<a href="https://github.com/marssel-vb/marssel/blob/main/LICENSE"><img src="https://img.shields.io/github/license/marssel-vb/marssel?color=f97316" alt="license" /></a>

<a href="https://github.com/marssel-vb/marssel/issues"><img src="https://img.shields.io/github/issues/marssel-vb/marssel" alt="open issues" /></a>

</p>

A modern, high-performance CSS-in-JS framework for quickly building elegant and interactive web interfaces.

## 📦 Installation

### Via NPM (Recommended)

```bash
npm install @marssel-vb/marssel
```

### Via Yarn

```bash
yarn add @marssel-vb/marssel
```

> **Bundler:** Marssel works out of the box with **Vite**, **Webpack**, and any bundler supporting ES modules. No additional plugin is required.

## 🚀 Quick Start

### 1. Basic import and initialization

```javascript
import { MarssellBundle } from "@marssel-vb/marssel";
const { Marssel } = MarssellBundle;

// Initialize Marssel with default configuration
const app = new Marssel();
```

### 2. With custom options

```javascript
import { MarssellBundle } from "@marssel-vb/marssel";
const { Marssel } = MarssellBundle;

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

## 📋 Requirements

### Manifest files

Create two configuration files in your `public/js` folder:

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

These files allow Marssel to efficiently manage font and icon loading.

## 💡 Usage Examples

### Utility Classes

```html
<!-- Colors -->
<div class="bg-[3b82f6] c-[fff]">Blue background, white text</div>

<!-- Spacing -->
<div class="p-[2rem] m-[1rem]">Padding and margin</div>

<!-- Borders -->
<div class="border-[1px_solid_e5e7eb] rounded-[8px]">Card with border</div>

<!-- Flexbox -->
<div class="d-[flex] justify-content-[center] align-items-[center]">
    Centered content
</div>

<!-- Responsive -->
<div class="fs-[16px] md--fs-[20px] lg--fs-[24px]">Responsive text</div>

<!-- Compact classes -->
<!--
  The --- syntax lets you group multiple utility classes under a single
  semantic name. Use + to separate each class inside the brackets.
  This helps reduce repetition on elements that share many styles.
-->
<input
    class="input-form---[w-[100%]+p-[1rem]+rounded-[8px]+border-[1px_solid_ddd]]"
/>
```

### Themes

```javascript
// Switch theme
app.themeManager.setTheme("dark");

// Listen to theme changes
app.themeManager.onThemeChange((theme) => {
    console.log(`Theme changed to: ${theme}`);
});

// Use theme variables in classes
<div class="bg-[theme-primary] c-[theme-text]">
    Uses the active theme colors
</div>;
```

### Custom Components

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
<button class="btn-primary">My button</button>
<div class="card">My card</div>
```

## 🧩 Using Specific Components

If you want to use only certain managers without initializing the full framework:

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

## 📚 Main API

### Marssel

```javascript
const app = new Marssel({
    lazyload: boolean, // Enable lazy loading (default: false)
    theme: string, // Default theme ('light' | 'dark' | 'auto')
    themes: object, // Custom theme configuration
    components: object, // Custom component styles
});
```

### Available Managers

- `fontManager` — Font management
- `iconManager` — Icon management
- `themeManager` — Theme management
- `styleManager` — CSS style management
- `modalManager` — Modals
- `carouselManager` — Carousels
- `toastManager` — Toast notifications
- `tooltipManager` — Tooltips
- `dropdownManager` — Dropdown menus
- `tabsManager` — Tabs
- `animationManager` — Animations

## 🔧 Advanced Options

### Lazy Loading

```javascript
const app = new Marssel({
    lazyload: true, // Enable lazy loading of styles
});
```

### Cache Clearing

```javascript
// Clear the style cache
app.clearStyleCache();
```

## 🎨 FOUC Prevention (Flash of Unstyled Content)

To prevent the flash of unstyled content, add this critical CSS in the `<head>` of your HTML:

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My Marssel Project</title>

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

## ❓ Troubleshooting

**Styles are not applied**

- Make sure the manifest files (`fonts-manifest.json`, `icons-manifest.json`) exist in `public/js/`. Marssel will silently skip style injection if they are missing.
- Check that your bundler is resolving ES modules correctly. Try adding `"type": "module"` to your `package.json` if styles still don't appear.

**Flash of unstyled content (FOUC)**

- Ensure the FOUC prevention CSS block is placed in `<head>` **before** any other stylesheets. Without it, the page will be visible before Marssel finishes injecting styles.

**Theme variables not resolving (`theme-primary` showing as-is)**

- Confirm that you passed a `themes` object when initializing Marssel. Theme variables only work when at least one theme is defined in the config.

**`app` is undefined after import**

- Double-check the import path and that you are destructuring correctly: `const { Marssel } = MarssellBundle;`

## 📦 Project Structure

```
your-project/
├── public/
│   ├── js/
│   │   ├── app.js              # Your main file
│   │   ├── fonts-manifest.json
│   │   └── icons-manifest.json
│   └── index.html
├── node_modules/
│   └── @marssel-vb/marssel/
└── package.json
```

## 🌐 Compatibility

- Modern browsers supporting ES6+
- Chrome, Firefox, Safari, Edge (latest versions)
- Node.js 14+ for development

## 📖 Documentation

For full documentation, visit [marssel.dev](https://marssel.dev)

## 🐛 Report a Bug

Found a bug? [Open an issue](https://github.com/marssel-vb/marssel/issues)

## 📄 License

MIT License — see the LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Feel free to open a pull request.

---

Made with ❤️ by [LVNS Studio](https://github.com/marssel-vb)
