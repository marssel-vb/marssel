import { parseClassName, parseClassPart } from "../utils/parsed.js";
import {
    cleanValue,
    addHashToHex,
    processGradientColors,
} from "../utils/helpers.js";
import { LRUCache } from "../utils/LRUCache.js";

// Pré-compilation des regex optimisées
const REGEXES = {
    STYLE_CLASS: /-\[|^\[.*\]-|---\[/,
    COMPACT_STYLE: /^(.*?)\](?:-|:)([\w-:()[\]]+)(!)?$/,
    PROP_VALUE: /^([a-z0-9-]+)-\[(.*)\](!)?$/,
    FONT: /(.*)\[(\d+)\]/,
    GROUP_PSEUDO: /^\[(.*)\]:([a-z-_:()[\]]+)(!)?$/,
    GROUPED_STYLES: /^\[(.*)\]:([a-z-]+(?::[a-z-]+)*)(!)?$/,
    CHILD_SELECTOR: /^(.+)>([a-zA-Z0-9-:]+)(!)?$/,
    CHILD_SELECTOR_WITH_BREAKPOINTS:
        /^(?:(.*?)--)?([a-z-]+)-\[(.*)\]>([a-zA-Z0-9-:]+)(!)?$/,

    // ✅ MODIFIÉ : Utilise (.*) pour capturer toute la valeur
    CHILD_STYLE_WITH_IMPORTANT:
        /([a-z0-9-]+)-\[(.*)\](!?)>([a-zA-Z0-9-:]+(?::[a-zA-Z0-9-:]+)*)(!?)/,

    // ✅ MODIFIÉ : Utilise (.*) (greedy) pour capturer tout le groupe [a+b] avant le >
    GROUP_CHILD_SELECTOR:
        /^\[(.*?)\]>([a-zA-Z0-9-:]+(?::[a-zA-Z0-9-:]+)*)(!)?$/,
    GROUP_CHILD_AFTER_BRACKET:
        /^\[(.*?)\]>([a-zA-Z0-9-:]+(?::[a-zA-Z0-9-:]+)*)(!)?$/,
    BREAKPOINT_ROOT_GROUP:
        /^(?:(?:m--)?([a-z0-9]+(?:--[a-z0-9]+)*)--)?\[(.+?)\](!)?(?:>([a-zA-Z0-9-:]+(?::[a-zA-Z0-9-:]+)*))?(!)?$/,
    ROOT_GROUP: /^\[(.*)\](!)?$/,
};

// Cache pour les sélecteurs générés
const selectorCache = new LRUCache(200);
const classCache = new LRUCache(300);

export class DomManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.props = marssel.constructor.properties;
        this.colorRegex = marssel.constructor.COLOR_REGEX;
        this.criticalsSelectors = marssel.constructor.CRITICAL_SELECTORS;

        // Pool de déclarations réutilisables
        this.declarationPool = [];
        this.poolIndex = 0;

        // Batch processing
        this.pendingClasses = new Set();
        this.processingScheduled = false;

        this.processedElements = new WeakSet();
        this.processedElementsCount = 0;

        // Cache des classes déjà traitées
        this.processedClasses = new Set();
    }

    autoAddBaseClasses(element) {
        if (this.processedElements.has(element)) return;

        const classList = element.classList;
        let classesModified = false;
        const classesToAdd = new Set();

        // Parcourir toutes les classes de l'élément
        for (const className of classList) {
            const baseClass = this.extractBaseClass(className);

            if (baseClass && baseClass !== className) {
                // Vérifier si la classe de base n'existe pas déjà
                if (!classList.contains(baseClass)) {
                    // Vérifier si la classe de base est appropriée pour cet élément
                    if (
                        this.isBaseClassAppropriateForElement(
                            baseClass,
                            element,
                        )
                    ) {
                        classesToAdd.add(baseClass);
                        classesModified = true;
                    }
                }
            }
        }

        // Ajouter les classes de base manquantes
        if (classesModified) {
            classesToAdd.forEach((baseClass) => {
                element.classList.add(baseClass);
                // AJOUT : Traiter immédiatement la classe de base ajoutée
                this.pendingClasses.add(baseClass);
            });
        }

        this.processedElements.add(element);

        if (++this.processedElementsCount % 1000 === 0) {
            this.processedElementsCount = 0;
        }
    }

    isBaseClassAppropriateForElement(baseClass, element) {
        const tagName = element.tagName.toLowerCase();

        // Liste des éléments qui ne devraient pas recevoir certaines classes de base
        const restrictedElements = ["html", "body", "head"];

        // Si c'est un élément restreint, on évite d'ajouter des classes de composants
        if (restrictedElements.includes(tagName)) {
            // Autoriser seulement les classes qui sont clairement des utilitaires génériques
            // et non des composants spécifiques
            const componentClasses = [
                "btn",
                "card",
                "nav",
                "header",
                "footer",
                "modal",
                "dropdown",
            ];

            // Vérifier si la classe de base ressemble à  un composant
            const isComponentClass = componentClasses.some(
                (comp) =>
                    baseClass.startsWith(comp) || baseClass.includes(comp),
            );

            // Vérifier aussi les patterns numériques (btn-1, card-2, etc.)
            const hasNumericSuffix = /^[a-z]+-\d+$/.test(baseClass);

            if (isComponentClass || hasNumericSuffix) {
                return false;
            }
        }

        return true;
    }

    extractBaseClass(className) {
        // Early returns pour les cas simples
        const tripleIndex = className.indexOf("---");
        if (tripleIndex === -1) return null;

        const componentPart = className.slice(0, tripleIndex);

        // indexOf est plus rapide que split pour un seul séparateur
        const doubleIndex = componentPart.indexOf("--");
        if (doubleIndex === -1) return componentPart;

        // àâ€°viter split + slice, utiliser lastIndexOf
        const lastDoubleIndex = componentPart.lastIndexOf("--");
        return componentPart.slice(lastDoubleIndex + 2);
    }

    setupObservers() {
        const observer = new MutationObserver((mutations) => {
            this.batchProcessMutations(mutations);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class"],
        });
    }

    batchProcessMutations(mutations) {
        let hasChanges = false;
        const elementsToProcess = new Set();

        for (const mutation of mutations) {
            if (
                mutation.type === "attributes" &&
                mutation.attributeName === "class"
            ) {
                // Retirer l'élément du cache pour retraitement
                this.processedElements.delete(mutation.target);
                elementsToProcess.add(mutation.target);
                hasChanges = true;
            } else if (mutation.type === "childList") {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        elementsToProcess.add(node);
                        hasChanges = true;
                    }
                });
            }
        }

        if (hasChanges) {
            // Traitement différé pour éviter les multiples appels
            if (!this.processingScheduled) {
                this.processingScheduled = true;
                requestAnimationFrame(() => {
                    elementsToProcess.forEach((element) =>
                        this.processElement(element),
                    );
                    this.processPendingClasses();
                    this.processingScheduled = false;
                });
            }
        }
    }

    processAllElements() {
        const elements = document.querySelectorAll("*");

        // Identifier et traiter d'abord les éléments critiques
        const criticalElements = this.getCriticalElements();
        const regularElements = [];

        // Priorité aux éléments visibles d'abord
        const viewportHeight = window.innerHeight;
        const visibleCriticalElements = [];
        const hiddenCriticalElements = [];
        const visibleElements = [];
        const hiddenElements = [];

        elements.forEach((element) => {
            const rect = element.getBoundingClientRect();
            const isVisible =
                rect.top < viewportHeight + 500 && rect.bottom > -500;
            const isCritical = criticalElements.includes(element);

            if (isCritical) {
                if (isVisible) {
                    visibleCriticalElements.push(element);
                } else {
                    hiddenCriticalElements.push(element);
                }
            } else {
                if (isVisible) {
                    visibleElements.push(element);
                } else {
                    hiddenElements.push(element);
                }
            }
        });

        // Traite d'abord les éléments critiques visibles
        if (visibleCriticalElements.length > 0) {
            this.processElementsBatch(visibleCriticalElements, 0, true); // true = critique
        }

        // Puis les éléments visibles normaux
        if (visibleElements.length > 0) {
            this.processElementsBatch(visibleElements, 0);
        }

        // Puis les éléments critiques cachés
        if (hiddenCriticalElements.length > 0) {
            setTimeout(() => {
                this.processElementsBatch(hiddenCriticalElements, 0, true);
            }, 25);
        }

        // Enfin les éléments cachés
        if (hiddenElements.length > 0) {
            setTimeout(() => {
                this.processElementsBatch(hiddenElements, 0);
            }, 50);
        }
    }

    // Nouvelle méthode pour identifier les éléments critiques
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

        return criticalElements;
    }

    debugBaseClassExtraction(className) {
        const baseClass = this.extractBaseClass(className);
        console.log(`Classe: "${className}" -> Classe de base: "${baseClass}"`);
        return baseClass;
    }

    processVisibleElementsFirst() {
        const viewportHeight = window.innerHeight;
        const elements = document.querySelectorAll("*");
        const criticalElements = this.getCriticalElements();

        const visibleCriticalElements = [];
        const visibleRegularElements = [];

        Array.from(elements).forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.top < viewportHeight + 1000) {
                if (criticalElements.includes(el)) {
                    visibleCriticalElements.push(el);
                } else {
                    visibleRegularElements.push(el);
                }
            }
        });

        // Traitement immédiat des éléments critiques visibles
        visibleCriticalElements.forEach((element) => {
            this.processElement(element);
        });

        // Traiter immédiatement leurs styles
        if (visibleCriticalElements.length > 0) {
            this.processPendingClasses();
            this.marssel.styleManager.updateStyles();
        }

        // Puis traiter les éléments réguliers visibles
        visibleRegularElements.forEach((element) => {
            this.processElement(element);
        });

        this.processPendingClasses();
        this.marssel.styleManager.debounceStyleUpdate();
    }

    processElementsBatch(elements, startIndex, isCritical = false) {
        const batchSize = isCritical ? 50 : 100;
        const endIndex = Math.min(startIndex + batchSize, elements.length);

        // Traiter le batch
        for (let i = startIndex; i < endIndex; i++) {
            this.processElement(elements[i]);
        }

        if (isCritical) {
            this.processPendingClasses();
            this.marssel.styleManager.updateStyles();
        }

        // Optimisation: Utiliser requestIdleCallback pour les non-critiques
        if (endIndex < elements.length) {
            const scheduleNext = () => {
                this.processElementsBatch(elements, endIndex, isCritical);
            };

            if (isCritical) {
                setTimeout(scheduleNext, 5);
            } else if ("requestIdleCallback" in window) {
                requestIdleCallback(scheduleNext, { timeout: 50 });
            } else {
                setTimeout(scheduleNext, 16);
            }
        } else if (!isCritical) {
            this.processPendingClasses();
        }
    }

    processElement(element) {
        if (!(element instanceof HTMLElement)) return;

        // AJOUT : Vérifier si l'élément est critique AVANT tout traitement
        const isCritical = this.isCriticalElement(element);

        // Ajouter automatiquement les classes de base AVANT le traitement
        this.autoAddBaseClasses(element);

        const classList = element.classList;
        if (!classList.length) return;

        const stylingClasses = this.filterStylingClasses(classList);
        if (!stylingClasses.length) return;

        // MODIFICATION : Si critique OU si l'élément a .no-lazy, traiter immédiatement
        if (isCritical || element.classList.contains("no-lazy")) {
            this.addClassesToPending(stylingClasses);
            this.processPendingClasses();
            return;
        }

        // MODIFICATION : Vérifier aussi les parents pour .no-lazy
        let parent = element.parentElement;
        while (parent) {
            if (parent.classList && parent.classList.contains("no-lazy")) {
                this.addClassesToPending(stylingClasses);
                this.processPendingClasses();
                return;
            }
            parent = parent.parentElement;
        }

        if (this.marssel.styleManager.lazyload) {
            this.handleLazyLoading(element, stylingClasses);
        } else {
            this.addClassesToPending(stylingClasses);
        }

        // Traiter immédiatement les classes en attente
        this.processPendingClasses();
    }

    isCriticalElement(element) {
        // Vérifier directement avec les sélecteurs statiques
        return this.criticalsSelectors.some((selector) => {
            try {
                return element.matches(selector);
            } catch (e) {
                return false;
            }
        });
    }

    filterStylingClasses(classList) {
        const result = [];
        for (const className of classList) {
            if (this.isStylingClass(className)) {
                result.push(className);
            }
        }
        return result;
    }

    isStylingClass(className) {
        if (classCache.has(className)) {
            return classCache.get(className);
        }

        // Tests plus rapides d'abord (opérateurs simples)
        const isStyling =
            className.includes("-") &&
            (className.includes("-[") ||
                className.includes(">") ||
                className.includes("---[") ||
                className.includes("]:") ||
                className.includes("--"));

        // Seulement mettre en cache si >= 10 caractères (éviter pollution cache)
        if (className.length >= 10) {
            classCache.set(className, isStyling);
        }

        return isStyling;
    }

    handleLazyLoading(element, stylingClasses) {
        this.marssel.styleManager.lazyElements.set(element, stylingClasses);
        this.marssel.styleManager.lazyObserver.observe(element);

        // Vérification optimisée du viewport
        if (this.isInInitialViewport(element)) {
            this.addClassesToPending(stylingClasses);
            this.marssel.styleManager.lazyElements.delete(element);
            this.marssel.styleManager.lazyObserver.unobserve(element);
        }
    }

    isInInitialViewport(element) {
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight + 500 && rect.bottom > -500;
    }

    addClassesToPending(classes) {
        for (const className of classes) {
            this.pendingClasses.add(className);
        }
    }

    processPendingClasses() {
        if (this.pendingClasses.size === 0) return;

        for (const className of this.pendingClasses) {
            this.processClassOptimized(className);
        }

        this.pendingClasses.clear();
        this.marssel.styleManager.debounceStyleUpdate();
    }

    processClassOptimized(className) {
        // Vérifier si la classe a déjà été traitée
        if (this.processedClasses.has(className)) {
            return;
        }

        // Essayer d'abord le traitement des pseudo-classes compactes
        if (this.processPseudoCompactStyles(className)) {
            return;
        }

        const bpRootGroupMatch = className.match(REGEXES.BREAKPOINT_ROOT_GROUP);
        if (bpRootGroupMatch) {
            this.processBreakpointRootGroup(bpRootGroupMatch);
            return;
        }

        // 1. ✅ PRIORITÉ MAX : [styles]>enfant:pseudo (le cas problématique)
        if (className.startsWith("[") && className.includes("]>")) {
            const groupChildMatch = className.match(
                REGEXES.GROUP_CHILD_AFTER_BRACKET,
            );
            if (groupChildMatch) {
                this.processGroupChildAfterBracket(groupChildMatch, className);
                return;
            }
        }

        // 2. Gérer [styles>enfant] (> DANS les crochets)
        if (
            className.startsWith("[") &&
            className.includes(">") &&
            className.includes("]")
        ) {
            const innerChildMatch = className.match(
                /^\[(.*?>\w+(?::\w+)*)\](?::(\w+(?::\w+)*))?(!)?$/,
            );
            if (innerChildMatch) {
                this.processInnerChildSelector(innerChildMatch, className);
                return;
            }
        }

        // 3. Gérer les groupes racine [style+style]! (sans > et sans :)
        const rootGroupMatch = className.match(REGEXES.ROOT_GROUP);
        if (
            rootGroupMatch &&
            !className.includes("]:") && // NE PAS contenir de pseudo-classes parent (ex: [styles]:hover)
            !className.includes("]>") && // NE PAS contenir de sélecteur enfant (ex: [styles]>span)
            !className.includes(">") // NE PAS contenir de sélecteur enfant imbriqué (ex: [style>span])
        ) {
            const [, stylesGroup, importantFlag] = rootGroupMatch;
            const isImportant = Boolean(importantFlag);
            this.processRootGroup(stylesGroup, className, isImportant);
            return;
        }

        // Routage optimisé basé sur les caractères présents
        if (className.startsWith("[") && className.includes("]:")) {
            this.processGroupPseudoClass(className);
        } else if (className.includes("---[")) {
            this.processCompactStyles(className);
        } else if (className.includes(">")) {
            this.processChildSelectorClass(className);
        } else if (className.includes("+")) {
            this.processCombinedClass(className);
        } else {
            this.processClassName(className);
        }

        // Marquer comme traitée
        this.processedClasses.add(className);

        this.marssel.styleManager.loadedClasses.add(className);
    }

    /**
     * Traite les groupes de styles racine avec breakpoints et/ou pseudo-classes
     * Ex: lg--[mb-[0]+text-align-[center]], :hover[c-[red]]!
     */
    processBreakpointRootGroup(match) {
        const [
            fullClassName,
            breakpointsPart,
            stylesGroup,
            importantBeforeChild,
            childSelector,
            importantAfterPseudo,
        ] = match;

        const breakpoints = breakpointsPart
            ? breakpointsPart.split("--").filter(Boolean)
            : [];

        const isGroupImportant =
            Boolean(importantBeforeChild) || Boolean(importantAfterPseudo);

        // Extraire pseudo-classes du childSelector si présent
        let pseudoModifier = null;
        let cleanChildSelector = childSelector;

        if (childSelector && childSelector.includes(":")) {
            const parts = childSelector.split(":");
            cleanChildSelector = parts[0];
            pseudoModifier = parts.slice(1).join(":");
        }

        const escapedClassName = fullClassName.replace(/[[\]+!:>.]/g, "\\$&");
        let selector = `.${escapedClassName}`;

        // Ajouter le sélecteur enfant et pseudo si présents
        if (cleanChildSelector) {
            selector += ` > ${cleanChildSelector}`;
            if (pseudoModifier) {
                const pseudoParts = pseudoModifier.split(":");
                selector += pseudoParts.map((p) => `:${p}`).join("");
            }
        }

        const declarations = this.getDeclarationSet();
        const properties = this.splitPropertiesGroup(stylesGroup);

        for (const prop of properties) {
            if (prop.includes(">")) {
                this.processChildStyle(
                    prop,
                    fullClassName,
                    pseudoModifier,
                    breakpoints,
                    isGroupImportant,
                );
                continue;
            }

            const propMatch = prop.match(REGEXES.PROP_VALUE);
            if (propMatch) {
                const [, property, value, propImportantFlag] = propMatch;
                const finalIsImportant =
                    isGroupImportant || Boolean(propImportantFlag);
                this.addStyleDeclaration(
                    declarations,
                    property,
                    value,
                    finalIsImportant,
                );
            }
        }

        if (declarations.size > 0) {
            this.marssel.styleManager.addDeclarationsWithMediaQuery(
                breakpoints,
                selector,
                declarations,
            );
        }
        this.returnDeclarationSet(declarations);
    }

    processCompactStyles(className) {
        const childSelectorMatch = className.match(REGEXES.CHILD_SELECTOR);
        const childSelector = childSelectorMatch ? childSelectorMatch[2] : null;
        const workingClassName = childSelectorMatch
            ? childSelectorMatch[1]
            : className;

        const [componentWithBreakpoints, stylesBlock] =
            workingClassName.split("---");
        const { breakpoints, component } = this.parseBreakpoints(
            componentWithBreakpoints,
        );

        const { cleanStylesBlock, pseudoModifier, isImportant } =
            this.parsePseudoModifier(stylesBlock);

        // ✅ AJOUT : Vérifier si ]! apparaît avant >
        const hasImportantBeforeChild = /\]!>/.test(className);
        const finalImportant = isImportant || hasImportantBeforeChild;

        if (!this.isValidStylesBlock(cleanStylesBlock)) return;

        const stylesList = this.parseStylesList(cleanStylesBlock);
        const baseSelector = this.generateSelectorCached(
            component,
            pseudoModifier,
            childSelector,
        );
        const declarations = this.getDeclarationSet();

        this.processStylesList(
            stylesList,
            declarations,
            component,
            pseudoModifier,
            breakpoints,
            finalImportant, // ✅ Passer finalImportant au lieu de isImportant
        );

        if (declarations.size > 0) {
            this.marssel.styleManager.addDeclarationsWithMediaQuery(
                breakpoints,
                baseSelector,
                declarations,
            );
        }

        this.returnDeclarationSet(declarations);
    }

    parseBreakpoints(componentWithBreakpoints) {
        if (!componentWithBreakpoints.includes("--")) {
            return { breakpoints: [], component: componentWithBreakpoints };
        }

        const parts = componentWithBreakpoints.split("--");
        return {
            breakpoints: parts.slice(0, -1),
            component: parts[parts.length - 1],
        };
    }

    parsePseudoModifier(stylesBlock) {
        // Nouvelle regex pour gérer ]!:pseudo, ]:pseudo, ]-pseudo et ]!
        // Cherche ] suivi optionnellement de ! suivi de : ou -
        const match = stylesBlock.match(/\](!?)([-:])(.+)$/);

        if (match) {
            const closeBracketIndex = match.index;
            const innerImportant = match[1] === "!"; // Le ! entre ] et :
            let pseudo = match[3];

            // Gérer le cas où le pseudo finit par ! (ex: :hover!)
            let isOuterImportant = false;
            if (pseudo.endsWith("!")) {
                isOuterImportant = true;
                pseudo = pseudo.slice(0, -1);
            }

            return {
                cleanStylesBlock: stylesBlock.slice(0, closeBracketIndex + 1), // Inclure le ]
                pseudoModifier: pseudo,
                isImportant: innerImportant || isOuterImportant,
            };
        }

        // Cas fallback : [styles]! (important sans pseudo)
        if (stylesBlock.endsWith("!")) {
            return {
                cleanStylesBlock: stylesBlock.slice(0, -1),
                pseudoModifier: null,
                isImportant: true,
            };
        }

        // Cas standard : [styles]
        return {
            cleanStylesBlock: stylesBlock,
            pseudoModifier: null,
            isImportant: false,
        };
    }

    isValidStylesBlock(stylesBlock) {
        return stylesBlock?.startsWith("[") && stylesBlock?.endsWith("]");
    }

    parseStylesList(stylesBlock) {
        // Détecter automatiquement le séparateur utilisé
        const separator = stylesBlock.includes("__") ? "__" : "+";
        return stylesBlock.slice(1, -1).split(separator).filter(Boolean);
    }

    generateSelectorCached(base, pseudoModifier, childSelector) {
        const cacheKey = `${base}|${pseudoModifier || ""}|${
            childSelector || ""
        }`;

        if (selectorCache.has(cacheKey)) {
            return selectorCache.get(cacheKey);
        }

        const escapedBase = base.replace(/[[\]]/g, "\\$&");
        let selector = this.generateSelector(escapedBase, pseudoModifier);

        if (childSelector) {
            selector += ` > ${childSelector}`;
        }

        selectorCache.set(cacheKey, selector);
        return selector;
    }

    // Ajouter cette méthode dans DomManager.js :
    processPseudoCompactStyles(className) {
        // Regex pour capturer le format avec pseudo-classes
        const pseudoCompactRegex = /^([\w-]+)---\[(.*?)\]([:-])([\w:-]+)$/;
        const match = className.match(pseudoCompactRegex);

        if (!match) return false;

        const [, component, stylesBlock, separator, pseudoModifier] = match;
        const isImportant = className.endsWith("!");

        const { breakpoints, component: cleanComponent } =
            this.parseBreakpoints(component);
        const stylesList = this.parseStylesList(`[${stylesBlock}]`);
        const selector = this.generateSelectorCached(
            cleanComponent,
            pseudoModifier,
        );
        const declarations = this.getDeclarationSet();

        this.processStylesList(
            stylesList,
            declarations,
            cleanComponent,
            pseudoModifier,
            breakpoints,
            isImportant,
        );

        if (declarations.size > 0) {
            this.marssel.styleManager.addDeclarationsWithMediaQuery(
                breakpoints,
                selector,
                declarations,
            );
        }

        this.returnDeclarationSet(declarations);
        return true;
    }

    generateSelector(base, pseudoModifier) {
        if (!pseudoModifier) return `.${base}`;

        // Séparer les pseudo-classes/éléments par :
        const pseudoParts = pseudoModifier.split(":");

        return `.${base}${pseudoParts.map((p) => `:${p}`).join("")}`;
    }

    processStylesList(
        stylesList,
        declarations,
        component,
        pseudoModifier,
        breakpoints,
        isImportant = false,
    ) {
        const escapedComponent = component.replace(/[[\]]/g, "\\$&");

        for (const style of stylesList) {
            if (style.includes(">")) {
                this.processChildStyle(
                    style,
                    escapedComponent,
                    pseudoModifier,
                    breakpoints,
                    isImportant, // Passer isImportant ici
                );
                continue;
            }

            const match = style.match(REGEXES.PROP_VALUE);
            if (match) {
                const [, property, value, importantFlag] = match;
                // Combiner isImportant du bloc avec celui du style individuel
                const styleIsImportant = isImportant || Boolean(importantFlag);
                this.addStyleDeclaration(
                    declarations,
                    property,
                    value,
                    styleIsImportant,
                );
            }
        }
    }

    processChildStyle(
        style,
        escapedComponent, // Attention: ici on reçoit souvent le fullClassName brut
        pseudoModifier,
        breakpoints,
        isImportant = false,
    ) {
        // Utiliser la regex mise à jour (supporte : et 0-9 dans l'enfant)
        const childMatch = style.match(REGEXES.CHILD_STYLE_WITH_IMPORTANT);
        if (!childMatch) return;

        const [, property, value, propertyImportant, child, childImportant] =
            childMatch;

        // 1. Génération du sélecteur parent
        // Si escapedComponent contient déjà des crochets (c'est une classe brute), on l'échappe
        let baseSelector;
        if (escapedComponent.includes("[")) {
            baseSelector = "." + escapedComponent.replace(/[[\]+!:>]/g, "\\$&");
        } else {
            // C'est un composant simple (ex: "btn")
            baseSelector = this.generateSelector(
                escapedComponent,
                pseudoModifier,
            );
        }

        // Ajouter le pseudo-modifier si on est dans le cas d'une classe brute complexe
        if (escapedComponent.includes("[") && pseudoModifier) {
            const parts = pseudoModifier.split(":");
            baseSelector += parts.map((p) => `:${p}`).join("");
        }

        const childSelector = `${baseSelector} > ${child}`;
        const childDeclarations = this.getDeclarationSet();

        const styleIsImportant =
            isImportant ||
            Boolean(propertyImportant) ||
            Boolean(childImportant);

        this.addStyleDeclaration(
            childDeclarations,
            property,
            value,
            styleIsImportant,
        );

        this.marssel.styleManager.addDeclarationsWithMediaQuery(
            breakpoints,
            childSelector,
            childDeclarations,
        );

        this.returnDeclarationSet(childDeclarations);
    }

    // Pool de Sets pour éviter les allocations répétées
    getDeclarationSet() {
        if (this.declarationPool.length > this.poolIndex) {
            const set = this.declarationPool[this.poolIndex++];
            set.clear();
            return set;
        }

        const newSet = new Set();
        this.declarationPool.push(newSet);
        this.poolIndex++;
        return newSet;
    }

    returnDeclarationSet(set) {
        this.poolIndex = Math.max(0, this.poolIndex - 1);
    }

    processCombinedClass(className, isImportant = false) {
        const [componentName, stylesPart] = className.split("---");

        if (!stylesPart) {
            this.processStandardCombined(className, isImportant);
            return;
        }

        const selector = `.${componentName}`;
        const declarations = this.getDeclarationSet();
        const styleClasses = stylesPart.split("+").filter(Boolean);
        let breakpoints = [];

        for (const styleClass of styleClasses) {
            const parsed = parseClassPart(componentName, styleClass);
            if (parsed) {
                breakpoints = parsed.breakpoints || breakpoints;
                const styleIsImportant = isImportant || parsed.isImportant; // Utiliser parsed.isImportant
                this.addStyleDeclaration(
                    declarations,
                    parsed.property,
                    parsed.value,
                    styleIsImportant,
                );
            }
        }

        this.marssel.styleManager.addDeclarationsWithMediaQuery(
            breakpoints,
            selector,
            declarations,
        );
        this.returnDeclarationSet(declarations);
    }

    processStandardCombined(className, isImportant = false) {
        const parts = className.split("+");
        const { breakpointPrefix, breakpoints } = this.extractBreakpoints(
            parts[0],
        );

        // Extraire le pseudo-sélecteur s'il existe
        const pseudoMatch = className.match(/:([a-z-_]+(?::[a-z-_]+)*)$/);
        const pseudoSelector = pseudoMatch ? `:${pseudoMatch[1]}` : "";

        // àâ€°chapper tous les caractères spéciaux y compris :
        const escapedClassName = className.replace(/[[\]+:]/g, "\\$&");
        const selector = `.${escapedClassName}${pseudoSelector}`;
        const declarations = this.getDeclarationSet();

        for (const [index, part] of parts.entries()) {
            const adjustedPart = this.adjustPartWithBreakpoints(
                part,
                breakpointPrefix,
                index,
            );
            const parsed = parseClassName(adjustedPart);

            if (parsed) {
                const styleIsImportant = isImportant || parsed.isImportant; // Utiliser parsed.isImportant
                this.addStyleDeclaration(
                    declarations,
                    parsed.property,
                    parsed.value,
                    styleIsImportant,
                );
            }
        }

        this.marssel.styleManager.addDeclarationsWithMediaQuery(
            breakpoints,
            selector,
            declarations,
        );
        this.returnDeclarationSet(declarations);
    }

    extractBreakpoints(firstPart) {
        if (!firstPart.includes("--")) {
            return { breakpointPrefix: "", breakpoints: [] };
        }

        const breakpointSection = firstPart.split("--")[0];
        return {
            breakpointPrefix: `${breakpointSection}--`,
            breakpoints: breakpointSection.split("--"),
        };
    }

    adjustPartWithBreakpoints(part, breakpointPrefix, index) {
        return index > 0 && breakpointPrefix && !part.includes("--")
            ? breakpointPrefix + part
            : part;
    }

    processClassName(className, isImportant = false) {
        const [componentName, stylesPart] = className.split("---");

        if (!stylesPart) {
            this.processSingleStyle(className, isImportant);
            return;
        }

        const groupedMatch = stylesPart.match(REGEXES.GROUPED_STYLES);
        if (groupedMatch) {
            const [, groupedStyles, sharedModifier, importantFlag] =
                groupedMatch;
            const styleIsImportant = isImportant || Boolean(importantFlag);
            this.processGroupedStyles(
                [, groupedStyles, sharedModifier],
                styleIsImportant,
            );
            return;
        }

        // Traitement des styles multiples
        const styleClasses = stylesPart.split("+").filter(Boolean);
        for (const styleClass of styleClasses) {
            const parsed = parseClassPart(componentName, styleClass);
            if (parsed) {
                // Fusionner isImportant avec celui du parsed
                const finalIsImportant = isImportant || parsed.isImportant;
                const parsedWithImportant = {
                    ...parsed,
                    isImportant: finalIsImportant,
                };
                this.marssel.styleManager.addStyleRule(parsedWithImportant);
            }
        }
    }

    processGroupedStyles(
        [, groupedStyles, sharedModifier, importantFlag],
        isImportant = false,
    ) {
        const styleIsImportant = isImportant || Boolean(importantFlag);
        const styles = groupedStyles.split("+").filter(Boolean);
        for (const style of styles) {
            this.processSingleStyle(
                `${style}-${sharedModifier}`,
                styleIsImportant,
            );
        }
    }

    processSingleStyle(className, isImportant = false) {
        const parsed = parseClassName(className);
        if (parsed) {
            // Fusionner isImportant avec celui du parsed
            const finalIsImportant = isImportant || parsed.isImportant;
            const parsedWithImportant = {
                ...parsed,
                isImportant: finalIsImportant,
            };
            this.marssel.styleManager.addStyleRule(parsedWithImportant);
        }
    }

    processChildSelectorClass(className, isImportant = false) {
        // 1. Essayer le pattern [groupe]>enfant (ex: [fs-[40px]+c-[red]]>span)
        const groupMatch = className.match(REGEXES.GROUP_CHILD_SELECTOR);
        if (groupMatch) {
            return this.processGroupChildSelector(
                groupMatch,
                className,
                isImportant,
            );
        }

        // 2. Sinon, essayer le pattern standard prop-[val]>enfant
        const match = className.match(REGEXES.CHILD_SELECTOR_WITH_BREAKPOINTS);
        if (!match) return false;

        const [
            ,
            breakpointsPart,
            property,
            value,
            childElement,
            importantFlag,
        ] = match;
        const breakpoints = breakpointsPart
            ? breakpointsPart.split("--").filter(Boolean)
            : [];

        const styleIsImportant = isImportant || Boolean(importantFlag);
        // ✅ IMPORTANT : On échappe aussi les deux-points (:)
        const escapedClassName = className.replace(/[[\]>!:]/g, "\\$&");
        const selector = `.${escapedClassName} > ${childElement}`;
        const declarations = this.getDeclarationSet();

        this.addStyleDeclaration(
            declarations,
            property,
            value,
            styleIsImportant,
        );
        this.marssel.styleManager.addDeclarationsWithMediaQuery(
            breakpoints,
            selector,
            declarations,
        );

        this.returnDeclarationSet(declarations);
        return true;
    }

    /**
     * Traite : [fs-[40px]+c-[green]]>span et [fs-[40px]+c-[green]]>span:hover
     * Le > est APRÈS les crochets
     */
    processGroupChildSelector(match, className, isImportant = false) {
        const [, stylesGroup, childSelector, importantFlag] = match;
        const styleIsImportant = isImportant || Boolean(importantFlag);

        const properties = this.splitPropertiesGroup(stylesGroup);

        // Séparer styles parent et enfant
        const parentStyles = [];
        const childStyles = [];

        for (const prop of properties) {
            if (prop.includes(">")) {
                childStyles.push(prop);
            } else {
                parentStyles.push(prop);
            }
        }

        const baseClassName = className.split(">")[0];
        const escapedBase = baseClassName.replace(/[[\]+!]/g, "\\$&");

        // 1. Traiter styles du PARENT
        if (parentStyles.length > 0) {
            const parentSelector = `.${escapedBase}`;
            const parentDeclarations = this.getDeclarationSet();

            for (const prop of parentStyles) {
                const propMatch = prop.match(REGEXES.PROP_VALUE);
                if (propMatch) {
                    const [, property, value, propImportant] = propMatch;
                    const finalImportant =
                        styleIsImportant || Boolean(propImportant);
                    this.addStyleDeclaration(
                        parentDeclarations,
                        property,
                        value,
                        finalImportant,
                    );
                }
            }

            if (parentDeclarations.size > 0) {
                this.marssel.styleManager.addDeclarationsWithMediaQuery(
                    [],
                    parentSelector,
                    parentDeclarations,
                );
            }
            this.returnDeclarationSet(parentDeclarations);
        }

        // 2. Traiter styles de l'ENFANT
        const finalSelector = `.${escapedBase} > ${childSelector}`;
        const childDeclarations = this.getDeclarationSet();

        for (const prop of childStyles) {
            const childMatch = prop.match(REGEXES.CHILD_STYLE_WITH_IMPORTANT);
            if (childMatch) {
                const [, property, value, propertyImportant, , childImportant] =
                    childMatch;
                const finalImportant =
                    styleIsImportant ||
                    Boolean(propertyImportant) ||
                    Boolean(childImportant);
                this.addStyleDeclaration(
                    childDeclarations,
                    property,
                    value,
                    finalImportant,
                );
            }
        }

        if (childDeclarations.size > 0) {
            this.marssel.styleManager.addDeclarationsWithMediaQuery(
                [],
                finalSelector,
                childDeclarations,
            );
        }

        this.returnDeclarationSet(childDeclarations);
        return true;
    }

    /**
     * Traite : [fs-[40px]+c-[green]>span] et [fs-[40px]+c-[green]>span]:hover
     * Le > est DANS les crochets
     */
    processInnerChildSelector(match, className) {
        const [, innerContent, parentPseudo, importantFlag] = match;

        // ✅ MODIF : Détecter le ! avant le : dans le className original
        const hasImportantBeforePseudo = /\]!:/.test(className);
        const isImportant = Boolean(importantFlag) || hasImportantBeforePseudo;

        // Séparer le contenu avant et après le >
        const lastChildIndex = innerContent.lastIndexOf(">");
        const stylesGroup = innerContent.slice(0, lastChildIndex);
        const childSelector = innerContent.slice(lastChildIndex + 1);

        const properties = this.splitPropertiesGroup(stylesGroup);

        // Séparer styles parent et enfant
        const parentStyles = [];
        const childStyles = [];

        for (const prop of properties) {
            if (prop.includes(">")) {
                childStyles.push(prop);
            } else {
                parentStyles.push(prop);
            }
        }

        const escapedBase = className.replace(/[[\]+!:>]/g, "\\$&");

        // 1. Traiter styles du PARENT
        if (parentStyles.length > 0) {
            let parentSelector = `.${escapedBase}`;

            // Ajouter le pseudo si présent
            if (parentPseudo) {
                const parts = parentPseudo.split(":");
                parentSelector += parts.map((p) => `:${p}`).join("");
            }

            const parentDeclarations = this.getDeclarationSet();

            for (const prop of parentStyles) {
                const propMatch = prop.match(REGEXES.PROP_VALUE);
                if (propMatch) {
                    const [, property, value, propImportant] = propMatch;
                    const finalImportant =
                        isImportant || Boolean(propImportant);
                    this.addStyleDeclaration(
                        parentDeclarations,
                        property,
                        value,
                        finalImportant,
                    );
                }
            }

            if (parentDeclarations.size > 0) {
                this.marssel.styleManager.addDeclarationsWithMediaQuery(
                    [],
                    parentSelector,
                    parentDeclarations,
                );
            }
            this.returnDeclarationSet(parentDeclarations);
        }

        // 2. Traiter styles de l'ENFANT
        let childFullSelector = `.${escapedBase} > ${childSelector}`;

        // Ajouter le pseudo au parent si présent
        if (parentPseudo) {
            const parts = parentPseudo.split(":");
            childFullSelector = `.${escapedBase}${parts
                .map((p) => `:${p}`)
                .join("")} > ${childSelector}`;
        }

        const childDeclarations = this.getDeclarationSet();

        for (const prop of childStyles) {
            const childMatch = prop.match(REGEXES.CHILD_STYLE_WITH_IMPORTANT);
            if (childMatch) {
                const [, property, value, propertyImportant, , childImportant] =
                    childMatch;
                const finalImportant =
                    isImportant ||
                    Boolean(propertyImportant) ||
                    Boolean(childImportant);
                this.addStyleDeclaration(
                    childDeclarations,
                    property,
                    value,
                    finalImportant,
                );
            }
        }

        if (childDeclarations.size > 0) {
            this.marssel.styleManager.addDeclarationsWithMediaQuery(
                [],
                childFullSelector,
                childDeclarations,
            );
        }

        this.returnDeclarationSet(childDeclarations);
        return true;
    }

    /**
     * Traite : [fs-[40px]+c-[green]]>span:hover
     * Le > est APRÈS les crochets
     */
    processGroupChildAfterBracket(match, className) {
        const [, stylesGroup, childSelector, importantFlag] = match;
        const isImportant = Boolean(importantFlag);

        // Parser les styles du groupe
        const properties = this.splitPropertiesGroup(stylesGroup);

        // Construire le sélecteur parent (classe échappée)
        const escapedBase = className.replace(/[[\]+!:>]/g, "\\$&");
        const baseSelector = `.${escapedBase}`;

        // Séparer le sélecteur enfant et ses pseudo-classes
        const childParts = childSelector.split(":");
        const childElement = childParts[0]; // L'élément enfant (ex: "span")
        const childPseudo = childParts.slice(1).filter((p) => p); // Les pseudo-classes (ex: ["hover"])

        // Construire le sélecteur complet avec les pseudo-classes sur l'enfant
        let childFullSelector;
        if (childPseudo.length > 0) {
            // Le pseudo s'applique à l'enfant : .parent > span:hover
            const pseudoString = childPseudo.map((p) => `:${p}`).join("");
            childFullSelector = `${baseSelector} > ${childElement}${pseudoString}`;
        } else {
            // Pas de pseudo-classe
            childFullSelector = `${baseSelector} > ${childElement}`;
        }

        const childDeclarations = this.getDeclarationSet();

        // Ajouter tous les styles à l'enfant
        for (const prop of properties) {
            // Gérer les styles enfants explicites s'il y en a (ceux avec >)
            if (prop.includes(">")) {
                const childMatch = prop.match(
                    REGEXES.CHILD_STYLE_WITH_IMPORTANT,
                );
                if (childMatch) {
                    const [
                        ,
                        property,
                        value,
                        propertyImportant,
                        ,
                        childImportant,
                    ] = childMatch;
                    const finalImportant =
                        isImportant ||
                        Boolean(propertyImportant) ||
                        Boolean(childImportant);
                    this.addStyleDeclaration(
                        childDeclarations,
                        property,
                        value,
                        finalImportant,
                    );
                }
            } else {
                // Styles normaux
                const propMatch = prop.match(REGEXES.PROP_VALUE);
                if (propMatch) {
                    const [, property, value, propImportant] = propMatch;
                    const finalImportant =
                        isImportant || Boolean(propImportant);
                    this.addStyleDeclaration(
                        childDeclarations,
                        property,
                        value,
                        finalImportant,
                    );
                }
            }
        }

        if (childDeclarations.size > 0) {
            this.marssel.styleManager.addDeclarationsWithMediaQuery(
                [],
                childFullSelector,
                childDeclarations,
            );
        }

        this.returnDeclarationSet(childDeclarations);
        return true;
    }

    addStyleDeclaration(declarations, property, value, isImportant = false) {
        // IMPORTANT : Convertir _ en espaces AVANT tout traitement
        const valueWithSpaces = value.replace(/_/g, " ");

        // Traiter les références de thème dans la valeur
        const processedValue = valueWithSpaces.includes("var(--theme-")
            ? valueWithSpaces
            : this.processThemeInValue(valueWithSpaces);

        let cssDeclarationOrArray = "";

        switch (property) {
            case "bg":
            case "background-color":
                cssDeclarationOrArray = `background-color: ${this.processColor(
                    processedValue,
                )}`;
                break;

            case "c":
            case "color":
                cssDeclarationOrArray = `color: ${this.processColor(
                    processedValue,
                )}`;
                break;

            case "bg-rgb":
                cssDeclarationOrArray = `background-color: rgb(${processedValue})`;
                break;

            case "bg-rgba":
                cssDeclarationOrArray = `background-color: rgba(${processedValue})`;
                break;

            case "c-rgb":
                cssDeclarationOrArray = `color: rgb(${processedValue})`;
                break;

            case "c-rgba":
                cssDeclarationOrArray = `color: rgba(${processedValue})`;
                break;

            case "bg-linear":
                // MODIFICATION : Utiliser la fonction importée
                cssDeclarationOrArray = `background: linear-gradient(${processGradientColors(
                    processedValue,
                )})`;
                break;

            case "bg-radial":
                // MODIFICATION : Utiliser la fonction importée
                cssDeclarationOrArray = `background: radial-gradient(${processGradientColors(
                    processedValue,
                )})`;
                break;

            case "content":
                cssDeclarationOrArray = `content: "${processedValue}"`;
                break;

            case "font":
                this.processFontDeclaration(
                    declarations,
                    processedValue,
                    isImportant,
                );
                return;

            default:
                cssDeclarationOrArray = this.processGenericDeclaration(
                    property,
                    processedValue,
                );
        }

        // VÃ©rifier si processGenericDeclaration a retournÃ© un tableau
        if (Array.isArray(cssDeclarationOrArray)) {
            // Si oui, boucler sur chaque dÃ©claration (ex: "padding-left: 16px")
            for (const decl of cssDeclarationOrArray) {
                if (isImportant && !decl.includes("!important")) {
                    declarations.add(decl + " !important");
                } else {
                    declarations.add(decl);
                }
            }
        } else {
            // Sinon, c'est un string simple (comportement normal)
            let cssDeclaration = cssDeclarationOrArray; // c'est un string

            if (isImportant && !cssDeclaration.includes("!important")) {
                cssDeclaration += " !important";
            }
            declarations.add(cssDeclaration);
        }
    }

    processGradient(value) {
        // Protéger temporairement les fonctions CSS (rgb, rgba, etc.)
        const functions = [];
        let protectedValue = value.replace(
            /(rgba?|hsla?|var)\([^)]+\)/gi,
            (match) => {
                const placeholder = `__FUNC_${functions.length}__`;
                functions.push(match);
                return placeholder;
            },
        );

        // Maintenant traiter les couleurs hexadécimales
        // Séparer par virgules et espaces tout en préservant la structure
        const parts = protectedValue.split(/([,\s]+)/);

        const processedParts = parts.map((part) => {
            const trimmed = part.trim();

            // Ne rien faire avec les séparateurs
            if (!trimmed || /^[,\s]+$/.test(part)) {
                return part;
            }

            // Ne pas toucher aux placeholders de fonctions
            if (/^__FUNC_\d+__$/.test(trimmed)) {
                return part;
            }

            // Ne PAS toucher aux valeurs avec unités CSS
            if (
                /(\d+\.?\d*)(deg|turn|rad|grad|px|em|rem|%|vh|vw|vmin|vmax)$/i.test(
                    trimmed,
                )
            ) {
                return part;
            }

            // Ne PAS toucher aux nombres purs
            if (/^\d+\.?\d*$/.test(trimmed)) {
                return part;
            }

            // Ne PAS toucher à "transparent"
            if (trimmed === "transparent") {
                return part;
            }

            // âœ… CORRECTION : Tester les couleurs hexadécimales (3 ou 6 caractères)
            const hexMatch = trimmed.match(/^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
            if (hexMatch && !trimmed.startsWith("#")) {
                const hex = hexMatch[1];

                // Hex de 6 caractères : toujours convertir
                if (hex.length === 6) {
                    return `#${hex.toUpperCase()}`;
                }

                // Hex de 3 caractères : vérifier s'il contient des lettres ou s'il s'agit d'un triplet identique
                if (hex.length === 3) {
                    const hasLetters = /[A-Fa-f]/i.test(hex);
                    const threeIdentical =
                        hex[0].toLowerCase() === hex[1].toLowerCase() &&
                        hex[1].toLowerCase() === hex[2].toLowerCase();

                    if (hasLetters || threeIdentical) {
                        return `#${hex.toUpperCase()}`;
                    }
                }
            }

            return part;
        });

        let result = processedParts.join("");

        // Restaurer les fonctions CSS
        functions.forEach((func, index) => {
            result = result.replace(`__FUNC_${index}__`, func);
        });

        return result;
    }

    processThemeInValue(value) {
        // Vérifier si déjà transformé
        if (value.includes("var(--theme-")) {
            return value;
        }

        // Remplacer theme-xxx par var(--theme-xxx) SEULEMENT si pas déjà fait
        return value.replace(/\btheme-([a-zA-Z0-9-]+)\b/g, "var(--theme-$1)");
    }

    processFontDeclaration(declarations, value, isImportant = false) {
        const fontMatch = value.match(REGEXES.FONT);
        if (fontMatch) {
            const [, family, variant] = fontMatch;
            this.marssel.fontManager.handleFont(family, variant);

            const fontFamily = `font-family: '${family}', sans-serif`;
            const fontWeight = `font-weight: ${variant}`;

            if (isImportant) {
                declarations.add(fontFamily + " !important");
                declarations.add(fontWeight + " !important");
            } else {
                declarations.add(fontFamily);
                declarations.add(fontWeight);
            }
        }
    }

    // Corriger processGenericDeclaration pour retourner la déclaration :
    processGenericDeclaration(property, value) {
        // Gestion spéciale des propriétés de thèmes
        if (property.startsWith("theme-")) {
            const cssVar = `--${property}`;
            const themeValue =
                this.marssel.styleManager.themeVariables.get(cssVar) || value;
            return `${cssVar}: ${themeValue}`;
        }

        const cssProperty = this.props[property] || property.replace(/_/g, "-");
        const shouldProcessColor = this.isColorProperty(property);

        // ✅ FIX: Appliquer addHashToHex sur TOUTES les valeurs après cleanValue
        let cssValue;
        if (shouldProcessColor) {
            cssValue = cleanValue(value);
        } else {
            cssValue = addHashToHex(cleanValue(value));
        }

        if (Array.isArray(cssProperty)) {
            // Pour les propriétés multiples, on les traite séparément
            return cssProperty.map((prop) => `${prop}: ${cssValue}`);
        } else {
            return `${cssProperty}: ${cssValue}`;
        }
    }

    isColorProperty(property) {
        return (
            ["bg", "c"].includes(property) ||
            property.startsWith("bg-") ||
            property.startsWith("c-")
        );
    }

    processColor(value) {
        // Si la valeur contient déjà var(, la retourner telle quelle
        if (value.includes("var(")) {
            return value;
        }

        // Si la valeur contient déjà rgb( ou rgba(, la retourner telle quelle
        if (/rgba?\(/.test(value)) {
            return value;
        }

        // REMETTRE la transformation des thèmes pour les valeurs brutes
        if (value.includes("theme-")) {
            return value.replace(
                /\btheme-([a-zA-Z0-9-]+)\b/g,
                "var(--theme-$1)",
            );
        }

        const hexPattern = /^[A-Fa-f0-9]{3}$|^[A-Fa-f0-9]{6}$/;
        if (hexPattern.test(value)) {
            return `#${value.toUpperCase()}`;
        }

        if (value.startsWith("#")) {
            return value;
        }

        return value;
    }

    processGroupPseudoClass(className, isImportant = false) {
        const match = className.match(REGEXES.GROUP_PSEUDO);
        if (!match) return false;

        const [, propertiesGroup, pseudoSelector, importantFlag] = match;
        const styleIsImportant = isImportant || Boolean(importantFlag);
        const selector = `.${className.replace(
            /[[\]+!:>.]/g,
            "\\$&",
        )}:${pseudoSelector}`;
        const declarations = this.getDeclarationSet();

        const properties = this.splitPropertiesGroup(propertiesGroup);
        for (const prop of properties) {
            // ✅ AJOUT : Gestion des enfants imbriqués
            if (prop.includes(">")) {
                // Note: Ici on passe le pseudoSelector pour qu'il s'applique au parent
                this.processChildStyle(
                    prop,
                    className, // Utilise la classe entière comme base
                    pseudoSelector, // Passe le pseudo (ex: hover)
                    [],
                    styleIsImportant,
                );
                continue;
            }

            const propMatch = prop.match(REGEXES.PROP_VALUE);
            if (propMatch) {
                const [, property, value, propImportantFlag] = propMatch;
                const propIsImportant =
                    styleIsImportant || Boolean(propImportantFlag);
                this.addStyleDeclaration(
                    declarations,
                    property,
                    value,
                    propIsImportant,
                );
            }
        }

        this.marssel.styleManager.addDeclarationsWithMediaQuery(
            [],
            selector,
            declarations,
        );
        this.returnDeclarationSet(declarations);
        return true;
    }

    /**
     * Ã¢Å“â€¦ NOUVELLE MÃ‰THODE
     * Traite les groupes de styles racine ex: [p-[10px]+c-[red]]!
     */
    processRootGroup(stylesGroup, fullClassName, isGroupImportant = false) {
        const escapedClassName = fullClassName.replace(/[[\]+!:>.]/g, "\\$&");
        const selector = `.${escapedClassName}`;
        const declarations = this.getDeclarationSet();

        const properties = this.splitPropertiesGroup(stylesGroup);

        for (const prop of properties) {
            // ✅ AJOUT : Gestion des enfants imbriqués dans le groupe
            if (prop.includes(">")) {
                this.processChildStyle(
                    prop,
                    fullClassName,
                    null,
                    [],
                    isGroupImportant,
                );
                continue;
            }

            const propMatch = prop.match(REGEXES.PROP_VALUE);
            if (propMatch) {
                const [, property, value, propImportantFlag] = propMatch;
                const finalIsImportant =
                    isGroupImportant || Boolean(propImportantFlag);
                this.addStyleDeclaration(
                    declarations,
                    property,
                    value,
                    finalIsImportant,
                );
            }
        }

        if (declarations.size > 0) {
            this.marssel.styleManager.addDeclarationsWithMediaQuery(
                [],
                selector,
                declarations,
            );
        }
        this.returnDeclarationSet(declarations);
    }

    splitPropertiesGroup(propertiesGroup) {
        const properties = [];
        let currentProp = "";
        let bracketCount = 0;

        for (const char of propertiesGroup) {
            if (char === "[") {
                bracketCount++;
            } else if (char === "]") {
                bracketCount--;
            } else if (bracketCount === 0 && (char === "_" || char === "+")) {
                if (currentProp) {
                    properties.push(currentProp);
                    currentProp = "";
                }
                continue;
            }
            currentProp += char;
        }

        if (currentProp) properties.push(currentProp);
        return properties;
    }
}
