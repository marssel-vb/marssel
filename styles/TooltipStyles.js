/**
 * TooltipStyles.js
 * Tooltip styling functionality for the Marssel framework
 * Optimized version with improved performance and maintainability
 */
export class TooltipStyles {
    // Static constants for better performance and maintainability
    static SELECTORS = {
        BASE: ".tooltip",
        DARK: ".tooltip--dark",
        LIGHT: ".tooltip--light",
        ACTIVE: ".tooltip.active",
        ARROW: ".tooltip::before",
        POSITIONS: {
            TOP: ".tooltip--top",
            BOTTOM: ".tooltip--bottom",
            LEFT: ".tooltip--left",
            RIGHT: ".tooltip--right",
        },
        ARROWS: {
            TOP: ".tooltip--top::before",
            BOTTOM: ".tooltip--bottom::before",
            LEFT: ".tooltip--left::before",
            RIGHT: ".tooltip--right::before",
        },
        ANIMATIONS: {
            FADE: ".tooltip--anim-fade",
            SCALE: ".tooltip--anim-scale",
            SCALE_ACTIVE: ".tooltip--anim-scale.active",
        },
    };

    static STYLES = {
        BASE: [
            "position: absolute",
            "opacity: 0",
            "visibility: hidden",
            "transition: opacity 0.2s, visibility 0.2s, transform 0.2s",
            "padding: 8px 12px",
            "border-radius: 4px",
            "font-size: 14px",
            "line-height: 1.4",
            "z-index: var(--tooltip-z-index, 1000)",
            "max-width: min(var(--tooltip-max-width, 300px), 90vw)",
            "width: max-content",
            "pointer-events: none",
            "white-space: normal",
            "overflow-wrap: break-word",
            "height: fit-content",
        ],
        DARK_THEME: [
            "background-color: rgba(33, 33, 33, 0.9)",
            "color: #ffffff",
            "box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2)",
        ],
        LIGHT_THEME: [
            "background-color: rgba(255, 255, 255, 0.9)",
            "color: #333333",
            "box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1)",
            "border: 1px solid #eeeeee",
        ],
        ACTIVE: [
            "opacity: 1",
            "visibility: visible",
            "transform: translate(0, 0)",
        ],
        ARROW: [
            "position: absolute",
            "width: 8px",
            "height: 8px",
            "background: inherit",
            "transform: rotate(45deg)",
        ],
    };

    static POSITION_STYLES = {
        TOP: [
            "transform: translateY(-10px)",
            "bottom: 100%",
            "left: 50%",
            "margin-bottom: var(--tooltip-offset, 8px)",
            "transform-origin: bottom",
        ],
        BOTTOM: [
            "transform: translateY(10px)",
            "top: 100%",
            "left: 50%",
            "margin-top: var(--tooltip-offset, 8px)",
            "transform-origin: top",
        ],
        LEFT: [
            "transform: translateX(-10px)",
            "right: 100%",
            "top: 50%",
            "margin-right: var(--tooltip-offset, 8px)",
            "transform-origin: right",
        ],
        RIGHT: [
            "transform: translateX(10px)",
            "left: 100%",
            "top: 50%",
            "margin-left: var(--tooltip-offset, 8px)",
            "transform-origin: left",
        ],
    };

    static ARROW_POSITIONS = {
        TOP: ["bottom: -4px", "left: calc(50% - 4px)"],
        BOTTOM: ["top: -4px", "left: calc(50% - 4px)"],
        LEFT: ["right: -4px", "top: calc(50% - 4px)"],
        RIGHT: ["left: -4px", "top: calc(50% - 4px)"],
    };

    static ANIMATION_STYLES = {
        FADE: ["opacity: 0", "transform: translate(0, 0)"],
        SCALE: ["transform: scale(0.8)"],
        SCALE_ACTIVE: ["transform: scale(1)"],
    };

    constructor(styleManager) {
        this.styleManager = styleManager;
        this.stylesCache = new Map();
    }

    /**
     * Convert array of strings to Set for compatibility with existing API
     * @param {string[]} styles - Array of CSS declarations
     * @returns {Set<string>} Set of CSS declarations
     */
    toSet(styles) {
        const key = styles.join("|");
        if (!this.stylesCache.has(key)) {
            this.stylesCache.set(key, new Set(styles));
        }
        return this.stylesCache.get(key);
    }

