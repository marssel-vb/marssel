export class HeaderStyles {
    constructor(styleManager) {
        this.styleManager = styleManager;
        this.commonDeclarations = this.initializeCommonDeclarations();
        this.selectors = this.initializeSelectors();
    }

    /**
     * Initializes reusable common CSS declarations
     */
    initializeCommonDeclarations() {
        return {
            flex: {
                display: new Set(["display: flex"]),
                alignCenter: new Set(["align-items: center"]),
                justifyBetween: new Set(["justify-content: space-between"]),
                justifyStart: new Set(["justify-content: flex-start"]),
                justifyCenter: new Set(["justify-content: center"]),
                justifyEnd: new Set(["justify-content: flex-end"]),
                column: new Set(["flex-direction: column"]),
                wrap: new Set(["flex-wrap: wrap"]),
                noShrink: new Set(["flex: 0 0 auto"]),
                grow: new Set(["flex: 1 1 auto"]),
            },
            position: {
                relative: new Set(["position: relative"]),
                absolute: new Set(["position: absolute"]),
                fixed: new Set(["position: fixed"]),
            },
            display: {
                block: new Set(["display: block"]),
                none: new Set(["display: none"]),
                inlineBlock: new Set(["display: inline-block"]),
            },
            transitions: {
                all: new Set(["transition: all 0.3s ease"]),
                opacity: new Set(["transition: opacity 0.3s ease"]),
                transform: new Set(["transition: .25s ease-in-out"]),
            },
            button: {
                base: new Set([
                    "background: none",
                    "border: none",
                    "cursor: pointer",
                ]),
                primary: new Set([
                    "padding: 0.5rem 1rem",
                    "background-color: #4a90e2",
                    "color: white",
                    "border: none",
                    "border-radius: 3px",
                    "cursor: pointer",
                    "text-decoration: none",
                ]),
            },
        };
    }

    /**
     * Initializes the selector configuration
     */
    initializeSelectors() {
        return {
            header: ".header",
            container: ".header-container",
            logo: ".header-logo",
            navbar: ".header-navbar",
            actions: ".header-actions",
            nav: ".nav",
            navItem: ".nav-item",
            navLink: ".nav-link",
            icon: ".icon",
            mobileMenu: ".mobile-menu",
            menuToggle: ".menu-toggle",
            menuClose: ".menu-close",
            overlay: ".menu-overlay",
        };
    }

    /**
     * Combines multiple sets of CSS declarations
     */
    combineDeclarations(...declarationSets) {
        const combined = new Set();
        declarationSets.forEach((set) => {
            if (set) {
                set.forEach((declaration) => combined.add(declaration));
            }
        });
        return combined;
    }

    /**
     * Adds styles with optimized management
     */
    addOptimizedStyles(selector, ...declarationSets) {
        const combined = this.combineDeclarations(...declarationSets);
        this.styleManager.addDeclarationsWithMediaQuery([], selector, combined);
    }

    /**
     * Adds all the basic header styles
     */
    addBaseStyles() {
        this.addHeaderBaseStyles();
        this.addNavigationStyles();
        this.addMobileMenuStyles();
        this.addButtonStyles();
        this.addResponsiveStyles();
        this.addPositioningStyles();
    }

    /**
     * Basic header and container styles
     */
    addHeaderBaseStyles() {
        const headerStyles = new Set([
            "box-shadow: 0 2px 10px rgba(0,0,0,0.1)",
            "width: 100%",
            "z-index: 100",
            "padding: 0.5rem 1rem",
        ]);
        this.addOptimizedStyles(
            this.selectors.header,
            headerStyles,
            this.commonDeclarations.position.relative,
            this.commonDeclarations.flex.display,
            this.commonDeclarations.flex.wrap,
            this.commonDeclarations.flex.alignCenter,
            this.commonDeclarations.transitions.all,
        );
        this.addOptimizedStyles(
            this.selectors.container,
            this.commonDeclarations.flex.display,
            this.commonDeclarations.flex.wrap,
            this.commonDeclarations.flex.alignCenter,
            this.commonDeclarations.flex.justifyBetween,
            new Set(["width: 100%"]),
        );
        this.addOptimizedStyles(
            this.selectors.logo,
            this.commonDeclarations.flex.display,
            this.commonDeclarations.flex.alignCenter,
            this.commonDeclarations.flex.noShrink,
        );
    }

    /**
     * Navigation styles
     */
    addNavigationStyles() {
        this.addOptimizedStyles(
            this.selectors.navbar,
            this.commonDeclarations.flex.display,
            this.commonDeclarations.flex.alignCenter,
        );
        this.addOptimizedStyles(
            this.selectors.actions,
            this.commonDeclarations.flex.display,
            this.commonDeclarations.flex.alignCenter,
        );
        this.addOptimizedStyles(
            this.selectors.nav,
            this.commonDeclarations.flex.display,
            new Set([
                "padding-left: 0",
                "margin-bottom: 0",
                "list-style: none",
            ]),
        );
        this.addOptimizedStyles(
            this.selectors.navItem,
            this.commonDeclarations.position.relative,
            new Set(["margin: 0 0.5rem"]),
        );
        const navLinkStyles = new Set([
            "padding: 0.5rem 1rem",
            "text-decoration: none",
            "cursor: pointer",
            "font-weight: 500",
        ]);
        this.addOptimizedStyles(
            this.selectors.navLink,
            this.commonDeclarations.display.block,
            navLinkStyles,
        );
    }

    /**
     * Mobile Menu Styles
     */
    addMobileMenuStyles() {
        const mobileMenuConfigs = {
            sidebar: {
                baseStyles: new Set([
                    "width: 280px",
                    "max-width: 80%",
                    "background-color: #fff",
                    "z-index: 1100",
                    "opacity: 0",
                ]),
                transforms: {
                    left: new Set(["left: 0", "transform: translateX(-100%)"]),
                    right: new Set(["right: 0", "transform: translateX(100%)"]),
                },
            },
            fullpage: {
                baseStyles: new Set([
                    "background-color: #fff",
                    "z-index: 1100",
                    "opacity: 0",
                    "overflow-y: auto",
                ]),
            },
            below: {
                baseStyles: new Set([
                    "width: 100%",
                    "background-color: #fff",
                    "border-top: 1px solid rgba(0, 0, 0, 0.1)",
                    "padding: 1rem",
                    "opacity: 0",
                ]),
            },
        };

        this.addOptimizedStyles(
            ".mobile-menu.sidebar",
            this.commonDeclarations.display.none,
            this.commonDeclarations.position.fixed,
            new Set(["top: 0", "bottom: 0"]),
            mobileMenuConfigs.sidebar.baseStyles,
            this.commonDeclarations.transitions.all,
        );
        this.addOptimizedStyles(
            ".mobile-menu.sidebar .menu-close",
            new Set(["float: right", "padding: 1rem"]),
        );
        this.addOptimizedStyles(
            ".sidebar-left .mobile-menu",
            mobileMenuConfigs.sidebar.transforms.left,
        );
        this.addOptimizedStyles(
            ".sidebar-right .mobile-menu",
            mobileMenuConfigs.sidebar.transforms.right,
        );
        this.addOptimizedStyles(
            ".mobile-menu.fullpage",
            this.commonDeclarations.display.none,
            this.commonDeclarations.position.fixed,
            new Set(["top: 0", "left: 0", "right: 0", "bottom: 0"]),
            mobileMenuConfigs.fullpage.baseStyles,
            this.commonDeclarations.transitions.opacity,
        );
        this.addOptimizedStyles(
            ".mobile-menu.below",
            this.commonDeclarations.display.none,
            mobileMenuConfigs.below.baseStyles,
            this.commonDeclarations.transitions.opacity,
        );
        this.addOptimizedStyles(
            ".menu-open .mobile-menu",
            this.commonDeclarations.display.block,
            new Set(["opacity: 1"]),
        );
        this.addOverlayStyles();
    }

    /**
     * Overlay styles
     */
    addOverlayStyles() {
        this.addOptimizedStyles(
            this.selectors.overlay,
            this.commonDeclarations.display.none,
            this.commonDeclarations.position.fixed,
            new Set([
                "top: 0",
                "left: 0",
                "right: 0",
                "bottom: 0",
                "background-color: rgba(0, 0, 0, 0.5)",
                "z-index: 1040",
                "opacity: 0",
            ]),
            this.commonDeclarations.transitions.opacity,
        );
        this.addOptimizedStyles(
            ".menu-open .menu-overlay",
            this.commonDeclarations.display.block,
            new Set(["opacity: 1"]),
        );
        this.addOptimizedStyles(
            '[data-mobile-menu-type="below"] .menu-overlay',
            new Set([
                "display: none !important",
                "pointer-events: none !important",
            ]),
        );
    }

    /**
     * Styles des boutons
     */
    addButtonStyles() {
        this.addOptimizedStyles(
            ".header-actions .btn",
            this.commonDeclarations.button.primary,
            new Set(["margin-left: 0.5rem"]),
        );
        this.addOptimizedStyles(
            ".header-actions .btn:hover",
            new Set(["background-color: #3a80d2"]),
        );
        this.addOptimizedStyles(
            this.selectors.menuToggle,
            this.commonDeclarations.display.none,
            this.commonDeclarations.position.relative,
            this.commonDeclarations.button.base,
        );
        this.addToggleButtonBars();
        this.addOptimizedStyles(
            this.selectors.menuClose,
            this.commonDeclarations.button.base,
            new Set(["font-size: 1.5rem", "z-index: 1060"]),
        );
        this.addMobileButtonManagement();
    }

    /**
     * Toggle button bar styles
     */
    addToggleButtonBars() {
        const barStyles = new Set([
            "position: absolute",
            "height: 3px",
            "width: 100%",
            "background: #333",
            "border-radius: 9px",
            "opacity: 1",
            "left: 0",
            "transform: rotate(0deg)",
        ]);
        this.addOptimizedStyles(
            ".menu-toggle span",
            this.commonDeclarations.display.block,
            barStyles,
            this.commonDeclarations.transitions.transform,
        );
        const barPositions = [
            { selector: ".menu-toggle span:nth-child(1)", top: "6px" },
            { selector: ".menu-toggle span:nth-child(2)", top: "18px" },
            { selector: ".menu-toggle span:nth-child(3)", top: "30px" },
        ];
        barPositions.forEach(({ selector, top }) => {
            this.addOptimizedStyles(selector, new Set([`top: ${top}`]));
        });
    }

    /**
     * Mobile button management
     */
    addMobileButtonManagement() {
        this.addOptimizedStyles(
            ".mobile-buttons-container",
            this.commonDeclarations.position.relative,
        );
        this.addOptimizedStyles(
            ".mobile-buttons-container .menu-close",
            this.commonDeclarations.display.none,
        );
        this.addOptimizedStyles(
            ".menu-open .mobile-buttons-container .menu-toggle",
            this.commonDeclarations.display.none,
        );
        this.addOptimizedStyles(
            ".menu-open .mobile-buttons-container .menu-close",
            this.commonDeclarations.display.block,
        );
        this.addOptimizedStyles(
            ".mobile-menu.below .menu-close",
            new Set(["display: none !important"]),
        );
    }

    /**
     * Responsive styles
     */
    addResponsiveStyles() {
        this.addOptimizedStyles(
            ".mobile-view .header-container > .header-navbar",
            this.commonDeclarations.display.none,
        );
        this.addOptimizedStyles(
            ".mobile-view .menu-toggle",
            this.commonDeclarations.display.block,
        );
        this.addOptimizedStyles(
            ".mobile-menu .header-navbar",
            this.commonDeclarations.display.block,
            new Set(["padding: 1rem"]),
        );
        this.addOptimizedStyles(
            ".mobile-menu .nav",
            this.commonDeclarations.flex.column,
            new Set(["align-items: flex-start"]),
        );
        this.addOptimizedStyles(
            ".mobile-menu .nav-item",
            new Set(["width: 100%", "margin: 0"]),
        );
        this.addOptimizedStyles(
            ".mobile-menu .nav-link",
            new Set(["padding: 0.75rem 0", "width: 100%"]),
        );
    }

    /**
     * Positioning styles with centralized configuration
     */
    addPositioningStyles() {
        const positions = ["left", "center", "right"];
        const elements = [
            { prefix: "logo", selector: ".header-logo" },
            { prefix: "nav", selector: ".header-navbar" },
            { prefix: "action", selector: ".header-actions" },
        ];

        elements.forEach(({ prefix, selector }) => {
            positions.forEach((position, index) => {
                const order = index + 1;
                const justifyClass =
                    position === "left"
                        ? "justifyStart"
                        : position === "center"
                          ? "justifyCenter"
                          : "justifyEnd";

                this.addOptimizedStyles(
                    `.${prefix}-${position} ${selector}`,
                    this.commonDeclarations.flex[justifyClass],
                    new Set([`order: ${order}`]),
                );
            });
        });

        this.addOptimizedStyles(
            ".logo-left.nav-center.action-right .header-navbar",
            this.commonDeclarations.flex.grow,
        );
    }

    /**
     * Adds styles for icons
     */
    addIconStyles() {
        this.addOptimizedStyles(
            this.selectors.icon,
            this.commonDeclarations.display.inlineBlock,
            new Set(["width: 16px", "height: 16px", "vertical-align: middle"]),
        );
    }

    /**
     * Main method for initializing all styles
     */
    initialize() {
        this.addBaseStyles();
        this.addIconStyles();
    }
}
