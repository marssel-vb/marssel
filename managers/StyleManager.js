import {
    cleanValue,
    addHashToHex,
    buildMediaQuery,
    processGradientColors,
} from "../utils/helpers.js";
import {
    parseGutterValue,
    parseRGBValue,
    parseRGBAValue,
} from "../utils/parsed.js";
import { MARSSEL_VERSION } from "../utils/version.js";

export class StyleManager {
    constructor(marssel, config = {}) {
        this.marssel = marssel;
        this.fontFaces = new Set();
        this.selectorDeclarations = new Map();
        this.compiledRules = new Map();
        this.themeVariables = new Map();

        // Configuration optimisée
        this.lazyload = Boolean(config.lazyload);
        this.maxBatchSize = config.maxBatchSize || 200;
        this.processingDelay = config.processingDelay || 50;

        // État du lazy loading
        this.lazyObserver = null;
        this.lazyElements = new Map();
        this.pendingLazyElements = new Set();
        this.processingBatch = false;

        // Flags pour les event listeners
        this.eventListenersAdded = false;

        // Cache et optimisations
        this.debounceStyleUpdate = this.createDebouncer(16);
        this.handleRapidScroll = this.createScrollHandler();
        this.viewportCache = { height: 0, scrollTop: 0, timestamp: 0 };

        // Tables de correspondance pour les propriétés
        this.initPropertyHandlers();
        this.initPseudoClassMap();

        this.dirtySelectors = new Set(); // Nouveaux sélecteurs
        this.needsFullRebuild = false;

        // Clé de stockage pour le cache CSS
        this.STORAGE_KEY = "marssel_styles_cache";
        this.STORAGE_VERSION = MARSSEL_VERSION; // ✅ Synchronisé avec package.json

        // Sélecteurs critiques
        this.criticalsSelectors = marssel.constructor.CRITICAL_SELECTORS || [];

        this.loadedClasses = new Set(); // Track les classes chargées
    }