    /**
     * Add a single style rule efficiently
     * @param {string} selector - CSS selector
     * @param {string[]} styles - Array of CSS declarations
     */
    addStyleRule(selector, styles) {
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            selector,
            this.toSet(styles)
        );
    }

    /**
     * Add multiple style rules in batch
     * @param {Object} rules - Object with selector-styles pairs
     */
    addStyleRules(rules) {
        Object.entries(rules).forEach(([selector, styles]) => {
            this.addStyleRule(selector, styles);
        });
    }

    /**
     * Add all tooltip-related styles to the document
     */
    addBaseStyles() {
        // Add base styles in batch
        this.addBaseStyleRules();
        this.addPositioningStyles();
        this.addAnimationStyles();

        // Single update call for better performance
        this.styleManager.updateStyles();
    }

    /**
     * Add base style rules
     */
    addBaseStyleRules() {
        const { SELECTORS, STYLES } = TooltipStyles;

        this.addStyleRules({
            [SELECTORS.BASE]: STYLES.BASE,
            [SELECTORS.DARK]: STYLES.DARK_THEME,
            [SELECTORS.LIGHT]: STYLES.LIGHT_THEME,
            [SELECTORS.ACTIVE]: STYLES.ACTIVE,
            [SELECTORS.ARROW]: STYLES.ARROW,
        });
    }

    /**
     * Add all position-related styles efficiently
     */
    addPositioningStyles() {
        const { SELECTORS, POSITION_STYLES, ARROW_POSITIONS } = TooltipStyles;

        // Position styles
        this.addStyleRules({
            [SELECTORS.POSITIONS.TOP]: POSITION_STYLES.TOP,
            [SELECTORS.POSITIONS.BOTTOM]: POSITION_STYLES.BOTTOM,
            [SELECTORS.POSITIONS.LEFT]: POSITION_STYLES.LEFT,
            [SELECTORS.POSITIONS.RIGHT]: POSITION_STYLES.RIGHT,
        });

        // Arrow position styles
        this.addStyleRules({
            [SELECTORS.ARROWS.TOP]: ARROW_POSITIONS.TOP,
            [SELECTORS.ARROWS.BOTTOM]: ARROW_POSITIONS.BOTTOM,
            [SELECTORS.ARROWS.LEFT]: ARROW_POSITIONS.LEFT,
            [SELECTORS.ARROWS.RIGHT]: ARROW_POSITIONS.RIGHT,
        });
    }

    /**
     * Add animation styles efficiently
     */
    addAnimationStyles() {
        const { SELECTORS, ANIMATION_STYLES } = TooltipStyles;

        this.addStyleRules({
            [SELECTORS.ANIMATIONS.FADE]: ANIMATION_STYLES.FADE,
            [SELECTORS.ANIMATIONS.SCALE]: ANIMATION_STYLES.SCALE,
            [SELECTORS.ANIMATIONS.SCALE_ACTIVE]: ANIMATION_STYLES.SCALE_ACTIVE,
        });
    }

    /**
     * Legacy method compatibility - kept for backward compatibility
     * @returns {Set<string>} CSS declarations for base tooltip
     * @deprecated Use static STYLES.BASE instead
     */
    getBaseStyles() {
        return this.toSet(TooltipStyles.STYLES.BASE);
    }

    /**
     * Legacy method compatibility
     * @returns {Set<string>} CSS declarations for dark theme
     * @deprecated Use static STYLES.DARK_THEME instead
     */
    getDarkThemeStyles() {
        return this.toSet(TooltipStyles.STYLES.DARK_THEME);
    }

    /**
     * Legacy method compatibility
     * @returns {Set<string>} CSS declarations for light theme
     * @deprecated Use static STYLES.LIGHT_THEME instead
     */
    getLightThemeStyles() {
        return this.toSet(TooltipStyles.STYLES.LIGHT_THEME);
    }

    /**
     * Legacy method compatibility
     * @returns {Set<string>} CSS declarations for active tooltips
     * @deprecated Use static STYLES.ACTIVE instead
     */
    getActiveStyles() {
        return this.toSet(TooltipStyles.STYLES.ACTIVE);
    }

    /**
     * Legacy method compatibility
     * @returns {Set<string>} CSS declarations for tooltip arrows
     * @deprecated Use static STYLES.ARROW instead
     */
    getArrowStyles() {
        return this.toSet(TooltipStyles.STYLES.ARROW);
    }

    /**
     * Clear the styles cache (useful for memory management)
     */
    clearCache() {
        this.stylesCache.clear();
    }

    /**
     * Get cache statistics for debugging
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.stylesCache.size,
            keys: Array.from(this.stylesCache.keys()),
        };
    }
}
