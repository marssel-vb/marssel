import { PopoverStyles } from "../styles/PopoverStyles.js";
import { LRUCache } from "../utils/LRUCache.js";

export class PopoverManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.activePopover = null;
        this.popovers = new LRUCache(50);
        this.popoverStyles = new PopoverStyles(marssel.styleManager);
        this.documentElement = document.documentElement;
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
        this.handleTriggerClick = this.handleTriggerClick.bind(this);
    }

    init() {
        const triggers = document.querySelectorAll("[data-popover-trigger]");
        if (!triggers.length) return;

        this.popoverStyles.initializeStyles();
        this.setupTriggers(triggers);

        document.addEventListener("click", this.handleOutsideClick, {
            passive: true,
        });
    }

    setupTriggers(triggers) {
        triggers.forEach((trigger) => {
            const targetId = trigger.getAttribute("data-popover-trigger");
            const popover = document.getElementById(targetId);

            if (popover) {
                this.registerPopover(trigger, popover);
            }
        });
    }

    registerPopover(trigger, element) {
        const direction =
            element.getAttribute("data-popover-direction") || "bottom";

        element.classList.add(`popover-${direction}`);

        const popoverData = {
            trigger,
            element,
            direction,
        };

        this.popovers.set(trigger, popoverData);

        trigger.addEventListener("click", this.handleTriggerClick, {
            passive: false,
        });
    }

    handleTriggerClick(event) {
        event.stopPropagation();
        event.preventDefault();
        this.togglePopover(event.currentTarget);
    }

    handleOutsideClick(event) {
        if (!this.activePopover) return;

        const { trigger, element } = this.activePopover;
        const isClickOutside =
            !trigger.contains(event.target) && !element.contains(event.target);

        if (isClickOutside) {
            this.closeActivePopover();
        }
    }

    togglePopover(trigger) {
        const popoverData = this.popovers.get(trigger);
        if (!popoverData) return;

        if (this.activePopover && this.activePopover !== popoverData) {
            this.closeActivePopover();
        }

        if (this.activePopover === popoverData) {
            this.closeActivePopover();
        } else {
            this.openPopover(popoverData);
        }
    }

    openPopover(popoverData) {
        const { trigger, element, direction } = popoverData;

        this.positionPopover(trigger, element, direction);

        requestAnimationFrame(() => {
            element.classList.add("popover-visible");
        });

        this.activePopover = popoverData;
    }

    closeActivePopover() {
        if (!this.activePopover) return;

        this.activePopover.element.classList.remove("popover-visible");
        this.activePopover = null;
    }

    positionPopover(trigger, popover, direction) {
        const triggerRect = trigger.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const position = this.calculatePosition(
            triggerRect,
            popoverRect,
            direction,
            windowWidth,
            windowHeight
        );

        this.applyPosition(popover, position);
    }

    calculatePosition(
        triggerRect,
        popoverRect,
        direction,
        windowWidth,
        windowHeight
    ) {
        const offset = 10;
        const positions = {
            bottom: {
                left:
                    triggerRect.left +
                    (triggerRect.width - popoverRect.width) / 2,
                top: triggerRect.bottom + offset,
            },
            top: {
                left:
                    triggerRect.left +
                    (triggerRect.width - popoverRect.width) / 2,
                top: triggerRect.top - popoverRect.height - offset,
            },
            left: {
                left: triggerRect.left - popoverRect.width - offset,
                top:
                    triggerRect.top +
                    (triggerRect.height - popoverRect.height) / 2,
            },
            right: {
                left: triggerRect.right + offset,
                top:
                    triggerRect.top +
                    (triggerRect.height - popoverRect.height) / 2,
            },
        };

        let { left, top } = positions[direction] || positions.bottom;

        left = Math.max(
            offset,
            Math.min(left, windowWidth - popoverRect.width - offset)
        );
        top = Math.max(
            offset,
            Math.min(top, windowHeight - popoverRect.height - offset)
        );

        return { left, top };
    }

    applyPosition(popover, { left, top }) {
        Object.assign(popover.style, {
            position: "fixed",
            left: `${left}px`,
            top: `${top}px`,
        });
    }

    destroy() {
        document.removeEventListener("click", this.handleOutsideClick);

        this.popovers.forEach(({ trigger }) => {
            trigger.removeEventListener("click", this.handleTriggerClick);
        });

        this.popovers.clear();
        this.activePopover = null;
    }
}
