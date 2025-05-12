// Importer les constantes
import { breakpoints } from "./constants.js";

export const cleanValue = (value) => {
    // Étape 1 : Traitement des fonctions CSS (rgba, translateX, etc.)
    let cleaned = value.replace(/(\w+)\[([^\]]+)\]/g, (match, fn, params) => {
        // Conversion spécifique aux paramètres de fonction
        const processedParams = params
            .replace(/_/g, ", ") // _ → virgule pour les paramètres
            .replace(/(\d)d(\d)/g, "$1.$2") // d → . entre chiffres
            .replace(/pc/g, "%"); // pc → % dans les fonctions

        return `${fn}(${processedParams})`;
    });

    // Étape 2 : Traitement des couleurs rgb et rgba
    cleaned = cleaned.replace(
        /(rgb|rgba)\[([^\]]+)\]/g,
        (match, type, params) => {
            const values = params.split("_").map((val) => val.trim());
            if (type === "rgb") {
                return `rgb(${values.join(", ")})`;
            } else if (type === "rgba") {
                // Convertir l'alpha en décimal si nécessaire
                const alpha = values[3];
                const alphaValue = alpha > 1 ? alpha / 100 : alpha;
                return `rgba(${values.slice(0, 3).join(", ")}, ${alphaValue})`;
            }
            return match;
        }
    );

    // Étape 3 : Conversion générale pour le reste
    cleaned = cleaned
        .replace(/(\d)d(\d)/g, "$1.$2") // d → . entre chiffres restants
        .replace(/pc/g, "%") // pc → % globaux
        .replace(/\[/g, "(") // [ → (
        .replace(/\]/g, ")") // ] → )
        .replace(/__/g, ",") // _ → espace pour le reste
        .replace(/_/g, " ") // _ → espace pour le reste
        .replace(/, /g, ",") // Nettoie les virgules générées
        .replace(/(rgba?|hsla?)\(([^)]+)\)/g, (match, fn, params) => {
            // Finalisation des fonctions de couleur
            return `${fn}(${params.replace(/ /g, ",")})`;
        });

    // Étape 4 : Gestion des cas spéciaux
    const unitConversions = [
        { regex: /(\d+)px/g, replace: "$1px" }, // Conserve px
        { regex: /(\d+)em/g, replace: "$1em" }, // Conserve em
        { regex: /(\d+)rem/g, replace: "$1rem" }, // Conserve rem
        { regex: /(\d+)%/g, replace: "$1%" }, // Conserve %
        { regex: /(\d+)deg/g, replace: "$1deg" }, // Conserve deg
    ];

    unitConversions.forEach(({ regex, replace }) => {
        cleaned = cleaned.replace(regex, replace);
    });

    // Étape 5 : Traitement des couleurs hexadécimales
    /*cleaned = cleaned
        .split(" ")
        .map((token) => {
            // Amélioration du regex pour capturer les couleurs hexadécimales
            const hexMatch = token.match(/^([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/);
            if (hexMatch) {
                let hex = hexMatch[0];
                if (hex.length === 3) {
                    hex = hex
                        .split("")
                        .map((c) => c + c)
                        .join("");
                }
                return `#${hex.toUpperCase()}`;
            }
            return token;
        })
        .join(" ");*/

    // Étape 5 : Traitement des couleurs hexadécimales
    cleaned = addDieseToHex(cleaned);

    return cleaned;
};

export const addDieseToHex = (value) => {
    return value.replace(
        /(?<!#)(?<!rgba?\[|rgb\()[A-Fa-f0-9]{6}|([A-Fa-f0-9])\1\1(?=[^a-zA-Z0-9#]|$)(?!\])(?!(,\s*\d))/g,
        (match) => {
            return `#${match.toUpperCase()}`;
        }
    );
};

export const escapeValue = (value) => {
    return value
        .replace(/\[/g, "\\[") // Échappe uniquement [ et ]
        .replace(/\]/g, "\\]")
        .replace(/ /g, "_"); // Remplace les espaces par _
};

export const buildMediaQuery = (breakpointList) => {
    if (
        !breakpointList ||
        !Array.isArray(breakpointList) ||
        breakpointList.length === 0
    ) {
        return null;
    }

    // Handle min-max range
    if (breakpointList.length === 2) {
        const [min, max] = breakpointList.map((bp) => breakpoints[bp]);

        // Make sure both breakpoints are defined
        if (min && max) {
            return `(min-width: ${min}) and (max-width: ${max})`;
        }
    }

    // Filter out any breakpoints that don't have corresponding values in the breakpoints object
    const validBreakpoints = breakpointList.filter((bp) => {
        const key = bp.startsWith("m") && bp.length === 3 ? bp.slice(1) : bp;
        return !!breakpoints[key];
    });

    // Return null if no valid breakpoints remain
    if (validBreakpoints.length === 0) {
        return null;
    }

    // Create the media query string
    return validBreakpoints
        .map((bp) => {
            if (bp.startsWith("m") && bp.length === 3) {
                return `(max-width: ${breakpoints[bp.slice(1)]})`;
            }
            return `(min-width: ${breakpoints[bp]})`;
        })
        .join(" and ");
};

export const buildDeclaration = (property, value) => {
    return Array.isArray(property)
        ? property.map((prop) => `${prop}: ${value}`).join("; ")
        : `${property}: ${value}`;
};
