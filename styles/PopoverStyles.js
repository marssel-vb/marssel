// Ce fichier contient les styles par défaut pour le système de carousel
export class PopoverStyles {
    constructor(styleManager) {
        this.styleManager = styleManager;
        this.addBaseStyles();
    }

    addBaseStyles() {
        const declarations = new Set([
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
        ]);
        // Ajout des déclarations CSS en utilisant Marssel's styleManager
        this.styleManager.addDeclarationsWithMediaQuery(
            [], // Pas de média query spécifique pour la plupart des styles
            "[data-popover]",
            declarations // Ajout direct des déclarations
        );

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".popover-visible",
            new Set(["opacity: 1", "visibility: visible"])
        );
    }
}
