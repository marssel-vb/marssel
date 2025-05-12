export class ProgressManager {
    constructor(marssel) {
        this.marssel = marssel;
    }

    init() {
        const hasProgressBar = document.querySelector(".progress-bar");
        if (!hasProgressBar) return;

        // Ajouter les styles par défaut pour les progress bars
        this.addDefaultStyles();
    }

    addDefaultStyles() {
        // Style de base pour les éléments avec la classe progress
        const progressDeclarations = new Set();
        progressDeclarations.add("position: relative");
        progressDeclarations.add("display: block");
        progressDeclarations.add("width: 100%");
        progressDeclarations.add("height: var(--progress-height, 8px)");
        progressDeclarations.add(
            "background-color: var(--progress-background-color, #e9ecef)"
        );
        progressDeclarations.add(
            "border-radius: var(--progress-border-radius, 4px)"
        );
        progressDeclarations.add("overflow: hidden");

        this.marssel.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".progress-[bar]",
            progressDeclarations
        );

        // Pseudo-élément pour représenter la barre de progression
        const progressBarDeclarations = new Set();
        progressBarDeclarations.add("content: ''");
        progressBarDeclarations.add("position: absolute");
        progressBarDeclarations.add("top: 0");
        progressBarDeclarations.add("left: 0");
        progressBarDeclarations.add("height: 100%");
        progressBarDeclarations.add(
            "width: calc(var(--progress-value, 0) * 1%)"
        );
        progressBarDeclarations.add(
            "background-color: var(--progress-color, #007bff)"
        );
        progressBarDeclarations.add(
            "border-radius: var(--progress-border-radius, 4px)"
        );
        progressBarDeclarations.add("transition: width 0.3s ease");

        this.marssel.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".progress-[bar]::before",
            progressBarDeclarations
        );

        // Style pour l'animation (optionnel)
        const progressAnimatedDeclarations = new Set();
        progressAnimatedDeclarations.add(
            "background-image: linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)"
        );
        progressAnimatedDeclarations.add("background-size: 1rem 1rem");
        progressAnimatedDeclarations.add(
            "animation: progress-bar-stripes 1s linear infinite"
        );

        this.marssel.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".progress-[bar].progress-[animated]::before",
            progressAnimatedDeclarations
        );

        // Ajouter l'animation
        const keyframesRule = `
        @keyframes progress-bar-stripes {
            from { background-position: 1rem 0; }
            to { background-position: 0 0; }
        }`;

        // Ajouter l'animation au styleSheet
        const styleElement = document.getElementById("marssel-styles");
        if (styleElement) {
            styleElement.textContent += keyframesRule;
        }

        this.marssel.styleManager.updateStyles();
    }

    // Cette méthode nous permet de mettre à jour la valeur de progression programmatiquement
    updateProgressValue(element, value) {
        if (!(element instanceof HTMLElement)) return;
        element.style.setProperty("--progress-value", value);
    }
}
