# Marssel

Un framework JavaScript frontend modulaire pour créer rapidement des interfaces web interactives.

## Installation

```bash
npm install marssel
``
## Utilisation
import { Marssel } from 'marssel';

## Initialiser Marssel avec des options
const app = new Marssel({
  lazyload: true
});

## Utilisation des composants spécifiques
import { CarouselManager } from 'marssel';
const carousel = new CarouselManager();
```

## Création de deux fichiers manifest.json

Dans le dossier public/js, créer deux fichiers : 
- fonts-manifest.json
- icons-manifest.json

### 6. Script de build (optionnel)

Si vous souhaitez bundler votre code pour une meilleure compatibilité, créez un fichier `build.js`:

```javascript
// build.js
import { rollup } from "rollup";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";

async function build() {
  const bundle = await rollup({
    input: "./index.js",
    plugins: [resolve(), commonjs(), terser()],
  });

  await bundle.write({
    file: "dist/marssel.js",
    format: "esm",
    name: "Marssel",
    sourcemap: true,
  });

  await bundle.write({
    file: "dist/marssel.umd.js",
    format: "umd",
    name: "Marssel",
    sourcemap: true,
  });

  console.log("Bundle built!");
}

build();
```

## Dépendances nécessaires

npm install --save-dev rollup @rollup/plugin-node-resolve @rollup/plugin-commonjs @rollup/plugin-terser
