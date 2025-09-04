// Système de dropdown optimisé avec styles modulaires
export class DropdownStyles {
    constructor(styleManager) {
        this.styleManager = styleManager;
        this.mediaQueries = [];
    }

    initializeStyles() {
        this.addBaseStyles();
        this.addResponsiveStyles();
    }

    // Méthode utilitaire pour ajouter des styles
    addStyles(selector, declarations) {
        this.styleManager.addDeclarationsWithMediaQuery(
            this.mediaQueries,
            selector,
            new Set(declarations)
        );
    }

    addBaseStyles() {
        // Configuration des styles de base
        const styleConfig = {
            // Conteneur principal
            ".dropdown": ["position: relative", "display: inline-block"],

            // Bouton de déclenchement
            ".dropdown-toggle": [
                "display: inline-flex",
                "align-items: center",
                "justify-content: space-between",
                "cursor: pointer",
                "vertical-align: middle",
            ],

            ".dropdown-toggle .icon-plus": [
                "margin-left: 8px",
                "transition: all 0.3s ease",
            ],

            ".dropdown.active .dropdown-toggle .icon": [
                "transform: rotate(180deg) scaleX(-1)", // Combinaison de rotations
            ],

            // Menu dropdown standard
            ".dropdown-menu": [
                "position: absolute",
                "z-index: 1000",
                "display: none",
                "min-width: 12rem",
                "padding: 0.5rem 0",
                "margin: 0.125rem 0 0",
                "background-color: #fff",
                "border: 1px solid rgba(0,0,0,0.15)",
                "border-radius: 0.25rem",
                "box-shadow: 0 2px 5px rgba(0,0,0,0.1)",
            ],

            // Éléments du menu
            ".dropdown-item": [
                "display: block",
                "width: 100%",
                "padding: 0.5rem 1.5rem",
                "clear: both",
                "text-align: inherit",
                "white-space: nowrap",
                "background-color: transparent",
                "border: 0",
                "text-decoration: none",
                "cursor: pointer",
                "color: #333",
                "transition: background-color 0.15s ease-in-out, color 0.15s ease-in-out",
            ],

            ".dropdown-item:hover": [
                "background-color: #f5f5f5",
                "color: #4a90e2",
            ],

            // Sous-menu
            ".dropdown-submenu": ["position: relative"],
        };

        // Application des styles de base
        Object.entries(styleConfig).forEach(([selector, declarations]) => {
            this.addStyles(selector, declarations);
        });

        // Styles spécialisés
        this.addFullWidthStyles();
        this.addMegaMenuStyles();
        this.addIconStyles();
    }

    addFullWidthStyles() {
        const fullWidthConfig = {
            ".dropdown-fullwidth": [
                "position: static !important",
                "display: inline-block",
            ],

            ".dropdown-menu-fullwidth": [
                "position: absolute",
                "left: 0",
                "right: 0",
                "transform: none",
                "width: 100%",
                "max-width: 100vw",
                "margin: 0",
                "z-index: 1000",
                "display: none",
                "padding: 2rem",
                "background-color: #fff",
                "border: 1px solid rgba(0,0,0,0.15)",
                "box-shadow: 0 2px 5px rgba(0,0,0,0.1)",
            ],
        };

        Object.entries(fullWidthConfig).forEach(([selector, declarations]) => {
            this.addStyles(selector, declarations);
        });
    }

    addMegaMenuStyles() {
        const megaMenuConfig = {
            ".mega-menu-grid": [
                "display: grid",
                "grid-template-columns: repeat(4, 1fr)",
                "gap: 1rem",
            ],

            ".mega-menu-column h4": [
                "margin: 0 0 1rem 0",
                "color: #4a90e2",
                "font-size: 1.1rem",
                "font-weight: 600",
            ],

            ".mega-menu-column ul": [
                "list-style: none",
                "padding: 0",
                "margin: 0",
            ],

            ".mega-menu-column ul li": ["margin-bottom: 0.5rem"],

            ".mega-menu-column ul li a": [
                "color: #333",
                "text-decoration: none",
                "transition: color 0.15s ease-in-out",
            ],

            ".mega-menu-column ul li a:hover": ["color: #4a90e2"],
        };

        Object.entries(megaMenuConfig).forEach(([selector, declarations]) => {
            this.addStyles(selector, declarations);
        });
    }

    addIconStyles() {
        const iconBaseStyles = [
            "display: inline-block",
            "margin-left: 8px",
            "transition: transform 0.3s ease",
            "width: 12px",
            "height: 12px",
            "vertical-align: middle",
            "position: relative",
            "flex-shrink: 0",
        ];

        const iconConfig = {
            // Icône plus (+) par défaut
            ".icon-plus": [
                ...iconBaseStyles,
                "background: transparent",
                "border: none",
            ],

            ".icon-plus::before, .icon-plus::after": [
                "content: ''",
                "position: absolute",
                "background-color: #333",
                "transition: all 0.3s ease",
            ],

            ".icon-plus::before": [
                "top: 50%",
                "left: 0",
                "width: 100%",
                "height: 2px",
                "transform: translateY(-50%)",
            ],

            ".icon-plus::after": [
                "left: 50%",
                "top: 0",
                "width: 2px",
                "height: 100%",
                "transform: translateX(-50%)",
            ],

            // Transformation en moins (-) quand actif
            ".dropdown.active .icon-plus::after": [
                "transform: translateX(-50%) rotate(90deg)",
                "opacity: 0",
            ],

            ".dropdown.active .icon-plus::before": [
                "transform: translateY(-50%)",
            ],
        };

        Object.entries(iconConfig).forEach(([selector, declarations]) => {
            this.addStyles(selector, declarations);
        });
    }

    addResponsiveStyles() {
        // Sauvegarde des media queries actuelles
        const originalMediaQueries = this.mediaQueries;

        // Application des styles mobiles
        this.mediaQueries = ["(max-width: 991px)"];

        const mobileConfig = {
            ".mobile-view .dropdown-menu": [
                "position: static",
                "box-shadow: none",
                "border: none",
                "border-left: 2px solid rgba(0,0,0,0.1)",
                "margin-left: 1rem",
                "padding-left: 0.5rem",
            ],

            ".mobile-view .dropdown-menu-fullwidth": [
                "position: static",
                "box-shadow: none",
                "border: none",
                "border-left: 2px solid rgba(0,0,0,0.1)",
                "margin-left: 1rem",
                "padding: 1rem",
            ],

            ".mobile-view .dropdown-toggle .icon-plus": [
                "margin-left: 6px",
                "width: 10px",
                "height: 10px",
            ],
        };

        Object.entries(mobileConfig).forEach(([selector, declarations]) => {
            this.addStyles(selector, declarations);
        });

        // Restauration des media queries originales
        this.mediaQueries = originalMediaQueries;
    }

    // Méthode pour ajouter des styles personnalisés
    addCustomStyles(customStyles) {
        if (typeof customStyles === "object" && customStyles !== null) {
            Object.entries(customStyles).forEach(([selector, declarations]) => {
                this.addStyles(
                    selector,
                    Array.isArray(declarations) ? declarations : [declarations]
                );
            });
        }
    }

    // Méthode pour réinitialiser tous les styles
    resetStyles() {
        // Cette méthode devrait être implémentée selon votre styleManager
        console.warn(
            "resetStyles() doit être implémentée selon votre styleManager"
        );
    }
}
