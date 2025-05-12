import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CONFIG = {
    fontsDir: "public/fonts/",
    manifestPath: "public/js/fonts-manifest.json",
    formats: [".woff2", ".woff", ".ttf"],
    weightMap: {
        thin: 100,
        extralight: 200,
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
        black: 900,
    },
};

function findProjectRoot(startDir) {
    const markers = ["package.json", "composer.json", "public"];
    let current = startDir;
    const root = path.parse(current).root;

    while (current !== root) {
        if (
            markers.some((marker) => fs.existsSync(path.join(current, marker)))
        ) {
            return current;
        }
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
    }

    return process.cwd();
}

function parseArgs() {
    const args = process.argv.slice(2);
    const config = { pretty: false };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--fonts" && args[i + 1]) {
            config.fontsDir = args[i + 1];
            i++;
        } else if (args[i] === "--manifest" && args[i + 1]) {
            config.manifestPath = args[i + 1];
            i++;
        } else if (args[i] === "--pretty") {
            config.pretty = true;
        }
    }

    return config;
}

function resolveConfig() {
    const projectRoot = findProjectRoot(process.cwd());
    const args = parseArgs();

    const fontsDir = path.resolve(
        projectRoot,
        args.fontsDir || DEFAULT_CONFIG.fontsDir
    );
    const manifestPath = path.resolve(
        projectRoot,
        args.manifestPath || DEFAULT_CONFIG.manifestPath
    );

    return {
        ...DEFAULT_CONFIG,
        fontsDir,
        manifestPath,
        pretty: args.pretty,
        projectRoot,
    };
}

function ensureDirs(config) {
    if (!fs.existsSync(config.fontsDir))
        fs.mkdirSync(config.fontsDir, { recursive: true });
    const manifestDir = path.dirname(config.manifestPath);
    if (!fs.existsSync(manifestDir))
        fs.mkdirSync(manifestDir, { recursive: true });
}

function getFontFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...getFontFiles(fullPath));
        } else {
            files.push({
                fullPath,
                file: entry.name,
                family: path.basename(dir),
            });
        }
    }
    return files;
}

function detectWeightAndStyle(baseName, config) {
    const lower = baseName.toLowerCase();
    let weight = 400;
    let style = "normal";

    const foundWeight = Object.keys(config.weightMap).find((w) =>
        lower.includes(w)
    );
    if (foundWeight) {
        weight = config.weightMap[foundWeight];
    }

    if (lower.includes("italic")) {
        style = "italic";
    }

    return { weight, style };
}

function parseFont({ file, fullPath, family }, config) {
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file, ext);
    const type =
        ext === ".woff2" ? "woff2" : ext === ".woff" ? "woff" : "truetype";

    const { weight, style } = detectWeightAndStyle(base, config);

    return { family, weight, style, type, fullPath };
}

function buildManifest(files, config) {
    const manifest = {};

    for (const fileInfo of files) {
        if (!config.formats.includes(path.extname(fileInfo.file).toLowerCase()))
            continue;

        const { family, weight, style, type, fullPath } = parseFont(
            fileInfo,
            config
        );

        if (!manifest[family]) manifest[family] = {};
        const key = `${weight}${style === "italic" ? "i" : ""}`; // Unique key for weight + style

        if (!manifest[family][key]) {
            manifest[family][key] = { weight, style, formats: [] };
        }

        let relPath = path
            .relative(config.projectRoot, fullPath)
            .replace(/\\/g, "/");
        if (relPath.startsWith("public/")) relPath = relPath.slice(6);

        manifest[family][key].formats.push({ file: relPath, type });
    }

    return manifest;
}

function generateManifest() {
    try {
        const config = resolveConfig();
        console.log("📁 Dossier des polices :", config.fontsDir);
        console.log("📄 Chemin du manifest :", config.manifestPath);

        ensureDirs(config);
        const fontFiles = getFontFiles(config.fontsDir);
        console.log(`🔍 ${fontFiles.length} fichier(s) trouvé(s)`);

        const manifest = buildManifest(fontFiles, config);
        const json = JSON.stringify(manifest, null, config.pretty ? 2 : 0);

        fs.writeFileSync(config.manifestPath, json);
        console.log("✅ Manifest généré avec succès.");
    } catch (err) {
        console.error("❌ Erreur :", err.message);
        process.exit(1);
    }
}

generateManifest();