    // === INITIALISATION ===
    initPropertyHandlers() {
        this.propertyHandlers = {
            "icon-size": (value, declarations, selector, parsed) => {
                const size = this.marssel.iconManager.sizes[value] || value;
                this.addDeclarationWithImportance(
                    declarations,
                    `--icon-size: ${size}`,
                    parsed.isImportant,
                );
            },

            icon: (value, declarations, selector, parsed) => {
                const iconDeclarations =
                    this.marssel.iconManager.createIconStyles(
                        selector,
                        parsed.finalClassName,
                    );
                if (iconDeclarations?.size > 0) {
                    iconDeclarations.forEach((decl) => {
                        this.addDeclarationWithImportance(
                            declarations,
                            decl,
                            parsed.isImportant,
                        );
                    });
                }
            },

            font: (value, declarations, selector, parsed) => {
                const match = value.match(/^(.*?)(?:\((\d*)(?:_(.*?))?\))?$/);
                if (!match) return;

                const fontFamily = match[1].replace(/_/g, " ");
                const fontWeight =
                    match[2] && match[2] !== "" ? match[2] : "400";
                const fontStyle = match[3] === "italic" ? "italic" : "normal";

                this.marssel.fontManager.handleFont(fontFamily, fontWeight);

                this.addDeclarationWithImportance(
                    declarations,
                    `font-family: '${fontFamily}', sans-serif`,
                    parsed.isImportant,
                );
                this.addDeclarationWithImportance(
                    declarations,
                    `font-weight: ${fontWeight}`,
                    parsed.isImportant,
                );
                this.addDeclarationWithImportance(
                    declarations,
                    `font-style: ${fontStyle}`,
                    parsed.isImportant,
                );
            },

            transform: (value, declarations, selector, parsed) => {
                this.addDeclarationWithImportance(
                    declarations,
                    `transform: ${cleanValue(value)}`,
                    parsed.isImportant,
                );
            },

            gutter: (value, declarations, selector, parsed) =>
                this.handleGutter(parsed, selector, declarations),
            "gutter-x": (value, declarations, selector, parsed) =>
                this.handleGutter(parsed, selector, declarations),
            "gutter-y": (value, declarations, selector, parsed) =>
                this.handleGutter(parsed, selector, declarations),

            col: (value, declarations, selector, parsed) =>
                this.handleColumn(parsed, selector, declarations),

            content: (value, declarations, selector, parsed) => {
                this.addDeclarationWithImportance(
                    declarations,
                    `content: "${cleanValue(value.replace(/_/g, " "))}"`,
                    parsed.isImportant,
                );
            },

            "bg-linear": (value, declarations, selector, parsed) => {
                // MODIFICATION : Ajouter .replace(/_/g, " ")
                const processedValue = processGradientColors(
                    value.replace(/_/g, " "),
                );
                this.addDeclarationWithImportance(
                    declarations,
                    `background: linear-gradient(${processedValue})`,
                    parsed.isImportant,
                );
            },

            "bg-radial": (value, declarations, selector, parsed) => {
                // MODIFICATION : Ajouter .replace(/_/g, " ")
                const processedValue = processGradientColors(
                    value.replace(/_/g, " "),
                );
                this.addDeclarationWithImportance(
                    declarations,
                    `background: radial-gradient(${processedValue})`,
                    parsed.isImportant,
                );
            },

            "c-rgb": (value, declarations, selector, parsed) => {
                const rgbValue = parseRGBValue(value);
                this.addDeclarationWithImportance(
                    declarations,
                    `color: rgb(${rgbValue})`,
                    parsed.isImportant,
                );
            },

            "c-rgba": (value, declarations, selector, parsed) => {
                const rgbaValue = parseRGBAValue(value);
                this.addDeclarationWithImportance(
                    declarations,
                    `color: rgba(${rgbaValue})`,
                    parsed.isImportant,
                );
            },

            "bg-rgb": (value, declarations, selector, parsed) => {
                const rgbValue = parseRGBValue(value);
                this.addDeclarationWithImportance(
                    declarations,
                    `background-color: rgb(${rgbValue})`,
                    parsed.isImportant,
                );
            },

            "bg-rgba": (value, declarations, selector, parsed) => {
                const rgbaValue = parseRGBAValue(value);
                this.addDeclarationWithImportance(
                    declarations,
                    `background-color: rgba(${rgbaValue})`,
                    parsed.isImportant,
                );
            },

            scale: (value, declarations, selector, parsed) => {
                this.addDeclarationWithImportance(
                    declarations,
                    `transform: scale(${cleanValue(value)})`,
                    parsed.isImportant,
                );
            },

            rotate: (value, declarations, selector, parsed) => {
                const rotateValue = cleanValue(value);
                const unit = rotateValue.includes("deg") ? "" : "deg";
                this.addDeclarationWithImportance(
                    declarations,
                    `transform: rotate(${rotateValue}${unit})`,
                    parsed.isImportant,
                );
            },

            translate: (value, declarations, selector, parsed) => {
                this.addDeclarationWithImportance(
                    declarations,
                    `transform: translate(${cleanValue(value)})`,
                    parsed.isImportant,
                );
            },

            progress: (value, declarations, selector, parsed) => {
                this.addDeclarationWithImportance(
                    declarations,
                    `--progress-value: ${cleanValue(value)}`,
                    parsed.isImportant,
                );
            },

            "progress-value": (value, declarations, selector, parsed) => {
                this.addDeclarationWithImportance(
                    declarations,
                    `--progress-value: ${cleanValue(value)}`,
                    parsed.isImportant,
                );
            },

            "progress-color": (value, declarations, selector, parsed) => {
                const colorValue = this.marssel.domManager.processColor(value);
                this.addDeclarationWithImportance(
                    declarations,
                    `--progress-color: ${colorValue}`,
                    parsed.isImportant,
                );
            },

            "progress-bg": (value, declarations, selector, parsed) => {
                const colorValue = this.marssel.domManager.processColor(value);
                this.addDeclarationWithImportance(
                    declarations,
                    `--progress-background-color: ${colorValue}`,
                    parsed.isImportant,
                );
            },

            "progress-height": (value, declarations, selector, parsed) => {
                this.addDeclarationWithImportance(
                    declarations,
                    `--progress-height: ${cleanValue(value)}`,
                    parsed.isImportant,
                );
            },

            "progress-radius": (value, declarations, selector, parsed) => {
                this.addDeclarationWithImportance(
                    declarations,
                    `--progress-border-radius: ${cleanValue(value)}`,
                    parsed.isImportant,
                );
            },
            // AJOUTÉ : Handlers pour les animations
            animation: (value, declarations, selector, parsed) => {
                this.marssel.animationManager.handleAnimationProperty(
                    value,
                    declarations,
                    parsed,
                );
            },

            "animation-name": (value, declarations, selector, parsed) => {
                this.marssel.animationManager.handleAnimationProperty(
                    value,
                    declarations,
                    parsed,
                );
            },

            "animation-duration": (value, declarations, selector, parsed) => {
                this.marssel.animationManager.handleAnimationDuration(
                    value,
                    declarations,
                    parsed,
                );
            },

            "animation-timing": (value, declarations, selector, parsed) => {
                this.marssel.animationManager.handleAnimationTiming(
                    value,
                    declarations,
                    parsed,
                );
            },

            "animation-delay": (value, declarations, selector, parsed) => {
                this.marssel.animationManager.handleAnimationDelay(
                    value,
                    declarations,
                    parsed,
                );
            },

            "animation-iteration": (value, declarations, selector, parsed) => {
                this.marssel.animationManager.handleAnimationIteration(
                    value,
                    declarations,
                    parsed,
                );
            },

            "animation-direction": (value, declarations, selector, parsed) => {
                this.marssel.animationManager.handleAnimationDirection(
                    value,
                    declarations,
                    parsed,
                );
            },

            "animation-fill": (value, declarations, selector, parsed) => {
                this.marssel.animationManager.handleAnimationFillMode(
                    value,
                    declarations,
                    parsed,
                );
            },
        };
    }

    initPseudoClassMap() {
        this.compoundPseudos = new Set([
            "any-link",
            "focus-visible",
            "focus-within",
            "local-link",
            "target-within",
            "user-invalid",
            "first-child",
            "last-child",
            "only-child",
            "first-of-type",
            "last-of-type",
            "only-of-type",
            "nth-child",
            "nth-last-child",
            "nth-of-type",
            "nth-last-of-type",
            "placeholder-shown",
            "read-only",
            "read-write",
        ]);

        // ✅ AJOUT : Pseudo-classes avec paramètres
        this.functionalPseudos = new Set([
            "nth-child",
            "nth-last-child",
            "nth-of-type",
            "nth-last-of-type",
            "not",
            "is",
            "where",
            "has",
        ]);
    }

    addDeclarationWithImportance(declarations, declaration, isImportant) {
        if (isImportant && !declaration.includes("!important")) {
            declarations.add(declaration + " !important");
        } else {
            declarations.add(declaration);
        }
    }

    initLazyObserver() {
        if (!this.lazyload || this.lazyObserver) return;

        this.lazyObserver = new IntersectionObserver(
            this.handleIntersection.bind(this),
            { rootMargin: "2000px", threshold: [0, 0.1] },
        );

        this.addEventListeners();
    }

    addEventListeners() {
        if (this.eventListenersAdded) return;

        window.addEventListener("scroll", this.handleRapidScroll, {
            passive: true,
        });
        window.addEventListener("hashchange", this.handleHashChange.bind(this));
        this.eventListenersAdded = true;

        // Vérifier immédiatement s'il y a une ancre
        if (window.location.hash) {
            setTimeout(() => this.handleHashChange(), 100);
        }
    }

