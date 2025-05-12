// Ce fichier contient les styles par défaut pour le système de carousel
export class OffcanvasStyles {
    constructor(styleManager) {
        this.styleManager = styleManager;
        this.addBaseStyles();
    }

    addBaseStyles() {
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".offcanvas",
            new Set([
                "position: fixed",
                "display: flex",
                "flex-direction: column",
                "max-width: 100%",
                "max-height: 100%",
                "background-color: #fff",
                "transition: transform 0.3s ease",
                "z-index: 1045",
                "box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15)",
                "visibility: hidden",
            ])
        );

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".offcanvas.show",
            new Set(["transform: none !important", "visibility: visible"])
        );

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".offcanvas-header",
            new Set([
                "display: flex",
                "align-items: center",
                "justify-content: space-between",
                "padding: 1rem",
                "border-bottom: 1px solid #dee2e6",
            ])
        );

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".offcanvas-title",
            new Set(["margin: 0"])
        );

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".offcanvas-body",
            new Set(["flex-grow: 1", "padding: 1rem", "overflow-y: auto"])
        );

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".offcanvas-close",
            new Set([
                "background: transparent",
                "border: 0",
                "font-size: 1.5rem",
                "opacity: 0.5",
                "cursor: pointer",
                "padding: 0.25rem 0.5rem",
            ])
        );

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".offcanvas-close:hover",
            new Set(["opacity: 1"])
        );

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".offcanvas-backdrop",
            new Set([
                "position: fixed",
                "top: 0",
                "left: 0",
                "width: 100vw",
                "height: 100vh",
                "background-color: rgba(0, 0, 0, 0.5)",
                "z-index: 1040",
                "opacity: 0",
                "visibility: hidden",
                "transition: opacity 0.3s ease",
            ])
        );

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".offcanvas-backdrop.show",
            new Set(["opacity: 1", "visibility: visible"])
        );

        // Direction-specific styles
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".offcanvas-start",
            new Set([
                "top: 0",
                "left: 0",
                "width: 400px",
                "height: 100vh",
                "transform: translateX(-100%)",
            ])
        );

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".offcanvas-end",
            new Set([
                "top: 0",
                "right: 0",
                "width: 400px",
                "height: 100vh",
                "transform: translateX(100%)",
            ])
        );

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".offcanvas-top",
            new Set([
                "top: 0",
                "left: 0",
                "width: 100vw",
                "height: 50vh",
                "transform: translateY(-100%)",
            ])
        );

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".offcanvas-bottom",
            new Set([
                "bottom: 0",
                "left: 0",
                "width: 100vw",
                "height: 50vh",
                "transform: translateY(100%)",
            ])
        );

        // Scroll lock on body
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            "body.offcanvas-lock-scroll",
            new Set(["overflow: hidden"])
        );
    }
}
