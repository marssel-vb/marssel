import { parseClassName, parseClassPart } from "../utils/parsed.js";
import {
    cleanValue,
    addHashToHex,
    processGradientColors,
} from "../utils/helpers.js";
import { LRUCache } from "../utils/LRUCache.js";

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
    CHILD_STYLE_WITH_IMPORTANT:
        /([a-z0-9-]+)-\[(.*)\](!?)>([a-zA-Z0-9-:]+(?::[a-zA-Z0-9-:]+)*)(!?)/,
    GROUP_CHILD_SELECTOR:
        /^\[(.*?)\]>([a-zA-Z0-9-:]+(?::[a-zA-Z0-9-:]+)*)(!)?$/,
    GROUP_CHILD_AFTER_BRACKET:
        /^\[(.*?)\]>([a-zA-Z0-9-:]+(?::[a-zA-Z0-9-:]+)*)(!)?$/,
    BREAKPOINT_ROOT_GROUP:
        /^(?:(?:m--)?([a-z0-9]+(?:--[a-z0-9]+)*)--)?\[(.+?)\](!)?(?:>([a-zA-Z0-9-:]+(?::[a-zA-Z0-9-:]+)*))?(!)?$/,
    ROOT_GROUP: /^\[(.*)\](!)?$/,
};

const selectorCache = new LRUCache(200);
const classCache = new LRUCache(300);

