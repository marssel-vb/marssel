export class PopoverStyles {
    static STYLES_CONFIG = {
        base: {
            selector: "[data-popover]",
            declarations: [
                "position: fixed",
                "z-index: 1000",
                "background-color: #fff",
                "border: 1px solid #ddd",
                "border-radius: 8px",
                "box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1)",
                "padding: 15px",
                "max-width: 300px",
                "opacity: 0",
                "visibility: hidden",
                "transform: scale(0.9)",
                "transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s",
            ],
        },
        visible: {
            selector: ".popover-visible",
            declarations: [
                "opacity: 1",
                "visibility: visible",
                "transform: scale(1)",
            ],
        },
    };

    constructor(styleManager) {
        this.styleManager = styleManager;
    }

    /**
     * Initializes all popover styles
     * @private
     */
    initializeStyles() {
        const { base, visible } = PopoverStyles.STYLES_CONFIG;
        this.applyStyles(base);
        this.applyStyles(visible);
    }

    /**
     * Applies a set of styles via the styleManager
     * @param {Object} styleConfig - Style configuration {selector, declarations}
     * @private
     */
    applyStyles({ selector, declarations }) {
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            selector,
            new Set(declarations),
        );
    }

    /**
     * Allows adding custom styles
     * @param {string} selector - CSS selector
     * @param {string[]} declarations - CSS declarations
     * @param {string[]} mediaQueries - Optional media queries
     */
    addCustomStyles(selector, declarations, mediaQueries = []) {
        this.styleManager.addDeclarationsWithMediaQuery(
            mediaQueries,
            selector,
            new Set(declarations),
        );
    }

    /**
     * Updates the basic style configuration
     * @param {Object} newConfig - New configuration
     */
    static updateConfig(newConfig) {
        Object.assign(PopoverStyles.STYLES_CONFIG, newConfig);
    }
}
