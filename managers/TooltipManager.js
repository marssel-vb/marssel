import { TooltipStyles } from "../styles/TooltipStyles.js";

export class TooltipManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.tooltips = new Map();
        this.activeTooltip = null;
        this.tooltipStyles = new TooltipStyles(marssel.styleManager);
        this.defaultOptions = {
            position: "top", // top, right, bottom, left
            offset: 8, // distance from trigger element in px
            theme: "dark", // dark, light
            customClass: "",
            animation: "fade", // fade, scale, none
            maxWidth: 300,
            hideOnEsc: true,
            hideOnOutsideClick: true,
            showDelay: 200,
            hideDelay: 200,
            zIndex: 1000,
        };
    }

    init() {
        const hasTooltip = document.querySelector("[data-tooltip]");
        if (!hasTooltip) return;

        // Add default styles
        this.tooltipStyles.addBaseStyles();

        // Set up event delegation on document for tooltips
        document.addEventListener("mouseover", this.handleMouseOver.bind(this));
        document.addEventListener("mouseout", this.handleMouseOut.bind(this));
        document.addEventListener("click", this.handleClick.bind(this));
        document.addEventListener("keydown", this.handleKeyDown.bind(this));

        // Find and initialize all tooltip elements on page load
        this.scanForTooltips();
    }

    scanForTooltips() {
        // Find all elements with tooltip attributes
        document.querySelectorAll("[data-tooltip]").forEach((element) => {
            this.registerTooltip(element);
        });
    }

    registerTooltip(element) {
        const content = element.getAttribute("data-tooltip");
        if (!content) return;

        // Set up options
        const options = {
            ...this.defaultOptions,
            position:
                element.getAttribute("data-tooltip-position") ||
                this.defaultOptions.position,
            theme:
                element.getAttribute("data-tooltip-theme") ||
                this.defaultOptions.theme,
            customClass:
                element.getAttribute("data-tooltip-class") ||
                this.defaultOptions.customClass,
            animation:
                element.getAttribute("data-tooltip-animation") ||
                this.defaultOptions.animation,
            maxWidth: parseInt(
                element.getAttribute("data-tooltip-max-width") ||
                    this.defaultOptions.maxWidth
            ),
        };

        // Store the element and its options
        this.tooltips.set(element, {
            content,
            options,
            tooltipElement: null,
            showTimeout: null,
            hideTimeout: null,
        });

        // Mark as tooltip trigger
        element.classList.add("tooltip-trigger");
    }

    handleMouseOver(event) {
        const trigger = this.findTooltipTrigger(event.target);
        if (!trigger) return;

        const tooltipData = this.tooltips.get(trigger);
        if (!tooltipData) return;

        // Clear any hide timeout
        if (tooltipData.hideTimeout) {
            clearTimeout(tooltipData.hideTimeout);
            tooltipData.hideTimeout = null;
        }

        // Set show timeout
        if (!tooltipData.showTimeout) {
            tooltipData.showTimeout = setTimeout(() => {
                this.showTooltip(trigger);
                tooltipData.showTimeout = null;
            }, tooltipData.options.showDelay);
        }
    }

    handleMouseOut(event) {
        const trigger = this.findTooltipTrigger(event.target);
        if (!trigger) return;

        const tooltipData = this.tooltips.get(trigger);
        if (!tooltipData) return;

        // Clear any show timeout
        if (tooltipData.showTimeout) {
            clearTimeout(tooltipData.showTimeout);
            tooltipData.showTimeout = null;
        }

        // Set hide timeout
        if (!tooltipData.hideTimeout) {
            tooltipData.hideTimeout = setTimeout(() => {
                this.hideTooltip(trigger);
                tooltipData.hideTimeout = null;
            }, tooltipData.options.hideDelay);
        }
    }

    handleClick(event) {
        // Hide tooltips when clicking outside them
        if (
            this.activeTooltip &&
            this.tooltips.get(this.activeTooltip).options.hideOnOutsideClick
        ) {
            const tooltipElement = this.tooltips.get(
                this.activeTooltip
            ).tooltipElement;

            // If clicking the trigger element, don't hide
            if (event.target === this.activeTooltip) return;

            // If clicking inside the tooltip, don't hide
            if (tooltipElement && tooltipElement.contains(event.target)) return;

            this.hideTooltip(this.activeTooltip);
        }
    }

    handleKeyDown(event) {
        // Hide on ESC key
        if (event.key === "Escape" && this.activeTooltip) {
            const tooltipData = this.tooltips.get(this.activeTooltip);
            if (tooltipData && tooltipData.options.hideOnEsc) {
                this.hideTooltip(this.activeTooltip);
            }
        }
    }

    findTooltipTrigger(element) {
        // Find the closest tooltip trigger element
        while (element && element !== document) {
            if (element.classList.contains("tooltip-trigger")) {
                return element;
            }
            element = element.parentElement;
        }
        return null;
    }

    showTooltip(triggerElement) {
        const tooltipData = this.tooltips.get(triggerElement);
        if (!tooltipData) return;

        // Hide any active tooltip
        if (this.activeTooltip && this.activeTooltip !== triggerElement) {
            this.hideTooltip(this.activeTooltip);
        }

        // Create tooltip element if it doesn't exist
        if (!tooltipData.tooltipElement) {
            tooltipData.tooltipElement = this.createTooltipElement(
                tooltipData.content,
                tooltipData.options
            );
            document.body.appendChild(tooltipData.tooltipElement);
        }

        // Position the tooltip
        this.positionTooltip(
            triggerElement,
            tooltipData.tooltipElement,
            tooltipData.options
        );

        // Activate tooltip
        tooltipData.tooltipElement.classList.add("active");
        this.activeTooltip = triggerElement;
    }

    hideTooltip(triggerElement) {
        const tooltipData = this.tooltips.get(triggerElement);
        if (!tooltipData || !tooltipData.tooltipElement) return;

        // Deactivate tooltip
        tooltipData.tooltipElement.classList.remove("active");
        this.activeTooltip = null;

        // Optional: remove the element from DOM after animation completes
        setTimeout(() => {
            if (
                tooltipData.tooltipElement &&
                tooltipData.tooltipElement.parentNode
            ) {
                tooltipData.tooltipElement.parentNode.removeChild(
                    tooltipData.tooltipElement
                );
                tooltipData.tooltipElement = null;
            }
        }, 300); // slightly longer than animation duration
    }

    createTooltipElement(content, options) {
        const tooltip = document.createElement("div");

        // Ne pas appliquer le thème si customClass est présent
        const themeClass =
            !options.customClass && ["dark", "light"].includes(options.theme)
                ? `tooltip--${options.theme}`
                : "";

        tooltip.className = `tooltip tooltip--${options.position} ${themeClass} tooltip--anim-${options.animation} ${options.customClass}`;
        tooltip.innerHTML = content;

        // Set custom styles as CSS variables
        tooltip.style.setProperty("--tooltip-z-index", options.zIndex);
        tooltip.style.setProperty(
            "--tooltip-max-width",
            `${options.maxWidth}px`
        );
        tooltip.style.setProperty("--tooltip-offset", `${options.offset}px`);

        return tooltip;
    }

    positionTooltip(triggerElement, tooltipElement, options) {
        const triggerRect = triggerElement.getBoundingClientRect();
        const tooltipRect = tooltipElement.getBoundingClientRect();
        const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft =
            window.pageXOffset || document.documentElement.scrollLeft;

        let top, left;

        // Calculate position based on option
        switch (options.position) {
            case "top":
                left =
                    scrollLeft +
                    triggerRect.left +
                    triggerRect.width / 2 -
                    tooltipRect.width / 2;
                top =
                    scrollTop +
                    triggerRect.top -
                    tooltipRect.height -
                    options.offset;
                break;

            case "bottom":
                left =
                    scrollLeft +
                    triggerRect.left +
                    triggerRect.width / 2 -
                    tooltipRect.width / 2;
                top = scrollTop + triggerRect.bottom + options.offset;
                break;

            case "left":
                left =
                    scrollLeft +
                    triggerRect.left -
                    tooltipRect.width -
                    options.offset;
                top =
                    scrollTop +
                    triggerRect.top +
                    triggerRect.height / 2 -
                    tooltipRect.height / 2;
                break;

            case "right":
                left = scrollLeft + triggerRect.right + options.offset;
                top =
                    scrollTop +
                    triggerRect.top +
                    triggerRect.height / 2 -
                    tooltipRect.height / 2;
                break;
        }

        // Apply responsive adjustments to ensure tooltip stays in viewport
        this.applyResponsiveAdjustments(tooltipElement, top, left, options);
    }

    applyResponsiveAdjustments(tooltipElement, top, left, options) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const tooltipRect = tooltipElement.getBoundingClientRect();
        const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft =
            window.pageXOffset || document.documentElement.scrollLeft;

        let adjustedTop = top;
        let adjustedLeft = left;
        let adjustedPosition = options.position;

        // Check if tooltip goes off screen horizontally
        if (left < scrollLeft) {
            // Off the left
            adjustedLeft = scrollLeft + 10;
        } else if (left + tooltipRect.width > scrollLeft + viewportWidth) {
            // Off the right
            adjustedLeft = scrollLeft + viewportWidth - tooltipRect.width - 10;
        }

        // Check if tooltip goes off screen vertically
        if (top < scrollTop) {
            // Off the top
            if (options.position === "top") {
                // Flip to bottom
                adjustedPosition = "bottom";
                const triggerBottom =
                    top + tooltipRect.height + 2 * options.offset;
                adjustedTop = triggerBottom;
            } else {
                adjustedTop = scrollTop + 10;
            }
        } else if (top + tooltipRect.height > scrollTop + viewportHeight) {
            // Off the bottom
            if (options.position === "bottom") {
                // Flip to top
                adjustedPosition = "top";
                const triggerTop =
                    top - tooltipRect.height - 2 * options.offset;
                adjustedTop = triggerTop;
            } else {
                adjustedTop =
                    scrollTop + viewportHeight - tooltipRect.height - 10;
            }
        }

        // Update tooltip position and class if needed
        tooltipElement.style.top = `${adjustedTop}px`;
        tooltipElement.style.left = `${adjustedLeft}px`;

        // If position changed, update classes
        if (adjustedPosition !== options.position) {
            tooltipElement.classList.remove(`tooltip--${options.position}`);
            tooltipElement.classList.add(`tooltip--${adjustedPosition}`);
        }
    }

    // Public API
    createTooltip(element, content, options = {}) {
        element.setAttribute("data-tooltip", content);

        // Set optional attributes
        if (options.position)
            element.setAttribute("data-tooltip-position", options.position);
        if (options.theme)
            element.setAttribute("data-tooltip-theme", options.theme);
        if (options.animation)
            element.setAttribute("data-tooltip-animation", options.animation);
        if (options.maxWidth)
            element.setAttribute("data-tooltip-max-width", options.maxWidth);

        this.registerTooltip(element);
        return element;
    }

    updateTooltip(element, content, options = {}) {
        if (!this.tooltips.has(element)) return;

        const tooltipData = this.tooltips.get(element);

        // Update content
        if (content) {
            tooltipData.content = content;
            element.setAttribute("data-tooltip", content);

            // Update tooltip element if active
            if (tooltipData.tooltipElement) {
                tooltipData.tooltipElement.innerHTML = content;
            }
        }

        // Update options
        if (options) {
            tooltipData.options = { ...tooltipData.options, ...options };

            // Update attributes
            if (options.position)
                element.setAttribute("data-tooltip-position", options.position);
            if (options.theme)
                element.setAttribute("data-tooltip-theme", options.theme);
            if (options.animation)
                element.setAttribute(
                    "data-tooltip-animation",
                    options.animation
                );
            if (options.maxWidth)
                element.setAttribute(
                    "data-tooltip-max-width",
                    options.maxWidth
                );

            // Recreate tooltip element if active
            if (tooltipData.tooltipElement) {
                this.hideTooltip(element);
                tooltipData.tooltipElement = null;
            }
        }
    }

    removeTooltip(element) {
        if (!this.tooltips.has(element)) return;

        // Hide tooltip if active
        if (this.activeTooltip === element) {
            this.hideTooltip(element);
        }

        // Remove data
        this.tooltips.delete(element);

        // Remove attributes
        element.removeAttribute("data-tooltip");
        element.removeAttribute("data-tooltip-position");
        element.removeAttribute("data-tooltip-theme");
        element.removeAttribute("data-tooltip-animation");
        element.removeAttribute("data-tooltip-max-width");

        // Remove trigger class
        element.classList.remove("tooltip-trigger");
    }
}
