import { AnimationStyles } from "../styles/AnimationStyles.js";
import { LRUCache } from "../utils/LRUCache.js";

export class AnimationManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.animationCache = new LRUCache(100);
        this.animationStyles = new AnimationStyles(marssel.styleManager);
        this.documentElement = document.documentElement;
        this.predefinedAnimations = AnimationStyles.PREDEFINED_ANIMATIONS;
    }

    init() {
        this.registerPredefinedAnimations();
        this.marssel.styleManager.updateStyles();
        this.processDataAnimations();
        this.setupObserver();
    }

    registerPredefinedAnimations() {
        Object.entries(this.predefinedAnimations).forEach(
            ([name, keyframes]) => {
                this.animationStyles.registerKeyframes(name, keyframes);
            },
        );
    }

    processDataAnimations() {
        const elements = document.querySelectorAll("[data-animation]");
        elements.forEach((element) => this.processElement(element));
    }

    processElement(element) {
        const animationName = element.getAttribute("data-animation");
        if (!animationName) return;

        const options = {
            duration: element.getAttribute("data-animation-duration") || "1s",
            timing: element.getAttribute("data-animation-timing") || "ease",
            delay: element.getAttribute("data-animation-delay") || "0s",
            iteration: element.getAttribute("data-animation-iteration") || "1",
            direction:
                element.getAttribute("data-animation-direction") || "normal",
            fillMode: element.getAttribute("data-animation-fill") || "none",
        };

        if (this.predefinedAnimations[animationName]) {
            this.applyAnimation(element, animationName, options);
            return;
        }

        const keyframesData = element.getAttribute("data-animation-keyframes");
        if (keyframesData) {
            this.createCustomAnimation(
                element,
                animationName,
                keyframesData,
                options,
            );
        }
    }

    createCustomAnimation(element, name, keyframesData, options) {
        try {
            const keyframes = JSON.parse(keyframesData);
            this.animationStyles.registerKeyframes(name, keyframes);
            this.applyAnimation(element, name, options);
        } catch (error) {
            console.error(`Erreur parsing keyframes pour ${name}:`, error);
        }
    }

    applyAnimation(element, name, options) {
        if (
            this.predefinedAnimations[name] &&
            !this.animationStyles.hasKeyframes(name)
        ) {
            this.animationStyles.registerKeyframes(
                name,
                this.predefinedAnimations[name],
            );
        }

        const elementId = element.id || this.generateUniqueId(element);
        if (!element.id) {
            element.id = elementId;
        }

        const selector = `#${elementId}`;
        this.animationStyles.applyAnimationToSelector(selector, name, options);

        const onEnd = element.getAttribute("data-animation-on-end");
        if (onEnd) {
            const handleAnimationEnd = () => {
                this.handleAnimationEnd(element, onEnd);
            };
            element.addEventListener("animationend", handleAnimationEnd, {
                once: true,
            });
        }
    }

    handleAnimationEnd(element, action) {
        switch (action) {
            case "remove":
                element.remove();
                break;
            case "hide":
                element.style.display = "none";
                break;
            case "reset":
                element.style.animation = "none";
                setTimeout(() => {
                    this.processElement(element);
                }, 10);
                break;
            default:
                if (typeof window[action] === "function") {
                    window[action](element);
                }
        }
    }

    generateUniqueId(element) {
        return `marssel-anim-${Math.random().toString(36).substr(2, 9)}`;
    }

    setupObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        if (node.hasAttribute("data-animation")) {
                            this.processElement(node);
                        }
                        const children =
                            node.querySelectorAll("[data-animation]");
                        children.forEach((child) => this.processElement(child));
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        this.observer = observer;
    }

    handleAnimationProperty(value, declarations, parsed) {
        const animationName = value;

        if (
            this.predefinedAnimations[animationName] &&
            !this.animationStyles.hasKeyframes(animationName)
        ) {
            this.animationStyles.registerKeyframes(
                animationName,
                this.predefinedAnimations[animationName],
            );
        }

        if (
            !this.animationStyles.hasKeyframes(animationName) &&
            !this.predefinedAnimations[animationName]
        ) {
            console.warn(`Animation "${animationName}" not found`);
            return;
        }

        if (
            this.predefinedAnimations[animationName] &&
            !this.animationStyles.hasKeyframes(animationName)
        ) {
            this.animationStyles.registerKeyframes(
                animationName,
                this.predefinedAnimations[animationName],
            );
        }

        this.animationStyles.addAnimationDeclaration(
            declarations,
            "animation-name",
            animationName,
            parsed.isImportant,
        );
    }

    handleAnimationDuration(value, declarations, parsed) {
        this.animationStyles.addAnimationDeclaration(
            declarations,
            "animation-duration",
            value,
            parsed.isImportant,
        );
    }

    handleAnimationTiming(value, declarations, parsed) {
        this.animationStyles.addAnimationDeclaration(
            declarations,
            "animation-timing-function",
            value,
            parsed.isImportant,
        );
    }

    handleAnimationDelay(value, declarations, parsed) {
        this.animationStyles.addAnimationDeclaration(
            declarations,
            "animation-delay",
            value,
            parsed.isImportant,
        );
    }

    handleAnimationIteration(value, declarations, parsed) {
        this.animationStyles.addAnimationDeclaration(
            declarations,
            "animation-iteration-count",
            value,
            parsed.isImportant,
        );
    }

    handleAnimationDirection(value, declarations, parsed) {
        this.animationStyles.addAnimationDeclaration(
            declarations,
            "animation-direction",
            value,
            parsed.isImportant,
        );
    }

    handleAnimationFillMode(value, declarations, parsed) {
        this.animationStyles.addAnimationDeclaration(
            declarations,
            "animation-fill-mode",
            value,
            parsed.isImportant,
        );
    }

    addAnimation(name, keyframes) {
        this.animationStyles.registerKeyframes(name, keyframes);
        this.marssel.styleManager.updateStyles();
    }

    triggerAnimation(element, animationName, options = {}) {
        const defaultOptions = {
            duration: "1s",
            timing: "ease",
            delay: "0s",
            iteration: "1",
            direction: "normal",
            fillMode: "none",
        };

        const mergedOptions = { ...defaultOptions, ...options };
        this.applyAnimation(element, animationName, mergedOptions);
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.animationCache.clear();
        this.animationStyles.clear();
    }
}
