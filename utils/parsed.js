import { escapeValue } from "./helpers.js";
import { CLASS_REGEX, REGEX_PATTERNS } from "./constants.js";

// Cache pour les regex compilées
const PART_REGEX =
    /^(?:(?:m--)?([a-z0-9]+(?:--[a-z0-9]+)*)--)?([a-z0-9-]+)-\[(.*?)\](?:-([a-z-_]+(?:-[a-z-_]+)*))?$/;
const GUTTER_REGEX = /^([\d.]+)(px|em|rem|%|pc)$/;

// Cache pour les résultats de parsing
const parseCache = new Map();
const classNameCache = new Map();

/**
 * Construit le nom de classe final de manière optimisée
 */
export const buildFinalClassName = (
    breakpoints,
    property,
    value,
    pseudoModifiers
) => {
    // Crée une clé de cache unique
    const cacheKey = `${breakpoints.join("--")}|${property}|${value}|${
        pseudoModifiers || ""
    }`;

    if (classNameCache.has(cacheKey)) {
        return classNameCache.get(cacheKey);
    }

    const escapedValue = escapeValue(value);
    let className = `${property}-\\[${escapedValue}\\]`;

    if (breakpoints.length > 0) {
        className = `${breakpoints.join("--")}--${className}`;
    }

    if (pseudoModifiers) {
        className += `-${pseudoModifiers}`;
    }

    // Met en cache le résultat
    classNameCache.set(cacheKey, className);
    return className;
};

/**
 * Parse un nom de classe CSS avec validation et cache
 */
export const parseClassName = (className) => {
    if (!className || typeof className !== "string") {
        return null;
    }

    // Vérifie le cache d'abord
    if (parseCache.has(className)) {
        return parseCache.get(className);
    }

    const match = className.match(CLASS_REGEX);
    if (!match) {
        parseCache.set(className, null);
        return null;
    }

    const [, component, breakpoints, property, value, pseudoModifiers] = match;

    // Validation des données extraites
    if (!property || !value) {
        parseCache.set(className, null);
        return null;
    }

    const bpList = breakpoints
        ? breakpoints.split("--").filter((bp) => bp.trim())
        : [];

    const result = {
        component: component || null,
        breakpoints: bpList,
        property,
        value,
        pseudoModifiers: pseudoModifiers || null,
        escapedValue: escapeValue(value),
        finalClassName: buildFinalClassName(
            bpList,
            property,
            value,
            pseudoModifiers
        ),
    };

    // Met en cache le résultat
    parseCache.set(className, result);

    // Auto-nettoyage du cache
    if (++operationCount % 100 === 0) {
        autoCleanCache();
    }

    return result;
};

/**
 * Parse une partie de classe CSS pour un composant spécifique
 */
export const parseClassPart = (component, styleClass) => {
    if (!component || !styleClass || typeof styleClass !== "string") {
        return null;
    }

    // Crée une clé de cache unique pour la combinaison composant/classe
    const cacheKey = `${component}:${styleClass}`;

    if (parseCache.has(cacheKey)) {
        return parseCache.get(cacheKey);
    }

    const match = styleClass.match(PART_REGEX);
    if (!match) {
        parseCache.set(cacheKey, null);
        return null;
    }

    const [, breakpoints, property, value, pseudoModifiers] = match;

    // Validation des données extraites
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
        escapedValue: escapeValue(value),
        finalClassName: buildFinalClassName(
            bpList,
            property,
            value,
            pseudoModifiers
        ),
    };

    // Met en cache le résultat
    parseCache.set(cacheKey, result);
    return result;
};

/**
 * Parse une valeur de gouttière avec validation améliorée
 */
export const parseGutterValue = (value) => {
    if (!value || typeof value !== "string") {
        return null;
    }

    const match = value.match(GUTTER_REGEX);
    if (!match) {
        return null;
    }

    const [, numValue, unit] = match;
    const parsedValue = parseFloat(numValue);

    // Validation de la valeur numérique
    if (isNaN(parsedValue) || parsedValue < 0) {
        return null;
    }

    // Conversion spéciale pour 'pc' (pourcentage)
    const finalUnit = unit === "pc" ? "%" : unit;
    const halfValue = parsedValue / 2;

    return `${halfValue}${finalUnit}`;
};

/**
 * Valide si un nom de classe respecte le format attendu
 */
export const isValidClassName = (className) => {
    return typeof className === "string" && CLASS_REGEX.test(className);
};

/**
 * Extrait tous les breakpoints d'un nom de classe
 */
export const extractBreakpoints = (className) => {
    const parsed = parseClassName(className);
    return parsed ? parsed.breakpoints : [];
};

/**
 * Extrait la propriété CSS d'un nom de classe
 */
export const extractProperty = (className) => {
    const parsed = parseClassName(className);
    return parsed ? parsed.property : null;
};

/**
 * Extrait la valeur d'un nom de classe
 */
export const extractValue = (className) => {
    const parsed = parseClassName(className);
    return parsed ? parsed.value : null;
};

/**
 * Vérifie si un nom de classe a des pseudo-modificateurs
 */
export const hasPseudoModifiers = (className) => {
    const parsed = parseClassName(className);
    return parsed ? !!parsed.pseudoModifiers : false;
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
        .replace(/\s+/g, " ") // Normalise les espaces multiples
        .replace(/[^\w\-\[\]\\():,.#%\s]/g, "") // Supprime les caractères non autorisés
        .split(" ")
        .filter((cls) => cls.length > 0)
        .join(" ");
};

/**
 * Optimise les performances en nettoyant les caches périodiquement
 */
export const clearParseCache = () => {
    parseCache.clear();
    classNameCache.clear();
};

/**
 * Obtient les statistiques du cache pour le debugging
 */
export const getCacheStats = () => {
    return {
        parseCache: {
            size: parseCache.size,
            maxSize: 1000, // Limite recommandée
        },
        classNameCache: {
            size: classNameCache.size,
            maxSize: 500, // Limite recommandée
        },
    };
};

/**
 * Nettoie automatiquement le cache s'il devient trop volumineux
 */
const autoCleanCache = () => {
    const stats = getCacheStats();

    if (stats.parseCache.size > stats.parseCache.maxSize) {
        // Garde seulement les 500 dernières entrées
        const entries = Array.from(parseCache.entries()).slice(-500);
        parseCache.clear();
        entries.forEach(([key, value]) => parseCache.set(key, value));
    }

    if (stats.classNameCache.size > stats.classNameCache.maxSize) {
        // Garde seulement les 250 dernières entrées
        const entries = Array.from(classNameCache.entries()).slice(-250);
        classNameCache.clear();
        entries.forEach(([key, value]) => classNameCache.set(key, value));
    }
};

// Auto-nettoyage périodique (toutes les 100 nouvelles entrées)
let operationCount = 0;
