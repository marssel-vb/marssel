//node .\generators\generate-svg.mjs
import fs from "fs";
import https from "https";
import { promisify } from "util";
import { fileURLToPath } from "url";
import path from "path";

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
    "currency-eur",
    "amazon-logo",
    "app-store-logo",
    "stack",
    "lightning",
    "cpu",
    "users",
    "grid-four",
    "trend-up",
    "x-logo",
    "github-logo",
    "book-open",
    "linkedin-logo",
    "circle-notch",
    "spinner",
    "spinner-ball",
    "gauge",
    "share-network",
];

// Declarations for the --onlynew mode (avoids duplicates)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = "generators";
const outputFileName = "default-icons.mjs";
const outputFile = path.join(__dirname, outputFileName);

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
    console.log("🎨 Icon generation ...\n");

    const onlyNew = process.argv.includes("--onlynew");
    console.log(`"Only New" mode activated : ${onlyNew ? "Oui" : "Non"}`);

    let finalJson = {};
    const existingKeys = new Set();

    if (onlyNew) {
        try {
            const existingModule = await import(`file://${outputFile}`);
            finalJson = existingModule.icons;
            Object.keys(finalJson).forEach((key) => existingKeys.add(key));
            console.log(`Loading ${existingKeys.size} existing icons.`);
        } catch (e) {
            console.log(
                `⚠️ Existing file ${outputFile} not found or error loading. Proceeding with a full generation.`,
            );
            // If the import fails (file does not exist), finalJson remains {}
        }
    }

    let totalIcons = 0;
    let failedIcons = 0;
    const failedList = [];

    for (const iconName of ICONS_LIST) {
        console.log(`📦 Icon processing : ${iconName}`);

        for (const [phosphorStyle, mappedStyle] of Object.entries(STYLES)) {
            const key =
                mappedStyle === "outline"
                    ? iconName
                    : `${iconName}-${mappedStyle}`;

            if (onlyNew && existingKeys.has(key)) {
                console.log(`  ⏭️  Already exists: ${key}`);
                continue;
            }

            const filename =
                phosphorStyle === "regular"
                    ? `${iconName}.svg`
                    : `${iconName}-${phosphorStyle}.svg`;
            const url = `${PHOSPHOR_REPO}/${phosphorStyle}/${filename}`;

            try {
                const svgContent = await fetchIcon(url);

                if (svgContent) {
                    const cleanedContent = cleanSvg(svgContent);
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
                        `  ⚠️  Not found: ${iconName}-${phosphorStyle}`,
                    );
                }
            } catch (error) {
                failedIcons++;
                failedList.push(`${iconName}-${phosphorStyle} (erreur)`);
                console.log(`  ❌ Error: ${iconName}-${phosphorStyle}`);
            }
        }
    }

    await mkdir(outputDir, { recursive: true });

    const jsContent = `export const icons = ${JSON.stringify(
        finalJson,
        null,
        2,
    )};\n`;

    await writeFile(outputFile, jsContent, "utf-8");

    console.log(`\n✨ Completed !`);
    console.log(`📊 ${totalIcons} icons generated/downloaded successfully`);
    console.log(`❌ ${failedIcons} icons failed`);
    console.log(`💾 File created: ${outputFile}`);
    console.log(`📈 Total entries: ${Object.keys(finalJson).length}`);

    if (failedList.length > 0) {
        console.log(`\n🚫 Not found icons (${failedList.length}) :`);
        failedList.forEach((icon) => console.log(`   - ${icon}`));
    }
}

main().catch(console.error);
