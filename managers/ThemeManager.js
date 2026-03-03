import { LRUCache } from "../utils/LRUCache.js";

export class ThemeManager {
    constructor(marssel, themes) {
        this.marssel = marssel;
        this.themes = themes || {};

        this.currentTheme = "light";
        this.themeChangeCallbacks = new Set();
        this.themeIcons = new LRUCache(50);
        this.customThemeValues = { light: {}, dark: {} };
        this.root = document.documentElement;
        this.body = document.body;
        this.STORAGE_KEY = "marssel-theme";
        this.THEME_ATTR = "data-theme";
        this.TRANSITION_DURATION = 300;
        this.currentTheme = this.getStoredTheme();
    }

    init(initialTheme = "auto") {
        this.loadCustomThemeValues();
        const detectedTheme = this.detectPreferredTheme(initialTheme);

        this.currentTheme = detectedTheme;
        this.updateThemeVariables();
        this.root.setAttribute(this.THEME_ATTR, detectedTheme);
        this.saveTheme(detectedTheme);

        this.setupEventListeners();
        this.collectThemeIcons();

        this.notifyThemeChange(detectedTheme);
    }

    /**
     * Retrieves the stored theme or uses 'auto' by default
     */
    getStoredTheme() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || "auto";
        } catch (error) {
            console.warn("Unable to access localStorage:", error);
            return "auto";
        }
    }

    /**
     * Saves the theme to localStorage
     */
    saveTheme(theme) {
        try {
            localStorage.setItem(this.STORAGE_KEY, theme);
        } catch (error) {
            console.warn("Unable to save theme:", error);
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
     * Updates the visibility of an icon with optimized animation
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
     * Displays an animated icon
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
     * Hides an animated icon
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
     * Loads custom theme values ​​from data attributes
     */
    loadCustomThemeValues() {
        const attributes = this.body.getAttributeNames();

        this.customThemeValues = { light: {}, dark: {} };

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
     * Obtains theme variables by combining default and custom values
     */
    getThemeVariables(theme) {
        return {
            ...(this.themes[theme] || {}),
            ...(this.customThemeValues[theme] || {}),
        };
    }

    /**
     * Add a method to update themes
     */
    updateThemes(newThemes) {
        this.themes = newThemes;
        this.loadCustomThemeValues();
        this.updateThemeVariables();
    }

    /**
     * Detects the system's preferred theme
     */
    detectPreferredTheme(theme) {
        if (theme === "auto") {
            return this.getSystemPreference();
        }
        return theme;
    }

    /**
     * Gets system preference for the theme
     */
    getSystemPreference() {
        try {
            return window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
        } catch (error) {
            console.warn("Unable to detect system preference:", error);
            return "light";
        }
    }

    /**
     * Apply a theme with optimizations
     */
    applyTheme(theme) {
        if (this.currentTheme === theme) return;

        this.currentTheme = theme;
        this.root.setAttribute(this.THEME_ATTR, theme);
        this.updateThemeVariables();
        this.saveTheme(theme);

        requestAnimationFrame(() => {
            this.updateAllIconsVisibility();
        });

        this.notifyThemeChange(theme);
    }

    /**
     * Updates all icons at once
     */
    updateAllIconsVisibility() {
        this.themeIcons.forEach((_, icon) => this.updateIconVisibility(icon));
    }

    /**
     * Updates the theme's CSS variables
     */
    updateThemeVariables() {
        const themeVars = this.getThemeVariables(this.currentTheme);

        if (!themeVars || Object.keys(themeVars).length === 0) {
            console.warn(
                `No theme variables found for theme: ${this.currentTheme}`,
            );
            console.warn("Available themes:", Object.keys(this.themes || {}));
            return;
        }

        Object.entries(themeVars).forEach(([varName, value]) => {
            if (value !== undefined && value !== null) {
                this.root.style.setProperty(varName, value);
            }
        });
    }

    /**
     * Alternates between light and dark themes
     */
    toggleTheme() {
        const newTheme = this.currentTheme === "light" ? "dark" : "light";
        this.applyTheme(newTheme);
    }

    /**
     * Adds a callback for theme changes
     */
    onThemeChange(callback) {
        if (typeof callback !== "function") {
            console.warn("The callback must be a function");
            return () => {};
        }

        this.themeChangeCallbacks.add(callback);
        return () => this.themeChangeCallbacks.delete(callback);
    }

    /**
     * Notify all callbacks of theme changes
     */
    notifyThemeChange(theme) {
        this.themeChangeCallbacks.forEach((callback) => {
            try {
                callback(theme);
            } catch (error) {
                console.error("Error in theme change callback:", error);
            }
        });
    }

    /**
     * Configure all event listeners
     */
    setupEventListeners() {
        this.setupThemeSwitchers();
        this.setupSystemThemeListener();
    }

    /**
     * Configure the theme change buttons
     */
    setupThemeSwitchers() {
        const switchers = document.querySelectorAll("[data-theme-switcher]");
        switchers.forEach((el) => {
            el.addEventListener("click", () => this.toggleTheme());
        });
    }

    /**
     * Configures listening for system preference changes
     */
    setupSystemThemeListener() {
        try {
            const mediaQuery = window.matchMedia(
                "(prefers-color-scheme: dark)",
            );

            const handleSystemChange = (e) => {
                if (this.getStoredTheme() === "auto") {
                    this.applyTheme(e.matches ? "dark" : "light");
                }
            };

            if (mediaQuery.addEventListener) {
                mediaQuery.addEventListener("change", handleSystemChange);
            } else {
                mediaQuery.addListener(handleSystemChange);
            }
        } catch (error) {
            console.warn("Unable to configure system theme listener:", error);
        }
    }

    /**
     * Cleans up resources (useful for preventing memory leaks)
     */
    destroy() {
        this.themeChangeCallbacks.clear();
        this.themeIcons.clear();
        this.customThemeValues = null;
    }

    /**
     * Getter for the current theme
     */
    get theme() {
        return this.currentTheme;
    }

    /**
     * Getter to check if dark mode is active
     */
    get isDarkMode() {
        return this.currentTheme === "dark";
    }
}