    removeEventListeners() {
        if (!this.eventListenersAdded) return;

        window.removeEventListener("scroll", this.handleRapidScroll);
        window.removeEventListener("hashchange", this.handleHashChange);
        this.eventListenersAdded = false;
    }

    // === GESTIONNAIRES D'ÉVÉNEMENTS ===
    /*applyThemeVariables(theme) {
        const themeConfig = this.marssel.themeManager.getThemeVariables(theme);

        Object.entries(themeConfig).forEach(([varName, value]) => {
            this.themeVariables.set(varName, value);
        });

        this.updateRootVariables();
        this.debounceStyleUpdate();
    }

    updateRootVariables() {
        const rootDeclarations = new Set();

        this.themeVariables.forEach((value, varName) => {
            rootDeclarations.add(`${varName}: ${value}`);
        });

        this.addDeclarationsWithMediaQuery([], ":root", rootDeclarations);
    }*/

    handleIntersection(entries) {
        const elementsToProcess = entries.reduce((acc, entry) => {
            if (entry.isIntersecting || entry.intersectionRatio > 0) {
                const element = entry.target;
                const classes = this.lazyElements.get(element);

                if (classes) {
                    acc.push({ element, classes });
                    this.lazyElements.delete(element);
                    this.lazyObserver.unobserve(element);
                }
            }
            return acc;
        }, []);

        if (elementsToProcess.length > 0) {
            this.processElements(elementsToProcess);
            this.debounceStyleUpdate();
        }
    }

    /*processElements(elementsToProcess) {
        const classProcessors = {
            hasGroupPseudo: (className) =>
                className.startsWith("[") && className.includes("]-"),
            hasCompactStyles: (className) => className.includes("---["),
            hasCombined: (className) => className.includes("+"),
            hasChildSelector: (className) => className.includes(">"),
        };

        elementsToProcess.forEach(({ classes }) => {
            classes.forEach((className) => {
                if (classProcessors.hasGroupPseudo(className)) {
                    this.marssel.domManager.processGroupPseudoClass(className);
                } else if (classProcessors.hasCompactStyles(className)) {
                    this.marssel.domManager.processCompactStyles(className);
                } else if (classProcessors.hasCombined(className)) {
                    this.marssel.domManager.processCombinedClass(className);
                } else if (classProcessors.hasChildSelector(className)) {
                    this.marssel.domManager.processChildSelectorClass(
                        className
                    );
                } else {
                    this.marssel.domManager.processClassName(className);
                }
            });
        });
    }*/

    processElements(elementsToProcess) {
        elementsToProcess.forEach(({ classes }) => {
            classes.forEach((className) => {
                this.marssel.domManager.processClassOptimized(className);
            });
        });
    }

    handleHashChange() {
        if (!this.lazyload || !window.location.hash) return;

        const targetElement = document.getElementById(
            window.location.hash.substring(1),
        );
        if (targetElement) {
            this.processElementsAroundTarget(targetElement);
        }
    }

    createScrollHandler() {
        let lastScrollTop = 0;
        let scrollTimeout;
        const SCROLL_THRESHOLD = 1000;

        return () => {
            if (!this.lazyload) return;

            clearTimeout(scrollTimeout);

            const currentScrollTop =
                window.pageYOffset || document.documentElement.scrollTop;
            const scrollDelta = Math.abs(currentScrollTop - lastScrollTop);

            if (scrollDelta > SCROLL_THRESHOLD) {
                this.processVisibleElements();
            }

            lastScrollTop = currentScrollTop;
            scrollTimeout = setTimeout(
                () => this.processVisibleElements(),
                200,
            );
        };
    }

    // === TRAITEMENT DES ÉLÉMENTS VISIBLES ===
    processVisibleElements() {
        if (!this.lazyload) return;

        const viewport = this.getViewportInfo();
        const extraMargin = 1000;

        this.lazyElements.forEach((classes, element) => {
            if (this.isElementInViewport(element, viewport, extraMargin)) {
                this.pendingLazyElements.add(element);
            }
        });

        this.startBatchProcessing();
    }

    processElementsAroundTarget(targetElement) {
        if (!targetElement || !this.lazyload) return;

        const viewport = this.getViewportInfo();
        const targetRect = targetElement.getBoundingClientRect();
        const targetTop = targetRect.top + viewport.scrollTop;
        const contextStart = targetTop - viewport.height * 2;
        const contextEnd = targetTop + viewport.height * 3;

        this.lazyElements.forEach((classes, element) => {
            const elementTop =
                element.getBoundingClientRect().top + viewport.scrollTop;
            if (elementTop >= contextStart && elementTop <= contextEnd) {
                this.pendingLazyElements.add(element);
            }
        });

        this.startBatchProcessing();
    }

    getViewportInfo() {
        const now = performance.now();

        // Cache pendant 100ms au lieu de 16ms pour réduire les recalculs
        if (now - this.viewportCache.timestamp < 100) {
            return this.viewportCache;
        }

        this.viewportCache = {
            height: window.innerHeight,
            scrollTop: window.pageYOffset || document.documentElement.scrollTop,
            timestamp: now,
        };

        // Calculer bottomPosition une seule fois
        this.viewportCache.bottomPosition =
            this.viewportCache.scrollTop + this.viewportCache.height;

        return this.viewportCache;
    }

    isElementInViewport(element, viewport, extraMargin) {
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top + viewport.scrollTop;
        const elementBottom = elementTop + rect.height;

        return (
            elementBottom >= viewport.scrollTop - extraMargin &&
            elementTop <= viewport.bottomPosition + extraMargin
        );
    }

    startBatchProcessing() {
        if (!this.processingBatch && this.pendingLazyElements.size > 0) {
            this.processBatch();
        }
    }

