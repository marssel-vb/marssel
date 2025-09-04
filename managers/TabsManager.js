import { TabsStyles } from "../styles/TabsStyles.js";
import { LRUCache } from "../utils/LRUCache.js";

export class TabsManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.tabsStyle = new TabsStyles(marssel.styleManager);
        this.stylesApplied = false;
        this.tabGroups = new LRUCache(50);
        this.observer = null;

        // Cache DOM elements
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
     * Initialise le TabsManager
     */
    init() {
        if (!this.config.autoInit) return;

        console.log("🔷 Initialisation TabsManager...");

        // Enregistrer les styles de base
        //this.tabsStyle.registerBaseStyles();

        // Initialiser tous les tabs existants
        this.initializeAllTabs();

        // Observer les nouveaux tabs
        this.setupObserver();

        console.log("✅ TabsManager initialisé");
    }

    /**
     * Initialise tous les tabs présents dans le DOM
     */
    initializeAllTabs() {
        const tabContainers = document.querySelectorAll(
            "[data-tabs], .tabs-container"
        );

        let count = 0;
        tabContainers.forEach((container) => {
            if (this.initializeTabGroup(container)) {
                count++;
            }
        });

        console.log(`📑 ${count} groupe(s) de tabs initialisé(s)`);
    }

    /**
     * Initialise un groupe de tabs spécifique
     */
    initializeTabGroup(container) {
        if (!this.stylesApplied) {
            this.tabsStyle.registerBaseStyles();
            this.stylesApplied = true;
        }

        // Générer ou récupérer l'ID du groupe
        const groupId = container.dataset.tabs || this.generateGroupId();

        // Éviter la double initialisation
        if (this.tabGroups.has(groupId)) {
            console.warn(`⚠️ Tab group "${groupId}" déjà initialisé`);
            return false;
        }

        // Trouver les radios
        const allRadios = container.querySelectorAll(
            'input[type="radio"][name]'
        );

        if (allRadios.length === 0) {
            console.warn("⚠️ Aucun input radio trouvé dans", container);
            return false;
        }

        // FIX: Filtrer les radios pour ne garder que le premier groupe 'name' trouvé
        // (Empêche les onglets imbriqués d'être comptés dans le parent)
        const groupName = allRadios[0].name;
        const radios = Array.from(allRadios).filter(
            (r) => r.name === groupName
        );

        // Parser la configuration
        const config = this.parseConfig(container);

        // Créer la structure du groupe
        const tabs = this.buildTabsArray(container, radios); // Passer la liste filtrée

        const tabGroup = {
            id: groupId,
            container,
            tabs,
            config,
            groupName,
            initialized: true,
        };

        // Enregistrer le groupe
        this.tabGroups.set(groupId, tabGroup);

        // Assurer un ID sur le container pour les sélecteurs CSS
        if (!container.id) {
            container.id = groupId;
        }

        // Appliquer les styles via TabsStyles
        this.tabsStyle.applyGroupStyles(tabGroup);

        // Appliquer un preset si spécifié
        if (config.preset && config.preset !== "default") {
            this.tabsStyle.applyPresetStyle(container, config.preset);
        }

        // Attacher les événements
        this.attachEventListeners(tabGroup);

        // Activer le premier onglet si aucun n'est checked
        this.ensureActiveTab(tabGroup);

        return true;
    }

    /**
     * Construit le tableau des tabs avec leurs éléments associés
     */
    buildTabsArray(container, radios) {
        // FIX 1: Utiliser [class*="..."] pour trouver le wrapper, même avec des modificateurs
        const contentWrapper = container.querySelector(
            '[class*="tabs-content"]'
        );

        if (!contentWrapper) {
            console.warn(
                `⚠️ Aucun wrapper ".tabs-content" trouvé dans`,
                container
            );
            // Retourner une map avec des panels null pour éviter d'autres erreurs
            return Array.from(radios).map((radio, index) => {
                const label = container.querySelector(
                    `label[for="${radio.id}"]`
                );
                if (!label) {
                    console.warn(
                        `⚠️ Aucun label trouvé pour l'input #${radio.id}`
                    );
                }
                return { radio, label, panel: null, index, id: radio.id };
            });
        }

        // FIX 2: Utiliser startsWith("tab-panel") pour trouver les panels, même avec des modificateurs
        const panels = Array.from(contentWrapper.children).filter((child) =>
            Array.from(child.classList).some((c) => c.startsWith("tab-panel"))
        );

        return Array.from(radios).map((radio, index) => {
            const label = container.querySelector(`label[for="${radio.id}"]`);
            const panel = panels[index]; // Obtenir depuis la liste filtrée d'enfants directs

            if (!label) {
                console.warn(`⚠️ Aucun label trouvé pour l'input #${radio.id}`);
            }

            if (!panel) {
                // Ajout de l'ID du groupe pour un meilleur débogage
                console.warn(
                    `⚠️ Aucun panel trouvé à l'index ${index} pour le groupe ${
                        container.dataset.tabs || container.id
                    }`
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
     * Parse la configuration depuis les data-attributes
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
     * Attache les événements au groupe de tabs
     */
    attachEventListeners(tabGroup) {
        const { tabs, config } = tabGroup;

        tabs.forEach((tab) => {
            if (!tab.radio) return;

            // Événement change sur le radio
            tab.radio.addEventListener("change", (e) => {
                if (e.target.checked) {
                    this.onTabChange(tabGroup, tab);
                }
            });

            // Navigation clavier sur le label
            if (config.keyboard && tab.label) {
                tab.label.setAttribute("tabindex", "0");
                tab.label.addEventListener("keydown", (e) => {
                    this.handleKeyboardNavigation(e, tabGroup, tab);
                });
            }
        });
    }

    /**
     * Gère le changement d'onglet
     */
    onTabChange(tabGroup, activeTab) {
        // Émettre un événement personnalisé
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

        // Animation du panel si activée
        if (tabGroup.config.animated && activeTab.panel) {
            this.animatePanel(activeTab.panel);
        }

        // Mettre à jour l'aria-selected
        this.updateAriaAttributes(tabGroup, activeTab);
    }

    /**
     * Anime l'apparition d'un panel
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
     * Gère la navigation au clavier
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
     * Met à jour les attributs ARIA pour l'accessibilité
     */
    updateAriaAttributes(tabGroup, activeTab) {
        tabGroup.tabs.forEach((tab) => {
            if (tab.label) {
                tab.label.setAttribute(
                    "aria-selected",
                    tab === activeTab ? "true" : "false"
                );
            }
            if (tab.panel) {
                tab.panel.setAttribute(
                    "aria-hidden",
                    tab === activeTab ? "false" : "true"
                );
            }
        });
    }

    /**
     * Assure qu'un onglet est actif au chargement
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
     * Récupère l'index de l'onglet précédemment actif
     */
    getPreviousActiveIndex(tabGroup) {
        const activeTab = tabGroup.tabs.find((t) => t.radio?.checked);
        return activeTab ? activeTab.index : -1;
    }

    /**
     * Configure un observateur pour les tabs ajoutés dynamiquement
     */
    setupObserver() {
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        // Element node
                        // Vérifier si le nœud lui-même est un container de tabs
                        if (
                            node.matches &&
                            node.matches("[data-tabs], .tabs-container")
                        ) {
                            this.initializeTabGroup(node);
                        }

                        // Chercher des containers de tabs dans les enfants
                        if (node.querySelectorAll) {
                            const containers = node.querySelectorAll(
                                "[data-tabs], .tabs-container"
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
     * Génère un ID unique pour un groupe de tabs
     */
    generateGroupId() {
        return `tabs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // ============================================
    // API PUBLIQUE
    // ============================================

    /**
     * Active un onglet spécifique par son index
     */
    activateTab(groupId, index) {
        const group = this.tabGroups.get(groupId);

        if (!group) {
            console.warn(`⚠️ Groupe de tabs "${groupId}" introuvable`);
            return false;
        }

        if (!group.tabs[index]) {
            console.warn(
                `⚠️ Onglet à l'index ${index} introuvable dans "${groupId}"`
            );
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
     * Récupère l'onglet actif d'un groupe
     */
    getActiveTab(groupId) {
        const group = this.tabGroups.get(groupId);

        if (!group) {
            console.warn(`⚠️ Groupe de tabs "${groupId}" introuvable`);
            return null;
        }

        return group.tabs.find((tab) => tab.radio?.checked) || null;
    }

    /**
     * Récupère l'index de l'onglet actif
     */
    getActiveIndex(groupId) {
        const activeTab = this.getActiveTab(groupId);
        return activeTab ? activeTab.index : -1;
    }

    /**
     * Récupère tous les groupes de tabs
     */
    getAllGroups() {
        return Array.from(this.tabGroups.keys());
    }

    /**
     * Récupère un groupe spécifique
     */
    getGroup(groupId) {
        return this.tabGroups.get(groupId) || null;
    }

    /**
     * Active l'onglet suivant
     */
    nextTab(groupId) {
        const group = this.tabGroups.get(groupId);
        if (!group) return false;

        const currentIndex = this.getActiveIndex(groupId);
        const nextIndex = (currentIndex + 1) % group.tabs.length;

        return this.activateTab(groupId, nextIndex);
    }

    /**
     * Active l'onglet précédent
     */
    previousTab(groupId) {
        const group = this.tabGroups.get(groupId);
        if (!group) return false;

        const currentIndex = this.getActiveIndex(groupId);
        const prevIndex =
            (currentIndex - 1 + group.tabs.length) % group.tabs.length;

        return this.activateTab(groupId, prevIndex);
    }

    /**
     * Désactive un onglet (le rend non cliquable)
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
     * Active un onglet désactivé
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
     * Détruit un groupe de tabs et nettoie les ressources
     */
    destroy(groupId) {
        const group = this.tabGroups.get(groupId);

        if (!group) {
            console.warn(`⚠️ Groupe de tabs "${groupId}" introuvable`);
            return false;
        }

        // Nettoyer les event listeners en clonant les éléments
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

        // Supprimer les styles du groupe
        this.tabsStyle.removeGroupStyles(groupId);

        // Supprimer le groupe de la Map
        this.tabGroups.delete(groupId);

        console.log(`🗑️ Groupe de tabs "${groupId}" détruit`);
        return true;
    }

    /**
     * Nettoie complètement le TabsManager
     */
    cleanup() {
        // Détruire tous les groupes
        this.tabGroups.forEach((_, groupId) => {
            this.destroy(groupId);
        });

        // Déconnecter l'observateur
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        // Nettoyer les styles
        this.tabsStyle.cleanup();

        console.log("🧹 TabsManager nettoyé");
    }
}
