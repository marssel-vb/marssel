export class TabsStyles {
    constructor(styleManager) {
        this.styleManager = styleManager;
        this.registeredGroups = new Set();
    }

    /**
     * Enregistre les styles de base pour tous les tabs
     */
    registerBaseStyles() {
        const baseRules = [
            {
                selector: ".tab-radio",
                declarations: [
                    "position: absolute",
                    "opacity: 0",
                    "pointer-events: none",
                    "width: 0",
                    "height: 0",
                ],
            },
            {
                selector: ".tabs-nav",
                declarations: ["display: flex", "gap: 0"],
            },
            {
                selector: ".tabs-content",
                declarations: ["position: relative"],
            },
            {
                selector: ".tab-panel",
                declarations: ["display: none"],
            },
            {
                selector: ".tab-label",
                declarations: [
                    "cursor: pointer",
                    "user-select: none",
                    "transition: all 0.3s ease",
                    "display: block",
                ],
            },
        ];

        baseRules.forEach((rule) => {
            const declarations = new Set(rule.declarations);
            this.styleManager.addDeclarationsWithMediaQuery(
                [],
                rule.selector,
                declarations
            );
        });

        this.styleManager.updateStyles();
    }

    /**
     * Applique les styles spécifiques à un groupe de tabs
     */
    applyGroupStyles(tabGroup) {
        const { id, tabs, config, container } = tabGroup;

        // Éviter la duplication
        if (this.registeredGroups.has(id)) {
            return;
        }

        // Styles d'activation des onglets
        this.applyActiveTabStyles(tabs, config);

        // Styles d'affichage des panels
        this.applyPanelDisplayStyles(tabs);

        // Styles d'orientation
        this.applyOrientationStyles(container, config);

        // Styles responsive
        if (config.responsive) {
            this.applyResponsiveStyles(container, tabs, config);
        }

        // Styles d'animation
        if (config.animated) {
            this.applyAnimationStyles(container);
        }

        this.registeredGroups.add(id);
        this.styleManager.updateStyles();
    }

    /**
     * Applique les styles pour les onglets actifs
     */
    applyActiveTabStyles(tabs, config) {
        const activeColor = config.activeColor || "#0066cc";
        const activeBorderWidth = config.activeBorderWidth || "3px";

        tabs.forEach((tab) => {
            if (!tab.radio || !tab.label) return;

            const radioId = tab.radio.id;
            const labelSelector = `#${this.escapeSelector(
                radioId
            )}:checked ~ .tabs-nav label[for="${this.escapeSelector(
                radioId
            )}"]`;

            const declarations = new Set([
                `color: ${activeColor}`,
                config.orientation === "horizontal"
                    ? `border-bottom: ${activeBorderWidth} solid ${activeColor}`
                    : `border-left: ${activeBorderWidth} solid ${activeColor}`,
            ]);

            this.styleManager.addDeclarationsWithMediaQuery(
                [],
                labelSelector,
                declarations
            );
        });
    }

    /**
     * Applique les styles d'affichage des panels
     */
    applyPanelDisplayStyles(tabs) {
        tabs.forEach((tab, index) => {
            if (!tab.radio) return;

            const radioId = tab.radio.id;
            const panelSelector = `#${this.escapeSelector(
                radioId
            )}:checked ~ .tabs-content .tab-panel:nth-of-type(${index + 1})`;

            const declarations = new Set(["display: block"]);

            this.styleManager.addDeclarationsWithMediaQuery(
                [],
                panelSelector,
                declarations
            );
        });
    }

    /**
     * Applique les styles d'orientation (horizontal/vertical)
     */
    applyOrientationStyles(container, config) {
        if (config.orientation === "vertical") {
            // Container en flex pour disposition côte à côte
            const containerId = container.id;
            if (containerId) {
                const containerDeclarations = new Set([
                    "display: flex",
                    "gap: 20px",
                ]);
                this.styleManager.addDeclarationsWithMediaQuery(
                    [],
                    `#${this.escapeSelector(containerId)}`,
                    containerDeclarations
                );
            }

            // Navigation verticale
            const navSelector = containerId
                ? `#${this.escapeSelector(containerId)} .tabs-nav`
                : ".tabs-vertical .tabs-nav";

            const navDeclarations = new Set([
                "flex-direction: column",
                "border-right: 1px solid #e0e0e0",
                "border-bottom: none",
                "min-width: 200px",
            ]);

            this.styleManager.addDeclarationsWithMediaQuery(
                [],
                navSelector,
                navDeclarations
            );

            // Labels verticaux
            const labelSelector = containerId
                ? `#${this.escapeSelector(containerId)} .tab-label`
                : ".tabs-vertical .tab-label";

            const labelDeclarations = new Set([
                "border-bottom: none",
                "border-left: 3px solid transparent",
                "text-align: left",
            ]);

            this.styleManager.addDeclarationsWithMediaQuery(
                [],
                labelSelector,
                labelDeclarations
            );

            // Contenu prend le reste de l'espace
            const contentSelector = containerId
                ? `#${this.escapeSelector(containerId)} .tabs-content`
                : ".tabs-vertical .tabs-content";

            const contentDeclarations = new Set(["flex: 1"]);

            this.styleManager.addDeclarationsWithMediaQuery(
                [],
                contentSelector,
                contentDeclarations
            );
        } else {
            // Horizontal (par défaut)
            const navSelector = container.id
                ? `#${this.escapeSelector(container.id)} .tabs-nav`
                : ".tabs-nav";

            const navDeclarations = new Set([
                "border-bottom: 1px solid #e0e0e0",
            ]);

            this.styleManager.addDeclarationsWithMediaQuery(
                [],
                navSelector,
                navDeclarations
            );

            // Labels horizontaux
            const labelSelector = container.id
                ? `#${this.escapeSelector(container.id)} .tab-label`
                : ".tab-label";

            const labelDeclarations = new Set([
                "border-bottom: 3px solid transparent",
                "padding: 15px",
            ]);

            this.styleManager.addDeclarationsWithMediaQuery(
                [],
                labelSelector,
                labelDeclarations
            );
        }
    }

    /**
     * Applique les styles responsive
     */
    applyResponsiveStyles(container, tabs, config) {
        const breakpoint = this.parseBreakpoint(
            config.mobileBreakpoint || "768px"
        );

        if (!breakpoint) return;

        // Sur mobile, passer en mode vertical
        const containerId = container.id;
        const navSelector = containerId
            ? `#${this.escapeSelector(containerId)} .tabs-nav`
            : ".tabs-nav";

        const navMobileDeclarations = new Set(["flex-direction: column"]);

        this.styleManager.addDeclarationsWithMediaQuery(
            [breakpoint],
            navSelector,
            navMobileDeclarations
        );

        // Modifier les bordures des labels sur mobile
        tabs.forEach((tab) => {
            if (!tab.radio || !tab.label) return;

            const radioId = tab.radio.id;
            const labelSelector = `#${this.escapeSelector(
                radioId
            )}:checked ~ .tabs-nav label[for="${this.escapeSelector(
                radioId
            )}"]`;

            const mobileLabelDeclarations = new Set([
                "border-bottom: 1px solid #e0e0e0",
                "border-left: 3px solid #0066cc",
            ]);

            this.styleManager.addDeclarationsWithMediaQuery(
                [breakpoint],
                labelSelector,
                mobileLabelDeclarations
            );
        });

        // Style des labels en mode mobile
        const labelSelector = containerId
            ? `#${this.escapeSelector(containerId)} .tab-label`
            : ".tab-label";

        const labelMobileDeclarations = new Set([
            "border-bottom: 1px solid #e0e0e0",
            "border-left: 3px solid transparent",
        ]);

        this.styleManager.addDeclarationsWithMediaQuery(
            [breakpoint],
            labelSelector,
            labelMobileDeclarations
        );
    }

    /**
     * Applique les styles d'animation
     */
    applyAnimationStyles(container) {
        const containerId = container.id;
        const panelSelector = containerId
            ? `#${this.escapeSelector(containerId)} .tab-panel`
            : ".tab-panel";

        const animationDeclarations = new Set([
            "animation: tabFadeIn 0.3s ease-in-out",
        ]);

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            panelSelector,
            animationDeclarations
        );

        // Ajouter la keyframe (seulement une fois)
        if (!this.registeredGroups.has("_animation_keyframe")) {
            const keyframe = `
                @keyframes tabFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;

            // Ajouter directement au style element
            const styleElement = document.getElementById("marssel-styles");
            if (styleElement) {
                const currentContent = styleElement.textContent;
                if (!currentContent.includes("@keyframes tabFadeIn")) {
                    styleElement.textContent = currentContent + "\n" + keyframe;
                }
            }

            this.registeredGroups.add("_animation_keyframe");
        }
    }

    /**
     * Applique un style prédéfini
     */
    applyPresetStyle(container, preset = "default") {
        const presets = {
            default: {
                activeColor: "#0066cc",
                activeBorderWidth: "3px",
                labelPadding: "15px",
                backgroundColor: "transparent",
            },
            pills: {
                activeColor: "#0066cc",
                activeBorderWidth: "0",
                labelPadding: "10px 20px",
                backgroundColor: "#f0f0f0",
                borderRadius: "20px",
            },
            minimal: {
                activeColor: "#333",
                activeBorderWidth: "2px",
                labelPadding: "10px 15px",
                backgroundColor: "transparent",
            },
            bordered: {
                activeColor: "#0066cc",
                activeBorderWidth: "2px",
                labelPadding: "12px 20px",
                backgroundColor: "white",
                border: "1px solid #e0e0e0",
            },
        };

        const style = presets[preset] || presets.default;
        const containerId = container.id;

        if (!containerId) return;

        // Appliquer les styles du preset
        const labelSelector = `#${this.escapeSelector(containerId)} .tab-label`;
        const labelDeclarations = new Set([
            `padding: ${style.labelPadding}`,
            `background-color: ${style.backgroundColor}`,
        ]);

        if (style.borderRadius) {
            labelDeclarations.add(`border-radius: ${style.borderRadius}`);
        }

        if (style.border) {
            labelDeclarations.add(`border: ${style.border}`);
        }

        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            labelSelector,
            labelDeclarations
        );

        this.styleManager.updateStyles();
    }

    /**
     * Supprime les styles d'un groupe
     */
    removeGroupStyles(groupId) {
        this.registeredGroups.delete(groupId);
        // Note: La suppression effective des règles CSS nécessiterait
        // une modification du StyleManager pour supporter la suppression
    }

    /**
     * Parse un breakpoint (ex: "768px" -> "m768")
     */
    parseBreakpoint(breakpoint) {
        const match = breakpoint.match(/(\d+)px/);
        if (!match) return null;

        const value = match[1];

        // Convertir en format Marssel (ex: 768px -> "mmd" pour max-width: 768px)
        const breakpointMap = {
            320: "mxs",
            576: "msm",
            768: "mmd",
            992: "mlg",
            1200: "mxl",
            1400: "mxxl",
        };

        return breakpointMap[value] || `m${value.substring(0, 2)}`;
    }

    /**
     * Échappe les caractères spéciaux pour les sélecteurs CSS
     */
    escapeSelector(str) {
        return str.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, "\\$&");
    }

    /**
     * Nettoie tous les styles enregistrés
     */
    cleanup() {
        this.registeredGroups.clear();
    }
}
