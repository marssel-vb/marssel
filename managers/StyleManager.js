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
        this.lazyload = Boolean(config.lazyload);
        this.maxBatchSize = config.maxBatchSize || 200;
        this.processingDelay = config.processingDelay || 50;
        this.lazyObserver = null;
        this.lazyElements = new Map();
        this.pendingLazyElements = new Set();
        this.processingBatch = false;
        this.eventListenersAdded = false;
        this.debounceStyleUpdate = this.createDebouncer(16);
        this.handleRapidScroll = this.createScrollHandler();
        this.viewportCache = { height: 0, scrollTop: 0, timestamp: 0 };
        this.initPropertyHandlers();
        this.initPseudoClassMap();
        this.dirtySelectors = new Set();
        this.needsFullRebuild = false;
        this.STORAGE_KEY = "marssel_styles_cache";
        this.STORAGE_VERSION = MARSSEL_VERSION;
        this.criticalsSelectors = marssel.constructor.CRITICAL_SELECTORS || [];
        this.loadedClasses = new Set();
    }

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

        if (now - this.viewportCache.timestamp < 100) {
            return this.viewportCache;
        }

        this.viewportCache = {
            height: window.innerHeight,
            scrollTop: window.pageYOffset || document.documentElement.scrollTop,
            timestamp: now,
        };

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

        elementsToProcess.forEach(({ element }) => {
            this.lazyElements.delete(element);
            this.lazyObserver.unobserve(element);
            this.pendingLazyElements.delete(element);
        });

        this.debounceStyleUpdate();

        if (this.pendingLazyElements.size > 0) {
            setTimeout(() => this.processBatch(), this.processingDelay);
        } else {
            this.processingBatch = false;
        }
    }

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
            this.processCriticalElements();
            this.updateStyles();

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
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

        if ("requestIdleCallback" in window) {
            requestIdleCallback(processAndUpdate);
        } else {
            setTimeout(processAndUpdate, 0);
        }
    }

    updateStylesSync() {
        const styleElement = document.getElementById("marssel-styles");
        if (!styleElement) return;

        const cssChunks = [
            ...this.fontFaces,
            ...this.generateRegularRules(),
            ...this.generateMediaQueryRules(),
        ];

        styleElement.textContent = cssChunks.join("\n");
    }

    processCriticalElements() {
        const criticalElements = this.getCriticalElements();

        criticalElements.forEach((element) => {
            if (!(element instanceof HTMLElement)) return;

            this.marssel.domManager.processElement(element);

            const allChildren = element.querySelectorAll("*");
            allChildren.forEach((child) => {
                if (child instanceof HTMLElement) {
                    this.marssel.domManager.processElement(child);
                }
            });

            if (this.lazyElements.has(element)) {
                this.lazyElements.delete(element);
                if (this.lazyObserver) {
                    this.lazyObserver.unobserve(element);
                }
            }
        });

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
        this.updateStylesSync();
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

        const viewport = this.getViewportInfo();
        const elementsToProcess = [];
        const criticalElements = this.getCriticalElements();

        this.lazyElements.forEach((classes, element) => {
            const rect = element.getBoundingClientRect();
            const isVisible =
                rect.top < viewport.height + 1000 && rect.bottom > -1000;
            const isCritical = criticalElements.includes(element);

            if (isVisible || isCritical) {
                elementsToProcess.push({ element, classes, isCritical });
            }
        });

        if (elementsToProcess.length > 0) {
            const criticalToProcess = elementsToProcess.filter(
                (item) => item.isCritical,
            );
            const regularToProcess = elementsToProcess.filter(
                (item) => !item.isCritical,
            );

            if (criticalToProcess.length > 0) {
                this.processElements(criticalToProcess);
                criticalToProcess.forEach(({ element }) => {
                    this.lazyElements.delete(element);
                    this.lazyObserver.unobserve(element);
                });
            }

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
                //
            }
        });

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
        const functionalMatch = mod.match(/^([a-z-]+)\[(.+)\]$/);

        if (functionalMatch) {
            const [, pseudoName, params] = functionalMatch;

            if (this.functionalPseudos.has(pseudoName)) {
                const cleanParams = params.replace(/_/g, " ");
                return `${pseudoName}(${cleanParams})`;
            }
        }

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

            if (version !== this.STORAGE_VERSION) {
                sessionStorage.removeItem(this.STORAGE_KEY);
                return;
            }

            const currentHash = this.getHTMLHash();
            if (htmlHash && htmlHash !== currentHash) {
                sessionStorage.removeItem(this.STORAGE_KEY);
                return;
            }

            if (loadedClasses && Array.isArray(loadedClasses)) {
                loadedClasses.forEach((className) => {
                    this.loadedClasses.add(className);
                    this.marssel.domManager.processedClasses.add(className);
                });
            }

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

            this.updateStyles();
        } catch (error) {
            console.warn("Error loading cache styles:", error);
            sessionStorage.removeItem(this.STORAGE_KEY);
        }
    }

    /**
     * Cleans up conflicting declarations (same property, different value)
     * @param {Set|undefined} existingDeclarations - Existing declarations
     * @param {Set} newDeclarations - New declarations from the cache
     * @returns {Set} - Cleaned up declarations
     */
    cleanConflictingDeclarations(existingDeclarations, newDeclarations) {
        if (!existingDeclarations) {
            return newDeclarations;
        }

        const newProperties = new Set();
        newDeclarations.forEach((decl) => {
            const property = decl.split(":")[0].trim();
            newProperties.add(property);
        });

        const filteredExisting = new Set();
        existingDeclarations.forEach((decl) => {
            const property = decl.split(":")[0].trim();

            if (!newProperties.has(property)) {
                filteredExisting.add(decl);
            }
        });

        return new Set([...filteredExisting, ...newDeclarations]);
    }

    /**
     * Generates a simple hash of a string
     * Used to detect HTML changes
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < Math.min(str.length, 10000); i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    /**
     * Generates a hash of the HTML of elements with Marssel classes
     */
    getHTMLHash() {
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
                console.warn("❌ Item not found: Marssel Styles");
                return;
            }

            const selectorMap = {};
            this.selectorDeclarations.forEach((value, key) => {
                if (value instanceof Map) {
                    const mediaSelectors = {};
                    value.forEach((decls, selector) => {
                        mediaSelectors[selector] = Array.from(decls);
                    });
                    selectorMap[key] = mediaSelectors;
                } else {
                    selectorMap[key] = Array.from(value);
                }
            });

            const css = styleElement.textContent || "";
            const maxClasses = 1000;
            const loadedClassesArray = Array.from(this.loadedClasses);

            const cache = {
                version: this.STORAGE_VERSION,
                htmlHash: this.getHTMLHash(),
                css: css,
                selectorMap: selectorMap,
                loadedClasses: loadedClassesArray.slice(-maxClasses),
                timestamp: Date.now(),
            };

            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
        } catch (error) {
            console.warn("❌ Error saving cache:", error);
        }
    }

    updateStyles() {
        if (this.updateScheduled) return;

        this.updateScheduled = true;
        requestAnimationFrame(() => {
            this.updateScheduled = false;

            const styleElement = document.getElementById("marssel-styles");
            if (!styleElement) return;

            const cssChunks = [
                ...this.fontFaces,
                ...this.generateRegularRules(),
                ...this.generateMediaQueryRules(),
            ];

            styleElement.textContent = cssChunks.join("\n");

            this.saveCachedStyles();
        });
    }

    updateFullStyles(styleElement) {
        const css = [
            ...this.fontFaces,
            ...this.generateRegularRules(),
            ...this.generateMediaQueryRules(),
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
        const breakpointOrder = {
            xs: 0,
            sm: 1,
            md: 2,
            lg: 3,
            xl: 4,
            xxl: 5,
        };

        const parseMediaQuery = (mediaQueryKey) => {
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

        this.selectorDeclarations.forEach((value, key) => {
            if (key.startsWith("@media")) {
                mediaQueries.push(key);
            }
        });

        mediaQueries.sort((a, b) => {
            const parsedA = parseMediaQuery(a);
            const parsedB = parseMediaQuery(b);

            if (parsedA.type === "min" && parsedB.type === "min") {
                return parsedA.value - parsedB.value;
            }

            if (parsedA.type === "max" && parsedB.type === "max") {
                return parsedB.value - parsedA.value;
            }

            if (parsedA.type === "min" && parsedB.type === "max") {
                return -1;
            }
            if (parsedA.type === "max" && parsedB.type === "min") {
                return 1;
            }

            return 0;
        });

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

        const boxSizingDeclarations = new Set(["box-sizing: border-box"]);
        ["*", "*::before", "*::after"].forEach((selector) => {
            this.addDeclarationsWithMediaQuery(
                [],
                selector,
                boxSizingDeclarations,
            );
        });

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
