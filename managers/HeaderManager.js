import { HeaderStyles } from "../styles/HeaderStyles.js";
import {
    breakpoints,
    containerMaxWidths,
    properties,
} from "../utils/constants.js";

export class HeaderManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.headers = new Map();
        this.bodyScrollLock = false;
        this.headerStyles = new HeaderStyles(marssel.styleManager);
        this.dropdownManager = marssel.dropdownManager;

        // Constantes pour les breakpoints (converties en nombres)
        this.BREAKPOINTS = {
            xs: parseInt(breakpoints.xs),
            sm: parseInt(breakpoints.sm),
            md: parseInt(breakpoints.md),
            lg: parseInt(breakpoints.lg),
            xl: parseInt(breakpoints.xl),
            xxl: parseInt(breakpoints.xxl),
        };

        // Largeurs maximales des conteneurs
        this.CONTAINER_MAX_WIDTHS = containerMaxWidths;

        // Propriétés CSS raccourcies
        this.CSS_PROPERTIES = properties;

        this.BREAKPOINT_NAMES = Object.keys(breakpoints);

        // Configuration par défaut
        this.DEFAULT_CONFIG = {
            logoPosition: "left",
            navPosition: "center",
            actionPosition: "right",
            mobileMenuType: "sidebar",
            sidebarPosition: "left",
            sidebarStyle: "overlay",
            mobileBreakpoint: "md",
        };

        this.currentBreakpoint = this.getCurrentBreakpoint();
        // Gestionnaires d'événements liés (pour pouvoir les supprimer)
        this.boundHandleResize = this.handleResize.bind(this);
        this.boundHandleOutsideClick = this.handleOutsideClick.bind(this);
    }

    init() {
        const headerElement = document.getElementById("main-header");
        if (!headerElement) return;

        // Initialisation des styles de base
        this.headerStyles.initialize();

        // Initialisation de tous les headers
        this.initializeAllHeaders();

        // Ajout des écouteurs d'événements globaux
        this.addGlobalEventListeners();
    }

    initializeAllHeaders() {
        const headers = document.querySelectorAll(".header");
        headers.forEach((header) => this.initializeHeader(header));
    }

    addGlobalEventListeners() {
        window.addEventListener("resize", this.boundHandleResize);
        document.addEventListener("click", this.boundHandleOutsideClick);
    }

    removeGlobalEventListeners() {
        window.removeEventListener("resize", this.boundHandleResize);
        document.removeEventListener("click", this.boundHandleOutsideClick);
    }

    handleOutsideClick(event) {
        this.headers.forEach((header, id) => {
            if (!header.isOpen) return;

            const { element } = header;
            const mobileMenu = element.querySelector(".mobile-menu");
            const isOutsideHeader = !element.contains(event.target);
            const isOutsideMobileMenu =
                mobileMenu && !mobileMenu.contains(event.target);
            const isNotToggleButton = !event.target.closest(
                '[data-toggle="menu"]'
            );

            if (isOutsideHeader || (isOutsideMobileMenu && isNotToggleButton)) {
                this.closeMobileMenu(id);
            }
        });
    }

    initializeHeader(headerElement) {
        const headerId = this.generateHeaderId(headerElement);
        const config = this.extractHeaderConfig(headerElement);

        // Création du menu mobile et overlay
        this.setupMobileComponents(headerElement, config);

        // Configuration des boutons toggle
        this.setupToggleButtons(headerElement, headerId);

        // Stockage de la configuration
        this.storeHeaderConfig(headerId, headerElement, config);

        // Application de la configuration initiale
        this.applyLayoutConfig(headerId);

        // Initialisation correcte de la visibilité selon le breakpoint actuel
        this.initializeElementVisibility(headerElement, config);
    }

    generateHeaderId(headerElement) {
        if (headerElement.id) return headerElement.id;

        const newId = `header-${this.headers.size + 1}`;
        headerElement.id = newId;
        return newId;
    }

    extractHeaderConfig(headerElement) {
        const { dataset } = headerElement;
        return {
            logoPosition:
                dataset.logoPosition || this.DEFAULT_CONFIG.logoPosition,
            navPosition: dataset.navPosition || this.DEFAULT_CONFIG.navPosition,
            actionPosition:
                dataset.actionPosition || this.DEFAULT_CONFIG.actionPosition,
            mobileMenuType:
                dataset.mobileMenuType || this.DEFAULT_CONFIG.mobileMenuType,
            sidebarPosition:
                dataset.sidebarPosition || this.DEFAULT_CONFIG.sidebarPosition,
            sidebarStyle:
                dataset.sidebarStyle || this.DEFAULT_CONFIG.sidebarStyle,
            mobileBreakpoint:
                dataset.mobileBreakpoint ||
                this.DEFAULT_CONFIG.mobileBreakpoint,
        };
    }

    setupMobileComponents(headerElement, config) {
        this.ensureMobileMenuExists(headerElement, config);
        this.ensureOverlayExists(headerElement);
    }

    setupToggleButtons(headerElement, headerId) {
        const toggleButtons = headerElement.querySelectorAll(
            '[data-toggle="menu"]'
        );
        toggleButtons.forEach((button) => {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                this.toggleMobileMenu(headerId);
            });
        });
    }

    storeHeaderConfig(headerId, headerElement, config) {
        this.headers.set(headerId, {
            element: headerElement,
            config,
            isOpen: false,
        });
    }

    ensureMobileMenuExists(headerElement, config) {
        if (headerElement.querySelector(".mobile-menu")) return;

        const mobileMenu = this.createMobileMenu(headerElement, config);
        headerElement.appendChild(mobileMenu);
    }

    createMobileMenu(headerElement, config) {
        const mobileMenu = document.createElement("div");
        mobileMenu.className = `mobile-menu ${config.mobileMenuType}`;

        // Clonage de la navbar
        const navbar = headerElement.querySelector(".header-navbar");
        if (navbar) {
            mobileMenu.appendChild(navbar.cloneNode(true));
        }

        // Bouton de fermeture
        const closeButton = this.createCloseButton(headerElement.id);
        mobileMenu.prepend(closeButton);

        return mobileMenu;
    }

    createCloseButton(headerId) {
        const closeButton = document.createElement("button");
        closeButton.className = "menu-close";
        closeButton.innerHTML = "&times;";
        closeButton.setAttribute("aria-label", "Close menu");
        closeButton.addEventListener("click", () =>
            this.closeMobileMenu(headerId)
        );
        return closeButton;
    }

    ensureOverlayExists(headerElement) {
        if (headerElement.querySelector(".menu-overlay")) return;

        const overlay = document.createElement("div");
        overlay.className = "menu-overlay";
        overlay.addEventListener("click", () =>
            this.closeMobileMenu(headerElement.id)
        );
        headerElement.appendChild(overlay);
    }

    toggleMobileMenu(headerId) {
        const header = this.headers.get(headerId);
        if (!header) return;

        if (header.isOpen) {
            this.closeMobileMenu(headerId);
        } else {
            this.openMobileMenu(headerId);
        }
    }

    openMobileMenu(headerId) {
        const header = this.headers.get(headerId);
        if (!header || header.isOpen) return;

        const { element, config } = header;
        const mobileMenu = element.querySelector(".mobile-menu");
        const overlay = element.querySelector(".menu-overlay");
        const toggleButton = element.querySelector(".menu-toggle");

        // Mise à jour de l'état visuel
        element.classList.add("menu-open");
        this.updateHeaderState(headerId, true);

        // Gestion spécifique du type "below"
        if (config.mobileMenuType === "below") {
            this.handleBelowMenuOpen(toggleButton);
        } else {
            if (
                toggleButton &&
                ["sidebar", "fullpage"].includes(config.mobileMenuType)
            ) {
                toggleButton.style.display = "none";
            }
            this.handleOverlayMenuOpen(overlay);
        }

        // Animation d'ouverture du menu
        this.animateMenuOpen(mobileMenu, config);

        // Gestion du scroll pour certains types de menus
        if (this.shouldLockScroll(config.mobileMenuType)) {
            this.toggleBodyScroll(false);
        }
    }

    handleBelowMenuOpen(toggleButton) {
        if (toggleButton) {
            toggleButton.style.display = "none";
        }
    }

    handleOverlayMenuOpen(overlay) {
        if (!overlay) return;

        overlay.style.display = "block";
        // Utilisation de requestAnimationFrame pour une meilleure performance
        requestAnimationFrame(() => {
            overlay.style.opacity = "1";
        });
    }

    animateMenuOpen(mobileMenu, config) {
        mobileMenu.style.display = "block";

        requestAnimationFrame(() => {
            mobileMenu.style.opacity = "1";

            if (config.mobileMenuType === "sidebar") {
                mobileMenu.style.transform = "translateX(0)";
            }
        });
    }

    closeMobileMenu(headerId) {
        const header = this.headers.get(headerId);
        if (!header || !header.isOpen) return;

        const { element, config } = header;
        const mobileMenu = element.querySelector(".mobile-menu");
        const overlay = element.querySelector(".menu-overlay");
        const toggleButton = element.querySelector(".menu-toggle");

        // Mise à jour de l'état visuel
        element.classList.remove("menu-open");
        this.updateHeaderState(headerId, false);

        // Gestion spécifique du type "below"
        if (config.mobileMenuType === "below" && toggleButton) {
            toggleButton.style.display = "block";
        }

        // Animation de fermeture
        this.animateMenuClose(mobileMenu, overlay, config);

        // Réactivation du scroll si nécessaire
        if (this.shouldLockScroll(config.mobileMenuType)) {
            this.toggleBodyScroll(true);
        }
        toggleButton.style.display = "block";
    }

    animateMenuClose(mobileMenu, overlay, config) {
        // Animation de l'overlay
        if (overlay) {
            overlay.style.opacity = "0";
            setTimeout(() => {
                overlay.style.display = "none";
            }, 300);
        }

        // Animation du menu
        mobileMenu.style.opacity = "0";

        if (config.mobileMenuType === "sidebar") {
            const transform =
                config.sidebarPosition === "left"
                    ? "translateX(-100%)"
                    : "translateX(100%)";
            mobileMenu.style.transform = transform;
        }

        setTimeout(() => {
            mobileMenu.style.display = "none";
        }, 300);
    }

    shouldLockScroll(menuType) {
        return ["fullpage", "sidebar"].includes(menuType);
    }

    updateHeaderState(headerId, isOpen) {
        const header = this.headers.get(headerId);
        if (header) {
            this.headers.set(headerId, { ...header, isOpen });
        }
    }

    applyLayoutConfig(headerId) {
        const header = this.headers.get(headerId);
        if (!header) return;

        const { element, config } = header;

        // Nettoyage des anciennes classes
        this.cleanupPositionalClasses(element);

        // Application des nouvelles classes
        this.applyPositionalClasses(element, config);

        // Ajustement pour le breakpoint actuel
        this.adjustLayoutForBreakpoint(headerId);
    }

    cleanupPositionalClasses(element) {
        const classesToRemove = [
            /logo-(left|center|right)/g,
            /nav-(left|center|right)/g,
            /action-(left|center|right)/g,
            /mobile-(sidebar|below|fullpage)/g,
            /sidebar-(left|right)/g,
        ];

        classesToRemove.forEach((regex) => {
            element.className = element.className.replace(regex, "");
        });
    }

    applyPositionalClasses(element, config) {
        const classes = [
            `logo-${config.logoPosition}`,
            `nav-${config.navPosition}`,
            `action-${config.actionPosition}`,
            `mobile-${config.mobileMenuType}`,
        ];

        if (config.mobileMenuType === "sidebar") {
            classes.push(`sidebar-${config.sidebarPosition}`);
        }

        element.classList.add(...classes);
    }

    getCurrentBreakpoint() {
        const width = window.innerWidth;

        if (width < this.BREAKPOINTS.sm) return "xs";
        if (width < this.BREAKPOINTS.md) return "sm";
        if (width < this.BREAKPOINTS.lg) return "md";
        if (width < this.BREAKPOINTS.xl) return "lg";
        if (width < this.BREAKPOINTS.xxl) return "xl";
        return "xxl";
    }

    handleResize() {
        const newBreakpoint = this.getCurrentBreakpoint();

        if (newBreakpoint === this.currentBreakpoint) return;

        this.currentBreakpoint = newBreakpoint;

        // Réinitialiser complètement l'état visuel de tous les headers
        this.headers.forEach((header, id) => {
            this.resetHeaderVisualState(id);
        });

        this.updateAllHeadersForBreakpoint(newBreakpoint);
    }

    updateAllHeadersForBreakpoint(breakpoint) {
        this.headers.forEach((header, id) => {
            this.adjustLayoutForBreakpoint(id);

            // Fermeture automatique des menus mobiles en mode desktop
            if (isDesktop && header.isOpen) {
                this.closeMobileMenu(id);
            }

            // Gestion spécifique de la visibilité des éléments selon le type de menu
            const { element, config } = header;
            const isDesktop = this.isDesktopBreakpoint(breakpoint, config);
            const isMobile = this.isMobileBreakpoint(breakpoint, config);
            const toggleButton = element.querySelector(".menu-toggle");
            const mobileMenu = element.querySelector(".mobile-menu");

            if (toggleButton) {
                // Le bouton hamburger ne doit être visible qu'en mode mobile
                toggleButton.style.display = isMobile ? "block" : "none";
            }

            if (mobileMenu && isDesktop) {
                // En mode desktop, s'assurer que le menu mobile est complètement caché
                mobileMenu.style.display = "none";
                mobileMenu.style.opacity = "0";
                mobileMenu.style.transform = "";
            }
        });
    }

    adjustLayoutForBreakpoint(headerId) {
        const header = this.headers.get(headerId);
        if (!header) return;

        const { element, config } = header;
        const isMobileView = this.isMobileBreakpoint(
            this.currentBreakpoint,
            config
        );
        const toggleButton = element.querySelector(".menu-toggle");

        // Basculement des classes de vue
        element.classList.toggle("mobile-view", isMobileView);
        element.classList.toggle("desktop-view", !isMobileView);

        // Gestion de la visibilité du bouton hamburger
        if (toggleButton) {
            if (isMobileView) {
                // En mode mobile, afficher le bouton hamburger
                toggleButton.style.display = "block";
            } else {
                // En mode desktop, cacher le bouton hamburger
                toggleButton.style.display = "none";
            }
        }

        // Initialisation des menus mobiles
        if (isMobileView) {
            this.initializeMobileMenuPosition(element, config);
        } else {
            // En mode desktop, s'assurer que le menu mobile est caché
            const mobileMenu = element.querySelector(".mobile-menu");
            if (mobileMenu) {
                mobileMenu.style.display = "none";
                mobileMenu.style.opacity = "0";
            }
        }
    }

    initializeMobileMenuPosition(element, config) {
        const mobileMenu = element.querySelector(".mobile-menu");
        if (!mobileMenu) return;

        if (config.mobileMenuType === "sidebar") {
            const transform =
                config.sidebarPosition === "left"
                    ? "translateX(-100%)"
                    : "translateX(100%)";
            mobileMenu.style.transform = transform;
        }

        mobileMenu.style.opacity = "0";
        mobileMenu.style.display = "none";
    }

    toggleBodyScroll(enable) {
        if (enable && this.bodyScrollLock) {
            this.enableBodyScroll();
        } else if (!enable && !this.bodyScrollLock) {
            this.disableBodyScroll();
        }
    }

    enableBodyScroll() {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
        this.bodyScrollLock = false;
    }

    disableBodyScroll() {
        const scrollbarWidth =
            window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = "hidden";
        document.body.style.paddingRight = `${scrollbarWidth}px`;
        this.bodyScrollLock = true;
    }

    // Méthodes publiques pour l'API
    updateHeaderConfig(headerId, newConfig) {
        const header = this.headers.get(headerId);
        if (!header) return false;

        this.headers.set(headerId, {
            ...header,
            config: { ...header.config, ...newConfig },
        });

        this.applyLayoutConfig(headerId);
        return true;
    }

    initializeMobileMenuDropdowns(mobileMenu) {
        if (!this.dropdownManager) return;

        // Initialisation des dropdowns standards
        const dropdowns = mobileMenu.querySelectorAll(".dropdown");
        dropdowns.forEach((dropdown) => {
            this.dropdownManager.initializeDropdown(dropdown);
        });

        // Initialisation des dropdowns fullwidth
        const fullwidthDropdowns = mobileMenu.querySelectorAll(
            ".dropdown-fullwidth"
        );
        fullwidthDropdowns.forEach((dropdown) => {
            this.dropdownManager.initializeFullwidthDropdown(dropdown);
        });
    }

    // Méthode de nettoyage pour libérer les ressources
    destroy() {
        this.removeGlobalEventListeners();
        this.headers.clear();
        this.toggleBodyScroll(true);
    }

    // Getters utilitaires
    get isAnyMenuOpen() {
        return Array.from(this.headers.values()).some(
            (header) => header.isOpen
        );
    }

    getHeaderConfig(headerId) {
        const header = this.headers.get(headerId);
        return header ? { ...header.config } : null;
    }

    getAllHeaders() {
        return Array.from(this.headers.keys());
    }

    // Méthodes utilitaires utilisant les constantes
    getBreakpointValue(breakpoint) {
        return this.BREAKPOINTS[breakpoint] || null;
    }

    getContainerMaxWidth(breakpoint) {
        return this.CONTAINER_MAX_WIDTHS[breakpoint] || null;
    }

    getCSSProperty(shorthand) {
        return this.CSS_PROPERTIES[shorthand] || shorthand;
    }

    // Méthode pour appliquer des styles dynamiques en utilisant les propriétés raccourcies
    applyDynamicStyles(element, styles) {
        if (!element || !styles) return;

        Object.entries(styles).forEach(([property, value]) => {
            const cssProperty = this.getCSSProperty(property);

            if (Array.isArray(cssProperty)) {
                // Pour les propriétés multiples (comme mx, my, etc.)
                cssProperty.forEach((prop) => {
                    element.style[prop] = value;
                });
            } else {
                element.style[cssProperty] = value;
            }
        });
    }

    // Méthode pour réinitialiser complètement l'état visuel d'un header
    resetHeaderVisualState(headerId) {
        const header = this.headers.get(headerId);
        if (!header) return;

        const { element, config } = header;
        const isMobile = this.isMobileBreakpoint();
        const toggleButton = element.querySelector(".menu-toggle");
        const mobileMenu = element.querySelector(".mobile-menu");
        const overlay = element.querySelector(".menu-overlay");

        // Réinitialiser l'état du header
        element.classList.remove("menu-open");

        // Gestion du bouton toggle
        if (toggleButton) {
            toggleButton.style.display = isMobile ? "block" : "none";
        }

        // Gestion du menu mobile
        if (mobileMenu) {
            mobileMenu.style.display = "none";
            mobileMenu.style.opacity = "0";
            mobileMenu.style.transform = "";

            if (isMobile && config.mobileMenuType === "sidebar") {
                const transform =
                    config.sidebarPosition === "left"
                        ? "translateX(-100%)"
                        : "translateX(100%)";
                mobileMenu.style.transform = transform;
            }
        }

        // Gestion de l'overlay
        if (overlay) {
            overlay.style.display = "none";
            overlay.style.opacity = "0";
        }

        // Mettre à jour l'état stocké
        this.updateHeaderState(headerId, false);
    }

    // Méthode pour obtenir la largeur de conteneur appropriée pour le breakpoint actuel
    getCurrentContainerWidth() {
        const containerWidth = this.getContainerMaxWidth(
            this.currentBreakpoint
        );
        return containerWidth || "100%";
    }

    // Méthode pour vérifier si nous sommes dans un breakpoint mobile
    isMobileBreakpoint(
        breakpoint = this.currentBreakpoint,
        headerConfig = null
    ) {
        if (!headerConfig) {
            const firstHeader = Array.from(this.headers.values())[0];
            if (!firstHeader) return breakpoint !== "xxl";
            headerConfig = firstHeader.config;
        }

        const mobileLimitName = headerConfig.mobileBreakpoint || "md";

        const currentIdx = this.BREAKPOINT_NAMES.indexOf(breakpoint);
        const limitIdx = this.BREAKPOINT_NAMES.indexOf(mobileLimitName);

        return currentIdx < limitIdx; // ✅ CORRECT : strictement inférieur
    }

    // Méthode pour vérifier si nous sommes dans un breakpoint desktop
    isDesktopBreakpoint(
        breakpoint = this.currentBreakpoint,
        headerConfig = null
    ) {
        return !this.isMobileBreakpoint(breakpoint, headerConfig);
    }

    // Initialise la visibilité des éléments selon le breakpoint actuel
    initializeElementVisibility(headerElement, config) {
        const isMobile = this.isMobileBreakpoint(
            this.currentBreakpoint,
            config
        );
        const toggleButton = headerElement.querySelector(".menu-toggle");
        const mobileMenu = headerElement.querySelector(".mobile-menu");

        if (toggleButton) {
            // Le bouton hamburger ne doit être visible qu'en mode mobile
            toggleButton.style.display = isMobile ? "block" : "none";
        }

        if (mobileMenu) {
            if (isMobile) {
                // En mode mobile, initialiser la position du menu
                this.initializeMobileMenuPosition(headerElement, config);
            } else {
                // En mode desktop, cacher complètement le menu mobile
                mobileMenu.style.display = "none";
                mobileMenu.style.opacity = "0";
                mobileMenu.style.transform = "";
            }
        }
    }
}
