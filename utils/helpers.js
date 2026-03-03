import { breakpoints } from "./constants.js";
import { LRUCache } from "./LRUCache.js";

const REGEX_CACHE = Object.freeze({
    CSS_FUNCTIONS: /(\w+)\[([^\]]+)\]/g,
    BRACKETS_OPEN: /\[/g,
    BRACKETS_CLOSE: /\]/g,
    ESCAPE_BRACKETS: /[\[\]]/g,
});

const breakpointCache = new LRUCache(100);
const validBreakpoints = new Set(Object.keys(breakpoints));

/**
 * Cleans and normalizes a CSS value with performance optimizations
 * @param {string} value - The value to clean
 * @returns {string} - The cleaned value
 */
export const cleanValue = (value) => {
    if (!value || typeof value !== "string") {
        return "";
    }

    let cleaned = value.replace(/_/g, " ");

    cleaned = cleaned.replace(
        /(?:^|\s)([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})(?=\s|$)/g,
        (match, hex) => {
            if (!/^\d+$/.test(hex) || hex.length === 6 || hex[0] === hex[1]) {
                return match.replace(hex, `#${hex.toUpperCase()}`);
            }
            return match;
        },
    );

    if (cleaned.includes("theme-") && !cleaned.includes("var(--theme-")) {
        cleaned = cleaned.replace(
            /\btheme-([a-zA-Z0-9-]+)\b/g,
            "var(--theme-$1)",
        );
    }

    return cleaned;
};

export const cleanValueFast = (value) => {
    if (!value.includes("[") && !value.includes("_") && !value.includes("d")) {
        return value.replace(/pc/g, "%");
    }

    return cleanValue(value);
};

/**
 * Adds the # symbol to hexadecimal colors
 * @param {string} value - The value potentially containing hexadecimal colors
 * @returns {string} - The value with the # symbol added
 */
