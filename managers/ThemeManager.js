import { LRUCache } from "../utils/LRUCache.js";

export class ThemeManager {
    constructor(marssel, themes) {
        this.marssel = marssel;
        this.themes = themes || {};

        this.currentTheme = "light";
        this.themeChangeCallbacks = new Set();
        this.themeIcons = new LRUCache(50);
        this.customThemeValues = { light: {}, dark: {} };

        // Cache des éléments DOM
        this.root = document.documentElement;
        this.body = document.body;

        // Constantes pour éviter les strings répétées
        this.STORAGE_KEY = "marssel-theme";
        this.THEME_ATTR = "data-theme";
        this.TRANSITION_DURATION = 300;

        // Récupération du thème sauvegardé
        this.currentTheme = this.getStoredTheme();
    }

    init(initialTheme = "auto") {
        this.loadCustomThemeValues();
        const detectedTheme = this.detectPreferredTheme(initialTheme);

        // Applique immédiatement les variables CSS au chargement
        this.currentTheme = detectedTheme;
        this.updateThemeVariables();
        this.root.setAttribute(this.THEME_ATTR, detectedTheme);
        this.saveTheme(detectedTheme);

        this.setupEventListeners();
        this.collectThemeIcons();

        // Notifie les callbacks après l'initialisation complète
        this.notifyThemeChange(detectedTheme);
    }

