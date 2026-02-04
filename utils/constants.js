// Configuration des propriétés CSS avec regroupement logique et optimisations
export const CACHE_LIMITS = {
    PARSE_CACHE_MAX: 500, // au lieu de 1000
    CLASS_CACHE_MAX: 300, // au lieu de illimité
    SELECTOR_CACHE_MAX: 200,
};

export const CRITICAL_SELECTORS = [
    ".no-lazy",
    "header",
    "footer",
    "nav",
    '[role="banner"]',
    '[role="contentinfo"]',
    '[role="navigation"]',
    ".header",
    ".footer",
    ".navbar",
    ".nav",
    "main",
    '[role="main"]',
];

const CSS_PROPERTIES = Object.freeze({
    // Layout & Display
    layout: {
        d: "display",
        pos: "position",
        top: "top",
        right: "right",
        bottom: "bottom",
        left: "left",
        z: "z-index",
        visible: "visibility",
    },

    // Dimensions
    dimensions: {
        w: "width",
        h: "height",
        "min-w": "min-width",
        "max-w": "max-width",
        "min-h": "min-height",
        "max-h": "max-height",
    },

    // Spacing - Margin
    margin: {
        m: "margin",
        mt: "margin-top",
        mr: "margin-right",
        mb: "margin-bottom",
        ml: "margin-left",
        mx: ["margin-left", "margin-right"],
        my: ["margin-top", "margin-bottom"],
    },

    // Spacing - Padding
    padding: {
        p: "padding",
        pt: "padding-top",
        pr: "padding-right",
        pb: "padding-bottom",
        pl: "padding-left",
        px: ["padding-left", "padding-right"],
        py: ["padding-top", "padding-bottom"],
    },

    // Flexbox & Grid
    flex: {
        flex: "flex",
        "flex-direction": "flex-direction",
        "flex-grow": "flex-grow",
        "flex-shrink": "flex-shrink",
        "flex-basis": "flex-basis",
        items: "align-items",
        justify: "justify-content",
        self: "align-self",
    },

    grid: {
        grid: "grid",
        "grid-cols": "grid-template-columns",
        "grid-rows": "grid-template-rows",
        "col-span": "grid-column",
        "row-span": "grid-row",
        col: "grid-column",
    },

    // Spacing - Gap & Gutter
    gap: {
        gap: "gap",
        "gap-x": "column-gap",
        "gap-y": "row-gap",
        gutter: "gutter",
        "gutter-x": "gutter-x",
        "gutter-y": "gutter-y",
    },

    // Typography
    typography: {
        c: "color",
        "c-rgb": "color",
        "c-rgba": "color",
        font: "font-family",
        "font-size": "font-size",
        "font-weight": "font-weight",
        fs: "font-size",
        fw: "font-weight",
        "letter-spacing": "letter-spacing",
        "line-h": "line-height",
        "text-align": "text-align",
        "text-dec": "text-decoration",
        "text-transform": "text-transform",
        "word-spacing": "word-spacing",
    },

    // Background
    background: {
        bg: "background-color",
        "bg-color": "background-color",
        "bg-img": "background-image",
        "bg-linear": "background",
        "bg-pos": "background-position",
        "bg-radial": "background",
        "bg-rgb": "background-color",
        "bg-rgba": "background-color",
        "bg-size": "background-size",
    },

    // Border
    border: {
        border: "border",
        "border-t": "border-top",
        "border-r": "border-right",
        "border-b": "border-bottom",
        "border-l": "border-left",
        "border-x": ["border-left", "border-right"],
        "border-y": ["border-top", "border-bottom"],
        "border-w": "border-width",
        "border-col": "border-color",
        "border-style": "border-style",
    },

    // Border Radius
    borderRadius: {
        rounded: "border-radius",
        "rounded-t": ["border-top-left-radius", "border-top-right-radius"],
        "rounded-r": ["border-top-right-radius", "border-bottom-right-radius"],
        "rounded-b": [
            "border-bottom-left-radius",
            "border-bottom-right-radius",
        ],
        "rounded-l": ["border-top-left-radius", "border-bottom-left-radius"],
        "rounded-tl": "border-top-left-radius",
        "rounded-tr": "border-top-right-radius",
        "rounded-br": "border-bottom-right-radius",
        "rounded-bl": "border-bottom-left-radius",
    },

    // Effects
    effects: {
        shadow: "box-shadow",
        opacity: "opacity",
        outline: "outline",
        cursor: "cursor",
    },

    // Custom Components
    custom: {
        icon: "icon",
        "icon-size": "--icon-size",
        progress: "progress",
        "progress-value": "--progress-value",
        "progress-color": "--progress-color",
        "progress-bg": "--progress-background-color",
        "progress-height": "--progress-height",
        "progress-radius": "--progress-border-radius",
    },

    // Animations & Transforms
    animations: {
        animation: "animation",
        "animation-name": "animation-name",
        "animation-duration": "animation-duration",
        "animation-timing": "animation-timing-function",
        "animation-delay": "animation-delay",
        "animation-iteration": "animation-iteration-count",
        "animation-direction": "animation-direction",
        "animation-fill": "animation-fill-mode",
        transform: "transform",
        scale: "transform",
        rotate: "transform",
        translate: "transform",
        transition: "transition",
        "transition-duration": "transition-duration",
    },
});

