import { TabsStyles } from "../styles/TabsStyles.js";
import { LRUCache } from "../utils/LRUCache.js";

export class TabsManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.tabsStyle = new TabsStyles(marssel.styleManager);
        this.stylesApplied = false;
        this.tabGroups = new LRUCache(50);
        this.observer = null;
        this.documentElement = document.documentElement;
        this.config = {
            defaultOrientation: "horizontal",
            defaultStyle: "default",
            animationDuration: 300,
            autoInit: true,
            defaultActiveColor: "#0066cc",
            defaultActiveBorderWidth: "3px",
        };
    }

    /**
     * Initializes the TabsManager
     */
    init() {
        if (!this.config.autoInit) return;

        this.initializeAllTabs();
        this.setupObserver();
    }

    /**
     * Initializes all tabs present in the DOM
     */
    initializeAllTabs() {
        const tabContainers = document.querySelectorAll(
            "[data-tabs], .tabs-container",
        );

        let count = 0;
        tabContainers.forEach((container) => {
            if (this.initializeTabGroup(container)) {
                count++;
            }
        });
    }

    /**
     * Initializes a specific group of tabs
     */
    initializeTabGroup(container) {
        if (!this.stylesApplied) {
            this.tabsStyle.registerBaseStyles();
            this.stylesApplied = true;
        }

        const groupId = container.dataset.tabs || this.generateGroupId();

        if (this.tabGroups.has(groupId)) {
            console.warn(`⚠️ Tab group "${groupId}" already initialized`);
            return false;
        }

        const allRadios = container.querySelectorAll(
            'input[type="radio"][name]',
        );

        if (allRadios.length === 0) {
            console.warn("⚠️ No radio input found in", container);
            return false;
        }

        const groupName = allRadios[0].name;
        const radios = Array.from(allRadios).filter(
            (r) => r.name === groupName,
        );
        const config = this.parseConfig(container);
        const tabs = this.buildTabsArray(container, radios);
        const tabGroup = {
            id: groupId,
            container,
            tabs,
            config,
            groupName,
            initialized: true,
        };

        this.tabGroups.set(groupId, tabGroup);

        if (!container.id) {
            container.id = groupId;
        }

        this.tabsStyle.applyGroupStyles(tabGroup);

        if (config.preset && config.preset !== "default") {
            this.tabsStyle.applyPresetStyle(container, config.preset);
        }

        this.attachEventListeners(tabGroup);

        this.ensureActiveTab(tabGroup);

        return true;
    }

    /**
     * Constructs the table of tabs with their associated elements
     */
    buildTabsArray(container, radios) {
        const contentWrapper = container.querySelector(
            '[class*="tabs-content"]',
        );

        if (!contentWrapper) {
            console.warn(`⚠️ No wrapper ".tabs-content" found in`, container);
            return Array.from(radios).map((radio, index) => {
                const label = container.querySelector(
                    `label[for="${radio.id}"]`,
                );
                if (!label) {
                    console.warn(`⚠️ No label found for input #${radio.id}`);
                }
                return { radio, label, panel: null, index, id: radio.id };
            });
        }

        const panels = Array.from(contentWrapper.children).filter((child) =>
            Array.from(child.classList).some((c) => c.startsWith("tab-panel")),
        );

        return Array.from(radios).map((radio, index) => {
            const label = container.querySelector(`label[for="${radio.id}"]`);
            const panel = panels[index];

            if (!label) {
                console.warn(`⚠️ No label found for input #${radio.id}`);
            }

            if (!panel) {
                console.warn(
                    `⚠️ No panel found at index ${index} for group ${
                        container.dataset.tabs || container.id
                    }`,
                );
            }

            return {
                radio,
                label,
                panel,
                index,
                id: radio.id,
            };
        });
    }

    /**
     * Parse the configuration from the data attributes
     */
    parseConfig(container) {
        return {
            orientation:
                container.dataset.tabsOrientation ||
                this.config.defaultOrientation,
            style: container.dataset.tabsStyle || this.config.defaultStyle,
            preset: container.dataset.tabsPreset || null,
            animated: container.dataset.tabsAnimated !== "false",
            responsive: container.dataset.tabsResponsive !== "false",
            mobileBreakpoint: container.dataset.tabsMobileBreakpoint || "768px",
            activeColor:
                container.dataset.tabsActiveColor ||
                this.config.defaultActiveColor,
            activeBorderWidth:
                container.dataset.tabsActiveBorderWidth ||
                this.config.defaultActiveBorderWidth,
            keyboard: container.dataset.tabsKeyboard !== "false",
        };
    }

    /**
     * Attach events to the tab group
     */
    attachEventListeners(tabGroup) {
        const { tabs, config } = tabGroup;

        tabs.forEach((tab) => {
            if (!tab.radio) return;

            tab.radio.addEventListener("change", (e) => {
                if (e.target.checked) {
                    this.onTabChange(tabGroup, tab);
                }
            });

            if (config.keyboard && tab.label) {
                tab.label.setAttribute("tabindex", "0");
                tab.label.addEventListener("keydown", (e) => {
                    this.handleKeyboardNavigation(e, tabGroup, tab);
                });
            }
        });
    }

    /**
     * Manages tab switching
     */
    onTabChange(tabGroup, activeTab) {
        const event = new CustomEvent("marssel:tab:change", {
            detail: {
                groupId: tabGroup.id,
                activeIndex: activeTab.index,
                activeTab: activeTab.radio,
                activeLabel: activeTab.label,
                activePanel: activeTab.panel,
                previousIndex: this.getPreviousActiveIndex(tabGroup),
            },
            bubbles: true,
            cancelable: true,
        });

        tabGroup.container.dispatchEvent(event);

        if (tabGroup.config.animated && activeTab.panel) {
            this.animatePanel(activeTab.panel);
        }

        this.updateAriaAttributes(tabGroup, activeTab);
    }

    /**
     * Animates the appearance of a panel
     */
    animatePanel(panel) {
        // Reset inline styles
        panel.style.opacity = "0";
        panel.style.transform = "translateY(10px)";

        requestAnimationFrame(() => {
            panel.style.transition = `opacity ${this.config.animationDuration}ms ease, transform ${this.config.animationDuration}ms ease`;
            panel.style.opacity = "1";
            panel.style.transform = "translateY(0)";

            // Nettoyer après l'animation
            setTimeout(() => {
                panel.style.transition = "";
            }, this.config.animationDuration);
        });
    }

    /**
     * Manages keyboard navigation
     */
    handleKeyboardNavigation(event, tabGroup, currentTab) {
        const { tabs } = tabGroup;
        const currentIndex = currentTab.index;
        let targetIndex = -1;

        switch (event.key) {
            case "ArrowRight":
            case "ArrowDown":
                event.preventDefault();
                targetIndex = (currentIndex + 1) % tabs.length;
                break;

            case "ArrowLeft":
            case "ArrowUp":
                event.preventDefault();
                targetIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                break;

            case "Home":
                event.preventDefault();
                targetIndex = 0;
                break;

            case "End":
                event.preventDefault();
                targetIndex = tabs.length - 1;
                break;

            case "Enter":
            case " ":
                event.preventDefault();
                if (!currentTab.radio.checked) {
                    currentTab.radio.checked = true;
                    this.onTabChange(tabGroup, currentTab);
                }
                return;
        }

        if (targetIndex !== -1 && tabs[targetIndex]) {
            const targetTab = tabs[targetIndex];
            targetTab.radio.checked = true;
            targetTab.label?.focus();
            this.onTabChange(tabGroup, targetTab);
        }
    }

    /**
     * Updates ARIA attributes for accessibility
     */
    updateAriaAttributes(tabGroup, activeTab) {
        tabGroup.tabs.forEach((tab) => {
            if (tab.label) {
                tab.label.setAttribute(
                    "aria-selected",
                    tab === activeTab ? "true" : "false",
                );
            }
            if (tab.panel) {
                tab.panel.setAttribute(
                    "aria-hidden",
                    tab === activeTab ? "false" : "true",
                );
            }
        });
    }

    /**
     * Ensures that a tab is active on load
     */
    ensureActiveTab(tabGroup) {
        const { tabs } = tabGroup;
        const checkedTab = tabs.find((t) => t.radio?.checked);

        if (!checkedTab && tabs.length > 0 && tabs[0].radio) {
            tabs[0].radio.checked = true;
            this.updateAriaAttributes(tabGroup, tabs[0]);
        }
    }

    /**
     * Retrieves the index of the previously active tab
     */
    getPreviousActiveIndex(tabGroup) {
        const activeTab = tabGroup.tabs.find((t) => t.radio?.checked);
        return activeTab ? activeTab.index : -1;
    }

    /**
     * Configure a watcher for dynamically added tabs
     */
    setupObserver() {
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        if (
                            node.matches &&
                            node.matches("[data-tabs], .tabs-container")
                        ) {
                            this.initializeTabGroup(node);
                        }

                        if (node.querySelectorAll) {
                            const containers = node.querySelectorAll(
                                "[data-tabs], .tabs-container",
                            );
                            containers.forEach((container) => {
                                this.initializeTabGroup(container);
                            });
                        }
                    }
                });
            });
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    /**
     * Generates a unique ID for a group of tabs
     */
    generateGroupId() {
        return `tabs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Activates a specific tab by its index
     */
    activateTab(groupId, index) {
        const group = this.tabGroups.get(groupId);

        if (!group) {
            console.warn(`⚠️ Tab group "${groupId}" not found`);
            return false;
        }

        if (!group.tabs[index]) {
            console.warn(`⚠️ Tab at index ${index} not found in "${groupId}"`);
            return false;
        }

        const targetTab = group.tabs[index];

        if (targetTab.radio) {
            targetTab.radio.checked = true;
            this.onTabChange(group, targetTab);
            return true;
        }

        return false;
    }

    /**
     * Retrieves the active tab of a group
     */
    getActiveTab(groupId) {
        const group = this.tabGroups.get(groupId);

        if (!group) {
            console.warn(`⚠️ Tab group "${groupId}" not found`);
            return null;
        }

        return group.tabs.find((tab) => tab.radio?.checked) || null;
    }

    /**
     * Retrieves the index of the active tab
     */
    getActiveIndex(groupId) {
        const activeTab = this.getActiveTab(groupId);
        return activeTab ? activeTab.index : -1;
    }

    /**
     * Retrieves all tab groups
     */
    getAllGroups() {
        return Array.from(this.tabGroups.keys());
    }

    /**
     * Retrieve a specific group
     */
    getGroup(groupId) {
        return this.tabGroups.get(groupId) || null;
    }

    /**
     * Activate the next tab
     */
    nextTab(groupId) {
        const group = this.tabGroups.get(groupId);
        if (!group) return false;

        const currentIndex = this.getActiveIndex(groupId);
        const len = group.tabs.length;

        for (let i = 1; i <= len; i++) {
            const nextIndex = (currentIndex + i) % len;
            if (!group.tabs[nextIndex].radio?.disabled) {
                return this.activateTab(groupId, nextIndex);
            }
        }

        return false;
    }

    /**
     * Activates the previous tab
     */
    previousTab(groupId) {
        const group = this.tabGroups.get(groupId);
        if (!group) return false;

        const currentIndex = this.getActiveIndex(groupId);
        const len = group.tabs.length;

        for (let i = 1; i <= len; i++) {
            const prevIndex = (currentIndex - i + len) % len;
            if (!group.tabs[prevIndex].radio?.disabled) {
                return this.activateTab(groupId, prevIndex);
            }
        }

        return false;
    }

    /**
     * Disables a tab (makes it unclickable)
     */
    disableTab(groupId, index) {
        const group = this.tabGroups.get(groupId);
        if (!group || !group.tabs[index]) return false;

        const tab = group.tabs[index];

        if (tab.radio) {
            tab.radio.disabled = true;
        }

        if (tab.label) {
            tab.label.style.opacity = "0.5";
            tab.label.style.cursor = "not-allowed";
            tab.label.style.pointerEvents = "none";
        }

        return true;
    }

    /**
     * Activates a disabled tab
     */
    enableTab(groupId, index) {
        const group = this.tabGroups.get(groupId);
        if (!group || !group.tabs[index]) return false;

        const tab = group.tabs[index];

        if (tab.radio) {
            tab.radio.disabled = false;
        }

        if (tab.label) {
            tab.label.style.opacity = "";
            tab.label.style.cursor = "";
            tab.label.style.pointerEvents = "";
        }

        return true;
    }

    /**
     * Destroys a group of tabs and cleans up resources
     */
    destroy(groupId) {
        const group = this.tabGroups.get(groupId);

        if (!group) {
            console.warn(`⚠️ Tab group "${groupId}" not found`);
            return false;
        }

        group.tabs.forEach((tab) => {
            if (tab.radio) {
                const newRadio = tab.radio.cloneNode(true);
                tab.radio.parentNode?.replaceChild(newRadio, tab.radio);
            }

            if (tab.label) {
                const newLabel = tab.label.cloneNode(true);
                tab.label.parentNode?.replaceChild(newLabel, tab.label);
            }
        });

        this.tabsStyle.removeGroupStyles(groupId);
        this.tabGroups.delete(groupId);

        console.log(`🗑️ Tab group "${groupId}" destroyed`);
        return true;
    }

    /**
     * Completely cleans the TabsManager
     */
    cleanup() {
        this.tabGroups.forEach((_, groupId) => {
            this.destroy(groupId);
        });

        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        this.tabsStyle.cleanup();

        console.log("🧹 TabsManager cleaned");
    }
}
