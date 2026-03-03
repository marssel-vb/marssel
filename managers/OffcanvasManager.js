import { OffcanvasStyles } from "../styles/OffcanvasStyles.js";
import { LRUCache } from "../utils/LRUCache.js";

export class OffcanvasManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.offcanvasElements = new LRUCache(20);
        this.activeOffcanvas = null;
        this.backdrop = null;
        this.isInitialized = false;
        this.offcanvasStyles = new OffcanvasStyles(marssel.styleManager);
        this.handleClick = this.handleClick.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
    }

    init() {
        if (this.isInitialized) return;

        if (!document.querySelector("[data-offcanvas-target]")) return;

        this.offcanvasStyles.initializeStyles();
        this.createBackdrop();
        this.initEvents();

        this.isInitialized = true;
    }

    createBackdrop() {
        this.backdrop = document.createElement("div");
        this.backdrop.className = "offcanvas-backdrop";
        this.backdrop.style.display = "none";
        document.body.appendChild(this.backdrop);
    }

    initEvents() {
        document.addEventListener("click", this.handleClick);
        document.addEventListener("keydown", this.handleKeydown);
    }

    handleClick(event) {
        const { target } = event;
        const trigger = target.closest("[data-offcanvas-target]");
        if (trigger) {
            const targetId = trigger.getAttribute("data-offcanvas-target");
            const lockScroll =
                trigger.getAttribute("data-offcanvas-lock-scroll") !== "false";

            this.show(targetId, lockScroll);
            event.preventDefault();
            return;
        }

        if (
            target.closest(".offcanvas-close") ||
            (target === this.backdrop && this.activeOffcanvas)
        ) {
            this.hideActive();
            event.preventDefault();
        }
    }

    handleKeydown(event) {
        if (event.key === "Escape" && this.activeOffcanvas) {
            this.hideActive();
        }
    }

    /**
     * Displays an offcanvas
     * @param {string} id - The ID of the offcanvas
     * @param {boolean} lockScroll - If true, locks page scrolling
     * @returns {boolean} - True if the offcanvas was successfully displayed
     */
    show(id, lockScroll = true) {
        const offcanvas = this.getOffcanvasElement(id);
        if (!offcanvas) return false;

        if (this.activeOffcanvas && this.activeOffcanvas !== id) {
            this.hideActive();
        }

        if (this.activeOffcanvas === id) return true;

        this.setActiveOffcanvas(id, offcanvas, lockScroll);
        this.showElements(offcanvas, lockScroll);
        this.dispatchEvent(offcanvas, "offcanvas:shown");

        return true;
    }

    /**
     * Hides the active offcanvas
     * @returns {boolean} - True if an offcanvas has been hidden
     */
    hideActive() {
        if (!this.activeOffcanvas) return false;

        const offcanvasInfo = this.offcanvasElements.get(this.activeOffcanvas);
        if (!offcanvasInfo) return false;

        const { element, lockScroll } = offcanvasInfo;

        this.hideElements(element, lockScroll);
        this.dispatchEvent(element, "offcanvas:hidden");
        this.resetActiveOffcanvas();

        return true;
    }

    /**
     * Private utility methods
     */
    getOffcanvasElement(id) {
        const offcanvas = document.getElementById(id);
        if (!offcanvas?.classList.contains("offcanvas")) {
            console.error(`L'offcanvas avec l'ID ${id} n'existe pas.`);
            return null;
        }
        return offcanvas;
    }

    setActiveOffcanvas(id, element, lockScroll) {
        this.offcanvasElements.set(id, { element, lockScroll });
        this.activeOffcanvas = id;
    }

    showElements(offcanvas, lockScroll) {
        requestAnimationFrame(() => {
            offcanvas.classList.add("show");
            this.backdrop.style.display = "block";
            this.backdrop.offsetHeight;
            this.backdrop.classList.add("show");

            if (lockScroll) {
                document.body.classList.add("offcanvas-lock-scroll");
            }
        });
    }

    hideElements(element, lockScroll) {
        element.classList.remove("show");
        this.backdrop.classList.remove("show");

        setTimeout(() => {
            if (!this.backdrop.classList.contains("show")) {
                this.backdrop.style.display = "none";
            }
        }, 300);

        if (lockScroll) {
            document.body.classList.remove("offcanvas-lock-scroll");
        }
    }

    resetActiveOffcanvas() {
        this.activeOffcanvas = null;
    }

    dispatchEvent(element, eventName) {
        element.dispatchEvent(
            new CustomEvent(eventName, {
                bubbles: true,
                cancelable: true,
            }),
        );
    }

    /**
     * Creates a new offcanvas with improved validation
     * @param {Object} options - Configuration options
     * @returns {HTMLElement|null} - Returns the created element or null on error
     */
    create({ id, title = "", content = "", position = "start" } = {}) {
        if (!id || typeof id !== "string") {
            console.error(
                "L'ID de l'offcanvas est requis et doit être une chaîne.",
            );
            return null;
        }

        if (document.getElementById(id)) {
            console.error(`Un élément avec l'ID ${id} existe déjà.`);
            return null;
        }

        const validPositions = ["start", "end", "top", "bottom"];
        if (!validPositions.includes(position)) {
            console.warn(
                `Position invalide: ${position}. Utilisation de 'start' par défaut.`,
            );
            position = "start";
        }

        const offcanvas = this.createOffcanvasElement(
            id,
            title,
            content,
            position,
        );
        document.body.appendChild(offcanvas);

        return offcanvas;
    }

    createOffcanvasElement(id, title, content, position) {
        const offcanvas = document.createElement("div");
        offcanvas.id = id;
        offcanvas.className = `offcanvas offcanvas-${position}`;

        const safeTitle = this.escapeHtml(title);
        const headerContent = title
            ? `
            <div class="offcanvas-header">
                <h5 class="offcanvas-title">${safeTitle}</h5>
                <button type="button" class="offcanvas-close" aria-label="Close">&times;</button>
            </div>
        `
            : `
            <div class="offcanvas-header">
                <button type="button" class="offcanvas-close" aria-label="Close">&times;</button>
            </div>
        `;

        offcanvas.innerHTML = `
            ${headerContent}
            <div class="offcanvas-body">
                ${content}
            </div>
        `;

        return offcanvas;
    }

    /**
     * Updates the content of an existing offcanvas
     * @param {string} id - Offcanvas ID
     * @param {Object} options - Options to update
     * @returns {boolean} - True if the update was successful
     */
    update(id, { title, content } = {}) {
        const offcanvas = this.getOffcanvasElement(id);
        if (!offcanvas) return false;

        if (title !== undefined) {
            this.updateTitle(offcanvas, title);
        }

        if (content !== undefined) {
            this.updateContent(offcanvas, content);
        }

        return true;
    }

    updateTitle(offcanvas, title) {
        const titleElement = offcanvas.querySelector(".offcanvas-title");
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    updateContent(offcanvas, content) {
        const bodyElement = offcanvas.querySelector(".offcanvas-body");
        if (bodyElement) {
            bodyElement.innerHTML = content;
        }
    }

    /**
     * Removes an offcanvas from the DOM
     * @param {string} id - Identifier of the offcanvas
     * @returns {boolean} - True if the removal was successful
     */
    remove(id) {
        const offcanvas = this.getOffcanvasElement(id);
        if (!offcanvas) return false;

        if (this.activeOffcanvas === id) {
            this.hideActive();
        }

        offcanvas.remove();
        this.offcanvasElements.delete(id);

        return true;
    }

    /**
     * Utility to escape HTML and prevent XSS injections
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Cleans up event listeners (to be called during destruction)
     */
    destroy() {
        document.removeEventListener("click", this.handleClick);
        document.removeEventListener("keydown", this.handleKeydown);

        if (this.backdrop) {
            this.backdrop.remove();
            this.backdrop = null;
        }

        this.offcanvasElements.clear();
        this.activeOffcanvas = null;
        this.isInitialized = false;
    }
}
