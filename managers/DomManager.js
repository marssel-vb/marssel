import { parseClassName, parseClassPart } from "../utils/parsed.js";
import { cleanValue } from "../utils/helpers.js";

// Pré-compilation des regex
const STYLE_CLASS_REGEX = /-\[|^\[.*\]-|---\[/;
const COMPACT_STYLE_REGEX = /^(.*?)\]-([\w-:()[\]]+)$/;
const PROP_VALUE_REGEX = /^([a-z0-9-]+)-\[(.*)\]$/;
const FONT_REGEX = /(.*)\[(\d+)\]/;
const GROUP_PSEUDO_REGEX = /^\[(.*)\]-([a-z-_:()[\]]+)$/;

export class DomManager {
    constructor(marssel) {
        this.marssel = marssel;
        // Cache des propriétés fréquentes
        this.props = marssel.constructor.properties;
        this.colorRegex = marssel.constructor.COLOR_REGEX;
    }

    setupObservers() {
        const observer = new MutationObserver((mutations) => {
            let needsUpdate = false;

            for (const mutation of mutations) {
                if (
                    mutation.type === "attributes" &&
                    mutation.attributeName === "class"
                ) {
                    this.processElement(mutation.target);
                    needsUpdate = true;
                } else if (mutation.type === "childList") {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            this.processElement(node);
                            needsUpdate = true;
                        }
                    });
                }
            }

            if (needsUpdate) {
                this.marssel.styleManager.debounceStyleUpdate();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class"],
        });
    }

    processAllElements() {
        document
            .querySelectorAll("*")
            .forEach((element) => this.processElement(element));
    }

    processElement(element) {
        if (!(element instanceof HTMLElement)) return;

        const classList = Array.from(element.classList);
        const stylingClasses = classList.filter(
            (className) =>
                className.includes("-") &&
                (className.includes("-") ||
                    (className.startsWith("[") && className.includes("]-")) ||
                    className.includes("---[") ||
                    (className.includes("--") &&
                        (className.includes("-[") ||
                            className.includes("---["))))
        );

        if (!stylingClasses.length) return;

        if (this.marssel.styleManager.lazyload) {
            this.marssel.styleManager.lazyElements.set(element, stylingClasses);
            this.marssel.styleManager.lazyObserver.observe(element);
        } else {
            this.processClasses(stylingClasses);
        }
    }

    processClasses(classes) {
        for (const className of classes) {
            if (className.startsWith("[") && className.includes("]-")) {
                this.processGroupPseudoClass(className);
            } else if (className.includes("+")) {
                this.processCombinedClass(className);
            } else if (className.includes("---[")) {
                this.processCompactStyles(className);
            } else {
                this.processClassName(className);
            }
        }
    }

    processCompactStyles(className) {
        let [componentWithBreakpoints, stylesBlock] = className.split("---");
        let breakpoints = [];

        if (componentWithBreakpoints.includes("--")) {
            const parts = componentWithBreakpoints.split("--");
            breakpoints = parts.slice(0, -1);
            componentWithBreakpoints = parts[parts.length - 1];
        }

        let pseudoModifier = null;
        const pseudoMatch = stylesBlock.match(COMPACT_STYLE_REGEX);
        if (pseudoMatch) {
            stylesBlock = pseudoMatch[1] + "]";
            pseudoModifier = pseudoMatch[2];
        }

        if (!stylesBlock?.startsWith("[") || !stylesBlock?.endsWith("]"))
            return;

        const stylesContent = stylesBlock.slice(1, -1);
        const stylesList = stylesContent.split("__").filter(Boolean);
        const escapedClassName = componentWithBreakpoints.replace(
            /[[\]]/g,
            "\\$&"
        );
        const selector = this.generateSelector(
            escapedClassName,
            pseudoModifier
        );
        const declarations = new Set();

        for (const style of stylesList) {
            const match = style.match(PROP_VALUE_REGEX);
            if (!match) continue;

            const [, property, value] = match;
            this.addStyleDeclaration(declarations, property, value);
        }

        this.marssel.styleManager.addDeclarationsWithMediaQuery(
            breakpoints,
            selector,
            declarations
        );
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

    processCombinedClass(className) {
        const [componentName, stylesPart] = className.split("---");
        if (!stylesPart) {
            this.processStandardCombined(className);
            return;
        }

        const selector = `.${componentName}`;
        const declarations = new Set();
        const styleClasses = stylesPart.split("+").filter(Boolean);
        let breakpoints = [];

        for (const styleClass of styleClasses) {
            const parsed = parseClassPart(componentName, styleClass);
            if (!parsed) continue;

            breakpoints = parsed.breakpoints || breakpoints;
            this.addStyleDeclaration(
                declarations,
                parsed.property,
                parsed.value
            );
        }

        this.marssel.styleManager.addDeclarationsWithMediaQuery(
            breakpoints,
            selector,
            declarations
        );
    }

    processStandardCombined(className) {
        const parts = className.split("+");
        const firstPart = parts[0];
        let breakpointPrefix = "";
        let breakpoints = [];

        if (firstPart.includes("--")) {
            const breakpointSection = firstPart.split("--")[0];
            breakpointPrefix = `${breakpointSection}--`;
            breakpoints = breakpointSection.split("--");
        }

        const escapedClassName = className.replace(/[[\]+]/g, "\\$&");
        const selector = `.${escapedClassName}`;
        const declarations = new Set();

        for (const [index, part] of parts.entries()) {
            const adjustedPart =
                index > 0 && breakpointPrefix && !part.includes("--")
                    ? breakpointPrefix + part
                    : part;

            const parsed = parseClassName(adjustedPart);
            if (!parsed) continue;

            this.addStyleDeclaration(
                declarations,
                parsed.property,
                parsed.value
            );
        }

        this.marssel.styleManager.addDeclarationsWithMediaQuery(
            breakpoints,
            selector,
            declarations
        );
    }

    processClassName(className) {
        const [componentName, stylesPart] = className.split("---");

        if (!stylesPart) {
            this.processSingleStyle(className);
            return;
        }

        const groupedMatch = stylesPart.match(
            /^\[(.*)\]-([a-z-]+(?:-[a-z-]+)*)$/
        );
        if (groupedMatch) {
            const [, groupedStyles, sharedModifier] = groupedMatch;
            groupedStyles
                .split("+")
                .filter(Boolean)
                .forEach((style) => {
                    this.processSingleStyle(`${style}-${sharedModifier}`);
                });
            return;
        }

        stylesPart
            .split("+")
            .filter(Boolean)
            .forEach((styleClass) => {
                const parsed = parseClassPart(componentName, styleClass);
                if (parsed) this.marssel.styleManager.addStyleRule(parsed);
            });
    }

    processSingleStyle(className) {
        const parsed = parseClassName(className);
        if (parsed) this.marssel.styleManager.addStyleRule(parsed);
    }

    addStyleDeclaration(declarations, property, value) {
        if (property === "bg" || property === "background-color") {
            declarations.add(`background-color: ${this.processColor(value)}`);
        } else if (property === "c" || property === "color") {
            declarations.add(`color: ${this.processColor(value)}`);
        } else if (property === "content") {
            declarations.add(`content: "${value.replace(/_/g, " ")}"`);
        } else if (property === "font") {
            const fontMatch = value.match(FONT_REGEX);
            if (fontMatch) {
                const [, family, variant] = fontMatch;
                this.marssel.fontManager.handleFont(family, variant);
                declarations.add(`font-family: '${family}', sans-serif`);
                declarations.add(`font-weight: ${variant}`);
            }
        } else {
            const cssProperty =
                this.props[property] || property.replace(/_/g, "-");
            const cssValue = cleanValue(value);

            if (Array.isArray(cssProperty)) {
                cssProperty.forEach((prop) =>
                    declarations.add(`${prop}: ${cssValue}`)
                );
            } else {
                declarations.add(`${cssProperty}: ${cssValue}`);
            }
        }
    }

    processColor(value) {
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
        const match = className.match(GROUP_PSEUDO_REGEX);
        if (!match) return false;

        const [, propertiesGroup, pseudoSelector] = match;
        const selector = `.${className.replace(
            /[[\]]/g,
            "\\$&"
        )}:${pseudoSelector}`;
        const declarations = new Set();

        const properties = this.splitPropertiesGroup(propertiesGroup);
        for (const prop of properties) {
            const propMatch = prop.match(PROP_VALUE_REGEX);
            if (!propMatch) continue;

            const [, property, value] = propMatch;
            this.addStyleDeclaration(declarations, property, value);
        }

        this.marssel.styleManager.addDeclarationsWithMediaQuery(
            [],
            selector,
            declarations
        );
        return true;
    }

    splitPropertiesGroup(propertiesGroup) {
        const properties = [];
        let currentProp = "";
        let bracketCount = 0;

        for (const char of propertiesGroup) {
            if (char === "[") bracketCount++;
            if (char === "]") bracketCount--;

            if (char === "_" && bracketCount === 0) {
                if (currentProp) properties.push(currentProp);
                currentProp = "";
            } else {
                currentProp += char;
            }
        }

        if (currentProp) properties.push(currentProp);
        return properties;
    }
}
