import * as Managers from "../managers/index.js";

import {
    properties,
    breakpoints,
    containerMaxWidths,
    CLASS_REGEX,
    COLOR_REGEX,
    CRITICAL_SELECTORS,
    defaultThemes,
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

        Object.keys(customThemes).forEach((themeName) => {
            if (merged[themeName]) {
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
                this.allThemes = {
                    light: {},
                    dark: {},
                };
                this.themeManager.themes = this.allThemes;
            }

            const cached = this.styleManager.styleCache?.load();
            if (cached) {
                this.styleManager.selectorDeclarations =
                    this.styleManager.styleCache.merge(
                        new Map(),
                        cached.selectorDeclarations,
                    );
            }

            this.styleManager.initializeStyleSheet();

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

            this.themeManager.init(this.config.theme);

            this.styleManager.addDefaultStyles();
            this.preprocessAllCompactClasses();
            await this.processCriticalElementsFirst();
            this.domManager.processVisibleElementsFirst();

            this.headerManager.init();
            this.dropdownManager.init();
            this.toastManager.init();
            this.domManager.processAllElements();

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    document.body.classList.add("marssel-ready");
                });
            });

            this.domManager.setupObservers();

            const managersToInit = [
                "carouselManager",
                "carouselManager",
                "modalManager",
                "popoverManager",
                "scrollspyManager",
                "tooltipManager",
                "offcanvasManager",
                "tabsManager",
                "animationManager",
            ];

            this.registerComponentStyles();

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

                window.addEventListener("beforeunload", () => {
                    this.styleManager.saveCachedStyles();
                });
            }, 50);
        } catch (error) {
            console.error("⚠ Erreur initialisation Marssel:", error);
        }
    }

    clearStyleCache() {
        sessionStorage.removeItem(this.styleManager.STORAGE_KEY);
        console.log("🗑️ Cleaned style cache");
    }

    preprocessAllCompactClasses() {
        const allElements = document.querySelectorAll("*");
        const compactClasses = new Set();

        allElements.forEach((element) => {
            element.classList.forEach((className) => {
                if (className.includes("---")) {
                    compactClasses.add(className);
                }
            });
        });

        compactClasses.forEach((className) => {
            this.domManager.processClassOptimized(className);
        });

        this.domManager.processPendingClasses();
        this.styleManager.updateStylesSync();

        //console.log(`🎨 ${compactClasses.size} pre-treated compact classes`);
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
                    //
                }
            });

            if (criticalElements.length === 0) {
                resolve();
                return;
            }

            let processed = 0;
            const total = criticalElements.length;

            criticalElements.forEach((element) => {
                this.domManager.processElement(element);
                processed++;

                if (processed === total) {
                    this.domManager.processPendingClasses();
                    this.styleManager.updateStyles();

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

            const virtualElement = document.createElement("div");
            virtualElement.className = styleString;

            const classList = virtualElement.classList;
            Array.from(classList).forEach((className) => {
                this.domManager.processClassOptimized(className);
            });

            this.mapComponentSelector(selector, styleString);
        });

        this.styleManager.updateStyles();
    }

    mapComponentSelector(selector, styles) {
        const [baseSelector, pseudoSelector] = selector.split(":");
        const cssSelector = pseudoSelector
            ? `.${baseSelector}:${pseudoSelector}`
            : `.${baseSelector}`;
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
