export class ModalManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.overlay = null;
        this.openModals = new Set(); // Suivi des modales ouvertes
        this.modalCache = new Map(); // Cache des éléments pour éviter les querySelector répétés
        this.boundCloseOnOverlay = this.closeAllModals.bind(this);
        this.boundCloseOnEscape = this.handleEscapeKey.bind(this);
    }

    init() {
        this.overlay = document.getElementById("modal-overlay");

        if (!this.overlay) {
            console.warn("Modal overlay element not found");
            return;
        }

        // Exposition des méthodes globales avec arrow functions pour préserver le contexte
        window.openModal = (id) => this.openModal(id);
        window.closeModal = (id) => this.closeModal(id);

        // Événements avec gestion optimisée
        this.overlay.addEventListener("click", this.boundCloseOnOverlay, {
            passive: true,
        });
        document.addEventListener("keydown", this.boundCloseOnEscape, {
            passive: false,
        });
    }

    /**
     * Récupère un élément modal avec mise en cache
     * @param {string} id - ID de la modale
     * @returns {HTMLElement|null}
     */
    getModalElement(id) {
        if (!this.modalCache.has(id)) {
            const modal = document.getElementById(id);
            if (modal) {
                this.modalCache.set(id, modal);
            }
            return modal;
        }
        return this.modalCache.get(id);
    }

    /**
     * Ouvre une modale
     * @param {string} id - ID de la modale à ouvrir
     * @returns {boolean} - True si la modale a été ouverte avec succès
     */
    openModal(id) {
        const modal = this.getModalElement(id);

        if (!modal) {
            console.warn(`Modal with id "${id}" not found`);
            return false;
        }

        // Éviter d'ouvrir une modale déjà ouverte
        if (this.openModals.has(id)) {
            return true;
        }

        // Gestion spéciale pour la modale fullscreen
        if (id !== "modal-fullscreen") {
            this.showOverlay();
        }

        this.showModal(modal);
        this.openModals.add(id);
        this.disableBodyScroll();

        return true;
    }

    /**
     * Ferme une modale spécifique
     * @param {string} id - ID de la modale à fermer
     * @returns {boolean} - True si la modale a été fermée avec succès
     */
    closeModal(id) {
        const modal = this.getModalElement(id);

        if (!modal || !this.openModals.has(id)) {
            return false;
        }

        this.hideModal(modal);
        this.openModals.delete(id);

        // Si aucune modale n'est ouverte, nettoyer l'état
        if (this.openModals.size === 0) {
            this.hideOverlay();
            this.enableBodyScroll();
        }

        return true;
    }

    /**
     * Ferme toutes les modales ouvertes
     */
    closeAllModals() {
        // Créer une copie du Set pour éviter les modifications pendant l'itération
        const modalsToClose = [...this.openModals];

        modalsToClose.forEach((id) => {
            const modal = this.getModalElement(id);
            if (modal) {
                this.hideModal(modal);
            }
        });

        this.openModals.clear();
        this.hideOverlay();
        this.enableBodyScroll();
    }

    /**
     * Gestion de la touche Échap
     * @param {KeyboardEvent} event
     */
    handleEscapeKey(event) {
        if (event.key === "Escape" && this.openModals.size > 0) {
            event.preventDefault();
            this.closeAllModals();
        }
    }

    /**
     * Affiche l'overlay
     */
    showOverlay() {
        if (this.overlay) {
            this.overlay.style.display = "block";
        }
    }

    /**
     * Cache l'overlay
     */
    hideOverlay() {
        if (this.overlay) {
            this.overlay.style.display = "none";
        }
    }

    /**
     * Affiche une modale
     * @param {HTMLElement} modal
     */
    showModal(modal) {
        modal.style.display = "block";
        // Améliorer l'accessibilité
        modal.setAttribute("aria-hidden", "false");

        // Focus sur le premier élément focusable de la modale
        const focusableElement = modal.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElement) {
            focusableElement.focus();
        }
    }

    /**
     * Cache une modale
     * @param {HTMLElement} modal
     */
    hideModal(modal) {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
    }

    /**
     * Désactive le scroll du body
     */
    disableBodyScroll() {
        document.body.style.overflow = "hidden";
    }

    /**
     * Réactive le scroll du body
     */
    enableBodyScroll() {
        document.body.style.overflow = "";
    }

    /**
     * Vérifie si une modale est ouverte
     * @param {string} id - ID de la modale
     * @returns {boolean}
     */
    isModalOpen(id) {
        return this.openModals.has(id);
    }

    /**
     * Retourne la liste des modales ouvertes
     * @returns {string[]}
     */
    getOpenModals() {
        return [...this.openModals];
    }

    /**
     * Nettoie les événements lors de la destruction
     */
    destroy() {
        if (this.overlay) {
            this.overlay.removeEventListener("click", this.boundCloseOnOverlay);
        }
        document.removeEventListener("keydown", this.boundCloseOnEscape);

        // Nettoyer les méthodes globales
        delete window.openModal;
        delete window.closeModal;

        this.closeAllModals();
        this.openModals.clear();
        this.modalCache.clear(); // Vider le cache
    }
}
