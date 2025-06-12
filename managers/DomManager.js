import { parseClassName, parseClassPart } from "../utils/parsed.js";
import { cleanValue } from "../utils/helpers.js";

// Pré-compilation des regex optimisées
const REGEXES = {
  STYLE_CLASS: /-\[|^\[.*\]-|---\[/,
  COMPACT_STYLE: /^(.*?)\]-([\w-:()[\]]+)$/,
  PROP_VALUE: /^([a-z0-9-]+)-\[(.*)\]$/,
  FONT: /(.*)\[(\d+)\]/,
  GROUP_PSEUDO: /^\[(.*)\]-([a-z-_:()[\]]+)$/,
  CHILD_SELECTOR: /^(.+)>([a-zA-Z-]+)$/,
  CHILD_SELECTOR_WITH_BREAKPOINTS:
    /^(?:(.*?)--)?([a-z-]+)-\[([^\]]+)\]>([a-zA-Z-]+)$/,
  GROUPED_STYLES: /^\[(.*)\]-([a-z-]+(?:-[a-z-]+)*)$/,
};

// Cache pour les sélecteurs générés
const selectorCache = new Map();
const classCache = new Map();

export class DomManager {
  constructor(marssel) {
    this.marssel = marssel;
    this.props = marssel.constructor.properties;
    this.colorRegex = marssel.constructor.COLOR_REGEX;

    // Pool de déclarations réutilisables
    this.declarationPool = [];
    this.poolIndex = 0;

    // Batch processing
    this.pendingClasses = new Set();
    this.processingScheduled = false;
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
          elementsToProcess.forEach((element) => this.processElement(element));
          this.processPendingClasses();
          this.processingScheduled = false;
        });
      }
    }
  }

  processAllElements() {
    const elements = document.querySelectorAll("*");
    // Traitement par batch pour éviter de bloquer le thread principal
    this.processElementsBatch(Array.from(elements), 0);
  }

  processElementsBatch(elements, startIndex) {
    const batchSize = 100;
    const endIndex = Math.min(startIndex + batchSize, elements.length);

    for (let i = startIndex; i < endIndex; i++) {
      this.processElement(elements[i]);
    }

    if (endIndex < elements.length) {
      requestAnimationFrame(() => {
        this.processElementsBatch(elements, endIndex);
      });
    } else {
      this.processPendingClasses();
    }
  }

  processElement(element) {
    if (!(element instanceof HTMLElement)) return;

    const classList = element.classList;
    if (!classList.length) return;

    const stylingClasses = this.filterStylingClasses(classList);
    if (!stylingClasses.length) return;

    if (this.marssel.styleManager.lazyload) {
      this.handleLazyLoading(element, stylingClasses);
    } else {
      this.addClassesToPending(stylingClasses);
    }
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
    // Cache pour éviter les regex répétées
    if (classCache.has(className)) {
      return classCache.get(className);
    }

    const isStyling =
      className.includes("-") &&
      (className.includes("-[") ||
        className.includes("]-") ||
        className.includes("---[") ||
        className.includes(">") ||
        className.includes("--"));

    classCache.set(className, isStyling);
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
    // Routage optimisé basé sur les caractères présents
    if (className.startsWith("[") && className.includes("]-")) {
      this.processGroupPseudoClass(className);
    } else if (className.includes("---[")) {
      this.processCompactStyles(className);
    } else if (className.includes("+")) {
      this.processCombinedClass(className);
    } else if (className.includes(">")) {
      this.processChildSelectorClass(className);
    } else {
      this.processClassName(className);
    }
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
      componentWithBreakpoints
    );

    const { cleanStylesBlock, pseudoModifier } =
      this.parsePseudoModifier(stylesBlock);
    if (!this.isValidStylesBlock(cleanStylesBlock)) return;

    const stylesList = this.parseStylesList(cleanStylesBlock);
    const baseSelector = this.generateSelectorCached(
      component,
      pseudoModifier,
      childSelector
    );
    const declarations = this.getDeclarationSet();

    this.processStylesList(
      stylesList,
      declarations,
      component,
      pseudoModifier,
      breakpoints
    );

    if (declarations.size > 0) {
      this.marssel.styleManager.addDeclarationsWithMediaQuery(
        breakpoints,
        baseSelector,
        declarations
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
    const pseudoMatch = stylesBlock.match(REGEXES.COMPACT_STYLE);
    if (pseudoMatch) {
      return {
        cleanStylesBlock: pseudoMatch[1] + "]",
        pseudoModifier: pseudoMatch[2],
      };
    }
    return { cleanStylesBlock: stylesBlock, pseudoModifier: null };
  }

  isValidStylesBlock(stylesBlock) {
    return stylesBlock?.startsWith("[") && stylesBlock?.endsWith("]");
  }

  parseStylesList(stylesBlock) {
    return stylesBlock.slice(1, -1).split("__").filter(Boolean);
  }

  generateSelectorCached(base, pseudoModifier, childSelector) {
    const cacheKey = `${base}|${pseudoModifier || ""}|${childSelector || ""}`;

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

  generateSelector(base, pseudoModifier) {
    if (!pseudoModifier) return `.${base}`;

    return pseudoModifier.includes("_")
      ? `.${base}${pseudoModifier
          .split("_")
          .map((p) => `:${p}`)
          .join("")}`
      : `.${base}:${pseudoModifier}`;
  }

  processStylesList(
    stylesList,
    declarations,
    component,
    pseudoModifier,
    breakpoints
  ) {
    const escapedComponent = component.replace(/[[\]]/g, "\\$&");

    for (const style of stylesList) {
      if (style.includes(">")) {
        this.processChildStyle(
          style,
          escapedComponent,
          pseudoModifier,
          breakpoints
        );
        continue;
      }

      const match = style.match(REGEXES.PROP_VALUE);
      if (match) {
        const [, property, value] = match;
        this.addStyleDeclaration(declarations, property, value);
      }
    }
  }

  processChildStyle(style, escapedComponent, pseudoModifier, breakpoints) {
    const childMatch = style.match(/([a-z-]+)-\[(.*?)\]>([a-zA-Z-]+)/);
    if (!childMatch) return;

    const [, property, value, child] = childMatch;
    const childSelector =
      this.generateSelector(escapedComponent, pseudoModifier) + ` > ${child}`;
    const childDeclarations = this.getDeclarationSet();

    this.addStyleDeclaration(childDeclarations, property, value);
    this.marssel.styleManager.addDeclarationsWithMediaQuery(
      breakpoints,
      childSelector,
      childDeclarations
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

  processCombinedClass(className) {
    const [componentName, stylesPart] = className.split("---");

    if (!stylesPart) {
      this.processStandardCombined(className);
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
        this.addStyleDeclaration(declarations, parsed.property, parsed.value);
      }
    }

    this.marssel.styleManager.addDeclarationsWithMediaQuery(
      breakpoints,
      selector,
      declarations
    );

    this.returnDeclarationSet(declarations);
  }

  processStandardCombined(className) {
    const parts = className.split("+");
    const { breakpointPrefix, breakpoints } = this.extractBreakpoints(parts[0]);

    const escapedClassName = className.replace(/[[\]+]/g, "\\$&");
    const selector = `.${escapedClassName}`;
    const declarations = this.getDeclarationSet();

    for (const [index, part] of parts.entries()) {
      const adjustedPart = this.adjustPartWithBreakpoints(
        part,
        breakpointPrefix,
        index
      );
      const parsed = parseClassName(adjustedPart);

      if (parsed) {
        this.addStyleDeclaration(declarations, parsed.property, parsed.value);
      }
    }

    this.marssel.styleManager.addDeclarationsWithMediaQuery(
      breakpoints,
      selector,
      declarations
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

  processClassName(className) {
    const [componentName, stylesPart] = className.split("---");

    if (!stylesPart) {
      this.processSingleStyle(className);
      return;
    }

    const groupedMatch = stylesPart.match(REGEXES.GROUPED_STYLES);
    if (groupedMatch) {
      this.processGroupedStyles(groupedMatch);
      return;
    }

    // Traitement des styles multiples
    const styleClasses = stylesPart.split("+").filter(Boolean);
    for (const styleClass of styleClasses) {
      const parsed = parseClassPart(componentName, styleClass);
      if (parsed) {
        this.marssel.styleManager.addStyleRule(parsed);
      }
    }
  }

  processGroupedStyles([, groupedStyles, sharedModifier]) {
    const styles = groupedStyles.split("+").filter(Boolean);
    for (const style of styles) {
      this.processSingleStyle(`${style}-${sharedModifier}`);
    }
  }

  processSingleStyle(className) {
    const parsed = parseClassName(className);
    if (parsed) {
      this.marssel.styleManager.addStyleRule(parsed);
    }
  }

  processChildSelectorClass(className) {
    const match = className.match(REGEXES.CHILD_SELECTOR_WITH_BREAKPOINTS);
    if (!match) return false;

    const [, breakpointsPart, property, value, childElement] = match;
    const breakpoints = breakpointsPart
      ? breakpointsPart.split("--").filter(Boolean)
      : [];

    const escapedClassName = className.replace(/[[\]>]/g, "\\$&");
    const selector = `.${escapedClassName} > ${childElement}`;
    const declarations = this.getDeclarationSet();

    this.addStyleDeclaration(declarations, property, value);
    this.marssel.styleManager.addDeclarationsWithMediaQuery(
      breakpoints,
      selector,
      declarations
    );

    this.returnDeclarationSet(declarations);
    return true;
  }

  addStyleDeclaration(declarations, property, value) {
    switch (property) {
      case "bg":
      case "background-color":
        declarations.add(`background-color: ${this.processColor(value)}`);
        break;
      case "c":
      case "color":
        declarations.add(`color: ${this.processColor(value)}`);
        break;
      case "content":
        declarations.add(`content: "${value.replace(/_/g, " ")}"`);
        break;
      case "font":
        this.processFontDeclaration(declarations, value);
        break;
      default:
        this.processGenericDeclaration(declarations, property, value);
    }
  }

  processFontDeclaration(declarations, value) {
    const fontMatch = value.match(REGEXES.FONT);
    if (fontMatch) {
      const [, family, variant] = fontMatch;
      this.marssel.fontManager.handleFont(family, variant);
      declarations.add(`font-family: '${family}', sans-serif`);
      declarations.add(`font-weight: ${variant}`);
    }
  }

  processGenericDeclaration(declarations, property, value) {
    // Gestion spéciale des propriétés de thèmes
    if (property.startsWith("theme-")) {
      const cssVar = `--${property}`;
      const themeValue =
        this.marssel.styleManager.themeVariables.get(cssVar) || value;
      declarations.add(`${cssVar}: ${themeValue}`);
      return;
    }

    const cssProperty = this.props[property] || property.replace(/_/g, "-");
    const cssValue = cleanValue(value);

    if (Array.isArray(cssProperty)) {
      for (const prop of cssProperty) {
        declarations.add(`${prop}: ${cssValue}`);
      }
    } else {
      declarations.add(`${cssProperty}: ${cssValue}`);
    }
  }

  processColor(value) {
    if (value.startsWith("theme-")) {
      return `var(--${value})`;
    }
    if (this.colorRegex.HEX.test(value)) return `#${value}`;

    if (this.colorRegex.RGB.test(value)) {
      const [r, g, b] = value.split(/\s+/);
      return `rgb(${r}, ${g}, ${b})`;
    }

    if (this.colorRegex.RGBA.test(value)) {
      const [r, g, b, a] = value.split(/\s+/);
      const alpha = parseInt(a) > 1 ? parseInt(a) / 100 : a;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    return value;
  }

  processGroupPseudoClass(className) {
    const match = className.match(REGEXES.GROUP_PSEUDO);
    if (!match) return false;

    const [, propertiesGroup, pseudoSelector] = match;
    const selector = `.${className.replace(
      /[[\]]/g,
      "\\$&"
    )}:${pseudoSelector}`;
    const declarations = this.getDeclarationSet();

    const properties = this.splitPropertiesGroup(propertiesGroup);
    for (const prop of properties) {
      const propMatch = prop.match(REGEXES.PROP_VALUE);
      if (propMatch) {
        const [, property, value] = propMatch;
        this.addStyleDeclaration(declarations, property, value);
      }
    }

    this.marssel.styleManager.addDeclarationsWithMediaQuery(
      [],
      selector,
      declarations
    );

    this.returnDeclarationSet(declarations);
    return true;
  }

  splitPropertiesGroup(propertiesGroup) {
    const properties = [];
    let currentProp = "";
    let bracketCount = 0;

    for (const char of propertiesGroup) {
      if (char === "[") bracketCount++;
      else if (char === "]") bracketCount--;
      else if (char === "_" && bracketCount === 0) {
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
