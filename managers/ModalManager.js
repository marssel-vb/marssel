import { LRUCache } from "../utils/LRUCache.js";

export class ModalManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.overlay = null;
        this.openModals = new Set();
        this.modalCache = new LRUCache(50);
        this.boundCloseOnOverlay = this.closeAllModals.bind(this);
        this.boundCloseOnEscape = this.handleEscapeKey.bind(this);
    }

    init() {
        this.overlay = document.getElementById("modal-overlay");

        if (!this.overlay) {
            // console.warn("Modal overlay element not found");
            return;
        }

        window.openModal = (id) => this.openModal(id);
        window.closeModal = (id) => this.closeModal(id);

        this.overlay.addEventListener("click", this.boundCloseOnOverlay, {
            passive: true,
        });
        document.addEventListener("keydown", this.boundCloseOnEscape, {
            passive: false,
        });
    }

    /**
     * Retrieves a cached modal element
     * @param {string} id - ID of the modal
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
     * Opens a modal
     * @param {string} id - ID of the modal to open
     * @returns {boolean} - True if the modal was opened successfully
     */
    openModal(id) {
        const modal = this.getModalElement(id);

        if (!modal) {
            console.warn(`Modal with id "${id}" not found`);
            return false;
        }

        if (this.openModals.has(id)) {
            return true;
        }

        if (id !== "modal-fullscreen") {
            this.showOverlay();
        }

        this.showModal(modal);
        this.openModals.add(id);
        this.disableBodyScroll();

        return true;
    }

    /**
     * Closes a specific modal
     * @param {string} id - ID of the modal to close
     * @returns {boolean} - True if the modal was successfully closed
     */
    closeModal(id) {
        const modal = this.getModalElement(id);

        if (!modal || !this.openModals.has(id)) {
            return false;
        }

        this.hideModal(modal);
        this.openModals.delete(id);

        if (this.openModals.size === 0) {
            this.hideOverlay();
            this.enableBodyScroll();
        }

        return true;
    }

    /**
     * Close all open modals
     */
    closeAllModals() {
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
     * Esc key handling
     * @param {KeyboardEvent} event
     */
    handleEscapeKey(event) {
        if (event.key === "Escape" && this.openModals.size > 0) {
            event.preventDefault();
            this.closeAllModals();
        }
    }

    /**
     * Displays the overlay
     */
    showOverlay() {
        if (this.overlay) {
            this.overlay.style.display = "block";
        }
    }

    /**
     * Hide the overlay
     */
    hideOverlay() {
        if (this.overlay) {
            this.overlay.style.display = "none";
        }
    }

    /**
     * Displays a modal
     * @param {HTMLElement} modal
     */
    showModal(modal) {
        modal.style.display = "block";
        modal.setAttribute("aria-hidden", "false");
        const focusableElement = modal.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElement) {
            focusableElement.focus();
        }
    }

    /**
     * Hides a modal
     * @param {HTMLElement} modal
     */
    hideModal(modal) {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
    }

    /**
     * Disable body scrolling
     */
    disableBodyScroll() {
        document.body.style.overflow = "hidden";
    }

    /**
     * Reactivates body scrolling
     */
    enableBodyScroll() {
        document.body.style.overflow = "";
    }

    /**
     * Checks if a modal is open
     * @param {string} id - ID of the modal
     * @returns {boolean}
     */
    isModalOpen(id) {
        return this.openModals.has(id);
    }

    /**
     * Returns the list of open modals
     * @returns {string[]}
     */
    getOpenModals() {
        return [...this.openModals];
    }

    /**
     * Cleanse up the events during destruction
     */
    destroy() {
        if (this.overlay) {
            this.overlay.removeEventListener("click", this.boundCloseOnOverlay);
        }
        document.removeEventListener("keydown", this.boundCloseOnEscape);

        delete window.openModal;
        delete window.closeModal;

        this.closeAllModals();
        this.openModals.clear();
        this.modalCache.clear();
    }
}
