//node .\generators\generate-svg.mjs
import fs from "fs";
import https from "https";
import { promisify } from "util";

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

const PHOSPHOR_REPO =
    "https://raw.githubusercontent.com/phosphor-icons/core/main/assets";

const STYLES = {
    regular: "outline",
    fill: "solid",
    duotone: "duotone",
};

const ICONS_LIST = [
    "acorn",
    "address-book",
    "airplane",
    "alarm",
    "align-left",
    "align-right",
    "align-center-horizontal",
    "align-center-vertical",
    "anchor",
    "android-logo",
    "apple-logo",
    "archive",
    "arrow-circle-down",
    "arrow-circle-left",
    "arrow-circle-right",
    "arrow-circle-up",
    "arrow-clockwise",
    "arrow-counter-clockwise",
    "arrow-down",
    "arrow-left",
    "arrow-right",
    "arrow-up",
    "arrow-square-out",
    "arrows-horizontal",
    "arrows-in",
    "arrows-out",
    "arrows-vertical",
    "article",
    "at",
    "backpack",
    "backspace",
    "bag",
    "barcode",
    "basket",
    "battery-full",
    "battery-low",
    "bell",
    "bell-slash",
    "bicycle",
    "binoculars",
    "bluetooth",
    "book",
    "bookmark",
    "bookmarks",
    "briefcase",
    "broadcast",
    "browser",
    "bug",
    "buildings",
    "bus",
    "calculator",
    "calendar",
    "camera",
    "car",
    "cards",
    "caret-down",
    "caret-left",
    "caret-right",
    "caret-up",
    "caret-double-down",
    "caret-double-left",
    "caret-double-right",
    "caret-double-up",
    "chart-bar",
    "chart-line",
    "chart-pie",
    "chat",
    "check",
    "check-circle",
    "check-square",
    "chevron-down",
    "chevron-left",
    "chevron-right",
    "chevron-up",
    "chevron-double-down",
    "chevron-double-left",
    "chevron-double-right",
    "chevron-double-up",
    "clipboard",
    "clock",
    "cloud",
    "cloud-arrow-down",
    "cloud-arrow-up",
    "code",
    "coffee",
    "command",
    "compass",
    "copy",
    "credit-card",
    "crown",
    "cube",
    "currency-dollar",
    "cursor",
    "database",
    "desktop",
    "devices",
    "discord-logo",
    "dog",
    "download",
    "dribbble-logo",
    "drop",
    "ear-fill",
    "envelope",
    "eraser",
    "export",
    "eye",
    "eye-slash",
    "facebook-logo",
    "figma-logo",
    "file",
    "file-plus",
    "file-text",
    "film-script",
    "fingerprint",
    "fire",
    "flag",
    "folder",
    "folder-open",
    "funnel",
    "game-controller",
    "gear",
    "gift",
    "globe",
    "google-logo",
    "graduation-cap",
    "grid-four",
    "hand",
    "hard-hat",
    "hash",
    "headset",
    "heart",
    "heart-straight",
    "house",
    "image",
    "inbox",
    "info",
    "instagram-logo",
    "key",
    "keyboard",
    "laptop",
    "lightbulb",
    "link",
    "list",
    "lock",
    "map-pin",
    "magic-wand",
    "magnifying-glass",
    "map",
    "microphone",
    "minus",
    "monitor",
    "moon",
    "music-note",
    "newspaper",
    "note-blank",
    "package",
    "paint-brush",
    "paperclip",
    "path",
    "pause",
    "pencil",
    "person",
    "phone",
    "picture-in-picture",
    "pin",
    "play",
    "plus",
    "power",
    "printer",
    "question",
    "receipt",
    "reddit-logo",
    "repeat",
    "rocket",
    "ruler",
    "scissors",
    "share",
    "shield",
    "shopping-cart",
    "sign-out",
    "sliders",
    "star",
    "storefront",
    "sun",
    "tag",
    "target",
    "terminal",
    "thumbs-down",
    "thumbs-up",
    "ticket",
    "trash",
    "trophy",
    "twitter-logo",
    "upload",
    "user",
    "video-camera",
    "wallet",
    "wifi-high",
    "wrench",
    "x",
    "youtube-logo",
    "zap",
    "currency-eur",
    "amazon-logo",
    "app-store-logo",
];

function fetchIcon(url) {
    return new Promise((resolve, reject) => {
        https
            .get(url, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    if (res.statusCode === 200) {
                        resolve(data);
                    } else {
                        resolve(null);
                    }
                });
            })
            .on("error", reject);
    });
}

function cleanSvg(svgContent) {
    const start = svgContent.indexOf(">") + 1;
    const end = svgContent.lastIndexOf("</svg>");
    if (start > 0 && end > 0) {
        return svgContent.substring(start, end).trim();
    }
    return svgContent;
}

function generateSvg(content, styleType) {
    const baseAttr =
        'xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256"';

    const styles = {
        outline: `${baseAttr} fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"`,
        solid: `${baseAttr} fill="currentColor"`,
        duotone: `${baseAttr} fill="currentColor"`,
    };

    const attr = styles[styleType] || styles.outline;
    return `<svg ${attr}>${content}</svg>`;
}

async function main() {
    console.log("🎨 Génération des icônes Phosphor...\n");

    const finalJson = {};
    let totalIcons = 0;
    let failedIcons = 0;
    const failedList = [];

    for (const iconName of ICONS_LIST) {
        console.log(`📦 Traitement de l'icône: ${iconName}`);

        for (const [phosphorStyle, mappedStyle] of Object.entries(STYLES)) {
            const filename =
                phosphorStyle === "regular"
                    ? `${iconName}.svg`
                    : `${iconName}-${phosphorStyle}.svg`;
            const url = `${PHOSPHOR_REPO}/${phosphorStyle}/${filename}`;

            try {
                const svgContent = await fetchIcon(url);

                if (svgContent) {
                    const cleanedContent = cleanSvg(svgContent);
                    const key =
                        mappedStyle === "outline"
                            ? iconName
                            : `${iconName}-${mappedStyle}`;

                    const finalSvg = generateSvg(cleanedContent, mappedStyle);

                    finalJson[key] = {
                        type: mappedStyle,
                        svg: finalSvg,
                    };

                    totalIcons++;
                    console.log(`  ✅ ${key}`);
                } else {
                    failedIcons++;
                    failedList.push(`${iconName}-${phosphorStyle}`);
                    console.log(
                        `  ⚠️  Non trouvée: ${iconName}-${phosphorStyle}`
                    );
                }
            } catch (error) {
                failedIcons++;
                failedList.push(`${iconName}-${phosphorStyle} (erreur)`);
                console.log(`  ❌ Erreur: ${iconName}-${phosphorStyle}`);
            }
        }
    }

    // Créer le dossier
    await mkdir("generators", { recursive: true });

    // Sauvegarder
    const outputFile = "generators/default-icons.mjs";
    const jsContent = `export const icons = ${JSON.stringify(
        finalJson,
        null,
        2
    )};\n`;

    await writeFile(outputFile, jsContent, "utf-8");

    console.log(`\n✨ Terminé!`);
    console.log(`📊 ${totalIcons} icônes générées avec succès`);
    console.log(`❌ ${failedIcons} icônes échouées`);
    console.log(`💾 Fichier créé: ${outputFile}`);
    console.log(`📈 Nombre total d'entrées: ${Object.keys(finalJson).length}`);

    if (failedList.length > 0) {
        console.log(`\n🚫 Icônes non trouvées (${failedList.length}) :`);
        failedList.forEach((icon) => console.log(`   - ${icon}`));
    }
}

main().catch(console.error);
