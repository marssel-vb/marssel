export class ModalManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.overlay = null;
        this.openModals = new Set(); // Suivi efficace des modales ouvertes
        this.scrollbarWidth = 0;
        this.isInitialized = false;

        // Cache des éléments pour éviter les querySelector répétés
        this.modalCache = new Map();

        // Event handlers bindés pour pouvoir les supprimer
        this.boundOverlayClick = this.handleOverlayClick.bind(this);
        this.boundKeyDown = this.handleKeyDown.bind(this);

        // Configuration par défaut
        this.config = {
            closeOnOverlay: true,
            closeOnEscape: true,
            preventBodyScroll: true,
            animationDuration: 300,
        };
    }

    init() {
        if (this.isInitialized) return;

        this.overlay = document.getElementById("modal-overlay");
        if (!this.overlay) {
            console.warn("Modal overlay not found");
            return;
        }

        // Calcul de la largeur de la scrollbar une seule fois
        this.calculateScrollbarWidth();

        // Pré-cache des modales existantes
        this.cacheExistingModals();

        // Event listeners
        this.addEventListeners();

        // Exposition des méthodes globales (avec namespace pour éviter les conflits)
        if (!window.ModalAPI) {
            window.ModalAPI = {
                open: (id) => this.openModal(id),
                close: (id) => this.closeModal(id),
                closeAll: () => this.closeAllModals(),
                isOpen: (id) => this.isModalOpen(id),
            };
        }

        this.isInitialized = true;
    }

    calculateScrollbarWidth() {
        // Calcul optimisé de la largeur de scrollbar
        const outer = document.createElement("div");
        outer.style.cssText =
            "position:absolute;top:-9999px;width:50px;height:50px;overflow:scroll;";
        document.body.appendChild(outer);
        this.scrollbarWidth = outer.offsetWidth - outer.clientWidth;
        document.body.removeChild(outer);
    }

    cacheExistingModals() {
        // Pré-cache toutes les modales existantes
        document.querySelectorAll('[id^="modal-"]').forEach((modal) => {
            this.modalCache.set(modal.id, modal);
        });
    }

    addEventListeners() {
        if (this.config.closeOnOverlay) {
            this.overlay.addEventListener("click", this.boundOverlayClick);
        }

        if (this.config.closeOnEscape) {
            document.addEventListener("keydown", this.boundKeyDown);
        }
    }

    removeEventListeners() {
        this.overlay?.removeEventListener("click", this.boundOverlayClick);
        document.removeEventListener("keydown", this.boundKeyDown);
    }

    handleOverlayClick(event) {
        // S'assurer que le clic est bien sur l'overlay et pas sur le contenu
        if (event.target === this.overlay) {
            this.closeAllModals();
        }
    }

    handleKeyDown(event) {
        if (event.key === "Escape" && this.openModals.size > 0) {
            event.preventDefault();
            this.closeTopModal(); // Ferme seulement la modale du dessus
        }
    }

    getModal(id) {
        // Utilise le cache ou fait un querySelector si nécessaire
        if (!this.modalCache.has(id)) {
            const modal = document.getElementById(id);
            if (modal) {
                this.modalCache.set(id, modal);
            }
        }
        return this.modalCache.get(id);
    }

    openModal(id, options = {}) {
        const modal = this.getModal(id);
        if (!modal) {
            console.warn(`Modal ${id} not found`);
            return false;
        }

        // Éviter d'ouvrir une modale déjà ouverte
        if (this.openModals.has(id)) {
            return true;
        }

        const config = { ...this.config, ...options };

        // Affichage de l'overlay (sauf pour fullscreen)
        if (id !== "modal-fullscreen") {
            this.showOverlay();
        }

        // Affichage de la modale
        this.showModal(modal, config);

        // Ajout au Set des modales ouvertes
        this.openModals.add(id);

        // Gestion du scroll
        if (config.preventBodyScroll) {
            this.disableBodyScroll();
        }

        // Event personnalisé
        this.dispatchModalEvent("modalOpened", { modalId: id, modal });

        return true;
    }

    closeModal(id) {
        const modal = this.getModal(id);
        if (!modal || !this.openModals.has(id)) {
            return false;
        }

        // Animation de fermeture
        this.hideModal(modal);

        // Retrait du Set
        this.openModals.delete(id);

        // Gestion de l'overlay et du scroll
        this.updateOverlayState();

        // Event personnalisé
        this.dispatchModalEvent("modalClosed", { modalId: id, modal });

        return true;
    }

    closeAllModals() {
        // Fermeture optimisée de toutes les modales
        const modalsToClose = Array.from(this.openModals);

        modalsToClose.forEach((id) => {
            const modal = this.getModal(id);
            if (modal) {
                this.hideModal(modal);
            }
        });

        this.openModals.clear();
        this.hideOverlay();
        this.enableBodyScroll();

        // Event personnalisé
        this.dispatchModalEvent("allModalsClosed", {
            closedModals: modalsToClose,
        });
    }

    closeTopModal() {
        // Ferme la dernière modale ouverte (pour Escape)
        const modalIds = Array.from(this.openModals);
        if (modalIds.length > 0) {
            const topModalId = modalIds[modalIds.length - 1];
            this.closeModal(topModalId);
        }
    }

    showOverlay() {
        if (this.overlay) {
            this.overlay.style.display = "block";
            // Force reflow pour l'animation
            this.overlay.offsetHeight;
            this.overlay.style.opacity = "1";
        }
    }

    hideOverlay() {
        if (this.overlay) {
            this.overlay.style.opacity = "0";
            setTimeout(() => {
                if (this.openModals.size === 0) {
                    this.overlay.style.display = "none";
                }
            }, this.config.animationDuration);
        }
    }

    showModal(modal, config) {
        modal.style.display = "block";

        // Animation d'entrée
        if (config.animationDuration > 0) {
            modal.style.opacity = "0";

            requestAnimationFrame(() => {
                modal.style.transition = `opacity ${config.animationDuration}ms ease, transform ${config.animationDuration}ms ease`;
                modal.style.opacity = "1";
            });
        }
    }

    hideModal(modal) {
        // Animation de sortie
        if (this.config.animationDuration > 0) {
            modal.style.opacity = "0";

            setTimeout(() => {
                modal.style.display = "none";
                modal.style.transition = "";
            }, this.config.animationDuration);
        } else {
            modal.style.display = "none";
        }
    }

    updateOverlayState() {
        // Met à jour l'état de l'overlay en fonction des modales ouvertes
        if (this.openModals.size === 0) {
            this.hideOverlay();
            this.enableBodyScroll();
        }
    }

    disableBodyScroll() {
        if (!this.config.preventBodyScroll) return;

        document.body.style.overflow = "hidden";
        // Compensation de la scrollbar pour éviter le jump
        document.body.style.paddingRight = `${this.scrollbarWidth}px`;
    }

    enableBodyScroll() {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
    }

    dispatchModalEvent(eventName, detail) {
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: true,
            cancelable: true,
        });
        document.dispatchEvent(event);
    }

    // API publique
    isModalOpen(id) {
        return this.openModals.has(id);
    }

    getOpenModals() {
        return Array.from(this.openModals);
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    // Nettoyage pour libérer les ressources
    destroy() {
        this.removeEventListeners();
        this.closeAllModals();
        this.modalCache.clear();
        this.openModals.clear();

        // Suppression de l'API globale
        if (window.ModalAPI) {
            delete window.ModalAPI;
        }

        this.isInitialized = false;
    }

    // Getter pour les statistiques (utile pour le debug)
    get stats() {
        return {
            openModalsCount: this.openModals.size,
            cachedModalsCount: this.modalCache.size,
            openModals: this.getOpenModals(),
        };
    }
}
