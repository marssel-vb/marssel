import { ToastStyles } from "../styles/ToastStyles.js";
import { LRUCache } from "../utils/LRUCache.js";

export class ToastManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.container = null;
        this.toasts = new LRUCache(20);
        this.counter = 0;
        this.toastStyle = new ToastStyles(marssel.styleManager);
        this.stylesApplied = false;
        this.config = {
            position: "top-right",
            duration: 5000,
            animationDuration: 300,
        };
        this.domCache = new WeakMap();
        // Map des groupes par position : { [position]: HTMLElement }
        this.positionGroups = new Map();
        this.bindGlobalMethods();
    }

    init() {
        this.createContainer();
    }

    createContainer() {
        if (this.container?.parentNode) return;

        this.container = document.createElement("div");
        this.container.className = "marssel-toast-container";
        document.body.appendChild(this.container);
    }

    /**
     * Retourne (ou crée) le sous-conteneur flex pour une position donnée.
     */
    getOrCreatePositionGroup(position) {
        if (this.positionGroups.has(position)) {
            return this.positionGroups.get(position);
        }

        const group = document.createElement("div");
        group.className = "marssel-toast-group";
        group.dataset.position = position;

        // Applique les styles de position + flex sur le groupe
        const positionStyles = this.toastStyle.getPositionStyles(
            position,
            this.config.position,
        );
        Object.assign(group.style, positionStyles);

        this.container.appendChild(group);
        this.positionGroups.set(position, group);
        return group;
    }

    /**
     * Supprime le groupe de position s'il est vide.
     */
    cleanupPositionGroup(position) {
        const group = this.positionGroups.get(position);
        if (group && group.children.length === 0) {
            group.remove();
            this.positionGroups.delete(position);
        }
    }

    bindGlobalMethods() {
        const toastMethods = {
            show: (message, options) => this.show(message, options),
            success: (message, options) =>
                this.show(message, { ...options, type: "success" }),
            error: (message, options) =>
                this.show(message, { ...options, type: "error" }),
            warning: (message, options) =>
                this.show(message, { ...options, type: "warning" }),
            info: (message, options) =>
                this.show(message, { ...options, type: "info" }),
            clear: () => this.clear(),
        };

        window.marsselToast = toastMethods;
    }

    show(message, options = {}) {
        this.createContainer();
        if (!this.stylesApplied) {
            this.toastStyle.applyStyles();
            this.stylesApplied = true;
        }

        const id = `toast-${++this.counter}`;
        const config = this.mergeOptions(options);

        const toast = this.createToastElement(id, message, config);
        this.setupToastBehavior(id, toast, config);

        return id;
    }

    mergeOptions(options) {
        return {
            position: options.position ?? this.config.position,
            duration: options.duration ?? this.config.duration,
            type: options.type ?? "",
            closable: options.closable ?? true,
            progress: options.progress ?? true,
            title: options.title ?? "",
            classes: options.classes ?? "",
            onClose: options.onClose ?? null,
        };
    }

    createToastElement(id, message, config) {
        const toast = document.createElement("div");
        toast.id = id;
        toast.className = this.buildToastClasses(config);
        toast.innerHTML = this.buildToastContent(message, config);

        // Insère dans le groupe de la position concernée
        const group = this.getOrCreatePositionGroup(config.position);
        group.appendChild(toast);

        this.toasts.set(id, {
            element: toast,
            position: config.position,
            timeout: null,
            onClose: config.onClose,
        });

        return toast;
    }

    buildToastClasses(config) {
        const classes = ["marssel-toast"];
        if (config.type) classes.push(`marssel-toast-${config.type}`);
        if (config.classes) classes.push(config.classes);
        return classes.join(" ");
    }

    buildToastContent(message, config) {
        const parts = [];

        if (config.title) {
            parts.push(
                `<div class="marssel-toast-title" style="font-weight: bold; margin-bottom: 0.5rem">${config.title}</div>`,
            );
        }

        parts.push(`<div class="marssel-toast-message">${message}</div>`);

        if (config.closable) {
            parts.push(
                `<button class="marssel-toast-close" aria-label="Close">&times;</button>`,
            );
        }

        if (config.progress && config.duration > 0) {
            parts.push(`<div class="marssel-toast-progress"></div>`);
        }

        return parts.join("");
    }

    setupToastBehavior(id, toast, config) {
        requestAnimationFrame(() => {
            toast.classList.add("visible");
        });

        this.setupProgressBar(toast, config);
        this.setupAutoRemoval(id, config);
        this.setupEventListeners(id, toast, config);
    }

    setupProgressBar(toast, config) {
        if (!config.progress || config.duration <= 0) return;

        const progressBar = toast.querySelector(".marssel-toast-progress");
        if (!progressBar) return;

        const duration = config.duration / 1000;
        progressBar.style.transition = `transform ${duration}s linear`;
        progressBar.style.transform = "scaleX(1)";

        requestAnimationFrame(() => {
            progressBar.style.transform = "scaleX(0)";
        });
    }

    setupAutoRemoval(id, config) {
        if (config.duration <= 0) return;

        const timeout = setTimeout(() => this.remove(id), config.duration);
        this.toasts.get(id).timeout = timeout;
    }

    setupEventListeners(id, toast, config) {
        const eventHandler = (e) =>
            this.handleToastEvents(e, id, toast, config);

        toast.addEventListener("click", eventHandler);
        toast.addEventListener("mouseenter", eventHandler);
        toast.addEventListener("mouseleave", eventHandler);

        // Stockage des handlers pour un nettoyage ultérieur
        this.domCache.set(toast, { eventHandler });
    }

    handleToastEvents(e, id, toast, config) {
        switch (e.type) {
            case "click":
                if (e.target.classList.contains("marssel-toast-close")) {
                    this.remove(id);
                }
                break;

            case "mouseenter":
                this.pauseProgress(id, toast, config);
                break;

            case "mouseleave":
                this.resumeProgress(id, toast, config);
                break;
        }
    }

    pauseProgress(id, toast, config) {
        if (!config.progress || config.duration <= 0) return;

        const progressBar = toast.querySelector(".marssel-toast-progress");
        if (!progressBar) return;

        progressBar.style.transition = "none";

        const toastData = this.toasts.get(id);
        if (toastData?.timeout) {
            clearTimeout(toastData.timeout);
            toastData.timeout = null;
        }
    }

    resumeProgress(id, toast, config) {
        if (!config.progress || config.duration <= 0) return;

        const progressBar = toast.querySelector(".marssel-toast-progress");
        if (!progressBar) return;

        const remainingTime = this.calculateRemainingTime(
            progressBar,
            config.duration,
        );

        progressBar.style.transition = `transform ${
            remainingTime / 1000
        }s linear`;
        progressBar.style.transform = "scaleX(0)";

        const timeout = setTimeout(() => this.remove(id), remainingTime);
        const toastData = this.toasts.get(id);
        if (toastData) {
            toastData.timeout = timeout;
        }
    }

    calculateRemainingTime(progressBar, duration) {
        try {
            const transform = getComputedStyle(progressBar).transform;
            const matrix = transform.match(/matrix.*\((.+)\)/);
            if (matrix) {
                const scaleX = parseFloat(matrix[1].split(", ")[0]);
                return Math.max(0, scaleX * duration);
            }
        } catch (error) {
            console.warn("Error calculating remaining time:", error);
        }
        return duration;
    }

    remove(id) {
        const toastData = this.toasts.get(id);
        if (!toastData) return;

        const { element, position, timeout, onClose } = toastData;

        if (timeout) {
            clearTimeout(timeout);
        }

        this.cleanupEventListeners(element);
        this.animateRemoval(element, () => {
            this.finalizeRemoval(id, element, position, onClose);
        });
    }

    cleanupEventListeners(element) {
        const cached = this.domCache.get(element);
        if (cached?.eventHandler) {
            element.removeEventListener("click", cached.eventHandler);
            element.removeEventListener("mouseenter", cached.eventHandler);
            element.removeEventListener("mouseleave", cached.eventHandler);
            this.domCache.delete(element);
        }
    }

    animateRemoval(element, callback) {
        element.classList.remove("visible");
        Object.assign(element.style, {
            opacity: "0",
            transform: "translateY(-10px)",
        });

        setTimeout(callback, this.config.animationDuration);
    }

    finalizeRemoval(id, element, position, onClose) {
        element.remove();
        this.toasts.delete(id);

        // Nettoie le groupe s'il est vide
        if (position) {
            this.cleanupPositionGroup(position);
        }

        if (typeof onClose === "function") {
            try {
                onClose();
            } catch (error) {
                console.error("Error in the onClose callback:", error);
            }
        }
    }

    clear() {
        for (const id of this.toasts.keys()) {
            this.remove(id);
        }
    }

    updatePosition(id, position) {
        const toastData = this.toasts.get(id);
        if (!toastData) return;

        const toast = toastData.element;
        const oldPosition = toastData.position;

        // Déplace le toast vers le nouveau groupe
        const newGroup = this.getOrCreatePositionGroup(position);
        newGroup.appendChild(toast);
        toastData.position = position;

        // Nettoie l'ancien groupe s'il est vide
        if (oldPosition) {
            this.cleanupPositionGroup(oldPosition);
        }
    }

    updateContent(id, options = {}) {
        const toastData = this.toasts.get(id);
        if (!toastData) return;

        const toast = toastData.element;
        const { message, title, type } = options;

        if (message) {
            this.updateMessage(toast, message);
        }

        if (title !== undefined) {
            this.updateTitle(toast, title);
        }

        if (type) {
            this.updateType(toast, type);
        }
    }

    updateMessage(toast, message) {
        const messageElement = toast.querySelector(".marssel-toast-message");
        if (messageElement) {
            messageElement.innerHTML = message;
        }
    }

    updateTitle(toast, title) {
        let titleElement = toast.querySelector(".marssel-toast-title");

        if (titleElement) {
            titleElement.innerHTML = title;
        } else if (title) {
            titleElement = this.createTitleElement(title);
            const messageElement = toast.querySelector(
                ".marssel-toast-message",
            );
            toast.insertBefore(
                titleElement,
                messageElement || toast.firstChild,
            );
        }
    }

    createTitleElement(title) {
        const titleElement = document.createElement("div");
        titleElement.className = "marssel-toast-title";
        Object.assign(titleElement.style, {
            fontWeight: "bold",
            marginBottom: "0.5rem",
        });
        titleElement.innerHTML = title;
        return titleElement;
    }

    updateType(toast, type) {
        const typeClasses = Object.keys(this.toastStyle.types || {}).map(
            (t) => `marssel-toast-${t}`,
        );

        toast.classList.remove(...typeClasses);

        if (this.toastStyle.types?.[type]) {
            toast.classList.add(`marssel-toast-${type}`);
        }
    }

    getActiveToasts() {
        return Array.from(this.toasts.keys());
    }

    destroy() {
        this.clear();
        if (this.container?.parentNode) {
            this.container.remove();
        }
        this.positionGroups.clear();
        if (window.marsselToast) {
            delete window.marsselToast;
        }
    }
}
