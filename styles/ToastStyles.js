export class ToastStyles {
    static POSITIONS = Object.freeze({
        "top-right": {
            top: "1rem",
            right: "1rem",
            alignItems: "flex-end",
            flexDirection: "column",
        },
        "top-left": {
            top: "1rem",
            left: "1rem",
            alignItems: "flex-start",
            flexDirection: "column",
        },
        "bottom-right": {
            bottom: "1rem",
            right: "1rem",
            alignItems: "flex-end",
            flexDirection: "column-reverse",
        },
        "bottom-left": {
            bottom: "1rem",
            left: "1rem",
            alignItems: "flex-start",
            flexDirection: "column-reverse",
        },
        "top-center": {
            top: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            alignItems: "center",
            flexDirection: "column",
        },
        "bottom-center": {
            bottom: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            alignItems: "center",
            flexDirection: "column-reverse",
        },
    });

    static TYPES = Object.freeze({
        success: {
            bg: "#E8F5E9",
            color: "#2E7D32",
            borderLeft: "4px solid #2E7D32",
        },
        error: {
            bg: "#FFEBEE",
            color: "#C62828",
            borderLeft: "4px solid #C62828",
        },
        warning: {
            bg: "#FFF8E1",
            color: "#F57F17",
            borderLeft: "4px solid #F57F17",
        },
        info: {
            bg: "#E3F2FD",
            color: "#1565C0",
            borderLeft: "4px solid #1565C0",
        },
    });

    static CONTAINER_STYLES = new Set([
        "position: fixed",
        "z-index: 9999",
        "pointer-events: none",
        "width: 100%",
        "height: 100%",
        "left: 0",
        "top: 0",
    ]);

    // Sous-conteneur par position : positionné en fixed, flex colonne
    static POSITION_GROUP_STYLES = new Set([
        "position: fixed",
        "z-index: 9999",
        "pointer-events: none",
        "display: flex",
        "gap: 0.5rem",
        "max-width: 350px",
    ]);

    static TOAST_BASE_STYLES = new Set([
        "position: relative",
        "min-width: 250px",
        "max-width: 350px",
        "width: 100%",
        "background-color: #fff",
        "color: #333",
        "border-radius: 4px",
        "padding: 1rem",
        "box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)",
        "pointer-events: auto",
        "transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out",
        "opacity: 0",
        "transform: translateY(10px)",
        "box-sizing: border-box",
    ]);

    static VISIBLE_STYLES = new Set(["opacity: 1", "transform: translateY(0)"]);

    static MOBILE_STYLES = new Set([
        "min-width: calc(100vw - 2rem)",
        "max-width: calc(100vw - 2rem)",
    ]);

    static CLOSE_BUTTON_STYLES = new Set([
        "position: absolute",
        "top: 8px",
        "right: 8px",
        "background: none",
        "border: none",
        "cursor: pointer",
        "font-size: 16px",
        "line-height: 1",
        "color: #999",
        "padding: 0",
    ]);

    static PROGRESS_BAR_STYLES = new Set([
        "position: absolute",
        "bottom: 0",
        "left: 0",
        "height: 3px",
        "background-color: rgba(0, 0, 0, 0.2)",
        "width: 100%",
        "transform-origin: left",
    ]);

    constructor(styleManager) {
        if (!styleManager) {
            throw new Error("StyleManager is required");
        }
        this.styleManager = styleManager;
    }

    /**
     * Applies all toast styles
     * Uses a batch approach to optimize performance
     */
    applyStyles() {
        const styleMethods = [
            () => this.addContainerStyles(),
            () => this.addPositionGroupStyles(),
            () => this.addToastBaseStyles(),
            () => this.addVisibleToastStyles(),
            () => this.addMobileResponsiveStyles(),
            () => this.addCloseButtonStyles(),
            () => this.addToastTypeStyles(),
            () => this.addProgressBarStyles(),
        ];

        try {
            styleMethods.forEach((method) => method());
        } catch (error) {
            console.error("Error applying toast styles:", error);
            throw error;
        } finally {
            this.styleManager.updateStyles();
        }
    }

    addContainerStyles() {
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".marssel-toast-container",
            ToastStyles.CONTAINER_STYLES,
        );
    }

    addPositionGroupStyles() {
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".marssel-toast-group",
            ToastStyles.POSITION_GROUP_STYLES,
        );
    }

    addToastBaseStyles() {
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".marssel-toast",
            ToastStyles.TOAST_BASE_STYLES,
        );
    }

    addVisibleToastStyles() {
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".marssel-toast.visible",
            ToastStyles.VISIBLE_STYLES,
        );
    }

    addMobileResponsiveStyles() {
        this.styleManager.addDeclarationsWithMediaQuery(
            ["msm"], // msm: max-width sm
            ".marssel-toast-group",
            ToastStyles.MOBILE_STYLES,
        );
    }

    addCloseButtonStyles() {
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".marssel-toast-close",
            ToastStyles.CLOSE_BUTTON_STYLES,
        );
    }

    /**
     * Generates styles for each type of toast
     * Optimized with a functional approach
     */
    addToastTypeStyles() {
        const typeEntries = Object.entries(ToastStyles.TYPES);

        typeEntries.forEach(([type, style]) => {
            const typeDeclarations = new Set([
                `background-color: ${style.bg}`,
                `color: ${style.color}`,
                `border-left: ${style.borderLeft}`,
            ]);

            this.styleManager.addDeclarationsWithMediaQuery(
                [],
                `.marssel-toast-${type}`,
                typeDeclarations,
            );
        });
    }

    addProgressBarStyles() {
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".marssel-toast-progress",
            ToastStyles.PROGRESS_BAR_STYLES,
        );
    }

    /**
     * Retrieves position styles for the group container (no alignItems/flexDirection — applied via JS)
     * @param {string} position - Requested position
     * @param {string} defaultPosition - Default position
     * @returns {Object} Position styles
     */
    getPositionStyles(position, defaultPosition = "top-right") {
        const positionStyle = ToastStyles.POSITIONS[position];

        if (positionStyle) {
            return positionStyle;
        }

        const fallbackStyle = ToastStyles.POSITIONS[defaultPosition];
        if (!fallbackStyle) {
            console.warn(
                `Invalid position: ${position}, using default top-right position`,
            );
            return ToastStyles.POSITIONS["top-right"];
        }

        return fallbackStyle;
    }

    /**
     * Utility method to check if a position is valid
     * @param {string} position - Position to check
     * @returns {boolean}
     */
    static isValidPosition(position) {
        return position in ToastStyles.POSITIONS;
    }

    /**
     * Utility method to check if a type is valid
     * @param {string} type - Type to check
     * @returns {boolean}
     */
    static isValidType(type) {
        return type in ToastStyles.TYPES;
    }

    /**
     * Retrieves the list of available positions
     * @returns {string[]}
     */
    static getAvailablePositions() {
        return Object.keys(ToastStyles.POSITIONS);
    }

    /**
     * Retrieves the list of available types
     * @returns {string[]}
     */
    static getAvailableTypes() {
        return Object.keys(ToastStyles.TYPES);
    }
}