    // === TRAITEMENT PAR LOTS ===
    processBatch() {
        if (!this.pendingLazyElements.size) {
            this.processingBatch = false;
            return;
        }

        this.processingBatch = true;
        const elementsToProcess = Array.from(this.pendingLazyElements)
            .slice(0, this.maxBatchSize)
            .map((element) => ({
                element,
                classes: this.lazyElements.get(element),
            }))
            .filter((item) => item.classes);

        this.processElements(elementsToProcess);

        // Nettoyer les éléments traités
        elementsToProcess.forEach(({ element }) => {
            this.lazyElements.delete(element);
            this.lazyObserver.unobserve(element);
            this.pendingLazyElements.delete(element);
        });

        this.debounceStyleUpdate();

        // Planifier le prochain lot
        if (this.pendingLazyElements.size > 0) {
            setTimeout(() => this.processBatch(), this.processingDelay);
        } else {
            this.processingBatch = false;
        }
    }

    // === GESTION DES STYLES ===
    ensureStyleElement() {
        if (!document.getElementById("marssel-styles")) {
            const style = document.createElement("style");
            style.id = "marssel-styles";
            document.head.appendChild(style);
        }
    }

    initializeStyleSheet() {
        this.ensureStyleElement();

        this.loadCachedStyles();

        const processAndUpdate = () => {
            // Traiter d'abord les éléments critiques
            this.processCriticalElements();

            // Force la mise à jour immédiate des styles critiques
            this.updateStyles();

            // Attendre que les styles soient appliqués avant d'afficher
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // Afficher le body maintenant
                    document.body.classList.add("marssel-ready");

                    // Puis traiter tous les autres éléments en arrière-plan
                    this.marssel.domManager.processAllElements();

                    if (this.lazyload) {
                        this.processInitialViewportElements();
                    }

                    this.debounceStyleUpdate();
                });
            });
        };

        if (this.lazyload) {
            this.initLazyObserver();
        }

        // Démarrer le traitement
        if ("requestIdleCallback" in window) {
            requestIdleCallback(processAndUpdate);
        } else {
            setTimeout(processAndUpdate, 0);
        }
    }

    // Nouvelle méthode pour traiter les éléments critiques
    processCriticalElements() {
        const criticalElements = this.getCriticalElements();

        // MODIFICATION : Traiter TOUS les éléments critiques immédiatement
        criticalElements.forEach((element) => {
            if (!(element instanceof HTMLElement)) return;

            // Traiter l'élément
            this.marssel.domManager.processElement(element);

            // AJOUT : Traiter TOUS les enfants des éléments critiques
            const allChildren = element.querySelectorAll("*");
            allChildren.forEach((child) => {
                if (child instanceof HTMLElement) {
                    this.marssel.domManager.processElement(child);
                }
            });

            // Retirer du lazy loading
            if (this.lazyElements.has(element)) {
                this.lazyElements.delete(element);
                if (this.lazyObserver) {
                    this.lazyObserver.unobserve(element);
                }
            }
        });

        // Traiter les classes de base APRÈS
        const allBaseClasses = new Set();
        document.querySelectorAll("*").forEach((element) => {
            element.classList.forEach((className) => {
                if (className.includes("---")) {
                    const baseClass = this.extractBaseClass(className);
                    if (baseClass) {
                        allBaseClasses.add(baseClass);
                    }
                }
            });
        });

        allBaseClasses.forEach((baseClass) => {
            this.marssel.domManager.pendingClasses.add(baseClass);
        });
        this.marssel.domManager.processPendingClasses();

        // Force la mise à jour immédiate
        this.updateStyles();
    }

    extractBaseClass(className) {
        const tripleIndex = className.indexOf("---");
        if (tripleIndex === -1) return null;

        const componentPart = className.slice(0, tripleIndex);
        const doubleIndex = componentPart.indexOf("--");

        if (doubleIndex === -1) return componentPart;

        const lastDoubleIndex = componentPart.lastIndexOf("--");
        return componentPart.slice(lastDoubleIndex + 2);
    }

    processInitialViewportElements() {
        if (!this.lazyload) return;

        const allBaseClasses = new Set();
        document.querySelectorAll("*").forEach((element) => {
            element.classList.forEach((className) => {
                if (className.includes("---")) {
                    const baseClass = this.extractBaseClass(className);
                    if (baseClass) {
                        allBaseClasses.add(baseClass);
                    }
                }
            });
        });

        allBaseClasses.forEach((baseClass) => {
            this.marssel.domManager.pendingClasses.add(baseClass);
        });
        this.marssel.domManager.processPendingClasses();
        this.updateStyles();

        // Reste du code existant...
        const viewport = this.getViewportInfo();
        const elementsToProcess = [];

        // Traiter en priorité les éléments critiques (header, footer, nav)
        const criticalElements = this.getCriticalElements();

        this.lazyElements.forEach((classes, element) => {
            const rect = element.getBoundingClientRect();
            const isVisible =
                rect.top < viewport.height + 1000 && rect.bottom > -1000;
            const isCritical = criticalElements.includes(element);

            // Traiter immédiatement les éléments critiques visibles
            if (isVisible || isCritical) {
                elementsToProcess.push({ element, classes, isCritical });
            }
        });

        if (elementsToProcess.length > 0) {
            // Séparer les éléments critiques des autres
            const criticalToProcess = elementsToProcess.filter(
                (item) => item.isCritical,
            );
            const regularToProcess = elementsToProcess.filter(
                (item) => !item.isCritical,
            );

            // Traiter d'abord les éléments critiques
            if (criticalToProcess.length > 0) {
                this.processElements(criticalToProcess);
                criticalToProcess.forEach(({ element }) => {
                    this.lazyElements.delete(element);
                    this.lazyObserver.unobserve(element);
                });
            }

            // Puis traiter les éléments réguliers
            if (regularToProcess.length > 0) {
                this.processElements(regularToProcess);
                regularToProcess.forEach(({ element }) => {
                    this.lazyElements.delete(element);
                    this.lazyObserver.unobserve(element);
                });
            }
        }
    }

    getCriticalElements() {
        const criticalElements = [];

        this.criticalsSelectors.forEach((selector) => {
            try {
                const elements = document.querySelectorAll(selector);
                criticalElements.push(...elements);
            } catch (e) {
                // Ignorer les erreurs de sélecteur
            }
        });

        // AJOUT : Inclure tous les éléments avec .no-lazy
        const noLazyElements = document.querySelectorAll(".no-lazy");
        noLazyElements.forEach((el) => {
            if (!criticalElements.includes(el)) {
                criticalElements.push(el);
            }
        });

        return criticalElements;
    }

    buildSelector(parsed) {
        const baseSelector = parsed.component
            ? `.${parsed.component}`
            : `.${parsed.finalClassName
                  .replace(/\+/g, "\\+")
                  .replace(/:/g, "\\:")}`;

        if (!parsed.pseudoModifiers) return baseSelector;

        const modifiers = parsed.pseudoModifiers.split(":");
        const pseudoSelectors = modifiers.map((mod) => {
            if (!mod) return "";
            const converted = this.convertPseudoClass(mod);
            return `:${converted}`;
        });

        return baseSelector + pseudoSelectors.join("");
    }

    convertPseudoClass(mod) {
        // ✅ AJOUT : Gérer les pseudo-classes fonctionnelles avec paramètres
        // Format attendu: nth-child[2n+1] ou not[.disabled]
        const functionalMatch = mod.match(/^([a-z-]+)\[(.+)\]$/);

        if (functionalMatch) {
            const [, pseudoName, params] = functionalMatch;

            if (this.functionalPseudos.has(pseudoName)) {
                // Remplacer les underscores par des espaces dans les paramètres
                const cleanParams = params.replace(/_/g, " ");
                return `${pseudoName}(${cleanParams})`;
            }
        }

        // Code existant pour les autres pseudo-classes
        return mod.replace(/([a-z]+)-([a-z]+)/g, (match, p1, p2) => {
            const fullName = `${p1}-${p2}`;
            return this.compoundPseudos.has(fullName) ? fullName : match;
        });
    }

    addFontFace(cssText) {
        this.fontFaces.add(cssText);
    }

    loadCachedStyles() {
        try {
            const cached = sessionStorage.getItem(this.STORAGE_KEY);
            if (!cached) return;

            const { version, htmlHash, css, selectorMap, loadedClasses } =
                JSON.parse(cached);

            // Vérifier la version
            if (version !== this.STORAGE_VERSION) {
                sessionStorage.removeItem(this.STORAGE_KEY);
                return;
            }

            // ✅ NOUVEAU : Vérifier si le HTML a changé
            const currentHash = this.getHTMLHash();
            if (htmlHash && htmlHash !== currentHash) {
                console.log("🔄 HTML modifié, cache invalidé");
                sessionStorage.removeItem(this.STORAGE_KEY);
                return;
            }

            // Restaurer les classes chargées
            if (loadedClasses && Array.isArray(loadedClasses)) {
                loadedClasses.forEach((className) => {
                    this.loadedClasses.add(className);
                    this.marssel.domManager.processedClasses.add(className);
                });
            }

            // Restaurer la map des sélecteurs avec nettoyage
            if (selectorMap) {
                Object.entries(selectorMap).forEach(([key, value]) => {
                    if (key.startsWith("@media")) {
                        if (!this.selectorDeclarations.has(key)) {
                            this.selectorDeclarations.set(key, new Map());
                        }
                        const mediaMap = this.selectorDeclarations.get(key);

                        Object.entries(value).forEach(
                            ([selector, declarations]) => {
                                const cleanedDeclarations =
                                    this.cleanConflictingDeclarations(
                                        mediaMap.get(selector),
                                        new Set(declarations),
                                    );
                                mediaMap.set(selector, cleanedDeclarations);
                            },
                        );
                    } else {
                        const existingDeclarations =
                            this.selectorDeclarations.get(key);
                        const newDeclarations = new Set(value);
                        const cleanedDeclarations =
                            this.cleanConflictingDeclarations(
                                existingDeclarations,
                                newDeclarations,
                            );
                        this.selectorDeclarations.set(key, cleanedDeclarations);
                    }
                });
            }

            const classCount = loadedClasses ? loadedClasses.length : 0;
            console.log(
                `✅ Cache chargé: ${classCount} classes, regénération du CSS propre...`,
            );

            // Regénérer le CSS propre
            this.updateStyles();
        } catch (error) {
            console.warn("Erreur chargement cache styles:", error);
            sessionStorage.removeItem(this.STORAGE_KEY);
        }
    }

    /**
     * Nettoie les déclarations en conflit (même propriété, valeur différente)
     * @param {Set|undefined} existingDeclarations - Déclarations existantes
     * @param {Set} newDeclarations - Nouvelles déclarations du cache
     * @returns {Set} - Déclarations nettoyées
     */
    cleanConflictingDeclarations(existingDeclarations, newDeclarations) {
        // Si pas de déclarations existantes, retourner les nouvelles
        if (!existingDeclarations) {
            return newDeclarations;
        }

        // Extraire les propriétés des nouvelles déclarations
        const newProperties = new Set();
        newDeclarations.forEach((decl) => {
            const property = decl.split(":")[0].trim();
            newProperties.add(property);
        });

        // Filtrer les anciennes déclarations qui ont la même propriété
        const filteredExisting = new Set();
        existingDeclarations.forEach((decl) => {
            const property = decl.split(":")[0].trim();
            // Garder seulement si la propriété n'est pas dans les nouvelles
            if (!newProperties.has(property)) {
                filteredExisting.add(decl);
            }
        });

        // Fusionner : anciennes (filtrées) + nouvelles
        return new Set([...filteredExisting, ...newDeclarations]);
    }

    /**
     * Génère un hash simple d'une chaîne
     * Utilisé pour détecter les changements de HTML
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < Math.min(str.length, 10000); i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }

    /**
     * Génère un hash du HTML des éléments avec classes Marssel
     */
    getHTMLHash() {
        // Ne hasher que les éléments avec des classes (pour la performance)
        const elements = document.querySelectorAll("[class]");
        const classesString = Array.from(elements)
            .map((el) => el.className)
            .join("|");
        return this.simpleHash(classesString);
    }

    saveCachedStyles() {
        try {
            const styleElement = document.getElementById("marssel-styles");
            if (!styleElement) {
                console.warn("❌ Élément marssel-styles introuvable");
                return;
            }

            // Convertir la Map en objet sérialisable
            const selectorMap = {};
            this.selectorDeclarations.forEach((value, key) => {
                if (value instanceof Map) {
                    // Media query
                    const mediaSelectors = {};
                    value.forEach((decls, selector) => {
                        mediaSelectors[selector] = Array.from(decls);
                    });
                    selectorMap[key] = mediaSelectors;
                } else {
                    // Sélecteur normal
                    selectorMap[key] = Array.from(value);
                }
            });

            const css = styleElement.textContent || "";
            const maxClasses = 1000;
            const loadedClassesArray = Array.from(this.loadedClasses);

            // ✅ NOUVEAU : Sauvegarder aussi les classes chargées
            const cache = {
                version: this.STORAGE_VERSION,
                htmlHash: this.getHTMLHash(), // Hash des classes du DOM
                css: css,
                selectorMap: selectorMap,
                loadedClasses: loadedClassesArray.slice(-maxClasses),
                timestamp: Date.now(),
            };

            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));

            console.log(
                `💾 Cache sauvegardé: ${css.length} chars CSS, ${this.loadedClasses.size} classes`,
            );
        } catch (error) {
            console.warn("❌ Erreur sauvegarde cache:", error);
        }
    }

    updateStyles() {
        if (this.updateScheduled) return;

        this.updateScheduled = true;
        requestAnimationFrame(() => {
            this.updateScheduled = false;

            const styleElement = document.getElementById("marssel-styles");
            if (!styleElement) return;

            // Utiliser textContent une seule fois au lieu de multiples appendChild
            const cssChunks = [
                ...this.fontFaces,
                ...this.generateRegularRules(),
                ...this.generateMediaQueryRules(),
            ];

            styleElement.textContent = cssChunks.join("\n");

            // ✅ CORRECTION : Sauvegarder APRÈS que le CSS soit généré
            this.saveCachedStyles();
        });
    }

    updateFullStyles(styleElement) {
        const css = [
            ...this.fontFaces, // 1. Font faces
            ...this.generateRegularRules(), // 2. Règles de base (sans media query)
            ...this.generateMediaQueryRules(), // 3. Media queries (triées)
        ];
        styleElement.textContent = css.join("\n");
    }

    generateRegularRules() {
        const rules = [];
        this.selectorDeclarations.forEach((declarations, selector) => {
            if (!selector.startsWith("@media")) {
                rules.push(
                    `${selector} { ${Array.from(declarations).join("; ")} }`,
                );
            }
        });
        return rules;
    }

    generateMediaQueryRules() {
        // Définir l'ordre des breakpoints
        const breakpointOrder = {
            xs: 0,
            sm: 1,
            md: 2,
            lg: 3,
            xl: 4,
            xxl: 5,
        };

        // Fonction pour extraire le type et la taille du breakpoint d'une media query
        const parseMediaQuery = (mediaQueryKey) => {
            // Exemples: "@media (min-width: 768px)" ou "@media (max-width: 991px)"
            const minWidthMatch = mediaQueryKey.match(/min-width:\s*(\d+)px/);
            const maxWidthMatch = mediaQueryKey.match(/max-width:\s*(\d+)px/);

            if (minWidthMatch) {
                return { type: "min", value: parseInt(minWidthMatch[1]) };
            }
            if (maxWidthMatch) {
                return { type: "max", value: parseInt(maxWidthMatch[1]) };
            }
            return { type: "none", value: 0 };
        };

        const rules = [];
        const mediaQueries = [];

        // Séparer les media queries des règles normales
        this.selectorDeclarations.forEach((value, key) => {
            if (key.startsWith("@media")) {
                mediaQueries.push(key);
            }
        });

        // Trier les media queries
        mediaQueries.sort((a, b) => {
            const parsedA = parseMediaQuery(a);
            const parsedB = parseMediaQuery(b);

            // min-width : du plus petit au plus grand
            if (parsedA.type === "min" && parsedB.type === "min") {
                return parsedA.value - parsedB.value;
            }

            // max-width : du plus grand au plus petit
            if (parsedA.type === "max" && parsedB.type === "max") {
                return parsedB.value - parsedA.value;
            }

            // min-width avant max-width
            if (parsedA.type === "min" && parsedB.type === "max") {
                return -1;
            }
            if (parsedA.type === "max" && parsedB.type === "min") {
                return 1;
            }

            return 0;
        });

        // Générer les règles CSS dans l'ordre trié
        mediaQueries.forEach((mediaQuery) => {
            const mediaQuerySelectors =
                this.selectorDeclarations.get(mediaQuery);
            const mediaQueryRules = [];

            mediaQuerySelectors.forEach((declarations, selector) => {
                mediaQueryRules.push(
                    `${selector} { ${Array.from(declarations).join("; ")} }`,
                );
            });

            rules.push(`${mediaQuery} { ${mediaQueryRules.join(" ")} }`);
        });

        return rules;
    }

    addDefaultStyles() {
        if (!this.marssel.iconManager.isLoaded) {
            console.warn("Icons not loaded yet, skipping default styles.");
            return;
        }

        // Box-sizing pour tous les éléments
        const boxSizingDeclarations = new Set(["box-sizing: border-box"]);
        ["*", "*::before", "*::after"].forEach((selector) => {
            this.addDeclarationsWithMediaQuery(
                [],
                selector,
                boxSizingDeclarations,
            );
        });

        // Variable CSS pour la taille des icônes
        const rootDeclarations = new Set([
            `--icon-size: ${this.marssel.iconManager.sizes.medium}`,
        ]);
        this.addDeclarationsWithMediaQuery([], ":root", rootDeclarations);
        this.updateStyles();
    }

    createDebouncer(delay) {
        let timeout;
        return () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => this.updateStyles(), delay);
        };
    }

    addStyleRule(parsed) {
        const rule = this.generateRule(parsed);
        if (rule) {
            this.styleSheet.add(rule);
            this.debounceStyleUpdate();
        }
    }

    generateRule(parsed) {
        const cacheKey = JSON.stringify(parsed);
        if (this.compiledRules.has(cacheKey)) {
            return this.compiledRules.get(cacheKey);
        }

        const selector = this.buildSelector(parsed);
        const declarations = this.generateDeclarations(parsed, selector);

        if (declarations.size > 0) {
            this.addDeclarationsWithMediaQuery(
                parsed.breakpoints,
                selector,
                declarations,
            );
        }

        const rule = "";
        this.compiledRules.set(cacheKey, rule);
        return rule;
    }

    generateDeclarations(parsed, selector) {
        const { property, value } = parsed;

        // Réutiliser un Set au lieu d'en créer un nouveau
        const declarations = this.marssel.domManager.getDeclarationSet();

        const handler = this.propertyHandlers[property];
        if (handler) {
            handler(value, declarations, selector, parsed);
        } else {
            this.handleGenericProperty(parsed, declarations);
        }

        return declarations;
    }

    handleIconSize(value, declarations) {
        const size = this.marssel.iconManager.sizes[value] || value;
        declarations.add(`--icon-size: ${size}`);
    }

    handleIcon(selector, parsed, declarations) {
        const iconDeclarations = this.marssel.iconManager.createIconStyles(
            selector,
            parsed.finalClassName,
        );
        if (iconDeclarations?.size > 0) {
            iconDeclarations.forEach((decl) => declarations.add(decl));
        }
    }

    handleFont(value, declarations) {
        const match = value.match(/^(.*?)(?:\[(\d*)(?:_(.*?))?\])?$/);
        if (!match) return;

        const fontFamily = match[1].replace(/_/g, " ");
        const fontWeight = match[2] && match[2] !== "" ? match[2] : "400";
        const fontStyle = match[3] === "italic" ? "italic" : "normal";

        this.marssel.fontManager.handleFont(fontFamily, fontWeight);

        declarations.add(`font-family: '${fontFamily}', sans-serif`);
        declarations.add(`font-weight: ${fontWeight}`);
        declarations.add(`font-style: ${fontStyle}`);
    }

    handleGutter(parsed, selector, declarations) {
        const { property, value } = parsed;
        const direction = property.split("-")[1] || "all";
        const gutterValue = parseGutterValue(value);

        if (!gutterValue) return;

        this.addGutterDeclarations(
            declarations,
            direction,
            gutterValue,
            "margin",
            parsed.isImportant,
        );

        const childSelector = `${selector} > [class*="col-"]`;
        const childDeclarations = new Set(["box-sizing: border-box"]);
        this.addGutterDeclarations(
            childDeclarations,
            direction,
            gutterValue,
            "padding",
            parsed.isImportant,
        );

        this.addDeclarationsWithMediaQuery(
            parsed.breakpoints,
            childSelector,
            childDeclarations,
        );
    }

    addGutterDeclarations(
        declarations,
        direction,
        gutterValue,
        type,
        isImportant = false,
    ) {
        const prefix = type === "margin" ? "-" : "";
        const directions = {
            x: ["left", "right"],
            y: ["top", "bottom"],
            all: ["top", "right", "bottom", "left"],
        };

        (directions[direction] || []).forEach((dir) => {
            let declaration = `${type}-${dir}: ${prefix}${gutterValue}`;
            if (isImportant && !declaration.includes("!important")) {
                declaration += " !important";
            }
            declarations.add(declaration);
        });
    }

    handleColumn(parsed, selector, declarations) {
        const { value } = parsed;
        const columnHandlers = {
            container: () =>
                this.handleContainerColumn(parsed, selector, declarations),
            row: () => this.handleRowColumn(parsed, selector, declarations),
        };

        const handler = columnHandlers[value];
        if (handler) {
            handler();
        } else {
            this.handleRegularColumn(parsed, value, declarations);
        }
    }

    handleContainerColumn(parsed, selector, declarations) {
        declarations.add("width: 100%");
        declarations.add("margin: 0 auto");
        declarations.add("padding: 0 12px");

        if (parsed.breakpoints.length === 0) {
            Object.entries(this.marssel.constructor.containerMaxWidths).forEach(
                ([bp, width]) => {
                    const mediaQuery = `(min-width: ${this.marssel.constructor.breakpoints[bp]})`;
                    const mediaQueryKey = `@media ${mediaQuery}`;

                    this.ensureMediaQuery(mediaQueryKey, selector);
                    this.selectorDeclarations
                        .get(mediaQueryKey)
                        .get(selector)
                        .add(`max-width: ${width}`);
                },
            );
        }
    }

    handleRowColumn(parsed, selector, declarations) {
        declarations.add("display: flex");
        declarations.add("flex-wrap: wrap");
        declarations.add("margin-right: -12px");
        declarations.add("margin-left: -12px");

        const childDeclarations = new Set([
            "padding-right: 12px",
            "padding-left: 12px",
        ]);
        this.addDeclarationsWithMediaQuery(
            parsed.breakpoints,
            `${selector} > *`,
            childDeclarations,
        );
    }

    handleRegularColumn(parsed, value, declarations) {
        if (value === "auto") {
            declarations.add("flex: 0 0 auto");
            declarations.add("width: auto");
            declarations.add("max-width: 100%");
        } else {
            const numericValue = parseInt(cleanValue(value));
            const percentage = ((numericValue / 12) * 100).toFixed(4) + "%";
            declarations.add(`flex: 0 0 ${percentage}`);
            declarations.add(`max-width: ${percentage}`);
        }
    }

    handleGenericProperty(parsed, declarations) {
        const { property, value, isImportant } = parsed;

        // AJOUTÉ : Cas spéciaux RGB/RGBA
        if (
            property === "bg-rgb" ||
            property === "bg-rgba" ||
            property === "c-rgb" ||
            property === "c-rgba"
        ) {
            const cssProperty = property.startsWith("bg-")
                ? "background-color"
                : "color";
            const functionName = property.endsWith("-rgb") ? "rgb" : "rgba";

            let declaration = `${cssProperty}: ${functionName}(${cleanValue(
                value,
            )})`;

            if (isImportant && !declaration.includes("!important")) {
                declaration += " !important";
            }

            declarations.add(declaration);
            return;
        }

        if (value.startsWith("theme-")) {
            const cssValue = `var(--${value})`;
            const cssProperty =
                this.marssel.constructor.properties[property] ||
                property.replace(/_/g, "-");

            if (Array.isArray(cssProperty)) {
                cssProperty.forEach((prop) => {
                    let declaration = `${prop}: ${cssValue}`;
                    if (isImportant && !declaration.includes("!important")) {
                        declaration += " !important";
                    }
                    declarations.add(declaration);
                });
            } else {
                let declaration = `${cssProperty}: ${cssValue}`;
                if (isImportant && !declaration.includes("!important")) {
                    declaration += " !important";
                }
                declarations.add(declaration);
            }
            return;
        }

        if (!this.marssel.constructor.properties[property]) {
            const formattedProperty = property.replace(/_/g, "-");
            // ✅ FIX: Ajouter addHashToHex pour traiter les couleurs hex dans toutes les valeurs
            const processedValue = addHashToHex(cleanValue(value));
            let declaration = `${formattedProperty}: ${processedValue}`;
            if (isImportant && !declaration.includes("!important")) {
                declaration += " !important";
            }
            declarations.add(declaration);
        } else {
            let cssValue = cleanValue(value);
            const cssProperty = this.marssel.constructor.properties[property];

            if (this.isColorProperty(property)) {
                cssValue = this.marssel.domManager.processColor(cssValue);
            } else {
                // ✅ FIX: Traiter les hex même pour les propriétés non-couleur (border, outline, etc.)
                cssValue = addHashToHex(cssValue);
            }

            if (Array.isArray(cssProperty)) {
                cssProperty.forEach((prop) => {
                    let declaration = `${prop}: ${cssValue}`;
                    if (isImportant && !declaration.includes("!important")) {
                        declaration += " !important";
                    }
                    declarations.add(declaration);
                });
            } else {
                let declaration = `${cssProperty}: ${cssValue}`;
                if (isImportant && !declaration.includes("!important")) {
                    declaration += " !important";
                }
                declarations.add(declaration);
            }
        }
    }

    isColorProperty(property) {
        return (
            ["bg", "c"].includes(property) ||
            property.startsWith("bg-") ||
            property.startsWith("c-")
        );
    }

    ensureMediaQuery(mediaQueryKey, selector) {
        if (!this.selectorDeclarations.has(mediaQueryKey)) {
            this.selectorDeclarations.set(mediaQueryKey, new Map());
        }

        const mediaSelectors = this.selectorDeclarations.get(mediaQueryKey);
        if (!mediaSelectors.has(selector)) {
            mediaSelectors.set(selector, new Set());
        }
    }

    addDeclarationsWithMediaQuery(breakpoints, selector, declarations) {
        if (breakpoints?.length > 0) {
            const mediaQuery = buildMediaQuery(breakpoints);
            if (mediaQuery) {
                const mediaQueryKey = `@media ${mediaQuery}`;
                this.ensureMediaQuery(mediaQueryKey, selector);

                declarations.forEach((decl) => {
                    this.selectorDeclarations
                        .get(mediaQueryKey)
                        .get(selector)
                        .add(decl);
                });
                return;
            }
        }

        if (!this.selectorDeclarations.has(selector)) {
            this.selectorDeclarations.set(selector, new Set());
        }

        declarations.forEach((decl) => {
            this.selectorDeclarations.get(selector).add(decl);
        });
    }

    setLazyload(enabled) {
        if (enabled === this.lazyload) return;

        if (enabled) {
            this.lazyload = true;
            this.initLazyObserver();
            this.reprocessAllElements();
        } else {
            this.lazyload = false;
            this.processAllPendingElements();
            this.cleanup();
        }
    }

    reprocessAllElements() {
        document.querySelectorAll("*").forEach((element) => {
            this.marssel.domManager.processElement(element);
        });
    }

    processAllPendingElements() {
        this.lazyElements.forEach((classes, element) => {
            this.processElements([{ element, classes }]);
        });

        this.pendingLazyElements.clear();
        this.lazyElements.clear();
        this.updateStyles();
    }

    cleanup() {
        if (this.lazyObserver) {
            this.lazyObserver.disconnect();
            this.lazyObserver = null;
        }

        this.removeEventListeners();
        this.processingBatch = false;
    }
}
