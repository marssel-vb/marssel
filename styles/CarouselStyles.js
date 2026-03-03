export class CarouselStyles {
    constructor(styleManager) {
        this.styleManager = styleManager;
        this.styleConfigs = this.#initializeStyleConfigs();
    }

    #initializeStyleConfigs() {
        return {
            ".carousel-container": [
                "position: relative",
                "overflow: hidden",
                "width: 100%",
                "height: 100%",
            ],
            ".carousel-track": [
                "display: flex",
                "height: 100%",
                "transition: transform 0.5s ease-in-out",
            ],
            ".carousel-slide": [
                "flex: 0 0 100%",
                "position: relative",
                "height: 100%",
            ],
            ".carousel-caption": [
                "position: absolute",
                "bottom: 0",
                "left: 0",
                "right: 0",
                "background-color: rgba(0, 0, 0, 0.5)",
                "color: white",
                "padding: 10px",
            ],
            ".carousel-nav-button": [
                "position: absolute",
                "top: 50%",
                "transform: translateY(-50%)",
                "background-color: rgba(0, 0, 0, 0.5)",
                "color: white",
                "border: none",
                "padding: 10px 15px",
                "cursor: pointer",
                "z-index: 10",
                "font-size: 18px",
            ],
            ".carousel-prev": ["left: 10px"],
            ".carousel-next": ["right: 10px"],
            ".carousel-indicators": [
                "position: absolute",
                "bottom: 10px",
                "left: 50%",
                "transform: translateX(-50%)",
                "display: flex",
                "gap: 5px",
                "z-index: 10",
            ],
            ".carousel-indicator": [
                "width: 10px",
                "height: 10px",
                "border-radius: 50%",
                "background-color: rgba(255, 255, 255, 0.5)",
                "cursor: pointer",
                "transition: background-color 0.3s ease",
            ],
            ".carousel-indicator.active": ["background-color: white"],
        };
    }

    addBaseStyles() {
        Object.entries(this.styleConfigs).forEach(
            ([selector, declarations]) => {
                this.styleManager.addDeclarationsWithMediaQuery(
                    [],
                    selector,
                    new Set(declarations),
                );
            },
        );
    }

    updateStyleConfig(selector, newDeclarations) {
        if (this.styleConfigs[selector]) {
            this.styleConfigs[selector] = [
                ...this.styleConfigs[selector],
                ...newDeclarations,
            ];
        }
    }

    getStyleConfig(selector) {
        return this.styleConfigs[selector] || [];
    }

    addCustomStyles(customConfigs) {
        Object.assign(this.styleConfigs, customConfigs);
    }
}
