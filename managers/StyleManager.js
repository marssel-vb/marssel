import { cleanValue, buildMediaQuery } from "../utils/helpers.js";
import { parseGutterValue } from "../utils/parsed.js";

export class StyleManager {
    constructor(marssel, config = {}) {
        console.log("Constructeur StyleManager avec config:", config);
        this.marssel = marssel;
        this.fontFaces = new Set();
        this.selectorDeclarations = new Map();
        this.compiledRules = new Map();

        // Utiliser config au lieu de options
        this.lazyload =
            config && typeof config.lazyload === "boolean"
                ? config.lazyload
                : false;

        console.log("StyleManager.lazyload configuré à:", this.lazyload);
        this.lazyObserver = null;
        this.lazyElements = new Map();

        // Ajout de nouvelles propriétés pour une meilleure gestion du lazyload
        this.processingBatch = false;
        this.maxBatchSize = config.maxBatchSize || 200; // Nombre maximal d'éléments à traiter par lot
        this.processingDelay = config.processingDelay || 50; // Délai entre les lots en ms
        this.pendingLazyElements = new Set(); // Éléments en attente de traitement
        this.scrollHandlerAdded = false;
        this.hashChangeHandlerAdded = false;
    }

    // Méthode pour initialiser l'IntersectionObserver pour le lazyloading
    initLazyObserver() {
        if (!this.lazyload) return;

        this.lazyObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        const classes = this.lazyElements.get(element);

                        if (classes) {
                            classes.forEach((className) => {
                                if (
                                    className.startsWith("[") &&
                                    className.includes("]-")
                                ) {
                                    this.marssel.domManager.processGroupPseudoClass(
                                        className
                                    );
                                } else if (className.includes("+")) {
                                    this.marssel.domManager.processCombinedClass(
                                        className
                                    );
                                } else if (className.includes("---[")) {
                                    this.marssel.domManager.processCompactStyles(
                                        className
                                    );
                                } else {
                                    this.marssel.domManager.processClassName(
                                        className
                                    );
                                }
                            });

                            // Génération réalisée, on peut supprimer et arrêter d'observer
                            this.lazyElements.delete(element);
                            this.lazyObserver.unobserve(element);
                        }

                        this.debounceStyleUpdate();
                    }
                });
            },
            {
                rootMargin: "800px", // Marge pour précharger les styles avant que l'élément soit visible
                threshold: 0.01, // Déclencher dès qu'une petite partie est visible
            }
        );

        // Ajout d'écouteurs d'événements pour gérer les sauts de scroll et ancres
        if (!this.scrollHandlerAdded) {
            window.addEventListener(
                "scroll",
                this.handleRapidScroll.bind(this),
                {
                    passive: true,
                }
            );
            this.scrollHandlerAdded = true;
        }

        if (!this.hashChangeHandlerAdded) {
            window.addEventListener(
                "hashchange",
                this.handleHashChange.bind(this)
            );
            // Vérifier dès le chargement si une ancre est présente dans l'URL
            if (window.location.hash) {
                setTimeout(() => this.handleHashChange(), 100);
            }
            this.hashChangeHandlerAdded = true;
        }
    }

    // Gestionnaire pour les changements d'ancre (hash) dans l'URL
    handleHashChange() {
        if (!this.lazyload || !window.location.hash) return;

        const targetId = window.location.hash.substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            // Traiter les éléments autour de la cible de l'ancre
            this.processElementsAroundTarget(targetElement);
        }
    }

    // Gestionnaire pour les défilements rapides
    handleRapidScroll = (() => {
        let lastScrollTop = 0;
        let scrollTimeout;
        const SCROLL_THRESHOLD = 1000; // Seuil pour détecter un scroll rapide (en pixels)

        return function () {
            if (!this.lazyload) return;

            clearTimeout(scrollTimeout);

            const currentScrollTop =
                window.pageYOffset || document.documentElement.scrollTop;
            const scrollDelta = Math.abs(currentScrollTop - lastScrollTop);

            // Si le défilement est rapide, traiter les éléments visibles
            if (scrollDelta > SCROLL_THRESHOLD) {
                this.processVisibleElements();
            }

            lastScrollTop = currentScrollTop;

            // Vérifie régulièrement si le défilement s'est arrêté
            scrollTimeout = setTimeout(() => {
                this.processVisibleElements();
            }, 200);
        };
    })();

    // Traite tous les éléments actuellement visibles dans la fenêtre
    processVisibleElements() {
        if (!this.lazyload) return;

        const viewportHeight = window.innerHeight;
        const currentScrollTop =
            window.pageYOffset || document.documentElement.scrollTop;
        const bottomPosition = currentScrollTop + viewportHeight;

        // Une marge supplémentaire pour précharger au-delà de la zone visible
        const extraMargin = 1000;

        this.lazyElements.forEach((classes, element) => {
            const rect = element.getBoundingClientRect();
            const elementTop = rect.top + currentScrollTop;
            const elementBottom = elementTop + rect.height;

            // Vérifier si l'élément est visible ou proche de la zone visible
            if (
                elementBottom >= currentScrollTop - extraMargin &&
                elementTop <= bottomPosition + extraMargin
            ) {
                this.pendingLazyElements.add(element);
            }
        });

        // Démarrer le traitement par lots si ce n'est pas déjà en cours
        if (!this.processingBatch && this.pendingLazyElements.size > 0) {
            this.processBatch();
        }
    }

    // Traite les éléments autour d'une cible (pour les ancres)
    processElementsAroundTarget(targetElement) {
        if (!targetElement || !this.lazyload) return;

        const viewportHeight = window.innerHeight;
        const currentScrollTop =
            window.pageYOffset || document.documentElement.scrollTop;
        const targetRect = targetElement.getBoundingClientRect();
        const targetTop = targetRect.top + currentScrollTop;

        // Zone de contexte élargie autour de la cible
        const contextStart = targetTop - viewportHeight * 2;
        const contextEnd = targetTop + viewportHeight * 3;

        this.lazyElements.forEach((classes, element) => {
            const rect = element.getBoundingClientRect();
            const elementTop = rect.top + currentScrollTop;

            if (elementTop >= contextStart && elementTop <= contextEnd) {
                this.pendingLazyElements.add(element);
            }
        });

        // Démarrer le traitement par lots
        if (!this.processingBatch && this.pendingLazyElements.size > 0) {
            this.processBatch();
        }
    }

    // Traite les éléments en attente par lots pour éviter de bloquer le thread principal
    processBatch() {
        if (!this.pendingLazyElements.size) {
            this.processingBatch = false;
            return;
        }

        this.processingBatch = true;
        const elementsToProcess = Array.from(this.pendingLazyElements).slice(
            0,
            this.maxBatchSize
        );

        // Traiter le lot actuel
        elementsToProcess.forEach((element) => {
            const classes = this.lazyElements.get(element);

            if (classes) {
                classes.forEach((className) => {
                    if (className.startsWith("[") && className.includes("]-")) {
                        this.marssel.domManager.processGroupPseudoClass(
                            className
                        );
                    } else if (className.includes("+")) {
                        this.marssel.domManager.processCombinedClass(className);
                    } else if (className.includes("---[")) {
                        this.marssel.domManager.processCompactStyles(className);
                    } else {
                        this.marssel.domManager.processClassName(className);
                    }
                });

                // Supprimer de la liste des éléments à observer
                this.lazyElements.delete(element);
                this.lazyObserver.unobserve(element);
            }

            this.pendingLazyElements.delete(element);
        });

        // Mettre à jour les styles après chaque lot
        this.debounceStyleUpdate();

        // Planifier le prochain lot
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

        if (this.lazyload) {
            this.initLazyObserver();
        }

        requestAnimationFrame(() => {
            this.marssel.domManager.processAllElements();
            this.updateStyles();
        });
    }

    // buildSelector(parsed) {
    //     let selector = parsed.component
    //         ? `.${parsed.component}`
    //         : `.${parsed.finalClassName}`;

    //     if (parsed.pseudoModifiers) {
    //         const modifiers = parsed.pseudoModifiers.split("-");
    //         let pseudoElement = null;
    //         const pseudoClasses = [];

    //         modifiers.forEach((mod) => {
    //             if (mod === "before" || mod === "after") {
    //                 pseudoElement = mod;
    //             } else {
    //                 pseudoClasses.push(mod);
    //             }
    //         });

    //         // Appliquer d'abord les pseudo-classes
    //         pseudoClasses.forEach((pc) => {
    //             selector += `:${pc}`;
    //         });

    //         // Puis le pseudo-élément
    //         if (pseudoElement) {
    //             selector += `::${pseudoElement}`;
    //         }
    //     }

    //     return selector;
    // }

    // buildSelector(parsed) {
    //     let selector = parsed.component
    //         ? `.${parsed.component}`
    //         : `.${parsed.finalClassName}`;

    //     if (parsed.pseudoModifiers) {
    //         // Scinder sur les underscores pour séparer les pseudo-classes
    //         const modifiers = parsed.pseudoModifiers.split("_");
    //         let pseudoElement = null;
    //         const pseudoClasses = [];

    //         modifiers.forEach((mod) => {
    //             if (mod === "before" || mod === "after") {
    //                 pseudoElement = mod;
    //             } else {
    //                 pseudoClasses.push(mod);
    //             }
    //         });

    //         // Appliquer les pseudo-classes
    //         pseudoClasses.forEach((pc) => {
    //             selector += `:${pc}`;
    //         });

    //         // Ajouter le pseudo-élément
    //         if (pseudoElement) {
    //             selector += `::${pseudoElement}`;
    //         }
    //     }

    //     return selector;
    // }

    // buildSelector(parsed) {
    //     let selector = parsed.component
    //         ? `.${parsed.component}`
    //         : `.${parsed.finalClassName}`;

    //     if (parsed.pseudoModifiers) {
    //         // Séparer les pseudo-classes et paramètres
    //         const modifiers = parsed.pseudoModifiers.split(/(?<!\[)_(?!\])/); // Ignorer les underscores dans les paramètres
    //         let pseudoElement = null;
    //         const pseudoParts = [];

    //         modifiers.forEach((mod) => {
    //             // Gérer les pseudo-éléments
    //             if (mod === "before" || mod === "after") {
    //                 pseudoElement = mod;
    //             }
    //             // Convertir la syntaxe Marssel [param] en (param)
    //             else if (mod.includes("[")) {
    //                 pseudoParts.push(
    //                     mod.replace(/\[/g, "(").replace(/\]/g, ")")
    //                 );
    //             } else {
    //                 pseudoParts.push(mod);
    //             }
    //         });

    //         // Construire la chaîne de pseudo-classes
    //         pseudoParts.forEach((pc) => {
    //             selector += `:${pc.replace(/-/g, ":")}`; // Convertir les tirets en :
    //         });

    //         // Ajouter le pseudo-élément
    //         if (pseudoElement) {
    //             selector += `::${pseudoElement}`;
    //         }
    //     }

    //     return selector;
    // }

    buildSelector(parsed) {
        let selector = parsed.component
            ? `.${parsed.component}`
            : `.${parsed.finalClassName.replace(/\+/g, "\\+")}`;

        if (parsed.pseudoModifiers) {
            // Nouveau split qui préserve les pseudo-classes composées
            const modifiers = parsed.pseudoModifiers.split(
                /(?<!\[|\(|:)_(?!\]|\)|:)/
            );

            modifiers.forEach((mod) => {
                // Conversion spéciale pour les pseudo-classes composées
                const converted = mod.replace(
                    /([a-z]+)-([a-z]+)/g,
                    (match, p1, p2) => {
                        const fullName = `${p1}-${p2}`;
                        // Liste des pseudo-classes composées officielles
                        const compoundPseudos = [
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
                        ];

                        return compoundPseudos.includes(fullName)
                            ? fullName
                            : match;
                    }
                );

                // Gestion des paramètres et conversion finale
                selector += converted.includes("[")
                    ? `:${converted
                          .replace(/\[/g, "(")
                          .replace(/\]/g, ")")
                          .replace(/_/g, " ")}`
                    : `:${converted.replace(/-/g, "-")}`;
            });
        }

        return selector;
    }

    wrapWithMediaQuery(selector, declaration, breakpoints) {
        if (!breakpoints?.length) return `${selector} { ${declaration} }`;

        const mediaQuery = buildMediaQuery(breakpoints);
        return `@media ${mediaQuery} { ${selector} { ${declaration} } }`;
    }

    // === Méthodes de base ===
    addFontFace(cssText) {
        this.fontFaces.add(cssText);
    }

    updateStyles() {
        const styleElement = document.getElementById("marssel-styles");
        if (!styleElement) return;

        let css = [];

        // Ajouter les @font-face en premier
        if (this.fontFaces.size > 0) {
            css.push(Array.from(this.fontFaces).join("\n"));
        }

        // Traiter d'abord les règles sans media queries
        this.selectorDeclarations.forEach((declarations, selector) => {
            if (!selector.startsWith("@media")) {
                css.push(
                    `${selector} { ${Array.from(declarations).join("; ")} }`
                );
            }
        });

        // Traiter ensuite les media queries
        this.selectorDeclarations.forEach((mediaQuerySelectors, mediaQuery) => {
            if (mediaQuery.startsWith("@media")) {
                let mediaQueryRules = [];
                mediaQuerySelectors.forEach((declarations, selector) => {
                    mediaQueryRules.push(
                        `${selector} { ${Array.from(declarations).join("; ")} }`
                    );
                });
                css.push(`${mediaQuery} { ${mediaQueryRules.join(" ")} }`);
            }
        });

        styleElement.textContent = css.join("\n");
    }

    addDefaultStyles() {
        if (!this.marssel.iconManager.isLoaded) {
            console.warn("Icons not loaded yet, skipping default styles.");
            return;
        }

        // Règles box-sizing pour tous les éléments
        const boxSizingDeclarations = new Set();
        boxSizingDeclarations.add("box-sizing: border-box");
        this.addDeclarationsWithMediaQuery([], "*", boxSizingDeclarations);
        this.addDeclarationsWithMediaQuery(
            [],
            "*::before",
            boxSizingDeclarations
        );
        this.addDeclarationsWithMediaQuery(
            [],
            "*::after",
            boxSizingDeclarations
        );

        // Variable :root pour la taille des icônes
        const rootDeclarations = new Set();
        const iconSize = this.marssel.iconManager.sizes.medium;
        rootDeclarations.add(`--icon-size: ${iconSize}`);
        this.addDeclarationsWithMediaQuery([], ":root", rootDeclarations);

        this.updateStyles();
    }

    addStyleRule(parsed) {
        const rule = this.generateRule(parsed);

        if (rule) {
            this.styleSheet.add(rule);

            // Déclencher la mise à jour des styles si nécessaire
            this.debounceStyleUpdate();
        }
    }

    // Optimisation du debouncing des mises à jour de style
    debounceStyleUpdate = (() => {
        let timeout;
        const DEBOUNCE_DELAY = 16; // ~1 frame à 60fps

        return () => {
            if (timeout) {
                clearTimeout(timeout);
            }

            timeout = setTimeout(() => {
                this.updateStyles();
                timeout = null;
            }, DEBOUNCE_DELAY);
        };
    })();

    generateRule(parsed) {
        const cacheKey = JSON.stringify(parsed);
        if (this.compiledRules.has(cacheKey)) {
            return this.compiledRules.get(cacheKey);
        }

        let rule = "";
        const { property, value } = parsed;
        const selector = this.buildSelector(parsed);
        let declarations = new Set();

        // Gestion des icônes
        if (property === "icon-size") {
            const size = this.marssel.iconManager.sizes[value] || value;
            declarations.add(`--icon-size: ${size}`);
        } else if (parsed.property === "icon") {
            declarations = this.marssel.iconManager.createIconStyles(
                selector,
                parsed.finalClassName
            );
        } else if (parsed.property === "font") {
            const match = value.match(/^(.*?)(?:\[(\d*)(?:_(.*?))?\])?$/);
            if (match) {
                const fontFamily = match[1].replace(/_/g, " ");
                const fontWeight =
                    match[2] && match[2] !== "" ? match[2] : "400";
                const fontStyle = match[3] === "italic" ? "italic" : "normal";

                this.marssel.fontManager.handleFont(fontFamily, fontWeight);

                declarations.add(`font-family: '${fontFamily}', sans-serif`);
                declarations.add(`font-weight: ${fontWeight}`);
                declarations.add(`font-style: ${fontStyle}`);
            }
        }

        // Gestion spéciale pour les propriétés transform
        else if (property === "transform") {
            declarations.add(`transform: ${cleanValue(value)}`);
        }

        // Handle gutters
        else if (["gutter", "gutter-x", "gutter-y"].includes(property)) {
            const direction = property.split("-")[1] || "all";
            const gutterValue = parseGutterValue(value);
            if (!gutterValue) return "";

            // Parent gutter declarations
            if (direction === "x" || direction === "all") {
                declarations.add(`margin-left: -${gutterValue}`);
                declarations.add(`margin-right: -${gutterValue}`);
            }
            if (direction === "y" || direction === "all") {
                declarations.add(`margin-top: -${gutterValue}`);
                declarations.add(`margin-bottom: -${gutterValue}`);
            }

            // Child selector declarations
            const childSelector = `${selector} > [class*="col-"]`;
            const childDeclarations = new Set();
            if (direction === "x" || direction === "all") {
                childDeclarations.add(`padding-left: ${gutterValue}`);
                childDeclarations.add(`padding-right: ${gutterValue}`);
            }
            if (direction === "y" || direction === "all") {
                childDeclarations.add(`padding-top: ${gutterValue}`);
                childDeclarations.add(`padding-bottom: ${gutterValue}`);
            }
            childDeclarations.add("box-sizing: border-box");

            // Handle media queries for both parent and child
            this.addDeclarationsWithMediaQuery(
                parsed.breakpoints,
                selector,
                declarations
            );
            this.addDeclarationsWithMediaQuery(
                parsed.breakpoints,
                childSelector,
                childDeclarations
            );
        }

        // Handle column system
        else if (property === "col") {
            switch (value) {
                case "container":
                    declarations.add("width: 100%");
                    declarations.add("margin: 0 auto");
                    declarations.add("padding: 0 12px");

                    if (parsed.breakpoints.length > 0) {
                        parsed.breakpoints.forEach((bp) => {
                            const maxWidth =
                                this.marssel.constructor.containerMaxWidths[bp];
                            if (maxWidth) {
                                declarations.add(`max-width: ${maxWidth}`);
                            }
                        });
                    } else {
                        // Add all container max-widths as separate media queries
                        Object.entries(
                            this.marssel.constructor.containerMaxWidths
                        ).forEach(([bp, width]) => {
                            const mediaQuery = `(min-width: ${this.marssel.constructor.breakpoints[bp]})`;
                            const mediaQueryKey = `@media ${mediaQuery}`;
                            const mediaSelector = selector;

                            if (!this.selectorDeclarations.has(mediaQueryKey)) {
                                this.selectorDeclarations.set(
                                    mediaQueryKey,
                                    new Map()
                                );
                            }

                            const mediaSelectors =
                                this.selectorDeclarations.get(mediaQueryKey);
                            if (!mediaSelectors.has(mediaSelector)) {
                                mediaSelectors.set(mediaSelector, new Set());
                            }

                            mediaSelectors
                                .get(mediaSelector)
                                .add(`max-width: ${width}`);
                        });
                    }
                    break;

                case "row":
                    declarations.add("display: flex");
                    declarations.add("flex-wrap: wrap");
                    declarations.add("margin-right: -12px");
                    declarations.add("margin-left: -12px");

                    // Child row elements
                    const childSelector = `${selector} > *`;
                    const childDeclarations = new Set();
                    childDeclarations.add("padding-right: 12px");
                    childDeclarations.add("padding-left: 12px");

                    this.addDeclarationsWithMediaQuery(
                        parsed.breakpoints,
                        selector,
                        declarations
                    );
                    this.addDeclarationsWithMediaQuery(
                        parsed.breakpoints,
                        childSelector,
                        childDeclarations
                    );
                    break;

                default:
                    if (value === "auto") {
                        declarations.add("flex: 0 0 auto");
                        declarations.add("width: auto");
                        declarations.add("max-width: 100%");
                    } else {
                        const numericValue = parseInt(cleanValue(value));
                        const percentage =
                            ((numericValue / 12) * 100).toFixed(4) + "%";

                        if (parsed.breakpoints.length > 0) {
                            // Responsive column
                            declarations.add(`flex: 0 0 ${percentage}`);
                            declarations.add(`max-width: ${percentage}`);
                        } else {
                            // Base column (full width)
                            declarations.add("flex: 0 0 100%");
                            declarations.add("max-width: 100%");
                            declarations.add("width: 100%");
                        }
                    }
                    break;
            }
        } else if (property === "content") {
            // Traitement spécial pour la propriété content
            declarations.add(
                `content: "${cleanValue(value.replace(/_/g, " "))}"`
            );
        } else if (property === "bg-linear") {
            // Traitement du dégradé linéaire
            const cleanedValue = cleanValue(value);
            declarations.add(`background: linear-gradient(${cleanedValue})`);
        } else if (property === "bg-radial") {
            // Traitement du dégradé radial
            const cleanedValue = cleanValue(value);
            declarations.add(`background: radial-gradient(${cleanedValue})`);
        }
        // 3. Gestion des autres propriétés
        else {
            // 3a. Propriétés personnalisées (non définies dans Marssel.properties)
            if (!this.marssel.constructor.properties[property]) {
                const formattedProperty = property.replace(/_/g, "-");
                let cssValue = cleanValue(value);
                declarations.add(`${formattedProperty}: ${cssValue}`);
            } else {
                let cssValue = cleanValue(value);
                let cssProperty = this.marssel.constructor.properties[property];

                if (
                    ["bg", "c"].includes(property) ||
                    property.startsWith("bg-") ||
                    property.startsWith("c-")
                ) {
                    cssValue = this.marssel.domManager.processColor(cssValue);
                }

                if (Array.isArray(cssProperty)) {
                    cssProperty.forEach((prop) => {
                        declarations.add(`${prop}: ${cssValue}`);
                    });
                } else {
                    declarations.add(`${cssProperty}: ${cssValue}`);
                }
            }
        }

        // Add declarations to selectorDeclarations
        if (declarations.size > 0) {
            this.addDeclarationsWithMediaQuery(
                parsed.breakpoints,
                selector,
                declarations
            );
        }

        this.compiledRules.set(cacheKey, rule);
        return rule;
    }

    // addDeclarationsWithMediaQuery(breakpoints, selector, declarations) {
    //     if (breakpoints.length > 0) {
    //         const mediaQuery = buildMediaQuery(breakpoints);
    //         const mediaQueryKey = `@media ${mediaQuery}`;

    //         if (!this.selectorDeclarations.has(mediaQueryKey)) {
    //             this.selectorDeclarations.set(mediaQueryKey, new Map());
    //         }

    //         const mediaSelectors = this.selectorDeclarations.get(mediaQueryKey);
    //         if (!mediaSelectors.has(selector)) {
    //             mediaSelectors.set(selector, new Set());
    //         }

    //         declarations.forEach((decl) => {
    //             if (!mediaSelectors.get(selector).has(decl)) {
    //                 mediaSelectors.get(selector).add(decl);
    //             }
    //         });
    //     } else {
    //         if (!this.selectorDeclarations.has(selector)) {
    //             this.selectorDeclarations.set(selector, new Set());
    //         }

    //         declarations.forEach((decl) => {
    //             this.selectorDeclarations.get(selector).add(decl);
    //         });
    //     }
    // }

    addDeclarationsWithMediaQuery(breakpoints, selector, declarations) {
        if (breakpoints && breakpoints.length > 0) {
            // Attempt to build a media query
            const mediaQuery = buildMediaQuery(breakpoints);

            // Only proceed if we got a valid media query back
            if (mediaQuery) {
                const mediaQueryKey = `@media ${mediaQuery}`;

                if (!this.selectorDeclarations.has(mediaQueryKey)) {
                    this.selectorDeclarations.set(mediaQueryKey, new Map());
                }

                const mediaSelectors =
                    this.selectorDeclarations.get(mediaQueryKey);
                if (!mediaSelectors.has(selector)) {
                    mediaSelectors.set(selector, new Set());
                }

                declarations.forEach((decl) => {
                    if (!mediaSelectors.get(selector).has(decl)) {
                        mediaSelectors.get(selector).add(decl);
                    }
                });
                return;
            }
        }

        // No valid breakpoints or invalid media query, add to main stylesheet
        if (!this.selectorDeclarations.has(selector)) {
            this.selectorDeclarations.set(selector, new Set());
        }

        declarations.forEach((decl) => {
            this.selectorDeclarations.get(selector).add(decl);
        });
    }

    // Dans StyleManager.js
    setLazyload(enabled) {
        // Si on active le lazyload
        if (enabled && !this.lazyload) {
            this.lazyload = true;
            this.initLazyObserver();

            // Réinitialiser le traitement des éléments
            document.querySelectorAll("*").forEach((element) => {
                this.marssel.domManager.processElement(element);
            });
        }
        // Si on désactive le lazyload
        else if (!enabled && this.lazyload) {
            this.lazyload = false;

            // Traiter tous les éléments en attente
            this.lazyElements.forEach((classes, element) => {
                classes.forEach((className) => {
                    if (className.startsWith("[") && className.includes("]-")) {
                        this.marssel.domManager.processGroupPseudoClass(
                            className
                        );
                    } else if (className.includes("+")) {
                        this.marssel.domManager.processCombinedClass(className);
                    } else if (className.includes("---[")) {
                        this.marssel.domManager.processCompactStyles(className);
                    } else {
                        this.marssel.domManager.processClassName(className);
                    }
                });
            });

            // Vider également les éléments en attente
            this.pendingLazyElements.clear();

            // Vider la liste et désactiver l'observer
            this.lazyElements.clear();
            if (this.lazyObserver) {
                this.lazyObserver.disconnect();
            }

            // Supprimer les écouteurs d'événements si nécessaire
            if (this.scrollHandlerAdded) {
                window.removeEventListener("scroll", this.handleRapidScroll);
                this.scrollHandlerAdded = false;
            }

            if (this.hashChangeHandlerAdded) {
                window.removeEventListener("hashchange", this.handleHashChange);
                this.hashChangeHandlerAdded = false;
            }

            this.updateStyles();
        }
    }
}
