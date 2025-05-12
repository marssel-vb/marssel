// Ce fichier contient les styles par défaut pour le système de carousel
export class CarouselStyles {
    constructor(styleManager) {
        this.styleManager = styleManager;
    }

    addBaseStyles() {
        // Basic carousel container styles
        const containerDeclarations = new Set();
        containerDeclarations.add("position: relative");
        containerDeclarations.add("overflow: hidden");
        containerDeclarations.add("width: 100%");
        containerDeclarations.add("height: 100%");
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".carousel-container",
            containerDeclarations
        );

        // Carousel slide track styles
        const trackDeclarations = new Set();
        trackDeclarations.add("display: flex");
        trackDeclarations.add("height: 100%");
        trackDeclarations.add("transition: transform 0.5s ease-in-out");
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".carousel-track",
            trackDeclarations
        );

        // Carousel slide styles
        const slideDeclarations = new Set();
        slideDeclarations.add("flex: 0 0 100%");
        slideDeclarations.add("position: relative");
        slideDeclarations.add("height: 100%");
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".carousel-slide",
            slideDeclarations
        );

        // Carousel caption styles
        const captionDeclarations = new Set();
        captionDeclarations.add("position: absolute");
        captionDeclarations.add("bottom: 0");
        captionDeclarations.add("left: 0");
        captionDeclarations.add("right: 0");
        captionDeclarations.add("background-color: rgba(0, 0, 0, 0.5)");
        captionDeclarations.add("color: white");
        captionDeclarations.add("padding: 10px");
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".carousel-caption",
            captionDeclarations
        );

        // Carousel navigation buttons
        const navButtonsDeclarations = new Set();
        navButtonsDeclarations.add("position: absolute");
        navButtonsDeclarations.add("top: 50%");
        navButtonsDeclarations.add("transform: translateY(-50%)");
        navButtonsDeclarations.add("background-color: rgba(0, 0, 0, 0.5)");
        navButtonsDeclarations.add("color: white");
        navButtonsDeclarations.add("border: none");
        navButtonsDeclarations.add("padding: 10px 15px");
        navButtonsDeclarations.add("cursor: pointer");
        navButtonsDeclarations.add("z-index: 10");
        navButtonsDeclarations.add("font-size: 18px");
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".carousel-nav-button",
            navButtonsDeclarations
        );

        // Previous button
        const prevButtonDeclarations = new Set();
        prevButtonDeclarations.add("left: 10px");
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".carousel-prev",
            prevButtonDeclarations
        );

        // Next button
        const nextButtonDeclarations = new Set();
        nextButtonDeclarations.add("right: 10px");
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".carousel-next",
            nextButtonDeclarations
        );

        // Carousel indicators
        const indicatorsContainerDeclarations = new Set();
        indicatorsContainerDeclarations.add("position: absolute");
        indicatorsContainerDeclarations.add("bottom: 10px");
        indicatorsContainerDeclarations.add("left: 50%");
        indicatorsContainerDeclarations.add("transform: translateX(-50%)");
        indicatorsContainerDeclarations.add("display: flex");
        indicatorsContainerDeclarations.add("gap: 5px");
        indicatorsContainerDeclarations.add("z-index: 10");
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".carousel-indicators",
            indicatorsContainerDeclarations
        );

        // Individual indicator
        const indicatorDeclarations = new Set();
        indicatorDeclarations.add("width: 10px");
        indicatorDeclarations.add("height: 10px");
        indicatorDeclarations.add("border-radius: 50%");
        indicatorDeclarations.add("background-color: rgba(255, 255, 255, 0.5)");
        indicatorDeclarations.add("cursor: pointer");
        indicatorDeclarations.add("transition: background-color 0.3s ease");
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".carousel-indicator",
            indicatorDeclarations
        );

        // Active indicator
        const activeIndicatorDeclarations = new Set();
        activeIndicatorDeclarations.add("background-color: white");
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".carousel-indicator.active",
            activeIndicatorDeclarations
        );
    }
}