// Export de la version aplatie pour compatibilité
export const properties = Object.freeze(
    Object.values(CSS_PROPERTIES).reduce((acc, group) => {
        return Object.assign(acc, group);
    }, Object.create(null)),
);

// Breakpoints et containers optimisés
export const breakpoints = Object.freeze({
    xs: "320px",
    sm: "576px",
    md: "768px",
    lg: "992px",
    xl: "1200px",
    xxl: "1400px",
});

export const containerMaxWidths = Object.freeze({
    sm: "540px",
    md: "720px",
    lg: "960px",
    xl: "1140px",
    xxl: "1320px",
});

// Regex optimisées avec compilation unique
export const REGEX_PATTERNS = Object.freeze({
    CLASS: /^(?:([a-zA-Z0-9-]+)---)?(?:(?:m--)?([a-z0-9]+(?:--[a-z0-9]+)*)--)?([a-z0-9-]+)-\[(.*?)\](?::([a-z-_()\[\]]+(?::[a-z-_()\[\]]+)*))?(!)?$/,

    COLOR: Object.freeze({
        // ✅ MODIFIÉ : Support hex 3 et 6 caractères
        HEX: /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/,
        RGB: /^(\d+),(\d+),(\d+)$/,
        RGBA: /^(\d+),(\d+),(\d+),(\d*\.?\d+)$/,
        HEX_WITH_HASH: /^#[0-9A-Fa-f]{3,6}$/,
    }),

    UNITS: /^(\d*\.?\d+)(px|em|rem|%|vh|vw|deg|s|ms)$/,
    FUNCTION: /(\w+)\[([^\]]+)\]/g,
    THEME_VALUE: /^theme-[a-z-]+$/,
});

export const defaultThemes = {
    light: {
        "--theme-bg": "#ffffff",
        "--theme-text": "#333333",
        "--theme-border": "#e0e0e0",
        "--theme-primary": "#2563eb",
        "--theme-secondary": "#8b5cf6",
        "--theme-accent": "#ec4899",
        "--theme-success": "#10b981",
        "--theme-warning": "#f59e0b",
        "--theme-danger": "#ef4444",
        "--theme-info": "#3b82f6",
        "--theme-custom": "#3b82f6",
    },
    dark: {
        "--theme-bg": "#1c1c1c",
        "--theme-text": "#f0f0f0",
        "--theme-border": "#444444",
        "--theme-primary": "#3b82f6",
        "--theme-secondary": "#a78bfa",
        "--theme-accent": "#f472b6",
        "--theme-success": "#10b981",
        "--theme-warning": "#f59e0b",
        "--theme-danger": "#ef4444",
        "--theme-info": "#3b82f6",
        "--theme-custom": "#3b82f6",
    },
};

// Utilitaires optimisés avec Map pour de meilleures performances
const propertyLookup = new Map();
const breakpointSet = new Set(Object.keys(breakpoints));

export const utils = Object.freeze({
    /**
     * Obtient une propriété CSS par son nom court (optimisé avec Map)
     */
    getCSSProperty: (shortName) => {
        if (!propertyLookup.has(shortName)) {
            propertyLookup.set(shortName, properties[shortName]);
        }
        return propertyLookup.get(shortName);
    },

    /**
     * Vérifie si une valeur est un code couleur HEX valide
     */
    isValidHex: (value) => REGEX_PATTERNS.COLOR.HEX.test(value),

    /**
     * Vérifie si une valeur est une couleur RGB valide
     */
    isValidRGB: (value) => REGEX_PATTERNS.COLOR.RGB.test(value),

    /**
     * Vérifie si une valeur a une unité CSS valide
     */
    hasValidUnit: (value) => REGEX_PATTERNS.UNITS.test(value),

    /**
     * Obtient toutes les propriétés d'un groupe spécifique
     */
    getPropertyGroup: (groupName) => CSS_PROPERTIES[groupName],

    /**
     * Vérifie si un breakpoint existe (optimisé avec Set)
     */
    hasBreakpoint: (bp) => breakpointSet.has(bp),

    /**
     * Parse une valeur d'unité CSS
     */
    parseUnit: (value) => {
        const match = value.match(REGEX_PATTERNS.UNITS);
        return match ? { value: parseFloat(match[1]), unit: match[2] } : null;
    },

    /**
     * Vérifie si une propriété accepte plusieurs valeurs CSS
     */
    isMultiProperty: (property) => Array.isArray(properties[property]),
});

// Exports pour compatibilité descendante
export const CLASS_REGEX = REGEX_PATTERNS.CLASS;
export const COLOR_REGEX = REGEX_PATTERNS.COLOR;
