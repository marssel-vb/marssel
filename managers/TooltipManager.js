import { TooltipStyles } from "../styles/TooltipStyles.js";
import { LRUCache } from "../utils/LRUCache.js";

export class TooltipManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.tooltips = new LRUCache(100);
        this.activeTooltip = null;
        this.tooltipStyles = new TooltipStyles(marssel.styleManager);
        this.defaultOptions = Object.freeze({
            position: "top",
            offset: 8,
            theme: "dark",
            customClass: "",
            animation: "fade",
            maxWidth: 300,
            hideOnEsc: true,
            hideOnOutsideClick: true,
            showDelay: 200,
            hideDelay: 200,
            zIndex: 1000,
        });
        this.selectors = {
            tooltipTrigger: "[data-tooltip]",
            tooltipTriggerClass: "tooltip-trigger",
        };
        this.debouncedMouseOver = this.debounce(
            this.handleMouseOver.bind(this),
            50,
        );
        this.debouncedMouseOut = this.debounce(
            this.handleMouseOut.bind(this),
            50,
        );
        this.boundHandleClick = this.handleClick.bind(this);
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleScroll = this.handleScroll.bind(this);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    init() {
        if (!document.querySelector(this.selectors.tooltipTrigger)) return;

        this.tooltipStyles.initializeStyles();
        this.setupEventListeners();
        this.scanForTooltips();
    }

    setupEventListeners() {
        const options = { passive: true };
        const scrollOptions = { passive: true, capture: true };

        document.addEventListener(
            "mouseover",
            this.debouncedMouseOver,
            options,
        );
        document.addEventListener("mouseout", this.debouncedMouseOut, options);
        document.addEventListener("click", this.boundHandleClick, options);
        document.addEventListener("keydown", this.boundHandleKeyDown, options);
        document.addEventListener(
            "scroll",
            this.boundHandleScroll,
            scrollOptions,
        );
    }

    scanForTooltips() {
        const elements = document.querySelectorAll(
            this.selectors.tooltipTrigger,
        );
        if (elements.length === 0) return;

        this.processBatch(Array.from(elements), 0, 50);
    }

    processBatch(elements, startIndex, batchSize) {
        const endIndex = Math.min(startIndex + batchSize, elements.length);

        for (let i = startIndex; i < endIndex; i++) {
            this.registerTooltip(elements[i]);
        }

        if (endIndex < elements.length) {
            requestAnimationFrame(() => {
                this.processBatch(elements, endIndex, batchSize);
            });
        }
    }

    registerTooltip(element) {
        const content = element.getAttribute("data-tooltip");
        if (!content?.trim()) return;

        const options = this.buildOptions(element);

        this.tooltips.set(element, {
            content: content.trim(),
            options,
            tooltipElement: null,
            showTimeout: null,
            hideTimeout: null,
        });

        element.classList.add(this.selectors.tooltipTriggerClass);
    }

    buildOptions(element) {
        const attributes = {
            position: element.getAttribute("data-tooltip-position"),
            theme: element.getAttribute("data-tooltip-theme"),
            customClass: element.getAttribute("data-tooltip-class"),
            animation: element.getAttribute("data-tooltip-animation"),
            maxWidth: element.getAttribute("data-tooltip-max-width"),
        };

        return {
            ...this.defaultOptions,
            position: attributes.position || this.defaultOptions.position,
            theme: attributes.theme || this.defaultOptions.theme,
            customClass:
                attributes.customClass || this.defaultOptions.customClass,
            animation: attributes.animation || this.defaultOptions.animation,
            maxWidth: attributes.maxWidth
                ? parseInt(attributes.maxWidth, 10)
                : this.defaultOptions.maxWidth,
        };
    }

    handleMouseOver(event) {
        const trigger = this.findTooltipTrigger(event.target);
        if (!trigger) return;

        const tooltipData = this.tooltips.get(trigger);
        if (!tooltipData) return;

        this.clearTimeout(tooltipData, "hideTimeout");
        this.setShowTimeout(trigger, tooltipData);
    }

    handleMouseOut(event) {
        const trigger = this.findTooltipTrigger(event.target);
        if (!trigger) return;

        const tooltipData = this.tooltips.get(trigger);
        if (!tooltipData) return;

        this.clearTimeout(tooltipData, "showTimeout");
        this.setHideTimeout(trigger, tooltipData);
    }

    clearTimeout(tooltipData, timeoutType) {
        if (tooltipData[timeoutType]) {
            clearTimeout(tooltipData[timeoutType]);
            tooltipData[timeoutType] = null;
        }
    }

    setShowTimeout(trigger, tooltipData) {
        if (!tooltipData.showTimeout) {
            tooltipData.showTimeout = setTimeout(() => {
                this.showTooltip(trigger);
                tooltipData.showTimeout = null;
            }, tooltipData.options.showDelay);
        }
    }

    setHideTimeout(trigger, tooltipData) {
        if (!tooltipData.hideTimeout) {
            tooltipData.hideTimeout = setTimeout(() => {
                this.hideTooltip(trigger);
                tooltipData.hideTimeout = null;
            }, tooltipData.options.hideDelay);
        }
    }

    handleClick(event) {
        if (!this.activeTooltip) return;

        const tooltipData = this.tooltips.get(this.activeTooltip);
        if (!tooltipData?.options.hideOnOutsideClick) return;

        const { target } = event;
        const { tooltipElement } = tooltipData;

        if (target === this.activeTooltip || tooltipElement?.contains(target)) {
            return;
        }

        this.hideTooltip(this.activeTooltip);
    }

    handleKeyDown(event) {
        if (event.key !== "Escape" || !this.activeTooltip) return;

        const tooltipData = this.tooltips.get(this.activeTooltip);
        if (tooltipData?.options.hideOnEsc) {
            this.hideTooltip(this.activeTooltip);
        }
    }

    handleScroll() {
        if (this.activeTooltip) {
            this.hideTooltip(this.activeTooltip);
        }
    }

    findTooltipTrigger(element) {
        let currentElement = element;
        while (currentElement && currentElement !== document.documentElement) {
            if (
                currentElement.classList?.contains(
                    this.selectors.tooltipTriggerClass,
                )
            ) {
                return currentElement;
            }
            currentElement = currentElement.parentElement;
        }
        return null;
    }

    showTooltip(triggerElement) {
        const tooltipData = this.tooltips.get(triggerElement);
        if (!tooltipData) return;

        if (this.activeTooltip && this.activeTooltip !== triggerElement) {
            this.hideTooltip(this.activeTooltip);
        }

        this.ensureTooltipElement(tooltipData);
        this.positionTooltip(
            triggerElement,
            tooltipData.tooltipElement,
            tooltipData.options,
        );

        requestAnimationFrame(() => {
            tooltipData.tooltipElement.classList.add("active");
        });

        this.activeTooltip = triggerElement;
    }

    ensureTooltipElement(tooltipData) {
        if (!tooltipData.tooltipElement) {
            tooltipData.tooltipElement = this.createTooltipElement(
                tooltipData.content,
                tooltipData.options,
            );
            document.body.appendChild(tooltipData.tooltipElement);
        }
    }

    hideTooltip(triggerElement) {
        const tooltipData = this.tooltips.get(triggerElement);
        if (!tooltipData?.tooltipElement) return;

        tooltipData.tooltipElement.classList.remove("active");
        this.activeTooltip = null;
        this.scheduleCleanup(tooltipData);
    }

    scheduleCleanup(tooltipData) {
        setTimeout(() => {
            if (tooltipData.tooltipElement?.parentNode) {
                tooltipData.tooltipElement.remove();
                tooltipData.tooltipElement = null;
            }
        }, 300);
    }

    createTooltipElement(content, options) {
        const tooltip = document.createElement("div");
        const classes = this.buildTooltipClasses(options);
        tooltip.className = classes;
        tooltip.innerHTML = content;

        this.applyTooltipStyles(tooltip, options);

        return tooltip;
    }

    buildTooltipClasses(options) {
        const classes = ["tooltip", `tooltip--${options.position}`];

        if (!options.customClass && ["dark", "light"].includes(options.theme)) {
            classes.push(`tooltip--${options.theme}`);
        }

        classes.push(`tooltip--anim-${options.animation}`);

        if (options.customClass) {
            classes.push(options.customClass);
        }

        return classes.join(" ");
    }

    applyTooltipStyles(tooltip, options) {
        const styles = {
            "--tooltip-z-index": options.zIndex,
            "--tooltip-max-width": `${options.maxWidth}px`,
            "--tooltip-offset": `${options.offset}px`,
        };

        Object.entries(styles).forEach(([property, value]) => {
            tooltip.style.setProperty(property, value);
        });
    }

    positionTooltip(triggerElement, tooltipElement, options) {
        const triggerRect = triggerElement.getBoundingClientRect();
        const tooltipRect = tooltipElement.getBoundingClientRect();
        const scroll = {
            top: window.pageYOffset || document.documentElement.scrollTop,
            left: window.pageXOffset || document.documentElement.scrollLeft,
        };

        const position = this.calculatePosition(
            triggerRect,
            tooltipRect,
            scroll,
            options,
        );
        this.applyResponsiveAdjustments(
            tooltipElement,
            position.top,
            position.left,
            options,
        );
    }

    calculatePosition(triggerRect, tooltipRect, scroll, options) {
        const positions = {
            top: {
                left:
                    scroll.left +
                    triggerRect.left +
                    triggerRect.width / 2 -
                    tooltipRect.width / 2,
                top:
                    scroll.top +
                    triggerRect.top -
                    tooltipRect.height -
                    options.offset,
            },
            bottom: {
                left:
                    scroll.left +
                    triggerRect.left +
                    triggerRect.width / 2 -
                    tooltipRect.width / 2,
                top: scroll.top + triggerRect.bottom + options.offset,
            },
            left: {
                left:
                    scroll.left +
                    triggerRect.left -
                    tooltipRect.width -
                    options.offset,
                top:
                    scroll.top +
                    triggerRect.top +
                    triggerRect.height / 2 -
                    tooltipRect.height / 2,
            },
            right: {
                left: scroll.left + triggerRect.right + options.offset,
                top:
                    scroll.top +
                    triggerRect.top +
                    triggerRect.height / 2 -
                    tooltipRect.height / 2,
            },
        };

        return positions[options.position] || positions.top;
    }

    applyResponsiveAdjustments(tooltipElement, top, left, options) {
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
        };

        const scroll = {
            top: window.pageYOffset || document.documentElement.scrollTop,
            left: window.pageXOffset || document.documentElement.scrollLeft,
        };

        const tooltipRect = tooltipElement.getBoundingClientRect();
        const margin = 10;

        let adjustedTop = top;
        let adjustedLeft = left;
        let adjustedPosition = options.position;

        adjustedLeft = this.adjustHorizontalPosition(
            left,
            tooltipRect.width,
            scroll.left,
            viewport.width,
            margin,
        );

        const verticalAdjustment = this.adjustVerticalPosition(
            top,
            tooltipRect.height,
            scroll.top,
            viewport.height,
            margin,
            options,
        );

        adjustedTop = verticalAdjustment.top;
        adjustedPosition = verticalAdjustment.position;

        this.applyPositionChanges(
            tooltipElement,
            adjustedTop,
            adjustedLeft,
            adjustedPosition,
            options.position,
        );
    }

    adjustHorizontalPosition(
        left,
        tooltipWidth,
        scrollLeft,
        viewportWidth,
        margin,
    ) {
        if (left < scrollLeft) {
            return scrollLeft + margin;
        }
        if (left + tooltipWidth > scrollLeft + viewportWidth) {
            return scrollLeft + viewportWidth - tooltipWidth - margin;
        }
        return left;
    }

    adjustVerticalPosition(
        top,
        tooltipHeight,
        scrollTop,
        viewportHeight,
        margin,
        options,
    ) {
        let adjustedTop = top;
        let adjustedPosition = options.position;

        if (top < scrollTop && options.position === "top") {
            adjustedPosition = "bottom";
            adjustedTop = top + tooltipHeight + 2 * options.offset;
        } else if (top < scrollTop) {
            adjustedTop = scrollTop + margin;
        } else if (top + tooltipHeight > scrollTop + viewportHeight) {
            if (options.position === "bottom") {
                adjustedPosition = "top";
                adjustedTop = top - tooltipHeight - 2 * options.offset;
            } else {
                adjustedTop =
                    scrollTop + viewportHeight - tooltipHeight - margin;
            }
        }

        return { top: adjustedTop, position: adjustedPosition };
    }

    applyPositionChanges(
        tooltipElement,
        top,
        left,
        newPosition,
        originalPosition,
    ) {
        tooltipElement.style.top = `${top}px`;
        tooltipElement.style.left = `${left}px`;

        if (newPosition !== originalPosition) {
            tooltipElement.classList.remove(`tooltip--${originalPosition}`);
            tooltipElement.classList.add(`tooltip--${newPosition}`);
        }
    }

    createTooltip(element, content, options = {}) {
        if (!element || !content) return null;

        element.setAttribute("data-tooltip", content);
        this.setOptionalAttributes(element, options);
        this.registerTooltip(element);

        return element;
    }

    setOptionalAttributes(element, options) {
        const attributeMap = {
            position: "data-tooltip-position",
            theme: "data-tooltip-theme",
            animation: "data-tooltip-animation",
            maxWidth: "data-tooltip-max-width",
            customClass: "data-tooltip-class",
        };

        Object.entries(options).forEach(([key, value]) => {
            if (value && attributeMap[key]) {
                element.setAttribute(attributeMap[key], value);
            }
        });
    }

    updateTooltip(element, content, options = {}) {
        const tooltipData = this.tooltips.get(element);
        if (!tooltipData) return false;

        let needsRecreation = false;

        if (content) {
            tooltipData.content = content.trim();
            element.setAttribute("data-tooltip", content);

            if (tooltipData.tooltipElement) {
                tooltipData.tooltipElement.innerHTML = content;
            }
        }

        if (Object.keys(options).length > 0) {
            tooltipData.options = { ...tooltipData.options, ...options };
            this.setOptionalAttributes(element, options);
            needsRecreation = true;
        }

        if (needsRecreation && tooltipData.tooltipElement) {
            this.hideTooltip(element);
            tooltipData.tooltipElement = null;
        }

        return true;
    }

    removeTooltip(element) {
        const tooltipData = this.tooltips.get(element);
        if (!tooltipData) return false;

        this.clearTimeout(tooltipData, "showTimeout");
        this.clearTimeout(tooltipData, "hideTimeout");

        if (this.activeTooltip === element) {
            this.hideTooltip(element);
        }

        this.tooltips.delete(element);

        const attributes = [
            "data-tooltip",
            "data-tooltip-position",
            "data-tooltip-theme",
            "data-tooltip-animation",
            "data-tooltip-max-width",
            "data-tooltip-class",
        ];

        attributes.forEach((attr) => element.removeAttribute(attr));
        element.classList.remove(this.selectors.tooltipTriggerClass);

        return true;
    }

    destroy() {
        this.tooltips.forEach((_, element) => {
            this.removeTooltip(element);
        });

        document.removeEventListener("mouseover", this.debouncedMouseOver);
        document.removeEventListener("mouseout", this.debouncedMouseOut);
        document.removeEventListener("click", this.boundHandleClick);
        document.removeEventListener("keydown", this.boundHandleKeyDown);
        document.removeEventListener("scroll", this.boundHandleScroll, {
            passive: true,
            capture: true,
        });

        this.tooltips.clear();
        this.activeTooltip = null;
    }
}
