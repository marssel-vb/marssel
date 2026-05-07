import { LRUCache } from "../utils/LRUCache.js";

export class IconManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.icons = new Map();
        this.sizes = Object.freeze({
            small: "16px",
            medium: "24px",
            large: "32px",
            xlarge: "48px",
        });
        this.isLoaded = false;
        this.initPromise = null;
        this.iconRegex = /^icon-\\\[([a-z0-9-]+(?:-solid|-duotone)?)\\\]$/i;
        this.colorRegex = /c-\[([\da-f]{3,8})\]/i;

        this.styleCache = new LRUCache(200);

        this.ICON_TYPES = Object.freeze({
            OUTLINE: "outline",
            SOLID: "solid",
            DUOTONE: "duotone",
        });
    }

    async init() {
        if (this.isLoaded) return;
        if (this.initPromise !== null) return this.initPromise;

        this.initPromise = (async () => {
            try {
                const manifestPath = this.marssel.config.paths.iconsManifest;
                const response = await fetch(manifestPath);
                if (!response.ok)
                    throw new Error(
                        `HTTP ${response.status}: ${response.statusText}`,
                    );
                const iconsData = await response.json();
                this.icons = new Map(Object.entries(iconsData));
            } catch (error) {
                console.warn(
                    "Manifeste d'icônes non trouvé, utilisation des icônes par défaut",
                    error,
                );
                this.icons = new Map();
            } finally {
                this.isLoaded = true;
            }
        })();

        return this.initPromise;
    }

    parseIconName(className) {
        const match = className.match(this.iconRegex);
        if (!match) return null;

        const fullIconName = match[1];

        if (fullIconName.endsWith("-solid")) {
            return {
                iconName: fullIconName.slice(0, -6),
                iconType: this.ICON_TYPES.SOLID,
                iconKey: fullIconName,
            };
        }

        if (fullIconName.endsWith("-duotone")) {
            return {
                iconName: fullIconName.slice(0, -8),
                iconType: this.ICON_TYPES.DUOTONE,
                iconKey: fullIconName,
            };
        }

        return {
            iconName: fullIconName,
            iconType: this.ICON_TYPES.OUTLINE,
            iconKey: fullIconName,
        };
    }

    getIconContent(className) {
        if (!this.isLoaded) {
            return null;
        }

        const parsedIcon = this.parseIconName(className);
        if (!parsedIcon) {
            console.warn("No icon match for className:", className);
            return null;
        }

        const icon = this.icons.get(parsedIcon.iconKey);
        if (!icon) {
            console.warn(`Icon not found: ${parsedIcon.iconKey}`);
            return null;
        }

        return icon;
    }

    extractColor(className) {
        const colorMatch = className.match(this.colorRegex);
        if (!colorMatch) return "currentColor";

        const colorValue = colorMatch[1];
        return colorValue.startsWith("#") ? colorValue : `#${colorValue}`;
    }

    createIconStyles(selector, className) {
        if (!this.isLoaded) return new Set();

        const cacheKey = `${selector}-${className}`;
        if (this.styleCache.has(cacheKey)) {
            return this.styleCache.get(cacheKey);
        }

        const icon = this.getIconContent(className);
        if (!icon) return new Set();

        const color = this.extractColor(className);
        const encodedSvg = encodeURIComponent(icon.svg);

        const declarations = new Set([
            "position: relative",
            "display: inline-block",
            "vertical-align: middle",
            "width: var(--icon-size)",
            "height: var(--icon-size)",
            `background-color: ${color}`,
            `-webkit-mask-image: url("data:image/svg+xml,${encodedSvg}")`,
            `mask-image: url("data:image/svg+xml,${encodedSvg}")`,
            "-webkit-mask-repeat: no-repeat",
            "mask-repeat: no-repeat",
            "-webkit-mask-position: center",
            "mask-position: center",
            "-webkit-mask-size: contain",
            "mask-size: contain",
        ]);

        this.styleCache.set(cacheKey, declarations);
        return declarations;
    }

    clearCache() {
        this.styleCache.clear();
    }

    getCacheStats() {
        return {
            size: this.styleCache.size,
            iconsLoaded: this.icons.size,
            isLoaded: this.isLoaded,
        };
    }
}
