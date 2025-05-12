/**
 * TooltipStyles.js
 * Tooltip styling functionality for the Marssel framework
 */
export class TooltipStyles {
    constructor(styleManager) {
        this.styleManager = styleManager;
    }

    /**
     * Add all tooltip-related styles to the document
     */
    addBaseStyles() {
        // Base tooltip container
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".tooltip",
            this.getBaseStyles()
        );

        // Theme styles
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".tooltip--dark",
            this.getDarkThemeStyles()
        );

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".tooltip--light",
            this.getLightThemeStyles()
        );

        // Active state
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".tooltip.active",
            this.getActiveStyles()
        );

        // Arrow styles
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".tooltip::before",
            this.getArrowStyles()
        );

        // Position styles
        this.addPositioningStyles();

        // Animation variants
        this.addAnimationStyles();

        // Update styles
        this.styleManager.updateStyles();
    }

    /**
     * Base tooltip styles
     * @returns {Set<string>} CSS declarations for base tooltip
     */
    getBaseStyles() {
        return new Set([
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
        ]);
    }

    /**
     * Dark theme styles
     * @returns {Set<string>} CSS declarations for dark theme
     */
    getDarkThemeStyles() {
        return new Set([
            "background-color: rgba(33, 33, 33, 0.9)",
            "color: #ffffff",
            "box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2)",
        ]);
    }

    /**
     * Light theme styles
     * @returns {Set<string>} CSS declarations for light theme
     */
    getLightThemeStyles() {
        return new Set([
            "background-color: rgba(255, 255, 255, 0.9)",
            "color: #333333",
            "box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1)",
            "border: 1px solid #eeeeee",
        ]);
    }

    /**
     * Active tooltip styles
     * @returns {Set<string>} CSS declarations for active tooltips
     */
    getActiveStyles() {
        return new Set([
            "opacity: 1",
            "visibility: visible",
            "transform: translate(0, 0)",
        ]);
    }

    /**
     * Arrow styles
     * @returns {Set<string>} CSS declarations for tooltip arrows
     */
    getArrowStyles() {
        return new Set([
            "position: absolute",
            "width: 8px",
            "height: 8px",
            "background: inherit",
            "transform: rotate(45deg)",
        ]);
    }

    /**
     * Add all position-related styles
     */
    addPositioningStyles() {
        // Top position
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".tooltip--top",
            new Set([
                "transform: translateY(-10px)",
                "bottom: 100%",
                "left: 50%",
                "margin-bottom: var(--tooltip-offset, 8px)",
                "transform-origin: bottom",
            ])
        );

        // Bottom position
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".tooltip--bottom",
            new Set([
                "transform: translateY(10px)",
                "top: 100%",
                "left: 50%",
                "margin-top: var(--tooltip-offset, 8px)",
                "transform-origin: top",
            ])
        );

        // Left position
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".tooltip--left",
            new Set([
                "transform: translateX(-10px)",
                "right: 100%",
                "top: 50%",
                "margin-right: var(--tooltip-offset, 8px)",
                "transform-origin: right",
            ])
        );

        // Right position
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".tooltip--right",
            new Set([
                "transform: translateX(10px)",
                "left: 100%",
                "top: 50%",
                "margin-left: var(--tooltip-offset, 8px)",
                "transform-origin: left",
            ])
        );

        // Arrow positions
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".tooltip--top::before",
            new Set(["bottom: -4px", "left: calc(50% - 4px)"])
        );

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".tooltip--bottom::before",
            new Set(["top: -4px", "left: calc(50% - 4px)"])
        );

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".tooltip--left::before",
            new Set(["right: -4px", "top: calc(50% - 4px)"])
        );

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".tooltip--right::before",
            new Set(["left: -4px", "top: calc(50% - 4px)"])
        );
    }

    /**
     * Add animation styles
     */
    addAnimationStyles() {
        // Fade animation
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".tooltip--anim-fade",
            new Set(["opacity: 0", "transform: translate(0, 0)"])
        );

        // Scale animation
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".tooltip--anim-scale",
            new Set(["transform: scale(0.8)"])
        );

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".tooltip--anim-scale.active",
            new Set(["transform: scale(1)"])
        );
    }
}
