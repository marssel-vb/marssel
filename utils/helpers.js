// Importation des constantes
import { breakpoints } from "./constants.js";

// Cache pour les regex compilées - améliore les performances
const REGEX_CACHE = Object.freeze({
    // Fonctions CSS (rgba, translateX, etc.)
    CSS_FUNCTIONS: /(\w+)\[([^\]]+)\]/g,

    // Couleurs rgb/rgba spécifiques
    RGB_RGBA: /(rgb|rgba)\[([^\]]+)\]/g,

    // Conversions générales
    DECIMAL_DOT: /(\d)d(\d)/g,
    PERCENT: /pc/g,
    BRACKETS_OPEN: /\[/g,
    BRACKETS_CLOSE: /\]/g,
    DOUBLE_UNDERSCORE: /__/g,
    SINGLE_UNDERSCORE: /_/g,
    COMMA_SPACE: /, /g,

    // Couleurs hexadécimales (regex optimisée)
    HEX_COLOR:
        /(?<!#)(?<!rgba?\[|rgb\()[A-Fa-f0-9]{6}|([A-Fa-f0-9])\1\1(?=[^a-zA-Z0-9#]|$)(?!\])(?!(,\s*\d))/g,

    // Échappement
    ESCAPE_BRACKETS: /[\[\]]/g,
    SPACES: / /g,
});

// Cache pour les conversions de breakpoints
const breakpointCache = new Map();

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

    // Étape 1 : Traitement des fonctions CSS générales
    let cleaned = value.replace(
        REGEX_CACHE.CSS_FUNCTIONS,
        (match, fn, params) => {
            const processedParams = params
                .replace(REGEX_CACHE.SINGLE_UNDERSCORE, ", ")
                .replace(REGEX_CACHE.DECIMAL_DOT, "$1.$2")
                .replace(REGEX_CACHE.PERCENT, "%");

            return `${fn}(${processedParams})`;
        }
    );

    // Étape 2 : Traitement spécialisé des couleurs rgb/rgba
    cleaned = cleaned.replace(REGEX_CACHE.RGB_RGBA, (match, type, params) => {
        const values = params.split("_").map((val) => val.trim());

        if (type === "rgb" && values.length >= 3) {
            return `rgb(${values.slice(0, 3).join(", ")})`;
        }

        if (type === "rgba" && values.length >= 4) {
            const alpha = parseFloat(values[3]);
            const normalizedAlpha = alpha > 1 ? alpha / 100 : alpha;
            return `rgba(${values.slice(0, 3).join(", ")}, ${normalizedAlpha})`;
        }

        return match;
    });

    // Étape 3 : Conversions générales (optimisées avec regex pré-compilées)
    cleaned = cleaned
        .replace(REGEX_CACHE.DECIMAL_DOT, "$1.$2")
        .replace(REGEX_CACHE.PERCENT, "%")
        .replace(REGEX_CACHE.BRACKETS_OPEN, "(")
        .replace(REGEX_CACHE.BRACKETS_CLOSE, ")")
        .replace(REGEX_CACHE.DOUBLE_UNDERSCORE, ",")
        .replace(REGEX_CACHE.SINGLE_UNDERSCORE, " ")
        .replace(REGEX_CACHE.COMMA_SPACE, ",");

    // Étape 4 : Finalisation des fonctions de couleur
    cleaned = cleaned.replace(
        /(rgba?|hsla?)\(([^)]+)\)/g,
        (match, fn, params) => {
            return `${fn}(${params.replace(/ /g, ",")})`;
        }
    );

    // Étape 5 : Ajout automatique du # pour les couleurs hexadécimales
    return addHashToHex(cleaned);
};

/**
 * Ajoute le symbole # aux couleurs hexadécimales (nom plus descriptif)
 * @param {string} value - La valeur contenant potentiellement des couleurs hexa
 * @returns {string} - La valeur avec les # ajoutés
 */
export const addHashToHex = (value) => {
    if (!value || typeof value !== "string") {
        return "";
    }

    return value.replace(
        REGEX_CACHE.HEX_COLOR,
        (match) => `#${match.toUpperCase()}`
    );
};

/**
 * Échappe une valeur pour l'utilisation dans les sélecteurs CSS
 * @param {string} value - La valeur à échapper
 * @returns {string} - La valeur échappée
 */
export const escapeValue = (value) => {
    if (!value || typeof value !== "string") {
        return "";
    }

    return value
        .replace(REGEX_CACHE.ESCAPE_BRACKETS, "\\$&") // Échappe [ et ]
        .replace(REGEX_CACHE.SPACES, "_"); // Remplace les espaces par _
};

/**
 * Construit une media query à partir d'une liste de breakpoints avec cache et optimisations
 * @param {string[]} breakpointList - Liste des breakpoints
 * @returns {string|null} - La media query construite ou null
 */
export const buildMediaQuery = (breakpointList) => {
    // Validation rapide
    if (!Array.isArray(breakpointList) || breakpointList.length === 0) {
        return null;
    }

    // Clé de cache pour éviter les recalculs
    const cacheKey = breakpointList.join("|");
    if (breakpointCache.has(cacheKey)) {
        return breakpointCache.get(cacheKey);
    }

    let result = null;

    // Cas spécial : range min-max (2 breakpoints)
    if (breakpointList.length === 2) {
        const [min, max] = breakpointList;
        const minWidth = breakpoints[min];
        const maxWidth = breakpoints[max];

        if (minWidth && maxWidth) {
            result = `(min-width: ${minWidth}) and (max-width: ${maxWidth})`;
        }
    } else {
        // Filtrage optimisé avec Set.has() O(1)
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

    // Mise en cache du résultat
    breakpointCache.set(cacheKey, result);

    // Auto-nettoyage du cache si nécessaire
    if (breakpointCache.size > 100) {
        const entries = Array.from(breakpointCache.entries()).slice(-50);
        breakpointCache.clear();
        entries.forEach(([key, value]) => breakpointCache.set(key, value));
    }

    return result;
};

/**
 * Construit une déclaration CSS à partir d'une propriété et d'une valeur
 * @param {string|string[]} property - La propriété CSS (ou tableau de propriétés)
 * @param {string} value - La valeur CSS
 * @returns {string} - La déclaration CSS construite
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
    /**
     * Nettoie le cache des breakpoints manuellement
     */
    clearBreakpointCache: () => {
        breakpointCache.clear();
    },

    /**
     * Obtient les statistiques du cache
     */
    getCacheStats: () => ({
        breakpointCache: {
            size: breakpointCache.size,
            maxSize: 100,
        },
    }),

    /**
     * Valide rapidement si un breakpoint existe
     */
    isValidBreakpoint: (bp) => {
        const key = bp.startsWith("m") && bp.length === 3 ? bp.slice(1) : bp;
        return validBreakpoints.has(key);
    },

    /**
     * Normalise une liste de breakpoints (supprime les doublons et invalides)
     */
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

// Rétrocompatibilité avec l'ancien nom de fonction
export const addDieseToHex = addHashToHex;
