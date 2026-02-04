export class TabsStyles {
    // Configuration centralisée pour les styles de base (comme dans PopoverStyles)
    static BASE_CONFIG = {
        radio: {
            selector: ".tab-radio",
            declarations: [
                "position: absolute",
                "opacity: 0",
                "pointer-events: none",
                "width: 0",
                "height: 0",
            ],
        },
        nav: {
            selector: ".tabs-nav",
            declarations: ["display: flex", "gap: 0"],
        },
        content: {
            selector: ".tabs-content",
            declarations: ["position: relative"],
        },
        panel: {
            selector: ".tab-panel",
            declarations: ["display: none"],
        },
        label: {
            selector: ".tab-label",
            declarations: [
                "cursor: pointer",
                "user-select: none",
                "transition: all 0.3s ease",
                "display: block",
            ],
        },
    };

    constructor(styleManager) {
        this.styleManager = styleManager;
        this.registeredGroups = new Set();
    }

    /**
     * Enregistre les styles de base pour tous les tabs
     */
    registerBaseStyles() {
        Object.values(TabsStyles.BASE_CONFIG).forEach((config) => {
            this.addStyle(config.selector, config.declarations);
        });

        this.styleManager.updateStyles();
    }

    /**
     * Méthode utilitaire pour ajouter des styles (calquée sur OffcanvasStyles/PopoverStyles)
     * @param {string} selector
     * @param {string[]} declarations
     * @param {string[]} mediaQueries
     */
    addStyle(selector, declarations, mediaQueries = []) {
        this.styleManager.addDeclarationsWithMediaQuery(
            mediaQueries,
            selector,
            new Set(declarations),
        );
    }

    /**
     * Applique les styles spécifiques à un groupe de tabs
     */
    applyGroupStyles(tabGroup) {
        const { id, tabs, config, container } = tabGroup;

        if (this.registeredGroups.has(id)) return;

        this.applyActiveTabStyles(tabs, config);
        this.applyPanelDisplayStyles(tabs);
        this.applyOrientationStyles(container, config);

        if (config.responsive) {
            this.applyResponsiveStyles(container, tabs, config);
        }

        if (config.animated) {
            this.applyAnimationStyles(container);
        }

        this.registeredGroups.add(id);
        this.styleManager.updateStyles();
    }

    applyActiveTabStyles(tabs, config) {
        const activeColor = config.activeColor || "#0066cc";
        const activeBorderWidth = config.activeBorderWidth || "3px";

        tabs.forEach((tab) => {
            if (!tab.radio || !tab.label) return;

            const radioId = tab.radio.id;
            const selector = `#${this.escapeSelector(radioId)}:checked ~ .tabs-nav label[for="${this.escapeSelector(radioId)}"]`;

            this.addStyle(selector, [
                `color: ${activeColor}`,
                config.orientation === "horizontal"
                    ? `border-bottom: ${activeBorderWidth} solid ${activeColor}`
                    : `border-left: ${activeBorderWidth} solid ${activeColor}`,
            ]);
        });
    }

    applyPanelDisplayStyles(tabs) {
        tabs.forEach((tab, index) => {
            if (!tab.radio) return;

            const radioId = tab.radio.id;
            const selector = `#${this.escapeSelector(radioId)}:checked ~ .tabs-content > .tab-panel:nth-of-type(${index + 1})`;

            this.addStyle(selector, ["display: block"]);
        });
    }

    applyOrientationStyles(container, config) {
        const containerId = container.id;

        if (config.orientation === "vertical") {
            if (containerId) {
                this.addStyle(`#${this.escapeSelector(containerId)}`, [
                    "display: flex",
                    "gap: 20px",
                ]);
            }

            const prefix = containerId
                ? `#${this.escapeSelector(containerId)} `
                : "";

            this.addStyle(`${prefix}.tabs-nav`, [
                "flex-direction: column",
                "border-right: 1px solid #e0e0e0",
                "border-bottom: none",
                "min-width: 200px",
            ]);

            this.addStyle(`${prefix}.tab-label`, [
                "border-bottom: none",
                "border-left: 3px solid transparent",
                "text-align: left",
            ]);

            this.addStyle(`${prefix}.tabs-content`, ["flex: 1"]);
        } else {
            const navSelector = containerId
                ? `#${this.escapeSelector(containerId)} .tabs-nav`
                : ".tabs-nav";
            this.addStyle(navSelector, ["border-bottom: 1px solid #e0e0e0"]);

            const labelSelector = containerId
                ? `#${this.escapeSelector(containerId)} .tab-label`
                : ".tab-label";
            this.addStyle(labelSelector, [
                "border-bottom: 3px solid transparent",
                "padding: 15px",
            ]);
        }
    }

    applyResponsiveStyles(container, tabs, config) {
        const breakpoint = this.parseBreakpoint(
            config.mobileBreakpoint || "768px",
        );
        if (!breakpoint) return;

        const containerId = container.id;
        const navSelector = containerId
            ? `#${this.escapeSelector(containerId)} .tabs-nav`
            : ".tabs-nav";

        this.addStyle(navSelector, ["flex-direction: column"], [breakpoint]);

        tabs.forEach((tab) => {
            if (!tab.radio || !tab.label) return;
            const radioId = tab.radio.id;
            const selector = `#${this.escapeSelector(radioId)}:checked ~ .tabs-nav label[for="${this.escapeSelector(radioId)}"]`;

            this.addStyle(
                selector,
                [
                    "border-bottom: 1px solid #e0e0e0",
                    "border-left: 3px solid #0066cc",
                ],
                [breakpoint],
            );
        });

        const labelSelector = containerId
            ? `#${this.escapeSelector(containerId)} .tab-label`
            : ".tab-label";
        this.addStyle(
            labelSelector,
            [
                "border-bottom: 1px solid #e0e0e0",
                "border-left: 3px solid transparent",
            ],
            [breakpoint],
        );
    }

    applyAnimationStyles(container) {
        const containerId = container.id;
        const selector = containerId
            ? `#${this.escapeSelector(containerId)} .tab-panel`
            : ".tab-panel";

        this.addStyle(selector, ["animation: tabFadeIn 0.3s ease-in-out"]);

        if (!this.registeredGroups.has("_animation_keyframe")) {
            const keyframe = `
                @keyframes tabFadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            const styleElement = document.getElementById("marssel-styles");
            if (
                styleElement &&
                !styleElement.textContent.includes("@keyframes tabFadeIn")
            ) {
                styleElement.textContent += "\n" + keyframe;
            }
            this.registeredGroups.add("_animation_keyframe");
        }
    }

    applyPresetStyle(container, preset = "default") {
        const presets = {
            default: {
                activeColor: "#0066cc",
                labelPadding: "15px",
                backgroundColor: "transparent",
            },
            pills: {
                activeColor: "#0066cc",
                labelPadding: "10px 20px",
                backgroundColor: "#f0f0f0",
                borderRadius: "20px",
            },
            minimal: {
                activeColor: "#333",
                labelPadding: "10px 15px",
                backgroundColor: "transparent",
            },
            bordered: {
                activeColor: "#0066cc",
                labelPadding: "12px 20px",
                backgroundColor: "white",
                border: "1px solid #e0e0e0",
            },
        };

        const style = presets[preset] || presets.default;
        if (!container.id) return;

        const declarations = [
            `padding: ${style.labelPadding}`,
            `background-color: ${style.backgroundColor}`,
        ];

        if (style.borderRadius)
            declarations.push(`border-radius: ${style.borderRadius}`);
        if (style.border) declarations.push(`border: ${style.border}`);

        this.addStyle(
            `#${this.escapeSelector(container.id)} .tab-label`,
            declarations,
        );
        this.styleManager.updateStyles();
    }

    removeGroupStyles(groupId) {
        this.registeredGroups.delete(groupId);
    }

    parseBreakpoint(breakpoint) {
        const match = breakpoint.match(/(\d+)px/);
        if (!match) return null;
        const value = match[1];
        const map = {
            320: "mxs",
            576: "msm",
            768: "mmd",
            992: "mlg",
            1200: "mxl",
            1400: "mxxl",
        };
        return map[value] || `m${value.substring(0, 2)}`;
    }

    escapeSelector(str) {
        return str.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, "\\$&");
    }

    cleanup() {
        this.registeredGroups.clear();
    }
}