    /**
     * Récupère le thème stocké ou utilise 'auto' par défaut
     */
    getStoredTheme() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || "auto";
        } catch (error) {
            console.warn("Impossible d'accéder au localStorage:", error);
            return "auto";
        }
    }

    /**
     * Sauvegarde le thème dans le localStorage
     */
    saveTheme(theme) {
        try {
            localStorage.setItem(this.STORAGE_KEY, theme);
        } catch (error) {
            console.warn("Impossible de sauvegarder le thème:", error);
        }
    }

    /**
     * Collecte et initialise les icônes de thème
     */
    collectThemeIcons() {
        const icons = document.querySelectorAll("[data-theme-icon]");
        icons.forEach((icon) => {
            const theme = icon.getAttribute("data-theme-icon");
            if (theme) {
                this.themeIcons.set(icon, theme);
                this.updateIconVisibility(icon);
            }
        });
    }

    /**
     * Met à jour la visibilité d'une icône avec animation optimisée
     */
    updateIconVisibility(icon) {
        const iconTheme = this.themeIcons.get(icon);
        const isVisible = iconTheme === this.currentTheme;

        if (isVisible) {
            this.showIcon(icon);
        } else {
            this.hideIcon(icon);
        }
    }

    /**
     * Affiche une icône avec animation
     */
    showIcon(icon) {
        icon.style.display = "block";
        icon.style.opacity = "0";

        requestAnimationFrame(() => {
            icon.style.transition = `opacity ${this.TRANSITION_DURATION}ms ease`;
            icon.style.opacity = "1";
        });
    }

    /**
     * Cache une icône avec animation
     */
    hideIcon(icon) {
        icon.style.transition = `opacity ${this.TRANSITION_DURATION}ms ease`;
        icon.style.opacity = "0";

        setTimeout(() => {
            if (icon.style.opacity === "0") {
                icon.style.display = "none";
            }
        }, this.TRANSITION_DURATION);
    }

    /**
     * Charge les valeurs de thème personnalisées depuis les attributs data
     */
    loadCustomThemeValues() {
        const attributes = this.body.getAttributeNames();

        // Réinitialise les valeurs
        this.customThemeValues = { light: {}, dark: {} };

        // Utilise un objet pour mapper les prefixes aux thèmes
        const prefixMap = {
            "data-theme-light-": "light",
            "data-theme-dark-": "dark",
            "data-theme-": "both",
        };

        attributes.forEach((attr) => {
            for (const [prefix, themeType] of Object.entries(prefixMap)) {
                if (attr.startsWith(prefix)) {
                    const varName = `--theme-${attr.replace(prefix, "")}`;
                    const value = this.body.getAttribute(attr);

                    if (themeType === "both") {
                        this.customThemeValues.light[varName] = value;
                        this.customThemeValues.dark[varName] = value;
                    } else {
                        this.customThemeValues[themeType][varName] = value;
                    }
                    break;
                }
            }
        });
    }

    /**
     * Obtient les variables de thème en combinant les valeurs par défaut et personnalisées
     */
    getThemeVariables(theme) {
        return {
            ...(this.themes[theme] || {}), // Thèmes fusionnés
            ...(this.customThemeValues[theme] || {}), // Valeurs data-attributes
        };
    }

    // Ajouter une méthode pour mettre à jour les thèmes
    updateThemes(newThemes) {
        // CORRECTION : Remplacer complètement les thèmes au lieu de les fusionner
        this.themes = newThemes;

        // Optionnel : Recharger les valeurs personnalisées
        this.loadCustomThemeValues();

        // Optionnel : Réappliquer le thème actuel
        this.updateThemeVariables();
    }

    /**
     * Détecte le thème préféré du système
     */
    detectPreferredTheme(theme) {
        if (theme === "auto") {
            return this.getSystemPreference();
        }
        return theme;
    }

    /**
     * Obtient la préférence système pour le thème
     */
    getSystemPreference() {
        try {
            return window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
        } catch (error) {
            console.warn(
                "Impossible de détecter la préférence système:",
                error
            );
            return "light";
        }
    }

    /**
     * Applique un thème avec optimisations
     */
    applyTheme(theme) {
        if (this.currentTheme === theme) return; // Évite les applications redondantes

        this.currentTheme = theme;

        // Application immédiate pour éviter les délais visuels
        this.root.setAttribute(this.THEME_ATTR, theme);
        this.updateThemeVariables();
        this.saveTheme(theme);

        // Mise à jour des icônes avec délai pour l'animation
        requestAnimationFrame(() => {
            this.updateAllIconsVisibility();
        });

        // Notifie les observateurs
        this.notifyThemeChange(theme);
    }

    /**
     * Met à jour toutes les icônes en une seule fois
     */
    updateAllIconsVisibility() {
        this.themeIcons.forEach((_, icon) => this.updateIconVisibility(icon));
    }

    /**
     * Met à jour les variables CSS du thème
     */
    updateThemeVariables() {
        const themeVars = this.getThemeVariables(this.currentTheme);

        // Vérification que les variables existent
        if (!themeVars || Object.keys(themeVars).length === 0) {
            console.warn(
                `Aucune variable trouvée pour le thème: ${this.currentTheme}`
            );
            console.warn("Thèmes disponibles:", Object.keys(this.themes || {}));
            return;
        }

        // Applique les variables CSS
        Object.entries(themeVars).forEach(([varName, value]) => {
            if (value !== undefined && value !== null) {
                this.root.style.setProperty(varName, value);
            }
        });
    }

    /**
     * Alterne entre les thèmes clair et sombre
     */
    toggleTheme() {
        const newTheme = this.currentTheme === "light" ? "dark" : "light";
        this.applyTheme(newTheme);
    }

    /**
     * Ajoute un callback pour les changements de thème
     */
    onThemeChange(callback) {
        if (typeof callback !== "function") {
            console.warn("Le callback doit être une fonction");
            return () => {};
        }

        this.themeChangeCallbacks.add(callback);
        return () => this.themeChangeCallbacks.delete(callback);
    }

    /**
     * Notifie tous les callbacks des changements de thème
     */
    notifyThemeChange(theme) {
        this.themeChangeCallbacks.forEach((callback) => {
            try {
                callback(theme);
            } catch (error) {
                console.error(
                    "Erreur dans le callback de changement de thème:",
                    error
                );
            }
        });
    }

    /**
     * Configure tous les event listeners
     */
    setupEventListeners() {
        this.setupThemeSwitchers();
        this.setupSystemThemeListener();
    }

    /**
     * Configure les boutons de changement de thème
     */
    setupThemeSwitchers() {
        const switchers = document.querySelectorAll("[data-theme-switcher]");
        switchers.forEach((el) => {
            // Utilise une fonction fléchée pour préserver le contexte
            el.addEventListener("click", () => this.toggleTheme());
        });
    }

    /**
     * Configure l'écoute des changements de préférence système
     */
    setupSystemThemeListener() {
        try {
            const mediaQuery = window.matchMedia(
                "(prefers-color-scheme: dark)"
            );

            const handleSystemChange = (e) => {
                if (this.getStoredTheme() === "auto") {
                    this.applyTheme(e.matches ? "dark" : "light");
                }
            };

            // Utilise la nouvelle API si disponible, sinon fallback
            if (mediaQuery.addEventListener) {
                mediaQuery.addEventListener("change", handleSystemChange);
            } else {
                mediaQuery.addListener(handleSystemChange);
            }
        } catch (error) {
            console.warn(
                "Impossible de configurer l'écoute du thème système:",
                error
            );
        }
    }

    /**
     * Nettoie les ressources (utile pour éviter les fuites mémoire)
     */
    destroy() {
        this.themeChangeCallbacks.clear();
        this.themeIcons.clear();
        this.customThemeValues = null;
    }

    /**
     * Getter pour le thème actuel
     */
    get theme() {
        return this.currentTheme;
    }

    /**
     * Getter pour vérifier si le mode sombre est actif
     */
    get isDarkMode() {
        return this.currentTheme === "dark";
    }
}
