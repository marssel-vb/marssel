import { escapeValue } from "./helpers.js";
import { CLASS_REGEX, REGEX_PATTERNS } from "./constants.js";
import { LRUCache } from "./LRUCache.js";

const GUTTER_REGEX = /^([\d.]+)(px|em|rem|%|pc)$/;
const parseCache = new LRUCache(500);
const classNameCache = new LRUCache(300);

let operationCount = 0;
const CACHE_CHECK_INTERVAL = 500;
const resultPool = [];
let poolIndex = 0;
const getResultObject = () => {
    if (poolIndex < resultPool.length) {
        return resultPool[poolIndex++];
    }
    const obj = {};
    resultPool.push(obj);
    poolIndex++;
    return obj;
};

/**
 * Construct the final class name in an optimized way.
 */
export const buildFinalClassName = (
    breakpoints,
    property,
    value,
    pseudoModifiers,
    isImportant = false,
) => {
    const cacheKey = `${breakpoints.join("--")}|${property}|${value}|${
        pseudoModifiers || ""
    }|${isImportant}`;

    if (classNameCache.has(cacheKey)) {
        return classNameCache.get(cacheKey);
    }

    const escapedValue = escapeValue(value);
    let className = `${property}-\\[${escapedValue}\\]`;

    if (breakpoints.length > 0) {
        className = `${breakpoints.join("--")}--${className}`;
    }

    if (pseudoModifiers) {
        className += `:${pseudoModifiers}`;
    }

    if (isImportant) {
        className += "\\!";
    }

    classNameCache.set(cacheKey, className);
    return className;
};

/**
 * Parse a CSS class name with validation and caching
 */
export const parseClassName = (className) => {
    if (!className || typeof className !== "string") return null;

    if (parseCache.has(className)) {
        return parseCache.get(className);
    }

    const match = className.match(CLASS_REGEX);
    if (!match) {
        parseCache.set(className, null);
        return null;
    }

    const [
        ,
        component,
        breakpoints,
        property,
        value,
        pseudoModifiers,
        important,
    ] = match;

    if (!property || !value) {
        parseCache.set(className, null);
        return null;
    }

    const bpList = breakpoints ? breakpoints.split("--").filter(Boolean) : [];
    const isImportant = Boolean(important);
    const result = getResultObject();
    result.component = component || null;
    result.breakpoints = bpList;
    result.property = property;
    result.value = value;
    result.pseudoModifiers = pseudoModifiers || null;
    result.isImportant = isImportant;
    result.escapedValue = escapeValue(value);
    result.finalClassName = buildFinalClassName(
        bpList,
        property,
        value,
        pseudoModifiers,
        isImportant,
    );

    parseCache.set(className, result);
    return result;
};

/**
 * Parses a portion of a CSS class for a specific component
 */
export const parseClassPart = (component, styleClass) => {
    if (!component || !styleClass || typeof styleClass !== "string") {
        return null;
    }

    const cacheKey = `${component}:${styleClass}`;

    if (parseCache.has(cacheKey)) {
        return parseCache.get(cacheKey);
    }

    const match = styleClass.match(REGEX_PATTERNS.CLASS);
    if (!match) {
        parseCache.set(cacheKey, null);
        return null;
    }

    const [, breakpoints, property, value, pseudoModifiers, important] = match;
    const isImportant = Boolean(important);

    if (!property || !value) {
        parseCache.set(cacheKey, null);
        return null;
    }

    const bpList = breakpoints
        ? breakpoints.split("--").filter((bp) => bp.trim())
        : [];

    const result = {
        component,
        breakpoints: bpList,
        property,
        value,
        pseudoModifiers: pseudoModifiers || null,
        isImportant,
        escapedValue: escapeValue(value),
        finalClassName: buildFinalClassName(
            bpList,
            property,
            value,
            pseudoModifiers,
            isImportant,
        ),
    };

    parseCache.set(cacheKey, result);
    return result;
};

/**
 * Parse a gutter value with improved validation
 */
export const parseGutterValue = (value) => {
    if (!value || typeof value !== "string") {
        return null;
    }

    const match = value.match(/^([\d.]+)(px|em|rem|%)$/);
    if (!match) {
        return null;
    }

    const [, numValue, unit] = match;
    const parsedValue = parseFloat(numValue);

    if (isNaN(parsedValue) || parsedValue < 0) {
        return null;
    }

    const halfValue = parsedValue / 2;
    return `${halfValue}${unit}`;
};

/**
 * Valid if a class name conforms to the expected format
 */
