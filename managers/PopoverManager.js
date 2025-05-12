import { PopoverStyles } from "../styles/PopoverStyles.js";

export class PopoverManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.activePopover = null;
        this.popovers = new Map();
        this.popoverStyles = new PopoverStyles(marssel.styleManager);
    }

    init() {
        // Vérifie s'il y a au moins un trigger
        const hasPopover = document.querySelector("[data-popover-trigger]");
        if (!hasPopover) return;

        // Add default styles
        this.popoverStyles.addBaseStyles();

        // Find all popover triggers and popover elements
        const triggers = document.querySelectorAll("[data-popover-trigger]");

        triggers.forEach((trigger) => {
            const targetId = trigger.getAttribute("data-popover-trigger");
            const popover = document.getElementById(targetId);

            if (popover) {
                this.registerPopover(trigger, popover);
            }
        });

        // Close popovers when clicking outside
        document.addEventListener("click", (event) => {
            if (
                this.activePopover &&
                !this.activePopover.trigger.contains(event.target) &&
                !this.activePopover.element.contains(event.target)
            ) {
                this.closeActivePopover();
            }
        });
    }

    registerPopover(trigger, element) {
        const direction =
            element.getAttribute("data-popover-direction") || "bottom";

        // Add direction class
        element.classList.add(`popover-${direction}`);

        this.popovers.set(trigger, {
            trigger,
            element,
            direction,
        });

        trigger.addEventListener("click", (event) => {
            event.stopPropagation();
            this.togglePopover(trigger);
        });
    }

    togglePopover(trigger) {
        // Close active popover if it's not the current one
        if (this.activePopover && this.activePopover.trigger !== trigger) {
            this.closeActivePopover();
        }

        const popoverData = this.popovers.get(trigger);
        if (!popoverData) return;

        if (this.activePopover === popoverData) {
            this.closeActivePopover();
        } else {
            this.openPopover(popoverData);
        }
    }

    openPopover(popoverData) {
        const { trigger, element, direction } = popoverData;

        // Position the popover
        this.positionPopover(trigger, element, direction);

        // Show the popover
        element.classList.add("popover-visible");
        this.activePopover = popoverData;
    }

    closeActivePopover() {
        if (this.activePopover) {
            this.activePopover.element.classList.remove("popover-visible");
            this.activePopover = null;
        }
    }

    positionPopover(trigger, popover, direction) {
        const triggerRect = trigger.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();

        let left, top;

        switch (direction) {
            case "bottom":
                left =
                    triggerRect.left +
                    triggerRect.width / 2 -
                    popoverRect.width / 2;
                top = triggerRect.bottom + 10;
                break;
            case "top":
                left =
                    triggerRect.left +
                    triggerRect.width / 2 -
                    popoverRect.width / 2;
                top = triggerRect.top - popoverRect.height - 10;
                break;
            case "left":
                left = triggerRect.left - popoverRect.width - 10;
                top =
                    triggerRect.top +
                    triggerRect.height / 2 -
                    popoverRect.height / 2;
                break;
            case "right":
                left = triggerRect.right + 10;
                top =
                    triggerRect.top +
                    triggerRect.height / 2 -
                    popoverRect.height / 2;
                break;
        }

        // Adjust for window boundaries
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Horizontal adjustment
        if (left < 0) left = 10;
        if (left + popoverRect.width > windowWidth)
            left = windowWidth - popoverRect.width - 10;

        // Vertical adjustment
        if (top < 0) top = 10;
        if (top + popoverRect.height > windowHeight)
            top = windowHeight - popoverRect.height - 10;

        popover.style.position = "fixed";
        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;
    }
}