export class DomManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.props = marssel.constructor.properties;
        this.colorRegex = marssel.constructor.COLOR_REGEX;
        this.criticalsSelectors = marssel.constructor.CRITICAL_SELECTORS;
        this.declarationPool = [];
        this.poolIndex = 0;
        this.pendingClasses = new Set();
        this.processingScheduled = false;
        this.processedElements = new WeakSet();
        this.processedElementsCount = 0;
        this.processedClasses = new Set();
    }

    autoAddBaseClasses(element) {
        if (this.processedElements.has(element)) return;

        const classList = element.classList;
        let classesModified = false;
        const classesToAdd = new Set();

        for (const className of classList) {
            const baseClass = this.extractBaseClass(className);

            if (baseClass && baseClass !== className) {
                if (!classList.contains(baseClass)) {
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

        if (classesModified) {
            classesToAdd.forEach((baseClass) => {
                element.classList.add(baseClass);
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
        const restrictedElements = ["html", "body", "head"];

        if (restrictedElements.includes(tagName)) {
            const componentClasses = [
                "btn",
                "card",
                "nav",
                "header",
                "footer",
                "modal",
                "dropdown",
            ];

            const isComponentClass = componentClasses.some(
                (comp) =>
                    baseClass.startsWith(comp) || baseClass.includes(comp),
            );
            const hasNumericSuffix = /^[a-z]+-\d+$/.test(baseClass);

            if (isComponentClass || hasNumericSuffix) {
                return false;
            }
        }

        return true;
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
        const criticalElements = this.getCriticalElements();
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

        if (visibleCriticalElements.length > 0) {
            this.processElementsBatch(visibleCriticalElements, 0, true);
        }

        if (visibleElements.length > 0) {
            this.processElementsBatch(visibleElements, 0);
        }

        if (hiddenCriticalElements.length > 0) {
            setTimeout(() => {
                this.processElementsBatch(hiddenCriticalElements, 0, true);
            }, 25);
        }

        if (hiddenElements.length > 0) {
            setTimeout(() => {
                this.processElementsBatch(hiddenElements, 0);
            }, 50);
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

        visibleCriticalElements.forEach((element) => {
            this.processElement(element);
        });

        if (visibleCriticalElements.length > 0) {
            this.processPendingClasses();
            this.marssel.styleManager.updateStyles();
        }

        visibleRegularElements.forEach((element) => {
            this.processElement(element);
        });

        this.processPendingClasses();
        this.marssel.styleManager.debounceStyleUpdate();
    }

    processElementsBatch(elements, startIndex, isCritical = false) {
        const batchSize = isCritical ? 50 : 100;
        const endIndex = Math.min(startIndex + batchSize, elements.length);

        for (let i = startIndex; i < endIndex; i++) {
            this.processElement(elements[i]);
        }

        if (isCritical) {
            this.processPendingClasses();
            this.marssel.styleManager.updateStyles();
        }

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

        const isCritical = this.isCriticalElement(element);
        this.autoAddBaseClasses(element);

        const classList = element.classList;
        if (!classList.length) return;

        const stylingClasses = this.filterStylingClasses(classList);
        if (!stylingClasses.length) return;

        if (isCritical || element.classList.contains("no-lazy")) {
            this.addClassesToPending(stylingClasses);
            this.processPendingClasses();
            return;
        }

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

        this.processPendingClasses();
    }

    isCriticalElement(element) {
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

        const isStyling =
            className.includes("-") &&
            (className.includes("-[") ||
                className.includes(">") ||
                className.includes("---[") ||
                className.includes("]:") ||
                className.includes("--"));

        if (className.length >= 10) {
            classCache.set(className, isStyling);
        }

        return isStyling;
    }

    handleLazyLoading(element, stylingClasses) {
        this.marssel.styleManager.lazyElements.set(element, stylingClasses);
        this.marssel.styleManager.lazyObserver.observe(element);

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
        if (this.processedClasses.has(className)) {
            return;
        }

        if (this.processPseudoCompactStyles(className)) {
            return;
        }

        const bpRootGroupMatch = className.match(REGEXES.BREAKPOINT_ROOT_GROUP);
        if (bpRootGroupMatch) {
            this.processBreakpointRootGroup(bpRootGroupMatch);
            return;
        }

        if (className.startsWith("[") && className.includes("]>")) {
            const groupChildMatch = className.match(
                REGEXES.GROUP_CHILD_AFTER_BRACKET,
            );
            if (groupChildMatch) {
                this.processGroupChildAfterBracket(groupChildMatch, className);
                return;
            }
        }

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

        const rootGroupMatch = className.match(REGEXES.ROOT_GROUP);
        if (
            rootGroupMatch &&
            !className.includes("]:") &&
            !className.includes("]>") &&
            !className.includes(">")
        ) {
            const [, stylesGroup, importantFlag] = rootGroupMatch;
            const isImportant = Boolean(importantFlag);
            this.processRootGroup(stylesGroup, className, isImportant);
            return;
        }

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

        this.processedClasses.add(className);
        this.marssel.styleManager.loadedClasses.add(className);
    }

    /**
     * Treats root style groups with breakpoints and/or pseudo-classes
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
        let pseudoModifier = null;
        let cleanChildSelector = childSelector;

        if (childSelector && childSelector.includes(":")) {
            const parts = childSelector.split(":");
            cleanChildSelector = parts[0];
            pseudoModifier = parts.slice(1).join(":");
        }

        const escapedClassName = fullClassName.replace(/[[\]+!:>.]/g, "\\$&");
        let selector = `.${escapedClassName}`;

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
            finalImportant,
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
        const match = stylesBlock.match(/\](!?)([-:])(.+)$/);

        if (match) {
            const closeBracketIndex = match.index;
            const innerImportant = match[1] === "!";
            let pseudo = match[3];
            let isOuterImportant = false;
            if (pseudo.endsWith("!")) {
                isOuterImportant = true;
                pseudo = pseudo.slice(0, -1);
            }

            return {
                cleanStylesBlock: stylesBlock.slice(0, closeBracketIndex + 1),
                pseudoModifier: pseudo,
                isImportant: innerImportant || isOuterImportant,
            };
        }

        if (stylesBlock.endsWith("!")) {
            return {
                cleanStylesBlock: stylesBlock.slice(0, -1),
                pseudoModifier: null,
                isImportant: true,
            };
        }

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

    processPseudoCompactStyles(className) {
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
                    isImportant,
                );
                continue;
            }

            const match = style.match(REGEXES.PROP_VALUE);
            if (match) {
                const [, property, value, importantFlag] = match;
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
        escapedComponent,
        pseudoModifier,
        breakpoints,
        isImportant = false,
    ) {
        const childMatch = style.match(REGEXES.CHILD_STYLE_WITH_IMPORTANT);
        if (!childMatch) return;

        const [, property, value, propertyImportant, child, childImportant] =
            childMatch;
        let baseSelector;
        if (escapedComponent.includes("[")) {
            baseSelector = "." + escapedComponent.replace(/[[\]+!:>]/g, "\\$&");
        } else {
            baseSelector = this.generateSelector(
                escapedComponent,
                pseudoModifier,
            );
        }

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

        const pseudoMatch = className.match(/:([a-z-_]+(?::[a-z-_]+)*)$/);
        const pseudoSelector = pseudoMatch ? `:${pseudoMatch[1]}` : "";

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
                const styleIsImportant = isImportant || parsed.isImportant;
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

        const styleClasses = stylesPart.split("+").filter(Boolean);
        for (const styleClass of styleClasses) {
            const parsed = parseClassPart(componentName, styleClass);
            if (parsed) {
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
            const finalIsImportant = isImportant || parsed.isImportant;
            const parsedWithImportant = {
                ...parsed,
                isImportant: finalIsImportant,
            };
            this.marssel.styleManager.addStyleRule(parsedWithImportant);
        }
    }

    processChildSelectorClass(className, isImportant = false) {
        const groupMatch = className.match(REGEXES.GROUP_CHILD_SELECTOR);
        if (groupMatch) {
            return this.processGroupChildSelector(
                groupMatch,
                className,
                isImportant,
            );
        }

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
     * Handles: [fs-[40px]+c-[green]]>span and [fs-[40px]+c-[green]]>span:hover
     * The > is AFTER the brackets
     */
    processGroupChildSelector(match, className, isImportant = false) {
        const [, stylesGroup, childSelector, importantFlag] = match;
        const styleIsImportant = isImportant || Boolean(importantFlag);
        const properties = this.splitPropertiesGroup(stylesGroup);
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
     * Handles: [fs-[40px]+c-[green]>span] et [fs-[40px]+c-[green]>span]:hover
     * The > is INSIDE the brackets
     */
    processInnerChildSelector(match, className) {
        const [, innerContent, parentPseudo, importantFlag] = match;
        const hasImportantBeforePseudo = /\]!:/.test(className);
        const isImportant = Boolean(importantFlag) || hasImportantBeforePseudo;
        const lastChildIndex = innerContent.lastIndexOf(">");
        const stylesGroup = innerContent.slice(0, lastChildIndex);
        const childSelector = innerContent.slice(lastChildIndex + 1);
        const properties = this.splitPropertiesGroup(stylesGroup);
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

        if (parentStyles.length > 0) {
            let parentSelector = `.${escapedBase}`;

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

        let childFullSelector = `.${escapedBase} > ${childSelector}`;

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
     * Handles : [fs-[40px]+c-[green]]>span:hover
     * The > is AFTER the brackets
     */
    processGroupChildAfterBracket(match, className) {
        const [, stylesGroup, childSelector, importantFlag] = match;
        const isImportant = Boolean(importantFlag);
        const properties = this.splitPropertiesGroup(stylesGroup);
        const escapedBase = className.replace(/[[\]+!:>]/g, "\\$&");
        const baseSelector = `.${escapedBase}`;
        const childParts = childSelector.split(":");
        const childElement = childParts[0];
        const childPseudo = childParts.slice(1).filter((p) => p);

        let childFullSelector;
        if (childPseudo.length > 0) {
            const pseudoString = childPseudo.map((p) => `:${p}`).join("");
            childFullSelector = `${baseSelector} > ${childElement}${pseudoString}`;
        } else {
            childFullSelector = `${baseSelector} > ${childElement}`;
        }

        const childDeclarations = this.getDeclarationSet();

        for (const prop of properties) {
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
        const valueWithSpaces = value.replace(/_/g, " ");
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
                cssDeclarationOrArray = `background: linear-gradient(${processGradientColors(
                    processedValue,
                )})`;
                break;

            case "bg-radial":
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

        if (Array.isArray(cssDeclarationOrArray)) {
            for (const decl of cssDeclarationOrArray) {
                if (isImportant && !decl.includes("!important")) {
                    declarations.add(decl + " !important");
                } else {
                    declarations.add(decl);
                }
            }
        } else {
            let cssDeclaration = cssDeclarationOrArray;

            if (isImportant && !cssDeclaration.includes("!important")) {
                cssDeclaration += " !important";
            }
            declarations.add(cssDeclaration);
        }
    }

    processGradient(value) {
        const functions = [];
        let protectedValue = value.replace(
            /(rgba?|hsla?|var)\([^)]+\)/gi,
            (match) => {
                const placeholder = `__FUNC_${functions.length}__`;
                functions.push(match);
                return placeholder;
            },
        );

        const parts = protectedValue.split(/([,\s]+)/);

        const processedParts = parts.map((part) => {
            const trimmed = part.trim();

            if (!trimmed || /^[,\s]+$/.test(part)) {
                return part;
            }

            if (/^__FUNC_\d+__$/.test(trimmed)) {
                return part;
            }

            if (
                /(\d+\.?\d*)(deg|turn|rad|grad|px|em|rem|%|vh|vw|vmin|vmax)$/i.test(
                    trimmed,
                )
            ) {
                return part;
            }

            if (/^\d+\.?\d*$/.test(trimmed)) {
                return part;
            }

            if (trimmed === "transparent") {
                return part;
            }

            const hexMatch = trimmed.match(/^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
            if (hexMatch && !trimmed.startsWith("#")) {
                const hex = hexMatch[1];

                if (hex.length === 6) {
                    return `#${hex.toUpperCase()}`;
                }

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

        functions.forEach((func, index) => {
            result = result.replace(`__FUNC_${index}__`, func);
        });

        return result;
    }

    processThemeInValue(value) {
        if (value.includes("var(--theme-")) {
            return value;
        }

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

    processGenericDeclaration(property, value) {
        if (property.startsWith("theme-")) {
            const cssVar = `--${property}`;
            const themeValue =
                this.marssel.styleManager.themeVariables.get(cssVar) || value;
            return `${cssVar}: ${themeValue}`;
        }

        const cssProperty = this.props[property] || property.replace(/_/g, "-");
        const shouldProcessColor = this.isColorProperty(property);

        let cssValue;
        if (shouldProcessColor) {
            cssValue = cleanValue(value);
        } else {
            cssValue = addHashToHex(cleanValue(value));
        }

        if (Array.isArray(cssProperty)) {
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
        if (value.includes("var(")) {
            return value;
        }

        if (/rgba?\(/.test(value)) {
            return value;
        }

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
            if (prop.includes(">")) {
                this.processChildStyle(
                    prop,
                    className,
                    pseudoSelector,
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
     * Processes root style groups e.g.: [p-[10px]+c-[red]]!
     *
     */
    processRootGroup(stylesGroup, fullClassName, isGroupImportant = false) {
        const escapedClassName = fullClassName.replace(/[[\]+!:>.]/g, "\\$&");
        const selector = `.${escapedClassName}`;
        const declarations = this.getDeclarationSet();

        const properties = this.splitPropertiesGroup(stylesGroup);

        for (const prop of properties) {
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
