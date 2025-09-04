import { cleanValue } from "../utils/helpers.js";

export class AnimationStyles {
    // Animations prédéfinies
    static PREDEFINED_ANIMATIONS = Object.freeze({
        fadeIn: {
            from: { opacity: 0 },
            to: { opacity: 1 },
        },
        fadeOut: {
            from: { opacity: 1 },
            to: { opacity: 0 },
        },
        slideInLeft: {
            from: { transform: "translateX(-100%)", opacity: 0 },
            to: { transform: "translateX(0)", opacity: 1 },
        },
        slideInRight: {
            from: { transform: "translateX(100%)", opacity: 0 },
            to: { transform: "translateX(0)", opacity: 1 },
        },
        slideInUp: {
            from: { transform: "translateY(100%)", opacity: 0 },
            to: { transform: "translateY(0)", opacity: 1 },
        },
        slideInDown: {
            from: { transform: "translateY(-100%)", opacity: 0 },
            to: { transform: "translateY(0)", opacity: 1 },
        },
        bounce: {
            "0%, 100%": { transform: "translateY(0)" },
            "50%": { transform: "translateY(-20px)" },
        },
        pulse: {
            "0%, 100%": { transform: "scale(1)" },
            "50%": { transform: "scale(1.05)" },
        },
        shake: {
            "0%, 100%": { transform: "translateX(0)" },
            "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-10px)" },
            "20%, 40%, 60%, 80%": { transform: "translateX(10px)" },
        },
        spin: {
            from: { transform: "rotate(0deg)" },
            to: { transform: "rotate(360deg)" },
        },
        zoomIn: {
            from: { transform: "scale(0)", opacity: 0 },
            to: { transform: "scale(1)", opacity: 1 },
        },
        zoomOut: {
            from: { transform: "scale(1)", opacity: 1 },
            to: { transform: "scale(0)", opacity: 0 },
        },
        flip: {
            from: { transform: "perspective(400px) rotateY(0)" },
            to: { transform: "perspective(400px) rotateY(360deg)" },
        },
        wobble: {
            "0%, 100%": { transform: "translateX(0)" },
            "15%": { transform: "translateX(-25px) rotate(-5deg)" },
            "30%": { transform: "translateX(20px) rotate(3deg)" },
            "45%": { transform: "translateX(-15px) rotate(-3deg)" },
            "60%": { transform: "translateX(10px) rotate(2deg)" },
            "75%": { transform: "translateX(-5px) rotate(-1deg)" },
        },
        slideOutLeft: {
            from: { transform: "translateX(0)", opacity: 1 },
            to: { transform: "translateX(-100%)", opacity: 0 },
        },
        slideOutRight: {
            from: { transform: "translateX(0)", opacity: 1 },
            to: { transform: "translateX(100%)", opacity: 0 },
        },
        slideOutUp: {
            from: { transform: "translateY(0)", opacity: 1 },
            to: { transform: "translateY(-100%)", opacity: 0 },
        },
        slideOutDown: {
            from: { transform: "translateY(0)", opacity: 1 },
            to: { transform: "translateY(100%)", opacity: 0 },
        },
        rotateIn: {
            from: { transform: "rotate(-200deg)", opacity: 0 },
            to: { transform: "rotate(0)", opacity: 1 },
        },
        rotateOut: {
            from: { transform: "rotate(0)", opacity: 1 },
            to: { transform: "rotate(200deg)", opacity: 0 },
        },
        bounceIn: {
            "0%": { transform: "scale(0.3)", opacity: 0 },
            "50%": { transform: "scale(1.05)", opacity: 1 },
            "70%": { transform: "scale(0.9)" },
            "100%": { transform: "scale(1)" },
        },
        bounceOut: {
            "0%": { transform: "scale(1)" },
            "25%": { transform: "scale(0.95)" },
            "50%": { transform: "scale(1.1)", opacity: 1 },
            "100%": { transform: "scale(0.3)", opacity: 0 },
        },
        flash: {
            "0%, 50%, 100%": { opacity: 1 },
            "25%, 75%": { opacity: 0 },
        },
        heartBeat: {
            "0%, 100%": { transform: "scale(1)" },
            "14%": { transform: "scale(1.3)" },
            "28%": { transform: "scale(1)" },
            "42%": { transform: "scale(1.3)" },
            "70%": { transform: "scale(1)" },
        },
        swing: {
            "20%": { transform: "rotate(15deg)" },
            "40%": { transform: "rotate(-10deg)" },
            "60%": { transform: "rotate(5deg)" },
            "80%": { transform: "rotate(-5deg)" },
            "100%": { transform: "rotate(0deg)" },
        },
        rubberBand: {
            "0%, 100%": { transform: "scale(1)" },
            "30%": { transform: "scaleX(1.25) scaleY(0.75)" },
            "40%": { transform: "scaleX(0.75) scaleY(1.25)" },
            "50%": { transform: "scaleX(1.15) scaleY(0.85)" },
            "65%": { transform: "scaleX(0.95) scaleY(1.05)" },
            "75%": { transform: "scaleX(1.05) scaleY(0.95)" },
        },
        jello: {
            "0%, 100%": { transform: "skewX(0deg) skewY(0deg)" },
            "30%": { transform: "skewX(25deg) skewY(25deg)" },
            "40%": { transform: "skewX(-20deg) skewY(-20deg)" },
            "50%": { transform: "skewX(15deg) skewY(15deg)" },
            "65%": { transform: "skewX(-10deg) skewY(-10deg)" },
            "75%": { transform: "skewX(5deg) skewY(5deg)" },
        },
        tada: {
            "0%, 100%": { transform: "scale(1) rotate(0)" },
            "10%, 20%": { transform: "scale(0.9) rotate(-3deg)" },
            "30%, 50%, 70%, 90%": { transform: "scale(1.1) rotate(3deg)" },
            "40%, 60%, 80%": { transform: "scale(1.1) rotate(-3deg)" },
        },
    });

    constructor(styleManager) {
        this.styleManager = styleManager;
        this.keyframes = new Map();
    }

    /**
     * Enregistre des keyframes d'animation
     */
    registerKeyframes(name, keyframes) {
        if (this.keyframes.has(name)) return;

        const keyframesCSS = this.buildKeyframesCSS(name, keyframes);
        this.keyframes.set(name, keyframesCSS);

        // Ajouter au StyleManager
        this.styleManager.addFontFace(keyframesCSS);

        // ✅ AJOUT : Forcer la mise à jour immédiate
        this.styleManager.updateStyles();
    }

    /**
     * Construit le CSS des keyframes
     */
    buildKeyframesCSS(name, keyframes) {
        const rules = Object.entries(keyframes)
            .map(([selector, properties]) => {
                const props = Object.entries(properties)
                    .map(([prop, value]) => `${prop}: ${value}`)
                    .join("; ");
                return `${selector} { ${props} }`;
            })
            .join("\n  ");

        return `@keyframes ${name} {\n  ${rules}\n}`;
    }

    /**
     * Vérifie si des keyframes existent
     */
    hasKeyframes(name) {
        return this.keyframes.has(name);
    }

    /**
     * Applique une animation à un sélecteur
     */
    applyAnimationToSelector(selector, name, options) {
        const { duration, timing, delay, iteration, direction, fillMode } =
            options;

        const animationValue = this.buildAnimationValue(
            name,
            duration,
            timing,
            delay,
            iteration,
            direction,
            fillMode
        );

        const declarations = new Set([`animation: ${animationValue}`]);

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            selector,
            declarations
        );

        // ✅ AJOUT : Forcer la mise à jour immédiate
        this.styleManager.updateStyles();
    }

    /**
     * Construit la valeur complète de la propriété animation
     */
    buildAnimationValue(
        name,
        duration,
        timing,
        delay,
        iteration,
        direction,
        fillMode
    ) {
        return `${name} ${duration} ${timing} ${delay} ${iteration} ${direction} ${fillMode}`;
    }

    /**
     * Ajoute une déclaration d'animation avec support !important
     */
    addAnimationDeclaration(
        declarations,
        property,
        value,
        isImportant = false
    ) {
        const cleanedValue = cleanValue(value);
        let declaration = `${property}: ${cleanedValue}`;

        if (isImportant && !declaration.includes("!important")) {
            declaration += " !important";
        }

        declarations.add(declaration);
    }

    /**
     * Ajoute des animations personnalisées en masse
     */
    addCustomAnimations(animations) {
        Object.entries(animations).forEach(([name, keyframes]) => {
            this.registerKeyframes(name, keyframes);
        });
    }

    /**
     * Supprime une animation
     */
    removeKeyframes(name) {
        this.keyframes.delete(name);
        // Note: Ne peut pas supprimer du StyleManager une fois ajouté
        // Il faudrait reconstruire tout le style
    }

    /**
     * Obtient toutes les animations enregistrées
     */
    getAllAnimations() {
        return Array.from(this.keyframes.keys());
    }

    /**
     * Obtient les keyframes d'une animation
     */
    getKeyframes(name) {
        return this.keyframes.get(name);
    }

    /**
     * Nettoie tous les keyframes
     */
    clear() {
        this.keyframes.clear();
    }

    /**
     * Crée une animation de transition entre deux états
     */
    createTransitionAnimation(name, fromState, toState, steps = 2) {
        const keyframes = {};

        keyframes["from"] = fromState;

        if (steps > 2) {
            const stepPercentage = 100 / (steps - 1);
            for (let i = 1; i < steps - 1; i++) {
                const percentage = Math.round(stepPercentage * i);
                keyframes[`${percentage}%`] = this.interpolateStates(
                    fromState,
                    toState,
                    i / (steps - 1)
                );
            }
        }

        keyframes["to"] = toState;

        this.registerKeyframes(name, keyframes);
        return name;
    }

    /**
     * Interpole entre deux états pour les transitions
     */
    interpolateStates(from, to, ratio) {
        const interpolated = {};

        Object.keys(from).forEach((key) => {
            if (typeof from[key] === "number" && typeof to[key] === "number") {
                interpolated[key] = from[key] + (to[key] - from[key]) * ratio;
            } else {
                // Pour les propriétés non-numériques, basculer à mi-chemin
                interpolated[key] = ratio < 0.5 ? from[key] : to[key];
            }
        });

        return interpolated;
    }

    /**
     * Crée une animation de boucle (loop)
     */
    createLoopAnimation(name, states, easing = "linear") {
        const keyframes = {};
        const stateCount = states.length;

        states.forEach((state, index) => {
            const percentage = Math.round((100 / (stateCount - 1)) * index);
            keyframes[`${percentage}%`] = state;
        });

        this.registerKeyframes(name, keyframes);
        return name;
    }

    /**
     * Crée une animation de séquence
     */
    createSequenceAnimation(name, sequence) {
        const keyframes = {};

        sequence.forEach(({ at, state }) => {
            keyframes[at] = state;
        });

        this.registerKeyframes(name, keyframes);
        return name;
    }

    /**
     * Clone une animation existante avec modifications
     */
    cloneAnimation(sourceName, newName, modifications = {}) {
        const sourceKeyframes = this.getKeyframes(sourceName);
        if (!sourceKeyframes) {
            console.warn(`Animation source "${sourceName}" non trouvée`);
            return null;
        }

        // Parser le CSS des keyframes (simplifié)
        // Dans un cas réel, il faudrait un vrai parser
        const modifiedKeyframes = { ...modifications };

        this.registerKeyframes(newName, modifiedKeyframes);
        return newName;
    }

    /**
     * Combine plusieurs animations
     */
    combineAnimations(name, animationNames, delays = []) {
        // Crée une animation complexe en combinant plusieurs
        const combinedKeyframes = {};
        const totalAnimations = animationNames.length;
        const segmentSize = 100 / totalAnimations;

        animationNames.forEach((animName, index) => {
            const startPercent = Math.round(segmentSize * index);
            const endPercent = Math.round(segmentSize * (index + 1));

            // Simplification - dans la réalité, il faudrait parser les keyframes existantes
            combinedKeyframes[`${startPercent}%`] = {
                /* état initial de l'animation */
            };
            combinedKeyframes[`${endPercent}%`] = {
                /* état final de l'animation */
            };
        });

        this.registerKeyframes(name, combinedKeyframes);
        return name;
    }

    /**
     * Génère une animation de respiration (breathing effect)
     */
    createBreathingAnimation(name, minScale = 1, maxScale = 1.05, steps = 4) {
        const keyframes = {
            "0%, 100%": { transform: `scale(${minScale})` },
        };

        const midPoint = 50;
        keyframes[`${midPoint}%`] = { transform: `scale(${maxScale})` };

        this.registerKeyframes(name, keyframes);
        return name;
    }

    /**
     * Génère une animation de clignotement
     */
    createBlinkAnimation(name, duration = "1s", times = 3) {
        const keyframes = {};
        const step = 100 / (times * 2);

        for (let i = 0; i <= times * 2; i++) {
            const percent = Math.round(step * i);
            keyframes[`${percent}%`] = {
                opacity: i % 2 === 0 ? 1 : 0,
            };
        }

        this.registerKeyframes(name, keyframes);
        return name;
    }

    /**
     * Obtient les statistiques
     */
    getStats() {
        return {
            totalKeyframes: this.keyframes.size,
            predefinedCount: Object.keys(AnimationStyles.PREDEFINED_ANIMATIONS)
                .length,
            customCount:
                this.keyframes.size -
                Object.keys(AnimationStyles.PREDEFINED_ANIMATIONS).length,
        };
    }
}
