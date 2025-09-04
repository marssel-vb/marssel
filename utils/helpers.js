// Importation des constantes
import { breakpoints } from "./constants.js";
import { LRUCache } from "./LRUCache.js";

// Cache pour les regex compilées - améliore les performances
const REGEX_CACHE = Object.freeze({
    CSS_FUNCTIONS: /(\w+)\[([^\]]+)\]/g,
    BRACKETS_OPEN: /\[/g,
    BRACKETS_CLOSE: /\]/g,
    ESCAPE_BRACKETS: /[\[\]]/g,
});

// Cache pour les conversions de breakpoints
const breakpointCache = new LRUCache(100);

// Set pour les breakpoints valides (performance O(1) pour has)
const validBreakpoints = new Set(Object.keys(breakpoints));

/**
 * Nettoie et normalise une valeur CSS avec optimisations de performance
 * @param {string} value - La valeur à nettoyer
 * @returns {string} - La valeur nettoyée
 */
export const cleanValue = (value) => {
    if (!value || typeof value !== "string") {
        return "";
    }

    // Convertir underscores en espaces D'ABORD
    let cleaned = value.replace(/_/g, " ");

    // Ajout du # pour hex AVANT la transformation des thèmes
    cleaned = addHashToHex(cleaned);

    // Transformer les thèmes EN DERNIER (après addHashToHex)
    if (cleaned.includes("theme-") && !cleaned.includes("var(--theme-")) {
        cleaned = cleaned.replace(
            /\btheme-([a-zA-Z0-9-]+)\b/g,
            "var(--theme-$1)"
        );
    }

    return cleaned;
};

export const cleanValueFast = (value) => {
    // Pour les valeurs simples (80% des cas), éviter toutes les regex
    if (!value.includes("[") && !value.includes("_") && !value.includes("d")) {
        return value.replace(/pc/g, "%");
    }
    // Sinon fallback sur la version complète
    return cleanValue(value);
};

/**
 * Ajoute le symbole # aux couleurs hexadécimales
 * @param {string} value - La valeur contenant potentiellement des couleurs hexa
 * @returns {string} - La valeur avec les # ajoutés
 */
export const addHashToHex = (value) => {
    if (!value || typeof value !== "string") {
        return "";
    }

    // Ne pas traiter si contient rgb/rgba
    if (/rgba?\(/.test(value)) {
        return value;
    }

    // Split par espaces et virgules, en gardant les séparateurs
    const parts = value.split(/(\s+|,)/);

    return parts
        .map((part) => {
            // Ne rien faire avec les séparateurs
            if (/^\s*$|^,$/.test(part)) {
                return part;
            }

            const trimmed = part.trim();

            // CRITIQUE : Ne PAS convertir si contient une unité CSS
            if (
                /(\d+\.?\d*)(deg|turn|rad|grad|px|em|rem|%|vh|vw|vmin|vmax|ch|ex|ms|s)$/i.test(
                    trimmed
                )
            ) {
                return part;
            }

            // Ne PAS convertir les nombres purs
            if (/^\d+\.?\d*$/.test(trimmed)) {
                return part;
            }

            // Tester si c'est un hex valide (3 ou 6 caractères)
            const hexMatch = trimmed.match(/^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
            if (hexMatch) {
                const hex = hexMatch[1];
                const hasLetters = /[A-Fa-f]/i.test(hex);
                const threeIdentical =
                    hex.length === 3 &&
                    hex[0].toLowerCase() === hex[1].toLowerCase() &&
                    hex[1].toLowerCase() === hex[2].toLowerCase();
                const isSixChars = hex.length === 6;

                if (hasLetters || threeIdentical || isSixChars) {
                    return part.replace(hex, `#${hex.toUpperCase()}`);
                }
            }

            return part;
        })
        .join("");
};

/**
 * Traite les couleurs hexadécimales et les thèmes dans les valeurs de gradient
 * @param {string} value - La valeur du gradient
 * @returns {string} - La valeur CSS finale
 */
export const processGradientColors = (value) => {
    if (!value || typeof value !== "string") {
        return "";
    }

    // 1. Normaliser les espaces (convertir _ en espace)
    const valueWithSpaces = value.replace(/_/g, " ");

    // 2. Protéger les fonctions existantes (rgb, var, calc, etc.)
    const functions = [];
    let protectedValue = valueWithSpaces.replace(
        /(rgba?|hsla?|var|calc|min|max|clamp)\([^)]+\)/gi,
        (match) => {
            const placeholder = `__FUNC_${functions.length}__`;
            functions.push(match);
            return placeholder;
        }
    );

    // 3. CORRECTIF : Transformer les thèmes (theme-xxx -> var(--theme-xxx))
    // On le fait sur la partie non protégée
    protectedValue = protectedValue.replace(
        /\btheme-([a-zA-Z0-9-]+)\b/g,
        "var(--theme-$1)"
    );

    // 4. Traitement des couleurs Hexadécimales
    const parts = protectedValue.split(/([,\s]+)/);

    const processedParts = parts.map((part) => {
        const trimmed = part.trim();

        // Ignorer séparateurs et placeholders
        if (
            !trimmed ||
            /^[,\s]+$/.test(part) ||
            /^__FUNC_\d+__$/.test(trimmed)
        ) {
            return part;
        }

        // Ignorer unités CSS, "transparent" et nombres purs
        if (
            /(\d+\.?\d*)(deg|turn|rad|grad|px|em|rem|%|vh|vw|vmin|vmax)$/i.test(
                trimmed
            ) ||
            trimmed === "transparent" ||
            /^\d+\.?\d*$/.test(trimmed)
        ) {
            return part;
        }

        // Convertir Hexadécimal
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

    // 5. Restaurer les fonctions CSS protégées
    functions.forEach((func, index) => {
        result = result.replace(`__FUNC_${index}__`, func);
    });

    return result;
};

/**
 * Echappe une valeur pour l'utilisation dans les sélecteurs CSS
 */
export const escapeValue = (value) => {
    if (!value || typeof value !== "string") {
        return "";
    }

    return value
        .replace(/\[/g, "\\[")
        .replace(/\]/g, "\\]")
        .replace(/\+/g, "\\+")
        .replace(/:/g, "\\:")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
        .replace(/%/g, "\\%")
        .replace(/,/g, "\\,")
        .replace(/\./g, "\\.")
        .replace(/\//g, "\\/")
        .replace(/_/g, "\\_");
};

/**
 * Construit une media query à partir d'une liste de breakpoints
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
 * Construit une déclaration CSS
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
 * Utilitaires supplémentaires pour l'optimisation
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
