import { OffcanvasStyles } from "../styles/OffcanvasStyles.js";

export class OffcanvasManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.offcanvasElements = new Map();
        this.activeOffcanvas = null;
        this.backdrop = null;
        this.isInitialized = false;
        this.offcanvasStyles = new OffcanvasStyles(marssel.styleManager);

        // Bind methods to preserve context
        this.handleClick = this.handleClick.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
    }

    init() {
        if (this.isInitialized) return;

        // Vérifie s'il y a au moins un trigger avec une requête plus efficace
        if (!document.querySelector("[data-offcanvas-target]")) return;

        this.offcanvasStyles.addBaseStyles();
        this.createBackdrop();
        this.initEvents();

        this.isInitialized = true;
    }

    createBackdrop() {
        this.backdrop = document.createElement("div");
        this.backdrop.className = "offcanvas-backdrop";
        this.backdrop.style.display = "none"; // Caché par défaut
        document.body.appendChild(this.backdrop);
    }

    initEvents() {
        // Utilisation de la délégation d'événements pour optimiser les performances
        document.addEventListener("click", this.handleClick);
        document.addEventListener("keydown", this.handleKeydown);
    }

    handleClick(event) {
        const { target } = event;

        // Gestion de l'ouverture
        const trigger = target.closest("[data-offcanvas-target]");
        if (trigger) {
            const targetId = trigger.getAttribute("data-offcanvas-target");
            const lockScroll =
                trigger.getAttribute("data-offcanvas-lock-scroll") !== "false";

            this.show(targetId, lockScroll);
            event.preventDefault();
            return;
        }

        // Gestion de la fermeture
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
     * Affiche un offcanvas
     * @param {string} id - L'identifiant de l'offcanvas
     * @param {boolean} lockScroll - Si true, verrouille le défilement de la page
     * @returns {boolean} - True si l'offcanvas a été affiché avec succès
     */
    show(id, lockScroll = true) {
        const offcanvas = this.getOffcanvasElement(id);
        if (!offcanvas) return false;

        // Cacher l'offcanvas actif s'il y en a un
        if (this.activeOffcanvas && this.activeOffcanvas !== id) {
            this.hideActive();
        }

        // Éviter de réafficher le même offcanvas
        if (this.activeOffcanvas === id) return true;

        this.setActiveOffcanvas(id, offcanvas, lockScroll);
        this.showElements(offcanvas, lockScroll);
        this.dispatchEvent(offcanvas, "offcanvas:shown");

        return true;
    }

    /**
     * Cache l'offcanvas actif
     * @returns {boolean} - True si un offcanvas a été caché
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
     * Méthodes utilitaires privées
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
        // Utilisation de requestAnimationFrame pour une animation plus fluide
        requestAnimationFrame(() => {
            offcanvas.classList.add("show");
            this.backdrop.style.display = "block";
            // Force reflow pour s'assurer que display: block est appliqué
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

        // Cacher le backdrop après la transition (optimisation)
        setTimeout(() => {
            if (!this.backdrop.classList.contains("show")) {
                this.backdrop.style.display = "none";
            }
        }, 300); // Durée de transition CSS

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
            })
        );
    }

    /**
     * Crée un nouvel offcanvas avec validation améliorée
     * @param {Object} options - Options de configuration
     * @returns {HTMLElement|null} - L'élément créé ou null en cas d'erreur
     */
    create({ id, title = "", content = "", position = "start" } = {}) {
        // Validation des paramètres
        if (!id || typeof id !== "string") {
            console.error(
                "L'ID de l'offcanvas est requis et doit être une chaîne."
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
                `Position invalide: ${position}. Utilisation de 'start' par défaut.`
            );
            position = "start";
        }

        const offcanvas = this.createOffcanvasElement(
            id,
            title,
            content,
            position
        );
        document.body.appendChild(offcanvas);

        return offcanvas;
    }

    createOffcanvasElement(id, title, content, position) {
        const offcanvas = document.createElement("div");
        offcanvas.id = id;
        offcanvas.className = `offcanvas offcanvas-${position}`;

        // Utilisation de template string avec échappement pour éviter les injections XSS
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
     * Met à jour le contenu d'un offcanvas existant
     * @param {string} id - Identifiant de l'offcanvas
     * @param {Object} options - Options à mettre à jour
     * @returns {boolean} - True si la mise à jour a réussi
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
     * Supprime un offcanvas du DOM
     * @param {string} id - Identifiant de l'offcanvas
     * @returns {boolean} - True si la suppression a réussi
     */
    remove(id) {
        const offcanvas = this.getOffcanvasElement(id);
        if (!offcanvas) return false;

        // Si l'offcanvas est actif, le cacher d'abord
        if (this.activeOffcanvas === id) {
            this.hideActive();
        }

        offcanvas.remove();
        this.offcanvasElements.delete(id);

        return true;
    }

    /**
     * Utilitaire pour échapper le HTML et éviter les injections XSS
     * @param {string} text - Texte à échapper
     * @returns {string} - Texte échappé
     */
    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Nettoie les event listeners (à appeler lors de la destruction)
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
