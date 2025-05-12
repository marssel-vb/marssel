export class ToastStyles {
    constructor(styleManager) {
        this.styleManager = styleManager;
        this.positions = {
            "top-right": { top: "1rem", right: "1rem" },
            "top-left": { top: "1rem", left: "1rem" },
            "bottom-right": { bottom: "1rem", right: "1rem" },
            "bottom-left": { bottom: "1rem", left: "1rem" },
            "top-center": {
                top: "1rem",
                left: "50%",
                transform: "translateX(-50%)",
            },
            "bottom-center": {
                bottom: "1rem",
                left: "50%",
                transform: "translateX(-50%)",
            },
        };

        this.types = {
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
        };
    }

    applyStyles() {
        this.addContainerStyles();
        this.addToastBaseStyles();
        this.addVisibleToastStyles();
        this.addMobileResponsiveStyles();
        this.addCloseButtonStyles();
        this.addToastTypeStyles();
        this.addProgressBarStyles();

        // Apply all collected styles
        this.styleManager.updateStyles();
    }

    addContainerStyles() {
        const containerDeclarations = new Set();
        containerDeclarations.add("position: fixed");
        containerDeclarations.add("z-index: 9999");
        containerDeclarations.add("pointer-events: none");
        containerDeclarations.add("width: 100%");
        containerDeclarations.add("height: 100%");
        containerDeclarations.add("left: 0");
        containerDeclarations.add("top: 0");

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".marssel-toast-container",
            containerDeclarations
        );
    }

    addToastBaseStyles() {
        const toastDeclarations = new Set();
        toastDeclarations.add("position: absolute");
        toastDeclarations.add("min-width: 250px");
        toastDeclarations.add("max-width: 350px");
        toastDeclarations.add("background-color: #fff");
        toastDeclarations.add("color: #333");
        toastDeclarations.add("border-radius: 4px");
        toastDeclarations.add("padding: 1rem");
        toastDeclarations.add("box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)");
        toastDeclarations.add("margin-bottom: 0.5rem");
        toastDeclarations.add("pointer-events: auto");
        toastDeclarations.add("transition: all 0.3s ease-in-out");
        toastDeclarations.add("opacity: 0");
        toastDeclarations.add("transform: translateY(10px)");

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".marssel-toast",
            toastDeclarations
        );
    }

    addVisibleToastStyles() {
        const visibleDeclarations = new Set();
        visibleDeclarations.add("opacity: 1");
        visibleDeclarations.add("transform: translateY(0)");

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".marssel-toast.visible",
            visibleDeclarations
        );
    }

    addMobileResponsiveStyles() {
        const mobileDeclarations = new Set();
        mobileDeclarations.add("min-width: calc(100% - 2rem)");
        mobileDeclarations.add("max-width: calc(100% - 2rem)");
        mobileDeclarations.add("margin-left: 1rem");
        mobileDeclarations.add("margin-right: 1rem");

        this.styleManager.addDeclarationsWithMediaQuery(
            ["msm"], // msm: max-width sm
            ".marssel-toast",
            mobileDeclarations
        );
    }

    addCloseButtonStyles() {
        const closeButtonDeclarations = new Set();
        closeButtonDeclarations.add("position: absolute");
        closeButtonDeclarations.add("top: 8px");
        closeButtonDeclarations.add("right: 8px");
        closeButtonDeclarations.add("background: none");
        closeButtonDeclarations.add("border: none");
        closeButtonDeclarations.add("cursor: pointer");
        closeButtonDeclarations.add("font-size: 16px");
        closeButtonDeclarations.add("line-height: 1");
        closeButtonDeclarations.add("color: #999");
        closeButtonDeclarations.add("padding: 0");

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".marssel-toast-close",
            closeButtonDeclarations
        );
    }

    addToastTypeStyles() {
        Object.entries(this.types).forEach(([type, style]) => {
            const typeDeclarations = new Set();
            typeDeclarations.add(`background-color: ${style.bg}`);
            typeDeclarations.add(`color: ${style.color}`);
            typeDeclarations.add(`border-left: ${style.borderLeft}`);

            this.styleManager.addDeclarationsWithMediaQuery(
                [],
                `.marssel-toast-${type}`,
                typeDeclarations
            );
        });
    }

    addProgressBarStyles() {
        const progressDeclarations = new Set();
        progressDeclarations.add("position: absolute");
        progressDeclarations.add("bottom: 0");
        progressDeclarations.add("left: 0");
        progressDeclarations.add("height: 3px");
        progressDeclarations.add("background-color: rgba(0, 0, 0, 0.2)");
        progressDeclarations.add("width: 100%");
        progressDeclarations.add("transform-origin: left");

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".marssel-toast-progress",
            progressDeclarations
        );
    }

    getPositionStyles(position, defaultPosition) {
        return this.positions[position] || this.positions[defaultPosition];
    }
}
