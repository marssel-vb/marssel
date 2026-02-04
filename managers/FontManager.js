import { FontsConfig } from "../utils/config.mjs";
import { LRUCache } from "../utils/LRUCache.js";

export class FontManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.config = this.initializeConfig();
        this.state = this.initializeState();

        // Bind methods
        this.flushGoogleFonts = this.flushGoogleFonts.bind(this);
    }

    initializeConfig() {
        return {
            fontsPath: FontsConfig.fontsPath,
            manifestUrl: FontsConfig.manifestPath,
            googleTimeout: 50,
            googleFontsUrl: "https://fonts.googleapis.com/css2",
            maxRetries: 3,
            retryDelay: 1000,
        };
    }

    initializeState() {
        return {
            loaded: new Set(),
            manifest: null,
            pendingRequests: new Map(), // ← GARDER Map (pas LRUCache)
            googleTimer: null,
            manifestLoaded: false,
            loadedStylesheets: new Set(), // ← Seulement celui-ci en LRUCache
        };
    }

    async init() {
        if (this.state.manifestLoaded) return;

        try {
            await this.loadManifest();
            this.state.manifestLoaded = true;
        } catch (error) {
            console.error("FontManager initialization failed:", error);
            throw error;
        }
    }

    async loadManifest(retryCount = 0) {
        try {
            console.log("🔍 Loading manifest from:", this.config.manifestUrl);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(this.config.manifestUrl, {
                signal: controller.signal,
                cache: "force-cache",
            });

            clearTimeout(timeoutId);

            console.log("📡 Response status:", response.status);
            console.log("📡 Response headers:", [
                ...response.headers.entries(),
            ]);

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`,
                );
            }

            const responseText = await response.text();
            console.log("📄 Response text length:", responseText.length);
            console.log("📄 Response text:", responseText);
            console.log("📄 First 100 chars:", responseText.substring(0, 100));

            // Vérifier si la réponse est vide ou contient seulement des espaces
            if (!responseText || responseText.trim() === "") {
                console.warn("⚠️ Empty response received");
                this.state.manifest = {};
                return;
            }

            // Tenter de parser le JSON
            try {
                this.state.manifest = JSON.parse(responseText);
                console.log(
                    "✅ JSON parsed successfully:",
                    this.state.manifest,
                );
            } catch (jsonError) {
                console.error("❌ JSON parsing failed:", jsonError);
                console.error("❌ Problematic text:", responseText);
                throw jsonError;
            }

            this.validateManifest();
        } catch (error) {
            console.error("💥 Error details:", error);
            console.error("💥 Error type:", error.constructor.name);
            console.error("💥 Error message:", error.message);

            if (retryCount < this.config.maxRetries) {
                console.warn(
                    `🔄 Manifest load attempt ${
                        retryCount + 1
                    } failed, retrying...`,
                    error.message,
                );
                await this.delay(this.config.retryDelay * (retryCount + 1));
                return this.loadManifest(retryCount + 1);
            }

            console.warn(
                "💀 Font manifest loading failed after all retries:",
                error,
            );
            // Utiliser un manifest vide au lieu de faire planter l'app
            this.state.manifest = {};
        }
    }

    validateManifest() {
        if (!this.state.manifest || typeof this.state.manifest !== "object") {
            throw new Error("Invalid manifest format");
        }
    }

    async handleFont(fontFamily, variant = "400") {
        if (!fontFamily || typeof fontFamily !== "string") {
            console.warn("Invalid font family provided:", fontFamily);
            return false;
        }

        const normalizedFamily = this.normalizeFontFamily(fontFamily);
        const normalizedVariant = this.normalizeVariant(variant);
        const fontKey = `${normalizedFamily}-${normalizedVariant}`;

        if (this.state.loaded.has(fontKey)) {
            return true;
        }

        // Ensure manifest is loaded
        if (!this.state.manifestLoaded) {
            await this.init();
        }

        this.state.loaded.add(fontKey);

        try {
            if (this.hasLocalFont(normalizedFamily, normalizedVariant)) {
                return this.injectLocalFont(
                    normalizedFamily,
                    normalizedVariant,
                );
            } else {
                return this.loadGoogleFont(normalizedFamily, normalizedVariant);
            }
        } catch (error) {
            console.error(`Failed to handle font ${fontKey}:`, error);
            this.state.loaded.delete(fontKey);
            return false;
        }
    }

    normalizeFontFamily(fontFamily) {
        return fontFamily.trim().replace(/["']/g, "");
    }

    // normalizeVariant(variant) {
    //     if (typeof variant === "number") {
    //         return variant.toString();
    //     }
    //     return variant.toString().trim();
    // }

    normalizeVariant(variant) {
        if (!variant) return "400";

        // Nettoie les espaces ET supprime les parenthèses ( )
        // Cela transforme "(700)" en "700"
        return variant.toString().trim().replace(/[()]/g, "");
    }

    hasLocalFont(fontFamily, variant) {
        return this.state.manifest?.[fontFamily]?.[variant] != null;
    }

    injectLocalFont(fontFamily, variant) {
        try {
            const fontData = this.state.manifest[fontFamily][variant];

            if (!fontData.formats || !Array.isArray(fontData.formats)) {
                throw new Error(
                    `Invalid font data for ${fontFamily}-${variant}`,
                );
            }

            const src = this.buildFontSources(fontData.formats);
            const cssText = this.buildFontFaceCSS(fontFamily, fontData, src);

            this.marssel.styleManager.addFontFace(cssText);
            return true;
        } catch (error) {
            console.error(
                `Failed to inject local font ${fontFamily}-${variant}:`,
                error,
            );
            return false;
        }
    }

    buildFontSources(formats) {
        const formatMap = {
            ".woff2": "woff2",
            ".woff": "woff",
            ".ttf": "truetype",
            ".otf": "opentype",
        };

        return formats
            .filter((format) => format.file && typeof format.file === "string")
            .map((format) => {
                const extension = this.getFileExtension(format.file);
                const formatType = formatMap[extension] || "woff2";
                return `url('${format.file}') format('${formatType}')`;
            })
            .join(", ");
    }

    getFileExtension(filename) {
        const match = filename.match(/\.[^.]+$/);
        return match ? match[0] : ".woff2";
    }

    buildFontFaceCSS(fontFamily, fontData, src) {
        return `
            @font-face {
                font-family: '${fontFamily}';
                font-style: ${fontData.style || "normal"};
                font-weight: ${fontData.weight || "400"};
                font-display: swap;
                src: ${src};
            }
        `.trim();
    }

    loadGoogleFont(family, variant) {
        try {
            const { weight, style } = this.parseVariant(variant);
            const familyKey = this.encodeGoogleFontFamily(family);
            const variantKey = this.buildGoogleVariantKey(weight, style);

            this.addToPendingRequests(familyKey, variantKey);
            this.scheduleGoogleFontsFlush();

            return true;
        } catch (error) {
            console.error(
                `Failed to load Google font ${family}-${variant}:`,
                error,
            );
            return false;
        }
    }

    parseVariant(variant) {
        const parts = variant.split("_");
        return {
            weight: parts[0] || "400",
            style: parts[1] || "normal",
        };
    }

    encodeGoogleFontFamily(family) {
        return family.replace(/\s+/g, "+");
    }

    buildGoogleVariantKey(weight, style) {
        const italic = style === "italic" ? "1" : "0";
        return `${italic},${weight}`;
    }

    addToPendingRequests(familyKey, variantKey) {
        if (!this.state.pendingRequests.has(familyKey)) {
            this.state.pendingRequests.set(familyKey, new Set());
        }
        this.state.pendingRequests.get(familyKey).add(variantKey);
    }

    scheduleGoogleFontsFlush() {
        if (this.state.googleTimer) {
            clearTimeout(this.state.googleTimer);
        }

        this.state.googleTimer = setTimeout(
            this.flushGoogleFonts,
            this.config.googleTimeout,
        );
    }

    flushGoogleFonts() {
        if (this.state.pendingRequests.size === 0) return;

        try {
            const url = this.buildGoogleFontsUrl();

            if (this.isStylesheetLoaded(url)) {
                console.log("Google fonts already loaded:", url);
                this.clearPendingRequests();
                return;
            }

            this.loadStylesheet(url);
            this.state.loadedStylesheets.add(url);
            this.clearPendingRequests();
        } catch (error) {
            console.error("Failed to flush Google fonts:", error);
        }
    }

    buildGoogleFontsUrl() {
        const fontParams = Array.from(this.state.pendingRequests.entries())
            .map(
                ([family, variants]) =>
                    `${family}:ital,wght@${Array.from(variants)
                        .sort()
                        .join(";")}`,
            )
            .join("&family=");

        return `${this.config.googleFontsUrl}?family=${fontParams}&display=swap`;
    }

    isStylesheetLoaded(url) {
        return (
            this.state.loadedStylesheets.has(url) ||
            Array.from(
                document.head.querySelectorAll("link[rel='stylesheet']"),
            ).some((link) => link.href === url)
        );
    }

    loadStylesheet(url) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = url;
        link.crossOrigin = "anonymous";

        // Add error handling
        link.onerror = () => {
            console.error("Failed to load stylesheet:", url);
            this.state.loadedStylesheets.delete(url);
        };

        link.onload = () => {
            console.log("Google fonts loaded successfully:", url);
        };

        document.head.appendChild(link);
    }

    clearPendingRequests() {
        this.state.pendingRequests.clear();
        if (this.state.googleTimer) {
            clearTimeout(this.state.googleTimer);
            this.state.googleTimer = null;
        }
    }

    // Utility method
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Public API methods
    isLoaded(fontFamily, variant = "400") {
        const fontKey = `${this.normalizeFontFamily(
            fontFamily,
        )}-${this.normalizeVariant(variant)}`;
        return this.state.loaded.has(fontKey);
    }

    getLoadedFonts() {
        return Array.from(this.state.loaded);
    }

    getManifest() {
        return { ...this.state.manifest };
    }

    hasPendingRequests() {
        return this.state.pendingRequests.size > 0;
    }

    // Cleanup method
    destroy() {
        this.clearPendingRequests();
        this.state.loaded.clear();
        this.state.loadedStylesheets.clear();
        this.state.manifest = null;
        this.state.manifestLoaded = false;
    }
}
