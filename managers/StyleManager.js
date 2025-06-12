import { cleanValue, buildMediaQuery } from "../utils/helpers.js";
import { parseGutterValue } from "../utils/parsed.js";

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
    }

    // === INITIALISATION ===
    initPropertyHandlers() {
        this.propertyHandlers = {
            "icon-size": (value, declarations) =>
                this.handleIconSize(value, declarations),
            icon: (value, declarations, selector, parsed) =>
                this.handleIcon(selector, parsed, declarations),
            font: (value, declarations) => this.handleFont(value, declarations),
            transform: (value, declarations) =>
                declarations.add(`transform: ${cleanValue(value)}`),
            gutter: (value, declarations, selector, parsed) =>
                this.handleGutter(parsed, selector, declarations),
            "gutter-x": (value, declarations, selector, parsed) =>
                this.handleGutter(parsed, selector, declarations),
            "gutter-y": (value, declarations, selector, parsed) =>
                this.handleGutter(parsed, selector, declarations),
            col: (value, declarations, selector, parsed) =>
                this.handleColumn(parsed, selector, declarations),
            content: (value, declarations) =>
                declarations.add(
                    `content: "${cleanValue(value.replace(/_/g, " "))}"`
                ),
            "bg-linear": (value, declarations) =>
                declarations.add(
                    `background: linear-gradient(${cleanValue(value)})`
                ),
            "bg-radial": (value, declarations) =>
                declarations.add(
                    `background: radial-gradient(${cleanValue(value)})`
                ),
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
    }

    initLazyObserver() {
        if (!this.lazyload || this.lazyObserver) return;

        this.lazyObserver = new IntersectionObserver(
            this.handleIntersection.bind(this),
            { rootMargin: "2000px", threshold: [0, 0.1] }
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

    processElements(elementsToProcess) {
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
    }

    handleHashChange() {
        if (!this.lazyload || !window.location.hash) return;

        const targetElement = document.getElementById(
            window.location.hash.substring(1)
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
                200
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

        // Cache du viewport pendant 16ms (1 frame)
        if (now - this.viewportCache.timestamp < 16) {
            return this.viewportCache;
        }

        this.viewportCache = {
            height: window.innerHeight,
            scrollTop: window.pageYOffset || document.documentElement.scrollTop,
            timestamp: now,
            get bottomPosition() {
                return this.scrollTop + this.height;
            },
        };

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

        const processAndUpdate = () => {
            this.marssel.domManager.processAllElements();
            if (this.lazyload) {
                this.processInitialViewportElements();
            }
            this.updateStyles();
        };

        if (this.lazyload) {
            this.initLazyObserver();
        }

        requestAnimationFrame(processAndUpdate);
    }

    processInitialViewportElements() {
        if (!this.lazyload) return;

        const viewport = this.getViewportInfo();
        const elementsToProcess = [];

        this.lazyElements.forEach((classes, element) => {
            const rect = element.getBoundingClientRect();
            const isVisible =
                rect.top < viewport.height + 1000 && rect.bottom > -1000;

            if (isVisible) {
                elementsToProcess.push({ element, classes });
            }
        });

        if (elementsToProcess.length > 0) {
            this.processElements(elementsToProcess);
            elementsToProcess.forEach(({ element }) => {
                this.lazyElements.delete(element);
                this.lazyObserver.unobserve(element);
            });
        }
    }

    buildSelector(parsed) {
        const baseSelector = parsed.component
            ? `.${parsed.component}`
            : `.${parsed.finalClassName.replace(/\+/g, "\\+")}`;

        if (!parsed.pseudoModifiers) return baseSelector;

        const modifiers = parsed.pseudoModifiers.split(
            /(?<!\[|\(|:)_(?!\]|\)|:)/
        );
        const pseudoSelectors = modifiers.map((mod) => {
            const converted = this.convertPseudoClass(mod);
            return this.formatPseudoSelector(converted);
        });

        return baseSelector + pseudoSelectors.join("");
    }

    convertPseudoClass(mod) {
        return mod.replace(/([a-z]+)-([a-z]+)/g, (match, p1, p2) => {
            const fullName = `${p1}-${p2}`;
            return this.compoundPseudos.has(fullName) ? fullName : match;
        });
    }

    formatPseudoSelector(converted) {
        return converted.includes("[")
            ? `:${converted
                  .replace(/\[/g, "(")
                  .replace(/\]/g, ")")
                  .replace(/_/g, " ")}`
            : `:${converted}`;
    }

    addFontFace(cssText) {
        this.fontFaces.add(cssText);
    }

    updateStyles() {
        const styleElement = document.getElementById("marssel-styles");
        if (!styleElement) return;

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
                    `${selector} { ${Array.from(declarations).join("; ")} }`
                );
            }
        });
        return rules;
    }

    generateMediaQueryRules() {
        const rules = [];
        this.selectorDeclarations.forEach((mediaQuerySelectors, mediaQuery) => {
            if (mediaQuery.startsWith("@media")) {
                const mediaQueryRules = [];
                mediaQuerySelectors.forEach((declarations, selector) => {
                    mediaQueryRules.push(
                        `${selector} { ${Array.from(declarations).join("; ")} }`
                    );
                });
                rules.push(`${mediaQuery} { ${mediaQueryRules.join(" ")} }`);
            }
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
                boxSizingDeclarations
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
                declarations
            );
        }

        const rule = "";
        this.compiledRules.set(cacheKey, rule);
        return rule;
    }

    generateDeclarations(parsed, selector) {
        const { property, value } = parsed;
        const declarations = new Set();

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
            parsed.finalClassName
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
            "margin"
        );

        const childSelector = `${selector} > [class*="col-"]`;
        const childDeclarations = new Set(["box-sizing: border-box"]);
        this.addGutterDeclarations(
            childDeclarations,
            direction,
            gutterValue,
            "padding"
        );

        this.addDeclarationsWithMediaQuery(
            parsed.breakpoints,
            childSelector,
            childDeclarations
        );
    }

    addGutterDeclarations(declarations, direction, gutterValue, type) {
        const prefix = type === "margin" ? "-" : "";
        const directions = {
            x: ["left", "right"],
            y: ["top", "bottom"],
            all: ["top", "right", "bottom", "left"],
        };

        (directions[direction] || []).forEach((dir) => {
            declarations.add(`${type}-${dir}: ${prefix}${gutterValue}`);
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
                }
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
            childDeclarations
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

            if (parsed.breakpoints.length > 0) {
                declarations.add(`flex: 0 0 ${percentage}`);
                declarations.add(`max-width: ${percentage}`);
            } else {
                declarations.add("flex: 0 0 100%");
                declarations.add("max-width: 100%");
                declarations.add("width: 100%");
            }
        }
    }

    handleGenericProperty(parsed, declarations) {
        const { property, value } = parsed;

        if (value.startsWith("theme-")) {
            const cssValue = `var(--${value})`;
            const cssProperty =
                this.marssel.constructor.properties[property] ||
                property.replace(/_/g, "-");

            if (Array.isArray(cssProperty)) {
                cssProperty.forEach((prop) =>
                    declarations.add(`${prop}: ${cssValue}`)
                );
            } else {
                declarations.add(`${cssProperty}: ${cssValue}`);
            }
            return;
        }

        if (!this.marssel.constructor.properties[property]) {
            const formattedProperty = property.replace(/_/g, "-");
            declarations.add(`${formattedProperty}: ${cleanValue(value)}`);
        } else {
            let cssValue = cleanValue(value);
            const cssProperty = this.marssel.constructor.properties[property];

            if (this.isColorProperty(property)) {
                cssValue = this.marssel.domManager.processColor(cssValue);
            }

            if (Array.isArray(cssProperty)) {
                cssProperty.forEach((prop) =>
                    declarations.add(`${prop}: ${cssValue}`)
                );
            } else {
                declarations.add(`${cssProperty}: ${cssValue}`);
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
