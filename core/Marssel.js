// Grouping of managers
import * as Managers from "../managers/index.js";

// Utility constants
import {
    properties,
    breakpoints,
    containerMaxWidths,
    CLASS_REGEX,
    COLOR_REGEX,
    defaultThemes, // Importer la fonction d'extension
} from "../utils/constants.js";

export class Marssel {
    constructor({ lazyload = false, theme = "auto", themes = {} } = {}) {
        this.config = { lazyload, theme };
        this.allThemes = this.mergeThemes(defaultThemes || {}, themes);

        // List of managers to instantiate
        const managerList = [
            "FontManager",
            "IconManager",
            "StyleManager",
            "DomManager",
            "ModalManager",
            "ScrollspyManager",
            "ToastManager",
            "TooltipManager",
            "HeaderManager",
            "CarouselManager",
            "DropdownManager",
            "OffcanvasManager",
            "PopoverManager",
        ];

        // Instantiating managers dynamically
        for (const key of managerList) {
            const name = key.charAt(0).toLowerCase() + key.slice(1);
            this[name] =
                key === "StyleManager"
                    ? new Managers[key](this, this.config)
                    : new Managers[key](this);
        }

        this.themeManager = new Managers.ThemeManager(this, this.allThemes);

        this.init();
    }

    mergeThemes(defaultThemes, customThemes) {
        // CORRECTION 5: Vérifications plus robustes
        if (!defaultThemes || typeof defaultThemes !== "object") {
            console.warn(
                "defaultThemes manquant ou invalide, utilisation d'un objet vide"
            );
            defaultThemes = {};
        }

        if (!customThemes || typeof customThemes !== "object") {
            console.warn(
                "customThemes manquant ou invalide, utilisation d'un objet vide"
            );
            customThemes = {};
        }

        const merged = { ...defaultThemes };

        // Pour chaque thème personnalisé (light, dark, etc.)
        Object.keys(customThemes).forEach((themeName) => {
            if (merged[themeName]) {
                // Étend le thème existant
                merged[themeName] = {
                    ...merged[themeName],
                    ...customThemes[themeName],
                };
            } else {
                merged[themeName] = customThemes[themeName];
            }
        });
        return merged;
    }

    async init() {
        if (!this.allThemes || Object.keys(this.allThemes).length === 0) {
            console.error("Aucun thème disponible pour l'initialisation");
            // Créer des thèmes par défaut minimaux
            this.allThemes = {
                light: {},
                dark: {},
            };
            this.themeManager.themes = this.allThemes;
        }

        // Asynchronous initialization
        await this.fontManager.init();
        await this.iconManager.init();

        this.themeManager.init(this.config.theme);

        // Synchronous initialization
        this.styleManager.initializeStyleSheet();
        this.styleManager.addDefaultStyles();
        this.domManager.setupObservers();
        this.domManager.processAllElements();

        // Managers to be initialized
        const managersToInit = [
            "carouselManager",
            "modalManager",
            "popoverManager",
            "scrollspyManager",
            "toastManager",
            "tooltipManager",
            "headerManager",
            "dropdownManager",
            "offcanvasManager",
        ];

        for (const manager of managersToInit) {
            this[manager]?.init?.();
        }
    }

    // Exposition of constants
    get currentTheme() {
        return this.themeManager?.currentTheme || "light";
    }
    static get properties() {
        return properties;
    }
    static get breakpoints() {
        return breakpoints;
    }
    static get containerMaxWidths() {
        return containerMaxWidths;
    }
    static get CLASS_REGEX() {
        return CLASS_REGEX;
    }
    static get COLOR_REGEX() {
        return COLOR_REGEX;
    }
}
