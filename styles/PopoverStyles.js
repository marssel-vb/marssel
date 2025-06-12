// Styles par défaut pour le système de popover
export class PopoverStyles {
    // Configuration des styles centralisée
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
     * Initialise tous les styles du popover
     * @private
     */
    initializeStyles() {
        const { base, visible } = PopoverStyles.STYLES_CONFIG;

        // Applique les styles de base
        this.applyStyles(base);

        // Applique les styles de visibilité
        this.applyStyles(visible);
    }

    /**
     * Applique un ensemble de styles via le styleManager
     * @param {Object} styleConfig - Configuration des styles {selector, declarations}
     * @private
     */
    applyStyles({ selector, declarations }) {
        this.styleManager.addDeclarationsWithMediaQuery(
            [], // Pas de media query
            selector,
            new Set(declarations)
        );
    }

    /**
     * Permet d'ajouter des styles personnalisés
     * @param {string} selector - Sélecteur CSS
     * @param {string[]} declarations - Déclarations CSS
     * @param {string[]} mediaQueries - Media queries optionnelles
     */
    addCustomStyles(selector, declarations, mediaQueries = []) {
        this.styleManager.addDeclarationsWithMediaQuery(
            mediaQueries,
            selector,
            new Set(declarations)
        );
    }

    /**
     * Met à jour la configuration des styles de base
     * @param {Object} newConfig - Nouvelle configuration
     */
    static updateConfig(newConfig) {
        Object.assign(PopoverStyles.STYLES_CONFIG, newConfig);
    }
}
