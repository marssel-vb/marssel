import { PopoverStyles } from "../styles/PopoverStyles.js";
import { LRUCache } from "../utils/LRUCache.js";

export class PopoverManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.activePopover = null;
        this.popovers = new LRUCache(50);
        this.popoverStyles = new PopoverStyles(marssel.styleManager);

        // Cache DOM elements
        this.documentElement = document.documentElement;

        // Bind methods to preserve context
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
        this.handleTriggerClick = this.handleTriggerClick.bind(this);
    }

    init() {
        // Early return with cached query
        const triggers = document.querySelectorAll("[data-popover-trigger]");
        if (!triggers.length) return;

        // Add default styles once
        this.popoverStyles.initializeStyles();

        // Process all triggers
        this.setupTriggers(triggers);

        // Single event listener for outside clicks (event delegation)
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

        // Add direction class
        element.classList.add(`popover-${direction}`);

        // Store popover data
        const popoverData = {
            trigger,
            element,
            direction,
        };

        this.popovers.set(trigger, popoverData);

        // Add optimized event listener
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

        // Close different active popover
        if (this.activePopover && this.activePopover !== popoverData) {
            this.closeActivePopover();
        }

        // Toggle current popover
        if (this.activePopover === popoverData) {
            this.closeActivePopover();
        } else {
            this.openPopover(popoverData);
        }
    }

    openPopover(popoverData) {
        const { trigger, element, direction } = popoverData;

        // Position first, then show (prevents layout thrashing)
        this.positionPopover(trigger, element, direction);

        // Use requestAnimationFrame for smooth animation
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
        // Cache rectangles calculation
        const triggerRect = trigger.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();

        // Cache window dimensions
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const position = this.calculatePosition(
            triggerRect,
            popoverRect,
            direction,
            windowWidth,
            windowHeight
        );

        // Batch DOM updates
        this.applyPosition(popover, position);
    }

    calculatePosition(
        triggerRect,
        popoverRect,
        direction,
        windowWidth,
        windowHeight
    ) {
        const offset = 10; // Magic number extracted as constant
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

        // Apply boundary constraints
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
        // Batch style updates
        Object.assign(popover.style, {
            position: "fixed",
            left: `${left}px`,
            top: `${top}px`,
        });
    }

    // Cleanup method for better memory management
    destroy() {
        document.removeEventListener("click", this.handleOutsideClick);

        // Clean up all trigger listeners
        this.popovers.forEach(({ trigger }) => {
            trigger.removeEventListener("click", this.handleTriggerClick);
        });

        this.popovers.clear();
        this.activePopover = null;
    }
}
