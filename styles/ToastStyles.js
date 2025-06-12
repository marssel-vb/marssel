export class ToastStyles {
    // Constantes statiques pour éviter la recréation à chaque instance
    static POSITIONS = Object.freeze({
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

    // Styles pré-calculés pour éviter la recréation
    static CONTAINER_STYLES = new Set([
        "position: fixed",
        "z-index: 9999",
        "pointer-events: none",
        "width: 100%",
        "height: 100%",
        "left: 0",
        "top: 0",
    ]);

    static TOAST_BASE_STYLES = new Set([
        "position: absolute",
        "min-width: 250px",
        "max-width: 350px",
        "background-color: #fff",
        "color: #333",
        "border-radius: 4px",
        "padding: 1rem",
        "box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)",
        "margin-bottom: 0.5rem",
        "pointer-events: auto",
        "transition: all 0.3s ease-in-out",
        "opacity: 0",
        "transform: translateY(10px)",
    ]);

    static VISIBLE_STYLES = new Set(["opacity: 1", "transform: translateY(0)"]);

    static MOBILE_STYLES = new Set([
        "min-width: calc(100% - 2rem)",
        "max-width: calc(100% - 2rem)",
        "margin-left: 1rem",
        "margin-right: 1rem",
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
     * Applique tous les styles de toast
     * Utilise une approche batch pour optimiser les performances
     */
    applyStyles() {
        // Tableau des méthodes à exécuter dans l'ordre
        const styleMethods = [
            () => this.addContainerStyles(),
            () => this.addToastBaseStyles(),
            () => this.addVisibleToastStyles(),
            () => this.addMobileResponsiveStyles(),
            () => this.addCloseButtonStyles(),
            () => this.addToastTypeStyles(),
            () => this.addProgressBarStyles(),
        ];

        // Exécution en batch pour de meilleures performances
        try {
            styleMethods.forEach((method) => method());
        } catch (error) {
            console.error(
                "Erreur lors de l'application des styles toast:",
                error
            );
            throw error;
        } finally {
            // S'assurer que les styles sont toujours appliqués
            this.styleManager.updateStyles();
        }
    }

    addContainerStyles() {
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".marssel-toast-container",
            ToastStyles.CONTAINER_STYLES
        );
    }

    addToastBaseStyles() {
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".marssel-toast",
            ToastStyles.TOAST_BASE_STYLES
        );
    }

    addVisibleToastStyles() {
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".marssel-toast.visible",
            ToastStyles.VISIBLE_STYLES
        );
    }

    addMobileResponsiveStyles() {
        this.styleManager.addDeclarationsWithMediaQuery(
            ["msm"], // msm: max-width sm
            ".marssel-toast",
            ToastStyles.MOBILE_STYLES
        );
    }

    addCloseButtonStyles() {
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".marssel-toast-close",
            ToastStyles.CLOSE_BUTTON_STYLES
        );
    }

    /**
     * Génère les styles pour chaque type de toast
     * Optimisé avec une approche fonctionnelle
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
                typeDeclarations
            );
        });
    }

    addProgressBarStyles() {
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".marssel-toast-progress",
            ToastStyles.PROGRESS_BAR_STYLES
        );
    }

    /**
     * Récupère les styles de position avec fallback sécurisé
     * @param {string} position - Position demandée
     * @param {string} defaultPosition - Position par défaut
     * @returns {Object} Styles de position
     */
    getPositionStyles(position, defaultPosition = "top-right") {
        const positionStyle = ToastStyles.POSITIONS[position];

        if (positionStyle) {
            return positionStyle;
        }

        const fallbackStyle = ToastStyles.POSITIONS[defaultPosition];
        if (!fallbackStyle) {
            console.warn(
                `Position invalide: ${position}, utilisation de top-right par défaut`
            );
            return ToastStyles.POSITIONS["top-right"];
        }

        return fallbackStyle;
    }

    /**
     * Méthode utilitaire pour vérifier si une position est valide
     * @param {string} position - Position à vérifier
     * @returns {boolean}
     */
    static isValidPosition(position) {
        return position in ToastStyles.POSITIONS;
    }

    /**
     * Méthode utilitaire pour vérifier si un type est valide
     * @param {string} type - Type à vérifier
     * @returns {boolean}
     */
    static isValidType(type) {
        return type in ToastStyles.TYPES;
    }

    /**
     * Récupère la liste des positions disponibles
     * @returns {string[]}
     */
    static getAvailablePositions() {
        return Object.keys(ToastStyles.POSITIONS);
    }

    /**
     * Récupère la liste des types disponibles
     * @returns {string[]}
     */
    static getAvailableTypes() {
        return Object.keys(ToastStyles.TYPES);
    }
}