export const isValidClassName = (className) => {
    return typeof className === "string" && CLASS_REGEX.test(className);
};

/**
 * Extracts all breakpoints from a class name
 */
export const extractBreakpoints = (className) => {
    const parsed = parseClassName(className);
    return parsed ? parsed.breakpoints : [];
};

/**
 * Extracts the CSS property from a class name
 */
export const extractProperty = (className) => {
    const parsed = parseClassName(className);
    return parsed ? parsed.property : null;
};

/**
 * Extracts the value of a class name
 */
export const extractValue = (className) => {
    const parsed = parseClassName(className);
    return parsed ? parsed.value : null;
};

/**
 * Checks if a class name has pseudo-modifiers
 */
export const hasPseudoModifiers = (className) => {
    const parsed = parseClassName(className);
    return parsed ? !!parsed.pseudoModifiers : false;
};

/**
 * Check if a class name is marked as important
 */
export const isImportant = (className) => {
    const parsed = parseClassName(className);
    return parsed ? parsed.isImportant : false;
};

/**
 * Extracts the importance modifiers (!important) from a class name
 */
export const extractImportance = (className) => {
    const parsed = parseClassName(className);
    return parsed ? parsed.isImportant : false;
};

/**
 * Normalise un nom de classe (supprime les espaces, caractères invalides, etc.)
 */
export const normalizeClassName = (className) => {
    if (!className || typeof className !== "string") {
        return "";
    }

    return className
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[^\w\-\[\]\\():,.#%\s!/]/g, "")
        .split(" ")
        .filter((cls) => cls.length > 0)
        .join(" ");
};

/**
 * Creates an important version of a class name
 */
export const makeImportant = (className) => {
    if (!className || typeof className !== "string") {
        return "";
    }

    const parsed = parseClassName(className);
    if (!parsed) {
        return className.endsWith("!") ? className : className + "!";
    }

    if (parsed.isImportant) {
        return className;
    }

    return buildFinalClassName(
        parsed.breakpoints,
        parsed.property,
        parsed.value,
        parsed.pseudoModifiers,
        true,
    );
};

/**
 * Removes the !important flag from a class name
 */
export const removeImportant = (className) => {
    if (!className || typeof className !== "string") {
        return "";
    }

    const parsed = parseClassName(className);
    if (!parsed) {
        return className.endsWith("!") ? className.slice(0, -1) : className;
    }

    if (!parsed.isImportant) {
        return className;
    }

    return buildFinalClassName(
        parsed.breakpoints,
        parsed.property,
        parsed.value,
        parsed.pseudoModifiers,
        false,
    );
};

/**
 * Parse a class with advanced handling of important modifiers
 */
export const parseClassWithImportance = (className, forceImportant = false) => {
    const parsed = parseClassName(className);
    if (!parsed) return null;

    if (forceImportant && !parsed.isImportant) {
        return {
            ...parsed,
            isImportant: true,
            finalClassName: buildFinalClassName(
                parsed.breakpoints,
                parsed.property,
                parsed.value,
                parsed.pseudoModifiers,
                true,
            ),
        };
    }

    return parsed;
};

/**
 * Optimize performance by periodically clearing caches
 */
export const clearParseCache = () => {
    parseCache.clear();
    classNameCache.clear();
};

/**
 * Retrieves cache statistics for debugging
 */
export const getCacheStats = () => {
    return {
        parseCache: {
            size: parseCache.size,
            maxSize: 1000,
        },
        classNameCache: {
            size: classNameCache.size,
            maxSize: 500,
        },
    };
};

/**
 * Automatically cleans the cache if it becomes too large
 */
const autoCleanCache = () => {
    if (parseCache.size > 1000) {
        const entries = Array.from(parseCache.entries());
        parseCache.clear();
        entries.slice(-700).forEach(([k, v]) => parseCache.set(k, v));
    }

    if (classNameCache.size > 500) {
        const entries = Array.from(classNameCache.entries());
        classNameCache.clear();
        entries.slice(-350).forEach(([k, v]) => classNameCache.set(k, v));
    }
};

export const parseRGBValue = (value) => {
    return value.replace(/_/g, ", ");
};
export const parseRGBAValue = (value) => {
    const parts = value.split(/_/);
    if (parts.length === 4) {
        const [r, g, b, a] = parts;
        const alpha = parseFloat(a) > 1 ? parseFloat(a) / 100 : a;
        return `${r}, ${g}, ${b}, ${alpha}`;
    }
    return value.replace(/\s+/g, ", ");
};
