import { escapeValue } from "./helpers.js";
import { CLASS_REGEX, REGEX_PATTERNS } from "./constants.js";
import { LRUCache } from "./LRUCache.js";

// Cache pour les regex compilées
// const PART_REGEX =
//     /^(?:(?:m--)?([a-z0-9]+(?:--[a-z0-9]+)*)--)?([a-z0-9-]+)-\[(.*?)\](?:-([a-z-_]+(?:-[a-z-_]+)*))?(!)?$/;
const GUTTER_REGEX = /^([\d.]+)(px|em|rem|%|pc)$/;

// Cache pour les résultats de parsing
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
 * Construit le nom de classe final de manière optimisée
 */
export const buildFinalClassName = (
    breakpoints,
    property,
    value,
    pseudoModifiers,
    isImportant = false
) => {
    // Crée une clé de cache unique incluant isImportant
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

    // Ajouter le ! pour important (échappé pour CSS)
    if (isImportant) {
        className += "\\!";
    }

    // Met en cache le résultat
    classNameCache.set(cacheKey, className);
    return className;
};

/**
 * Parse un nom de classe CSS avec validation et cache
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

    // Réutiliser un objet du pool au lieu d'en créer un nouveau
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
        isImportant
    );

    parseCache.set(className, result);
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

    const match = styleClass.match(REGEX_PATTERNS.CLASS);
    if (!match) {
        parseCache.set(cacheKey, null);
        return null;
    }

    const [, breakpoints, property, value, pseudoModifiers, important] = match;
    const isImportant = Boolean(important);

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
        isImportant,
        escapedValue: escapeValue(value),
        finalClassName: buildFinalClassName(
            bpList,
            property,
            value,
            pseudoModifiers,
            isImportant
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

    // ✅ MODIFIÉ : Accepter directement % au lieu de pc
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
    return `${halfValue}${unit}`; // ✅ Plus de conversion pc->%
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
 * Vérifie si un nom de classe est marqué comme important
 */
export const isImportant = (className) => {
    const parsed = parseClassName(className);
    return parsed ? parsed.isImportant : false;
};

/**
 * Extrait les modificateurs d'importance (!important) d'un nom de classe
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
        .replace(/\s+/g, " ") // Normalise les espaces multiples
        .replace(/[^\w\-\[\]\\():,.#%\s!]/g, "") // Supprime les caractères non autorisés (inclut !)
        .split(" ")
        .filter((cls) => cls.length > 0)
        .join(" ");
};

/**
 * Crée une version importante d'un nom de classe
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
        return className; // Déjà important
    }

    // Reconstruit le nom de classe avec !important
    return buildFinalClassName(
        parsed.breakpoints,
        parsed.property,
        parsed.value,
        parsed.pseudoModifiers,
        true
    );
};

/**
 * Supprime l'indicateur !important d'un nom de classe
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
        return className; // Pas important
    }

    // Reconstruit le nom de classe sans !important
    return buildFinalClassName(
        parsed.breakpoints,
        parsed.property,
        parsed.value,
        parsed.pseudoModifiers,
        false
    );
};

/**
 * Parse une classe avec gestion avancée des modificateurs important
 */
export const parseClassWithImportance = (className, forceImportant = false) => {
    const parsed = parseClassName(className);
    if (!parsed) return null;

    // Si forceImportant est true, marque comme important même si pas dans le nom de classe
    if (forceImportant && !parsed.isImportant) {
        return {
            ...parsed,
            isImportant: true,
            finalClassName: buildFinalClassName(
                parsed.breakpoints,
                parsed.property,
                parsed.value,
                parsed.pseudoModifiers,
                true
            ),
        };
    }

    return parsed;
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
    if (parseCache.size > 1000) {
        const entries = Array.from(parseCache.entries());
        parseCache.clear();
        // Garder les 700 plus récents (pas 500)
        entries.slice(-700).forEach(([k, v]) => parseCache.set(k, v));
    }

    if (classNameCache.size > 500) {
        const entries = Array.from(classNameCache.entries());
        classNameCache.clear();
        entries.slice(-350).forEach(([k, v]) => classNameCache.set(k, v));
    }
};

// Auto-nettoyage périodique (toutes les 100 nouvelles entrées)
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
