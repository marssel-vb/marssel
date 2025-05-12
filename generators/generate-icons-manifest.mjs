// node generate-icons-manifest.js [--icons path] [--manifest path] [--pretty]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔍 Trouver la racine du projet
function findProjectRoot(startDir) {
    const rootMarkers = ["package.json", "composer.json", "public"];
    let currentDir = startDir;
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
        if (
            rootMarkers.some((marker) =>
                fs.existsSync(path.join(currentDir, marker))
            )
        ) {
            return currentDir;
        }
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) break;
        currentDir = parentDir;
    }

    return process.cwd();
}

const projectRoot = findProjectRoot(process.cwd());

// 🧾 Analyse des arguments CLI
function parseArgs() {
    const args = process.argv.slice(2);
    const config = { pretty: false };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case "--icons":
                config.customIconsDir = args[++i];
                break;
            case "--manifest":
                config.manifestPath = args[++i];
                break;
            case "--pretty":
                config.pretty = true;
                break;
        }
    }

    return config;
}

// 📁 Configuration finale
function getConfig() {
    const args = parseArgs();
    const defaults = {
        customIconsDir: "public/images/icons/",
        manifestPath: "public/js/icons-manifest.json",
    };

    const normalize = (p, fallback) => (p || fallback).replace(/^\/+/, "");

    const config = {
        customIconsDir: path.resolve(
            projectRoot,
            normalize(args.customIconsDir, defaults.customIconsDir)
        ),
        manifestPath: path.resolve(
            projectRoot,
            normalize(args.manifestPath, defaults.manifestPath)
        ),
        pretty: args.pretty,
    };

    console.log("📂 Racine du projet détectée:", projectRoot);
    return config;
}

// 📦 Extraction SVG
function extractSvg(filePath) {
    const raw = fs.readFileSync(filePath, "utf8");
    return raw.replace(/\s+/g, " ").trim();
}

// 📥 Chargement des icônes par défaut
async function loadDefaultIcons() {
    try {
        const { icons } = await import("./default-icons.mjs");
        return icons || {};
    } catch (e) {
        console.warn("⚠️ Icônes par défaut introuvables :", e.message);
        return {};
    }
}

// 🔁 Traitement d'un dossier d'icônes
function processIconDir(dir, type, manifest) {
    if (!fs.existsSync(dir)) {
        console.log(`📁 Création du dossier : ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
        return;
    }

    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".svg"));

    for (const file of files) {
        const base = path.basename(file, ".svg");
        const name =
            type === "solid"
                ? `${base}-solid`
                : type === "duotone"
                ? `${base}-duotone`
                : base;
        manifest[name] = {
            svg: extractSvg(path.join(dir, file)),
            type,
        };
        console.log(`✅ ${file} [${type}]`);
    }
}

// 🚀 Main
async function generateIconsManifest() {
    try {
        const config = getConfig();
        console.log("\n📁 Configuration:");
        console.log(`   📌 Répertoire icônes : ${config.customIconsDir}`);
        console.log(`   📝 Fichier manifeste : ${config.manifestPath}`);

        const manifestDir = path.dirname(config.manifestPath);
        if (!fs.existsSync(manifestDir))
            fs.mkdirSync(manifestDir, { recursive: true });

        const manifest = { ...(await loadDefaultIcons()) };

        for (const type of ["outline", "solid", "duotone"]) {
            console.log(`\n🔍 Traitement des icônes ${type}...`);
            const dir = path.join(config.customIconsDir, type);
            processIconDir(dir, type, manifest);
        }

        fs.writeFileSync(
            config.manifestPath,
            JSON.stringify(manifest, null, config.pretty ? 2 : 0)
        );

        console.log("\n✨ Manifest généré avec succès !");
        console.log(`   🔢 Total icônes : ${Object.keys(manifest).length}`);
        console.log(`   📄 Écrit dans : ${config.manifestPath}`);
    } catch (e) {
        console.error("\n❌ Erreur durant la génération :", e);
        process.exit(1);
    }
}

generateIconsManifest();
export default generateIconsManifest;
