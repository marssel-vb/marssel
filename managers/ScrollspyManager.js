export class ScrollspyManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.scrollspies = new Map();
        this.scrollTimeout = null;
        this.resizeTimeout = null;
        this.isScrolling = false;
        this.handleScroll = this.handleScroll.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleMutation = this.handleMutation.bind(this);
    }

    init() {
        const scrollspyElements = document.querySelectorAll("[data-scrollspy]");
        if (scrollspyElements.length === 0) return;

        scrollspyElements.forEach((el) => this.createScrollspy(el));

        this.setupMutationObserver();
        this.setupEventListeners();
    }

    setupMutationObserver() {
        this.observer = new MutationObserver(this.handleMutation);
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-scrollspy"],
        });
    }

    setupEventListeners() {
        window.addEventListener("resize", this.handleResize, { passive: true });
    }

    handleScroll() {
        if (this.isScrolling) return;

        this.isScrolling = true;

        if (this.scrollTimeout) {
            cancelAnimationFrame(this.scrollTimeout);
        }

        this.scrollTimeout = requestAnimationFrame(() => {
            this.updateAll();
            this.isScrolling = false;
        });
    }

    handleResize() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
            if (this.scrollspies.size > 0) {
                this.refreshAll();
            }
        }, 100);
    }

    handleMutation(mutations) {
        const processedNodes = new Set();

        for (const mutation of mutations) {
            if (
                mutation.type === "attributes" &&
                mutation.attributeName === "data-scrollspy"
            ) {
                this.createScrollspy(mutation.target);
            } else if (mutation.type === "childList") {
                for (const node of mutation.addedNodes) {
                    if (
                        node.nodeType === 1 &&
                        !processedNodes.has(node) &&
                        node.hasAttribute("data-scrollspy")
                    ) {
                        processedNodes.add(node);
                        this.createScrollspy(node);
                    }
                }
            }
        }
    }

    createScrollspy(navElement) {
        if (this.scrollspies.has(navElement)) {
            return this.scrollspies.get(navElement);
        }

        const targetId = navElement.getAttribute("data-scrollspy");
        const targetContainer = document.getElementById(targetId);

        if (!targetContainer) {
            console.warn(`Scrollspy target #${targetId} not found`);
            return null;
        }

        const options = this.parseOptions(navElement);
        const sections = this.getSections(navElement);

        if (sections.length === 0) {
            console.warn("No valid section links found for scrollspy");
            return null;
        }

        const style = window.getComputedStyle(targetContainer);
        const isScrollable =
            style.overflowY === "scroll" || style.overflowY === "auto";
        const scrollElement = isScrollable ? targetContainer : window;
        const scrollspyInstance = {
            navElement,
            targetContainer,
            sections,
            options,
            cachedPositions: new Map(),
            lastActiveSection: null,
            scrollElement: scrollElement,
        };

        scrollElement.addEventListener("scroll", this.handleScroll, {
            passive: true,
        });

        if (options.smoothScroll) {
            this.setupSmoothScrolling(scrollspyInstance);
        }

        this.scrollspies.set(navElement, scrollspyInstance);
        this.refreshScrollspy(scrollspyInstance);
        this.updateScrollspy(scrollspyInstance);

        return scrollspyInstance;
    }

    parseOptions(navElement) {
        return {
            offset: parseInt(
                navElement.getAttribute("data-scrollspy-offset") || "0",
                10,
            ),
            activeClass:
                navElement.getAttribute("data-scrollspy-active") || "active",
            threshold: parseFloat(
                navElement.getAttribute("data-scrollspy-threshold") || "0.2",
            ),
            smoothScroll:
                navElement.getAttribute("data-scrollspy-smooth") !== "false",
        };
    }

    getSections(navElement) {
        const navLinks = navElement.querySelectorAll('a[href^="#"]');
        const sections = [];

        for (const link of navLinks) {
            const sectionId = link.getAttribute("href").substring(1);
            const section = document.getElementById(sectionId);

            if (section) {
                sections.push({ link, section, id: sectionId });
            }
        }

        return sections;
    }

    setupSmoothScrolling(scrollspy) {
        const clickHandler = (e) => {
            e.preventDefault();
            const sectionId = e.currentTarget.getAttribute("href").substring(1);
            const section = document.getElementById(sectionId);

            if (section) {
                const offset = scrollspy.options.offset;
                const isWindowScroll = scrollspy.scrollElement === window;

                if (isWindowScroll) {
                    const top =
                        section.getBoundingClientRect().top +
                        window.scrollY -
                        offset;

                    window.scrollTo({
                        top,
                        behavior: "smooth",
                    });
                } else {
                    const top = section.offsetTop - offset;

                    scrollspy.targetContainer.scrollTo({
                        top,
                        behavior: "smooth",
                    });
                }
            }
        };

        scrollspy.clickHandler = clickHandler;

        scrollspy.sections.forEach(({ link }) => {
            link.addEventListener("click", clickHandler);
        });
    }

    refreshScrollspy(scrollspy) {
        scrollspy.cachedPositions.clear();
        const isWindowScroll = scrollspy.scrollElement === window;

        scrollspy.sections.forEach((section) => {
            if (section.section) {
                if (isWindowScroll) {
                    const rect = section.section.getBoundingClientRect();
                    const position = {
                        top: rect.top + window.scrollY,
                        bottom: rect.top + window.scrollY + rect.height,
                        height: rect.height,
                    };
                    scrollspy.cachedPositions.set(section.id, position);
                } else {
                    const position = {
                        top: section.section.offsetTop,
                        bottom:
                            section.section.offsetTop +
                            section.section.offsetHeight,
                        height: section.section.offsetHeight,
                    };
                    scrollspy.cachedPositions.set(section.id, position);
                }
            }
        });
    }

    updateScrollspy(scrollspy) {
        const {
            sections,
            options,
            cachedPositions,
            targetContainer,
            scrollElement,
        } = scrollspy;

        const isWindowScroll = scrollElement === window;
        const scrollPosition =
            (isWindowScroll ? window.scrollY : targetContainer.scrollTop) +
            options.offset;
        const viewportHeight = isWindowScroll
            ? window.innerHeight
            : targetContainer.clientHeight;
        const containerRect = isWindowScroll
            ? { top: 0, bottom: viewportHeight }
            : targetContainer.getBoundingClientRect();

        let activeSection = null;
        let maxVisibility = 0;

        for (const section of sections) {
            if (!section.section) continue;

            const rect = section.section.getBoundingClientRect();
            const sectionHeight = rect.height;
            const relativeTop = rect.top - containerRect.top;
            const relativeBottom = rect.bottom - containerRect.top;
            const visibleTop = Math.max(0, relativeTop);
            const visibleBottom = Math.min(viewportHeight, relativeBottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            const visibilityPercentage =
                sectionHeight > 0 ? visibleHeight / sectionHeight : 0;

            if (
                visibilityPercentage > options.threshold &&
                visibilityPercentage > maxVisibility
            ) {
                maxVisibility = visibilityPercentage;
                activeSection = section;
            }
        }

        if (!activeSection) {
            const sectionsAbove = sections.filter((section) => {
                const cached = cachedPositions.get(section.id);
                return cached && cached.top <= scrollPosition;
            });

            if (sectionsAbove.length > 0) {
                activeSection = sectionsAbove.reduce((prev, current) => {
                    const prevCached = cachedPositions.get(prev.id);
                    const currentCached = cachedPositions.get(current.id);
                    return currentCached.top > prevCached.top ? current : prev;
                });
            } else if (sections.length > 0) {
                activeSection = sections[0];
            }
        }

        if (scrollspy.lastActiveSection !== activeSection) {
            this.updateActiveClasses(scrollspy, activeSection);
            scrollspy.lastActiveSection = activeSection;
        }
    }

    updateActiveClasses(scrollspy, activeSection) {
        const { sections, options } = scrollspy;

        sections.forEach(({ link }) => {
            link.classList.remove(options.activeClass);
        });

        if (activeSection) {
            activeSection.link.classList.add(options.activeClass);
        }
    }

    updateAll() {
        this.scrollspies.forEach((scrollspy) => {
            this.updateScrollspy(scrollspy);
        });
    }

    refreshAll() {
        this.scrollspies.forEach((scrollspy) => {
            this.refreshScrollspy(scrollspy);
        });
        this.updateAll();
    }

    destroy(navElement) {
        const scrollspy = this.scrollspies.get(navElement);
        if (!scrollspy) return;

        if (scrollspy.clickHandler) {
            scrollspy.sections.forEach(({ link }) => {
                link.removeEventListener("click", scrollspy.clickHandler);
            });
        }

        scrollspy.scrollElement.removeEventListener(
            "scroll",
            this.handleScroll,
        );

        scrollspy.cachedPositions.clear();

        this.scrollspies.delete(navElement);
    }

    destroyAll() {
        window.removeEventListener("resize", this.handleResize);

        if (this.observer) {
            this.observer.disconnect();
        }

        this.scrollspies.forEach((_, navElement) => {
            this.destroy(navElement);
        });

        if (this.scrollTimeout) {
            cancelAnimationFrame(this.scrollTimeout);
        }
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.scrollspies.clear();
    }
}
