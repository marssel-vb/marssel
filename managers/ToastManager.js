import { ToastStyles } from "../styles/ToastStyles.js";

export class ToastManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.container = null;
        this.toasts = new Map();
        this.counter = 0;
        this.toastStyle = new ToastStyles(marssel.styleManager);
        this.defaultPosition = "top-right";
        this.defaultDuration = 5000; // 5 secondes
    }

    init() {
        const hasToast = document.querySelector("[data-popover-trigger]");
        if (!hasToast) return;

        this.createContainer();
        this.toastStyle.applyStyles();
        this.bindGlobalMethods();
    }

    createContainer() {
        this.container = document.createElement("div");
        this.container.className = "marssel-toast-container";
        document.body.appendChild(this.container);
    }

    bindGlobalMethods() {
        window.marsselToast = {
            show: this.show.bind(this),
            success: (message, options) =>
                this.show(message, { ...options, type: "success" }),
            error: (message, options) =>
                this.show(message, { ...options, type: "error" }),
            warning: (message, options) =>
                this.show(message, { ...options, type: "warning" }),
            info: (message, options) =>
                this.show(message, { ...options, type: "info" }),
            clear: this.clear.bind(this),
        };
    }

    show(message, options = {}) {
        const id = `toast-${++this.counter}`;
        const {
            position = this.defaultPosition,
            duration = this.defaultDuration,
            type = "",
            closable = true,
            progress = true,
            title = "",
            classes = "",
            onClose = null,
        } = options;

        // Créer l'élément toast
        const toast = document.createElement("div");
        toast.id = id;
        toast.className = `marssel-toast${
            type ? ` marssel-toast-${type}` : ""
        } ${classes}`;

        // Appliquer la position
        const positionStyles = this.toastStyle.getPositionStyles(
            position,
            this.defaultPosition
        );
        Object.entries(positionStyles).forEach(([prop, value]) => {
            toast.style[prop] = value;
        });

        // Construire le contenu
        let contentHTML = "";
        if (title) {
            contentHTML += `<div class="marssel-toast-title" style="font-weight: bold; margin-bottom: 0.5rem">${title}</div>`;
        }
        contentHTML += `<div class="marssel-toast-message">${message}</div>`;

        // Ajouter le bouton de fermeture si nécessaire
        if (closable) {
            contentHTML += `<button class="marssel-toast-close" aria-label="Close">&times;</button>`;
        }

        // Ajouter la barre de progression si nécessaire
        if (progress && duration > 0) {
            contentHTML += `<div class="marssel-toast-progress"></div>`;
        }

        toast.innerHTML = contentHTML;
        this.container.appendChild(toast);
        this.toasts.set(id, { element: toast, timeout: null, onClose });

        // Animation d'entrée
        setTimeout(() => {
            toast.classList.add("visible");
        }, 10);

        // Configurer la barre de progression
        if (progress && duration > 0) {
            const progressBar = toast.querySelector(".marssel-toast-progress");
            progressBar.style.transition = `transform ${
                duration / 1000
            }s linear`;
            progressBar.style.transform = "scaleX(1)";

            // Animation de la barre de progression
            setTimeout(() => {
                progressBar.style.transform = "scaleX(0)";
            }, 10);
        }

        // Configurer l'expiration du toast
        if (duration > 0) {
            const timeout = setTimeout(() => {
                this.remove(id);
            }, duration);
            this.toasts.get(id).timeout = timeout;
        }

        // Configurer les événements d'interaction
        toast.addEventListener("click", (e) => {
            if (e.target.classList.contains("marssel-toast-close")) {
                this.remove(id);
            }
        });

        // Pour permettre de mettre en pause l'expiration au survol
        toast.addEventListener("mouseenter", () => {
            if (progress && duration > 0) {
                const progressBar = toast.querySelector(
                    ".marssel-toast-progress"
                );
                progressBar.style.transition = "none";
                if (this.toasts.has(id) && this.toasts.get(id).timeout) {
                    clearTimeout(this.toasts.get(id).timeout);
                }
            }
        });

        toast.addEventListener("mouseleave", () => {
            if (progress && duration > 0) {
                const progressBar = toast.querySelector(
                    ".marssel-toast-progress"
                );
                const remainingTime =
                    parseFloat(
                        getComputedStyle(progressBar)
                            .transform.split(", ")[0]
                            .slice(7)
                    ) * duration;

                progressBar.style.transition = `transform ${
                    remainingTime / 1000
                }s linear`;
                progressBar.style.transform = "scaleX(0)";

                const timeout = setTimeout(() => {
                    this.remove(id);
                }, remainingTime);

                if (this.toasts.has(id)) {
                    this.toasts.get(id).timeout = timeout;
                }
            }
        });

        return id;
    }

    remove(id) {
        if (!this.toasts.has(id)) return;

        const { element, timeout, onClose } = this.toasts.get(id);

        // Nettoyer le timeout
        if (timeout) {
            clearTimeout(timeout);
        }

        // Animation de sortie
        element.classList.remove("visible");
        element.style.opacity = "0";
        element.style.transform = "translateY(-10px)";

        // Supprimer l'élément après l'animation
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.toasts.delete(id);

            // Exécuter le callback de fermeture si fourni
            if (typeof onClose === "function") {
                onClose();
            }
        }, 300);
    }

    clear() {
        // Supprimer tous les toasts actifs
        this.toasts.forEach((_, id) => {
            this.remove(id);
        });
    }

    // Méthode pour mettre à jour la position d'un toast existant
    updatePosition(id, position) {
        if (!this.toasts.has(id)) return;

        const toast = this.toasts.get(id).element;
        const positionStyles = this.toastStyle.getPositionStyles(
            position,
            this.defaultPosition
        );

        // Réinitialiser les propriétés de position existantes
        toast.style.top = "";
        toast.style.right = "";
        toast.style.bottom = "";
        toast.style.left = "";
        toast.style.transform = "";

        // Appliquer les nouvelles propriétés de position
        Object.entries(positionStyles).forEach(([prop, value]) => {
            toast.style[prop] = value;
        });
    }

    // Méthode pour mettre à jour le contenu d'un toast existant
    updateContent(id, options = {}) {
        if (!this.toasts.has(id)) return;

        const toast = this.toasts.get(id).element;
        const { message, title, type } = options;

        if (message) {
            const messageElement = toast.querySelector(
                ".marssel-toast-message"
            );
            if (messageElement) {
                messageElement.innerHTML = message;
            }
        }

        if (title) {
            let titleElement = toast.querySelector(".marssel-toast-title");
            if (titleElement) {
                titleElement.innerHTML = title;
            } else {
                titleElement = document.createElement("div");
                titleElement.className = "marssel-toast-title";
                titleElement.style.fontWeight = "bold";
                titleElement.style.marginBottom = "0.5rem";
                titleElement.innerHTML = title;

                const messageElement = toast.querySelector(
                    ".marssel-toast-message"
                );
                if (messageElement) {
                    toast.insertBefore(titleElement, messageElement);
                } else {
                    toast.appendChild(titleElement);
                }
            }
        }

        if (type) {
            // Supprimer les classes de type existantes
            Object.keys(this.toastStyle.types).forEach((t) => {
                toast.classList.remove(`marssel-toast-${t}`);
            });

            // Ajouter la nouvelle classe de type
            if (Object.keys(this.toastStyle.types).includes(type)) {
                toast.classList.add(`marssel-toast-${type}`);
            }
        }
    }
}
