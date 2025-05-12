// Grouping of managers
import * as Managers from "../managers/index.js";

// Utility constants
import {
    properties,
    breakpoints,
    containerMaxWidths,
    CLASS_REGEX,
    COLOR_REGEX,
} from "../utils/constants.js";

export class Marssel {
    constructor({ lazyload = false } = {}) {
        this.config = { lazyload };

        // List of managers to instantiate
        const managerList = [
            "FontManager",
            "IconManager",
            "StyleManager",
            "DomManager",
            "ModalManager",
            "ScrollspyManager",
            "ToastManager",
            "TooltipManager",
            "HeaderManager",
            "CarouselManager",
            "DropdownManager",
            "OffcanvasManager",
            "PopoverManager",
        ];

        // Instantiating managers dynamically
        for (const key of managerList) {
            const name = key.charAt(0).toLowerCase() + key.slice(1);
            this[name] =
                key === "StyleManager"
                    ? new Managers[key](this, this.config)
                    : new Managers[key](this);
        }

        this.init();
    }

    async init() {
        // Asynchronous initialization
        await this.fontManager.init();
        await this.iconManager.init();

        // Synchronous initialization
        this.styleManager.initializeStyleSheet();
        this.styleManager.addDefaultStyles();
        this.domManager.setupObservers();
        this.domManager.processAllElements();

        // Managers to be initialized
        const managersToInit = [
            "carouselManager",
            "modalManager",
            "popoverManager",
            "scrollspyManager",
            "toastManager",
            "tooltipManager",
            "headerManager",
            "dropdownManager",
            "offcanvasManager",
        ];

        for (const manager of managersToInit) {
            this[manager]?.init?.();
        }
    }

    // Exposition of constants
    static get properties() {
        return properties;
    }
    static get breakpoints() {
        return breakpoints;
    }
    static get containerMaxWidths() {
        return containerMaxWidths;
    }
    static get CLASS_REGEX() {
        return CLASS_REGEX;
    }
    static get COLOR_REGEX() {
        return COLOR_REGEX;
    }
}