export const addHashToHex = (value) => {
    if (!value || typeof value !== "string") {
        return "";
    }

    if (/rgba?\(/.test(value)) {
        return value;
    }

    if (value.match(/^\d{3}$/) && !value.match(/[a-fA-F]/)) {
        return value;
    }

    const parts = value.split(/(\s+|,)/);

    return parts
        .map((part) => {
            if (/^\s*$|^,$/.test(part)) {
                return part;
            }

            const trimmed = part.trim();

            if (
                /(\d+\.?\d*)(deg|turn|rad|grad|px|em|rem|%|vh|vw|vmin|vmax|ch|ex|ms|s)$/i.test(
                    trimmed,
                )
            ) {
                return part;
            }

            if (
                /^\d+$/.test(trimmed) &&
                trimmed.length !== 3 &&
                trimmed.length !== 6
            ) {
                return part;
            }

            if (trimmed.includes(".")) {
                return part;
            }

            const hexMatch = trimmed.match(/^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
            if (hexMatch) {
                const hex = hexMatch[1];
                if (/[a-fA-F]/.test(hex)) {
                    return `#${hex.toUpperCase()}`;
                }

                if (hex.length === 3) {
                    if (/[a-fA-F]/.test(hex)) {
                        return `#${hex.toUpperCase()}`;
                    }

                    return `#${hex.toUpperCase()}`;
                }

                if (hex.length === 6) {
                    const isLikelyColor =
                        /[a-fA-F]/.test(hex) ||
                        hex.split("").every((c) => c === hex[0]);

                    if (isLikelyColor) {
                        return `#${hex.toUpperCase()}`;
                    }
                }
            }

            return part;
        })
        .join("");
};

/**
 * Handles hexadecimal colors and themes in gradient values
 * @param {string} value - The gradient value
 * @returns {string} - The final CSS value
 */
export const processGradientColors = (value) => {
    if (!value || typeof value !== "string") {
        return "";
    }

    const valueWithSpaces = value.replace(/_/g, " ");
    const functions = [];
    let protectedValue = valueWithSpaces.replace(
        /(rgba?|hsla?|var|calc|min|max|clamp)\([^)]+\)/gi,
        (match) => {
            const placeholder = `__FUNC_${functions.length}__`;
            functions.push(match);
            return placeholder;
        },
    );

    protectedValue = protectedValue.replace(
        /\btheme-([a-zA-Z0-9-]+)\b/g,
        "var(--theme-$1)",
    );

    const parts = protectedValue.split(/([,\s]+)/);
    const processedParts = parts.map((part) => {
        const trimmed = part.trim();

        if (
            !trimmed ||
            /^[,\s]+$/.test(part) ||
            /^__FUNC_\d+__$/.test(trimmed)
        ) {
            return part;
        }

        if (
            /(\d+\.?\d*)(deg|turn|rad|grad|px|em|rem|%|vh|vw|vmin|vmax)$/i.test(
                trimmed,
            ) ||
            trimmed === "transparent" ||
            /^\d+\.?\d*$/.test(trimmed)
        ) {
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
};

/**
 * Escapes a value for use in CSS selectors
 */
export const escapeValue = (value) => {
    if (!value || typeof value !== "string") {
        return "";
    }

    return (
        value
            .replace(/\[/g, "\\[")
            .replace(/\]/g, "\\]")
            .replace(/\+/g, "\\+")
            .replace(/:/g, "\\:")
            .replace(/\(/g, "\\(")
            .replace(/\)/g, "\\)")
            .replace(/%/g, "\\%")
            .replace(/,/g, "\\,")
            .replace(/\./g, "\\.")
            //.replace(/\//g, "\\/")
            .replace(/_/g, "\\_")
    );
};

/**
 * Constructs a media query from a list of breakpoints
 */
export const buildMediaQuery = (breakpointList) => {
    if (!Array.isArray(breakpointList) || breakpointList.length === 0) {
        return null;
    }

    const cacheKey = breakpointList.join("|");
    if (breakpointCache.has(cacheKey)) {
        return breakpointCache.get(cacheKey);
    }

    let result = null;

    if (breakpointList.length === 2) {
        const [min, max] = breakpointList;
        const minWidth = breakpoints[min];
        const maxWidth = breakpoints[max];

        if (minWidth && maxWidth) {
            result = `(min-width: ${minWidth}) and (max-width: ${maxWidth})`;
        }
    } else {
        const validBps = breakpointList.filter((bp) => {
            const key =
                bp.startsWith("m") && bp.length === 3 ? bp.slice(1) : bp;
            return validBreakpoints.has(key);
        });

        if (validBps.length > 0) {
            result = validBps
                .map((bp) => {
                    if (bp.startsWith("m") && bp.length === 3) {
                        const bpKey = bp.slice(1);
                        return `(max-width: ${breakpoints[bpKey]})`;
                    }
                    return `(min-width: ${breakpoints[bp]})`;
                })
                .join(" and ");
        }
    }

    if (breakpointCache.size >= 100) {
        const firstKey = breakpointCache.keys().next().value;
        breakpointCache.delete(firstKey);
    }

    breakpointCache.set(cacheKey, result);
    return result;
};

/**
 * Constructs a CSS declaration
 */
export const buildDeclaration = (property, value) => {
    if (!property || !value) {
        return "";
    }

    return Array.isArray(property)
        ? property.map((prop) => `${prop}: ${value}`).join("; ")
        : `${property}: ${value}`;
};

/**
 * Additional utilities for optimization
 */
export const utils = Object.freeze({
    clearBreakpointCache: () => {
        breakpointCache.clear();
    },
    getCacheStats: () => ({
        breakpointCache: {
            size: breakpointCache.size,
            maxSize: 100,
        },
    }),
    isValidBreakpoint: (bp) => {
        const key = bp.startsWith("m") && bp.length === 3 ? bp.slice(1) : bp;
        return validBreakpoints.has(key);
    },
    normalizeBreakpoints: (bpList) => {
        if (!Array.isArray(bpList)) return [];
        const seen = new Set();
        return bpList.filter((bp) => {
            if (seen.has(bp) || !utils.isValidBreakpoint(bp)) {
                return false;
            }
            seen.add(bp);
            return true;
        });
    },
});

export const addDieseToHex = addHashToHex;
