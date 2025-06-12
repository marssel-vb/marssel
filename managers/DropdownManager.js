import { DropdownStyles } from "../styles/DropdownStyles.js";
import { breakpoints } from "../utils/constants.js";

export class DropdownManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.dropdowns = new Map();
        this.dropdownStyles = new DropdownStyles(marssel.styleManager);

        // Configuration par défaut
        this.defaultConfig = {
            position: "bottom-left",
            animation: "fade",
            closeOnClick: true,
            container: "parent",
        };

        // Breakpoints constants from constants.js
        this.breakpoints = this.parseBreakpoints(breakpoints);

        this.currentBreakpoint = this.getCurrentBreakpoint();

        // Bind methods once
        this.handleResize = this.handleResize.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
    }

    // Parse breakpoints from constants.js (convert "576px" to 576)
    parseBreakpoints(breakpointsObj) {
        const parsed = {};
        for (const [key, value] of Object.entries(breakpointsObj)) {
            parsed[key] = parseInt(value.replace("px", ""), 10);
        }
        return parsed;
    }

    init() {
        const dropdownElements = document.querySelectorAll(
            ".dropdown, .dropdown-fullwidth"
        );

        // Si aucun dropdown n'est trouvé, on s'arrête là sans ajouter les styles
        if (dropdownElements.length === 0) return;

        // Add default styles seulement s'il y a des dropdowns
        this.dropdownStyles.initializeStyles();

        // Initialize all dropdowns
        dropdownElements.forEach((dropdown) => {
            if (dropdown.classList.contains("dropdown-fullwidth")) {
                this.initializeFullwidthDropdown(dropdown);
            } else {
                this.initializeDropdown(dropdown);
            }
        });

        // Event listeners
        this.addEventListeners();
    }

    addEventListeners() {
        window.addEventListener("resize", this.handleResize);
        document.addEventListener("click", this.handleDocumentClick);
    }

    removeEventListeners() {
        window.removeEventListener("resize", this.handleResize);
        document.removeEventListener("click", this.handleDocumentClick);
    }

    initializeDropdown(dropdownElement) {
        const dropdownId = this.generateDropdownId(dropdownElement);
        const config = this.getDropdownConfig(dropdownElement);
        const { toggle, menu } = this.getDropdownElements(dropdownElement);

        if (!toggle || !menu) {
            console.warn(
                `Dropdown ${dropdownId}: missing toggle or menu element`
            );
            return;
        }

        this.addToggleListener(toggle, dropdownId);
        this.initializeSubmenu(dropdownElement);

        this.storeDropdown(dropdownId, {
            element: dropdownElement,
            config,
            isOpen: false,
            menu,
            toggle,
            isFullwidth: false,
        });
    }

    initializeFullwidthDropdown(dropdownElement) {
        const dropdownId = this.generateDropdownId(
            dropdownElement,
            "fullwidth"
        );
        const config = this.getDropdownConfig(dropdownElement);
        const toggle = dropdownElement.querySelector(".dropdown-toggle");
        const menu = dropdownElement.querySelector(".dropdown-menu-fullwidth");

        if (!toggle || !menu) {
            console.warn(
                `Fullwidth dropdown ${dropdownId}: missing toggle or menu element`
            );
            return;
        }

        this.addToggleListener(toggle, dropdownId);

        this.storeDropdown(dropdownId, {
            element: dropdownElement,
            config,
            isOpen: false,
            menu,
            toggle,
            isFullwidth: true,
        });
    }

    generateDropdownId(element, type = "") {
        if (element.id) return element.id;

        const id = `dropdown-${type ? type + "-" : ""}${
            this.dropdowns.size + 1
        }`;
        element.id = id;
        return id;
    }

    getDropdownConfig(element) {
        return {
            position: element.dataset.position || this.defaultConfig.position,
            animation:
                element.dataset.animation || this.defaultConfig.animation,
            closeOnClick: element.dataset.closeOnClick !== "false",
            container:
                element.dataset.container || this.defaultConfig.container,
        };
    }

    getDropdownElements(dropdownElement) {
        return {
            toggle: dropdownElement.querySelector(".dropdown-toggle"),
            menu: dropdownElement.querySelector(".dropdown-menu"),
        };
    }

    addToggleListener(toggle, dropdownId) {
        toggle.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleDropdown(dropdownId);
        });
    }

    storeDropdown(id, dropdownData) {
        this.dropdowns.set(id, dropdownData);
    }

    initializeSubmenu(dropdownElement) {
        const submenuToggles = dropdownElement.querySelectorAll(
            ".dropdown-submenu > a"
        );

        submenuToggles.forEach((toggle) => {
            toggle.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleSubmenuToggle(toggle);
            });
        });
    }

    handleSubmenuToggle(toggle) {
        const submenu = toggle.nextElementSibling;
        const parentItem = toggle.parentElement;
        const isActive = parentItem.classList.contains("active");

        // Close sibling submenus
        this.closeSiblingSubmenus(parentItem);

        // Toggle current submenu
        parentItem.classList.toggle("active", !isActive);
        if (submenu) {
            submenu.style.display = isActive ? "none" : "block";
        }
    }

    closeSiblingSubmenus(parentItem) {
        const siblings = parentItem.parentElement.children;

        Array.from(siblings).forEach((sibling) => {
            if (
                sibling !== parentItem &&
                sibling.classList.contains("active")
            ) {
                sibling.classList.remove("active");
                const siblingSubmenu = sibling.querySelector(".dropdown-menu");
                if (siblingSubmenu) {
                    siblingSubmenu.style.display = "none";
                }
            }
        });
    }

    toggleDropdown(dropdownId) {
        const dropdown = this.dropdowns.get(dropdownId);
        if (!dropdown?.menu) return;

        const { element, isOpen } = dropdown;

        // Close all other dropdowns first
        this.closeAllDropdowns(element);

        // Toggle current dropdown
        if (isOpen) {
            this.closeDropdown(dropdownId);
        } else {
            this.openDropdown(dropdownId);
        }
    }

    openDropdown(dropdownId) {
        const dropdown = this.dropdowns.get(dropdownId);
        if (!dropdown || dropdown.isOpen) return;

        const { element, menu } = dropdown;

        // Update visual state
        element.classList.add("active");
        menu.style.display = "block";

        // Position dropdown if needed
        this.positionDropdown(dropdownId);

        // Update stored state
        dropdown.isOpen = true;
    }

    closeDropdown(dropdownId) {
        const dropdown = this.dropdowns.get(dropdownId);
        if (!dropdown || !dropdown.isOpen) return;

        const { element, menu } = dropdown;

        // Update visual state
        element.classList.remove("active");
        menu.style.display = "none";

        // Update stored state
        dropdown.isOpen = false;
    }

    closeAllDropdowns(exceptElement = null) {
        this.dropdowns.forEach((dropdown, id) => {
            if (
                dropdown.isOpen &&
                dropdown.element !== exceptElement &&
                !dropdown.element.contains(exceptElement)
            ) {
                this.closeDropdown(id);
            }
        });
    }

    getCurrentBreakpoint() {
        const width = window.innerWidth;

        if (!this.breakpoints || typeof this.breakpoints !== "object") {
            console.warn("Breakpoints not defined, using default");
            return "md"; // valeur par défaut
        }

        // Order breakpoints from smallest to largest
        const sortedBreakpoints = Object.entries(this.breakpoints).sort(
            ([, a], [, b]) => a - b
        );

        for (let i = 0; i < sortedBreakpoints.length; i++) {
            const [name, minWidth] = sortedBreakpoints[i];
            if (width < minWidth) {
                return i === 0 ? name : sortedBreakpoints[i - 1][0];
            }
        }

        // If width is larger than all breakpoints, return the largest
        return sortedBreakpoints[sortedBreakpoints.length - 1][0];
    }

    handleResize() {
        const newBreakpoint = this.getCurrentBreakpoint();

        if (newBreakpoint !== this.currentBreakpoint) {
            this.currentBreakpoint = newBreakpoint;
            this.closeAllDropdowns();
        }
    }

    handleDocumentClick(e) {
        this.closeAllDropdowns(e.target);
    }

    updateDropdownConfig(dropdownId, newConfig) {
        const dropdown = this.dropdowns.get(dropdownId);
        if (!dropdown) return false;

        dropdown.config = { ...dropdown.config, ...newConfig };
        return true;
    }

    positionDropdown(dropdownId) {
        const dropdown = this.dropdowns.get(dropdownId);
        if (!dropdown?.isOpen || dropdown.isFullwidth) return;

        const { menu, config } = dropdown;

        // Reset positioning styles
        this.resetMenuPosition(menu);

        // Apply position based on config
        this.applyPosition(menu, config.position);
    }

    resetMenuPosition(menu) {
        const positions = ["top", "left", "right", "bottom"];
        positions.forEach((pos) => (menu.style[pos] = ""));
    }

    applyPosition(menu, position) {
        const positionMap = {
            "bottom-left": { top: "100%", left: "0" },
            "bottom-right": { top: "100%", right: "0" },
            "top-left": { bottom: "100%", left: "0" },
            "top-right": { bottom: "100%", right: "0" },
            "left-top": { right: "100%", top: "0" },
            "left-bottom": { right: "100%", bottom: "0" },
            "right-top": { left: "100%", top: "0" },
            "right-bottom": { left: "100%", bottom: "0" },
        };

        const styles = positionMap[position] || positionMap["bottom-left"];
        Object.assign(menu.style, styles);
    }

    // Public methods for external control
    getDropdown(dropdownId) {
        return this.dropdowns.get(dropdownId);
    }

    getAllDropdowns() {
        return Array.from(this.dropdowns.values());
    }

    getOpenDropdowns() {
        return Array.from(this.dropdowns.values()).filter(
            (dropdown) => dropdown.isOpen
        );
    }

    destroy() {
        this.removeEventListeners();
        this.closeAllDropdowns();
        this.dropdowns.clear();
    }
}
