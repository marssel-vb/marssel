// Grouping of managers
import * as Managers from "../managers/index.js";

// Utility constants
import {
    properties,
    breakpoints,
    containerMaxWidths,
    CLASS_REGEX,
    COLOR_REGEX,
    CRITICAL_SELECTORS,
    defaultThemes, // Importer la fonction d'extension
} from "../utils/constants.js";

import { parseClassName } from "../utils/parsed.js";

export class Marssel {
    constructor({
        lazyload = false,
        theme = "auto",
        themes = {},
        components = {},
        paths = {},
    } = {}) {
        this.config = {
            lazyload,
            theme,
            paths: {
                fontsManifest: paths.fontsManifest || "/js/fonts-manifest.json",
                iconsManifest: paths.iconsManifest || "/js/icons-manifest.json",
            },
        };
        this.allThemes = this.mergeThemes(defaultThemes || {}, themes);
        this.componentStyles = components;

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
            "TabsManager",
            "AnimationManager",
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
                "defaultThemes manquant ou invalide, utilisation d'un objet vide",
            );
            defaultThemes = {};
        }

        if (!customThemes || typeof customThemes !== "object") {
            console.warn(
                "customThemes manquant ou invalide, utilisation d'un objet vide",
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
        try {
            if (!this.allThemes || Object.keys(this.allThemes).length === 0) {
                console.error("Aucun thème disponible pour l'initialisation");
                // Créer des thèmes par défaut minimaux
                this.allThemes = {
                    light: {},
                    dark: {},
                };
                this.themeManager.themes = this.allThemes;
            }

            // Initialise les styles critiques IMMÉDIATEMENT
            this.styleManager.initializeStyleSheet();

            // Optimisation: Ne pas attendre DOMContentLoaded si déjà chargé
            if (document.readyState !== "loading") {
                await Promise.all([
                    this.fontManager.init(),
                    this.iconManager.init(),
                ]);
            } else {
                await new Promise((resolve) => {
                    document.addEventListener("DOMContentLoaded", async () => {
                        await Promise.all([
                            this.fontManager.init(),
                            this.iconManager.init(),
                        ]);
                        resolve();
                    });
                });
            }

            // Charge les polices et icônes en parallèle
            await Promise.all([
                this.fontManager.init(),
                this.iconManager.init(),
            ]);

            this.themeManager.init(this.config.theme);

            // Styles par défaut
            this.styleManager.addDefaultStyles();

            this.preprocessAllCompactClasses();

            // NOUVEAU : Traite spécifiquement les éléments critiques en premier
            await this.processCriticalElementsFirst();

            // Traite d'abord les éléments visibles
            this.domManager.processVisibleElementsFirst();
            this.domManager.setupObservers();

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
                "tabsManager",
                "animationManager",
            ];

            this.registerComponentStyles();

            // Initialisation différée des managers non critiques
            setTimeout(() => {
                managersToInit.forEach((manager) => {
                    try {
                        this[manager]?.init?.();
                    } catch (error) {
                        console.warn(
                            `Erreur initialisation ${manager}:`,
                            error,
                        );
                    }
                });

                this.domManager.processAllElements();

                // Nettoyer le cache au déchargement de la page
                window.addEventListener("beforeunload", () => {
                    this.styleManager.saveCachedStyles();
                });

                // Marquer comme prêt immédiatement après le traitement
                requestAnimationFrame(() => {
                    document.body.classList.add("marssel-ready");
                    console.log("🎨 Marssel initialisé avec succès");
                });
            }, 50); // Réduit de 100ms à 50ms
        } catch (error) {
            console.error("⚠ Erreur initialisation Marssel:", error);
        }
    }

    clearStyleCache() {
        sessionStorage.removeItem(this.styleManager.STORAGE_KEY);
        console.log("🗑️ Cache styles nettoyé");
    }

    preprocessAllCompactClasses() {
        // Scanner tout le document pour les classes avec ---
        const allElements = document.querySelectorAll("*");
        const compactClasses = new Set();

        allElements.forEach((element) => {
            element.classList.forEach((className) => {
                if (className.includes("---")) {
                    compactClasses.add(className);
                }
            });
        });

        // Traiter immédiatement toutes ces classes
        compactClasses.forEach((className) => {
            this.domManager.processClassOptimized(className);
        });

        // Forcer la mise à jour des styles
        this.domManager.processPendingClasses();
        this.styleManager.updateStyles();

        console.log(`🎨 ${compactClasses.size} classes compactes prétraitées`);
    }

    async processCriticalElementsFirst() {
        return new Promise((resolve) => {
            const criticalSelectors = [
                "header",
                "footer",
                "nav",
                '[role="banner"]',
                '[role="contentinfo"]',
                '[role="navigation"]',
                ".header",
                ".footer",
                ".navbar",
                ".nav",
            ];

            const criticalElements = [];
            const viewportHeight = window.innerHeight;

            criticalSelectors.forEach((selector) => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach((element) => {
                        const rect = element.getBoundingClientRect();
                        // Prendre une marge plus large pour les éléments critiques
                        if (
                            rect.top < viewportHeight + 100 &&
                            rect.bottom > -100
                        ) {
                            criticalElements.push(element);
                        }
                    });
                } catch (e) {
                    // Ignorer les erreurs de sélecteur
                }
            });

            if (criticalElements.length === 0) {
                resolve();
                return;
            }

            // Traiter immédiatement les éléments critiques
            let processed = 0;
            const total = criticalElements.length;

            criticalElements.forEach((element) => {
                this.domManager.processElement(element);
                processed++;

                if (processed === total) {
                    // Traiter immédiatement les styles des éléments critiques
                    this.domManager.processPendingClasses();
                    this.styleManager.updateStyles();

                    // Laisser un frame pour que les styles s'appliquent
                    requestAnimationFrame(() => {
                        resolve();
                    });
                }
            });
        });
    }

    registerComponentStyles() {
        if (
            !this.componentStyles ||
            Object.keys(this.componentStyles).length === 0
        ) {
            return;
        }

        Object.entries(this.componentStyles).forEach(([selector, styles]) => {
            const styleString = Array.isArray(styles)
                ? styles.join(" ")
                : styles;

            // Créer une classe virtuelle qui sera traitée par le système existant
            const virtualElement = document.createElement("div");
            virtualElement.className = styleString;

            // Parser et enregistrer les styles
            const classList = virtualElement.classList;
            Array.from(classList).forEach((className) => {
                this.domManager.processClassOptimized(className);
            });

            // Mapper le sélecteur personnalisé
            this.mapComponentSelector(selector, styleString);
        });

        this.styleManager.updateStyles();
    }

    mapComponentSelector(selector, styles) {
        // Extraire le nom de base et le pseudo-sélecteur
        const [baseSelector, pseudoSelector] = selector.split(":");

        // Créer le sélecteur CSS final
        const cssSelector = pseudoSelector
            ? `.${baseSelector}:${pseudoSelector}`
            : `.${baseSelector}`;

        // Ajouter au StyleManager
        const declarations = new Set();
        const classList = styles.split(" ");

        classList.forEach((className) => {
            const parsed = parseClassName(className);
            if (parsed) {
                const genDeclarations = this.styleManager.generateDeclarations(
                    parsed,
                    cssSelector,
                );
                genDeclarations.forEach((decl) => declarations.add(decl));
            }
        });

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            cssSelector,
            declarations,
        );
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
    static get CRITICAL_SELECTORS() {
        return CRITICAL_SELECTORS;
    }
}
