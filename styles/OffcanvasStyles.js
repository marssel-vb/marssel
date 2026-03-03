export class OffcanvasStyles {
    static CONFIG = {
        TRANSITIONS: {
            DURATION: "0.3s",
            EASING: "ease",
        },
        Z_INDEX: {
            OFFCANVAS: 1045,
            BACKDROP: 1040,
        },
        DIMENSIONS: {
            SIDE_WIDTH: "400px",
            VERTICAL_HEIGHT: "50vh",
        },
        COLORS: {
            BACKGROUND: "#fff",
            BORDER: "#dee2e6",
            BACKDROP: "rgba(0, 0, 0, 0.5)",
            SHADOW: "rgba(0, 0, 0, 0.15)",
        },
        SPACING: {
            PADDING: "1rem",
            CLOSE_PADDING: "0.25rem 0.5rem",
        },
    };

    constructor(styleManager) {
        this.styleManager = styleManager;
    }

    initializeStyles() {
        this.addCoreStyles();
        this.addHeaderStyles();
        this.addDirectionalStyles();
        this.addUtilityStyles();
    }

    addCoreStyles() {
        const { CONFIG } = OffcanvasStyles;

        this.addStyle(".offcanvas", [
            "position: fixed",
            "display: flex",
            "flex-direction: column",
            "max-width: 100%",
            "max-height: 100%",
            `background-color: ${CONFIG.COLORS.BACKGROUND}`,
            `transition: transform ${CONFIG.TRANSITIONS.DURATION} ${CONFIG.TRANSITIONS.EASING}`,
            `z-index: ${CONFIG.Z_INDEX.OFFCANVAS}`,
            `box-shadow: 0 0.5rem 1rem ${CONFIG.COLORS.SHADOW}`,
            "visibility: hidden",
        ]);
        this.addStyle(".offcanvas.show", [
            "transform: none !important",
            "visibility: visible",
        ]);
        this.addStyle(".offcanvas-body", [
            "flex-grow: 1",
            `padding: ${CONFIG.SPACING.PADDING}`,
            "overflow-y: auto",
        ]);
        this.addStyle(".offcanvas-backdrop", [
            "position: fixed",
            "top: 0",
            "left: 0",
            "width: 100vw",
            "height: 100vh",
            `background-color: ${CONFIG.COLORS.BACKDROP}`,
            `z-index: ${CONFIG.Z_INDEX.BACKDROP}`,
            "opacity: 0",
            "visibility: hidden",
            `transition: opacity ${CONFIG.TRANSITIONS.DURATION} ${CONFIG.TRANSITIONS.EASING}`,
        ]);
        this.addStyle(".offcanvas-backdrop.show", [
            "opacity: 1",
            "visibility: visible",
        ]);
    }

    addHeaderStyles() {
        const { CONFIG } = OffcanvasStyles;

        this.addStyle(".offcanvas-header", [
            "display: flex",
            "align-items: center",
            "justify-content: space-between",
            `padding: ${CONFIG.SPACING.PADDING}`,
            `border-bottom: 1px solid ${CONFIG.COLORS.BORDER}`,
        ]);
        this.addStyle(".offcanvas-title", ["margin: 0"]);
        this.addStyle(".offcanvas-close", [
            "background: transparent",
            "border: 0",
            "font-size: 1.5rem",
            "opacity: 0.5",
            "cursor: pointer",
            `padding: ${CONFIG.SPACING.CLOSE_PADDING}`,
        ]);
        this.addStyle(".offcanvas-close:hover", ["opacity: 1"]);
    }

    addDirectionalStyles() {
        const { CONFIG } = OffcanvasStyles;
        const directions = {
            start: {
                position: ["top: 0", "left: 0"],
                dimensions: [
                    `width: ${CONFIG.DIMENSIONS.SIDE_WIDTH}`,
                    "height: 100vh",
                ],
                transform: "translateX(-100%)",
            },
            end: {
                position: ["top: 0", "right: 0"],
                dimensions: [
                    `width: ${CONFIG.DIMENSIONS.SIDE_WIDTH}`,
                    "height: 100vh",
                ],
                transform: "translateX(100%)",
            },
            top: {
                position: ["top: 0", "left: 0"],
                dimensions: [
                    "width: 100vw",
                    `height: ${CONFIG.DIMENSIONS.VERTICAL_HEIGHT}`,
                ],
                transform: "translateY(-100%)",
            },
            bottom: {
                position: ["bottom: 0", "left: 0"],
                dimensions: [
                    "width: 100vw",
                    `height: ${CONFIG.DIMENSIONS.VERTICAL_HEIGHT}`,
                ],
                transform: "translateY(100%)",
            },
        };

        Object.entries(directions).forEach(([direction, config]) => {
            this.addStyle(`.offcanvas-${direction}`, [
                ...config.position,
                ...config.dimensions,
                `transform: ${config.transform}`,
            ]);
        });
    }

    addUtilityStyles() {
        this.addStyle("body.offcanvas-lock-scroll", ["overflow: hidden"]);
    }

    /**
     * Utility method for adding styles consistently
     * @param {string} selector - CSS selector
     * @param {string[]} declarations - Array of CSS declarations
     */
    addStyle(selector, declarations) {
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            selector,
            new Set(declarations),
        );
    }

    /**
     * Method to customize the configuration
     * @param {Object} customConfig - Custom configuration
     * @returns {OffcanvasStyles} Instance for chaining
     */
    static withConfig(customConfig) {
        const mergedConfig = this.deepMerge(this.CONFIG, customConfig);

        return class extends OffcanvasStyles {
            static CONFIG = mergedConfig;
        };
    }

    /**
     * Utility for deep object merging
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    static deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (
                source[key] &&
                typeof source[key] === "object" &&
                !Array.isArray(source[key])
            ) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    /**
     * Method to get the current configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return OffcanvasStyles.CONFIG;
    }

    /**
     * Method to dynamically update certain styles
     * @param {string} property - Property to update
     * @param {string} value - New value
     */
    updateProperty(property, value) {
        console.warn(
            "updateProperty: Method to be implemented according to specific needs",
        );
    }
}
