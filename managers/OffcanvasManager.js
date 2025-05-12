import { OffcanvasStyles } from "../styles/OffcanvasStyles.js";

export class OffcanvasManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.offcanvasElements = new Map();
        this.activeOffcanvas = null;
        this.backdrop = null;
        this.isInitialized = false;
        this.offcanvasStyles = new OffcanvasStyles(marssel.styleManager);
    }

    init() {
        if (this.isInitialized) return;

        // Vérifie s'il y a au moins un trigger
        const hasOffcanvasTrigger = document.querySelector(
            "[data-offcanvas-target]"
        );
        if (!hasOffcanvasTrigger) return;

        // Add default styles
        this.offcanvasStyles.addBaseStyles();

        // Création du backdrop
        this.backdrop = document.createElement("div");
        this.backdrop.className = "offcanvas-backdrop";
        document.body.appendChild(this.backdrop);

        // Initialiser les événements
        this.initEvents();

        this.isInitialized = true;
    }

    initEvents() {
        // Événements d'ouverture par attributs data-offcanvas
        document.addEventListener("click", (event) => {
            const trigger = event.target.closest("[data-offcanvas-target]");
            if (trigger) {
                const targetId = trigger.getAttribute("data-offcanvas-target");
                const lockScroll =
                    trigger.getAttribute("data-offcanvas-lock-scroll") !==
                    "false";

                this.show(targetId, lockScroll);
                event.preventDefault();
            }
        });

        // Événements de fermeture
        document.addEventListener("click", (event) => {
            // Fermeture par le bouton
            if (event.target.closest(".offcanvas-close")) {
                this.hideActive();
                event.preventDefault();
            }

            // Fermeture par le backdrop
            if (event.target === this.backdrop && this.activeOffcanvas) {
                this.hideActive();
                event.preventDefault();
            }
        });

        // Fermeture par la touche Echap
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && this.activeOffcanvas) {
                this.hideActive();
            }
        });
    }

    /**
     * Affiche un offcanvas
     * @param {string} id - L'identifiant de l'offcanvas
     * @param {boolean} lockScroll - Si true, verrouille le défilement de la page
     */
    show(id, lockScroll = true) {
        const offcanvas = document.getElementById(id);
        if (!offcanvas || !offcanvas.classList.contains("offcanvas")) {
            console.error(`L'offcanvas avec l'ID ${id} n'existe pas.`);
            return;
        }

        // Cacher l'offcanvas actif s'il y en a un
        if (this.activeOffcanvas) {
            this.hideActive();
        }

        // Stocker les informations de l'offcanvas
        this.offcanvasElements.set(id, { element: offcanvas, lockScroll });
        this.activeOffcanvas = id;

        // Afficher l'offcanvas et le backdrop
        offcanvas.classList.add("show");
        this.backdrop.classList.add("show");

        // Verrouiller le défilement si nécessaire
        if (lockScroll) {
            document.body.classList.add("offcanvas-lock-scroll");
        }

        // Déclencher l'événement d'ouverture
        offcanvas.dispatchEvent(new CustomEvent("offcanvas:shown"));
    }

    /**
     * Cache l'offcanvas actif
     */
    hideActive() {
        if (!this.activeOffcanvas) return;

        const offcanvasInfo = this.offcanvasElements.get(this.activeOffcanvas);
        if (!offcanvasInfo) return;

        const { element, lockScroll } = offcanvasInfo;

        // Cacher l'offcanvas et le backdrop
        element.classList.remove("show");
        this.backdrop.classList.remove("show");

        // Déverrouiller le défilement si nécessaire
        if (lockScroll) {
            document.body.classList.remove("offcanvas-lock-scroll");
        }

        // Déclencher l'événement de fermeture
        element.dispatchEvent(new CustomEvent("offcanvas:hidden"));

        // Réinitialiser les variables
        this.activeOffcanvas = null;
    }

    /**
     * Crée un nouvel offcanvas
     * @param {Object} options - Options de configuration
     * @param {string} options.id - Identifiant de l'offcanvas
     * @param {string} options.title - Titre de l'offcanvas
     * @param {string} options.content - Contenu HTML de l'offcanvas
     * @param {string} options.position - Position (start, end, top, bottom)
     * @param {boolean} options.backdrop - Si true, affiche un backdrop
     */
    create({ id, title = "", content = "", position = "start" }) {
        // Vérifier si l'ID existe déjà
        if (document.getElementById(id)) {
            console.error(`Un élément avec l'ID ${id} existe déjà.`);
            return;
        }

        // Créer l'élément offcanvas
        const offcanvas = document.createElement("div");
        offcanvas.id = id;
        offcanvas.className = `offcanvas offcanvas-${position}`;

        // Structure interne
        offcanvas.innerHTML = `
            <div class="offcanvas-header">
                <h5 class="offcanvas-title">${title}</h5>
                <button type="button" class="offcanvas-close" aria-label="Close">&times;</button>
            </div>
            <div class="offcanvas-body">
                ${content}
            </div>
        `;

        // Ajouter au DOM
        document.body.appendChild(offcanvas);

        return offcanvas;
    }

    /**
     * Met à jour le contenu d'un offcanvas existant
     * @param {string} id - Identifiant de l'offcanvas
     * @param {Object} options - Options à mettre à jour
     */
    update(id, { title, content } = {}) {
        const offcanvas = document.getElementById(id);
        if (!offcanvas || !offcanvas.classList.contains("offcanvas")) {
            console.error(`L'offcanvas avec l'ID ${id} n'existe pas.`);
            return;
        }

        if (title !== undefined) {
            const titleElement = offcanvas.querySelector(".offcanvas-title");
            if (titleElement) {
                titleElement.textContent = title;
            }
        }

        if (content !== undefined) {
            const bodyElement = offcanvas.querySelector(".offcanvas-body");
            if (bodyElement) {
                bodyElement.innerHTML = content;
            }
        }
    }

    /**
     * Supprime un offcanvas du DOM
     * @param {string} id - Identifiant de l'offcanvas
     */
    remove(id) {
        const offcanvas = document.getElementById(id);
        if (!offcanvas || !offcanvas.classList.contains("offcanvas")) {
            console.error(`L'offcanvas avec l'ID ${id} n'existe pas.`);
            return;
        }

        // Si l'offcanvas est actif, le cacher d'abord
        if (this.activeOffcanvas === id) {
            this.hideActive();
        }

        // Supprimer du DOM
        offcanvas.remove();
        this.offcanvasElements.delete(id);
    }
}
