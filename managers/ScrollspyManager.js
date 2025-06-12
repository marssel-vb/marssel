export class ScrollspyManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.scrollspies = new Map();
        this.scrollTimeout = null;
        this.resizeTimeout = null;
        this.isScrolling = false;

        // Bind methods to avoid creating new functions on each call
        this.handleScroll = this.handleScroll.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleMutation = this.handleMutation.bind(this);
    }

    init() {
        const scrollspyElements = document.querySelectorAll("[data-scrollspy]");
        if (scrollspyElements.length === 0) return;

        // Initialize existing scrollspy elements
        scrollspyElements.forEach((el) => this.createScrollspy(el));

        // Setup optimized mutation observer
        this.setupMutationObserver();

        // Setup optimized event listeners
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
        // Optimized scroll handler with requestAnimationFrame
        window.addEventListener("scroll", this.handleScroll, { passive: true });
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
        }, 100); // Debounce resize events
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
        // Early return if already exists
        if (this.scrollspies.has(navElement)) {
            return this.scrollspies.get(navElement);
        }

        const targetId = navElement.getAttribute("data-scrollspy");
        const targetContainer = document.getElementById(targetId);

        if (!targetContainer) {
            console.warn(`Scrollspy target #${targetId} not found`);
            return null;
        }

        // Parse options with defaults
        const options = this.parseOptions(navElement);

        // Get sections efficiently
        const sections = this.getSections(navElement);

        if (sections.length === 0) {
            console.warn("No valid section links found for scrollspy");
            return null;
        }

        // Create optimized scrollspy instance
        const scrollspyInstance = {
            navElement,
            targetContainer,
            sections,
            options,
            cachedPositions: new Map(), // Cache for section positions
            lastActiveSection: null, // Track last active to avoid unnecessary updates
        };

        // Setup smooth scrolling if enabled
        if (options.smoothScroll) {
            this.setupSmoothScrolling(scrollspyInstance);
        }

        // Store and initialize
        this.scrollspies.set(navElement, scrollspyInstance);
        this.refreshScrollspy(scrollspyInstance);
        this.updateScrollspy(scrollspyInstance);

        return scrollspyInstance;
    }

    parseOptions(navElement) {
        return {
            offset: parseInt(
                navElement.getAttribute("data-scrollspy-offset") || "0",
                10
            ),
            activeClass:
                navElement.getAttribute("data-scrollspy-active") || "active",
            threshold: parseFloat(
                navElement.getAttribute("data-scrollspy-threshold") || "0.2"
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
                const top =
                    section.getBoundingClientRect().top +
                    window.scrollY -
                    offset;

                window.scrollTo({
                    top,
                    behavior: "smooth",
                });
            }
        };

        // Store handler for cleanup
        scrollspy.clickHandler = clickHandler;

        scrollspy.sections.forEach(({ link }) => {
            link.addEventListener("click", clickHandler);
        });
    }

    refreshScrollspy(scrollspy) {
        // Clear cached positions
        scrollspy.cachedPositions.clear();

        // Update section positions
        scrollspy.sections.forEach((section) => {
            if (section.section) {
                const rect = section.section.getBoundingClientRect();
                const position = {
                    top: rect.top + window.scrollY,
                    bottom: rect.top + window.scrollY + rect.height,
                    height: rect.height,
                };
                scrollspy.cachedPositions.set(section.id, position);
            }
        });
    }

    updateScrollspy(scrollspy) {
        const { sections, options, cachedPositions } = scrollspy;
        const scrollPosition = window.scrollY + options.offset;
        const viewportHeight = window.innerHeight;

        // Find active section using cached positions when possible
        let activeSection = null;
        let maxVisibility = 0;

        for (const section of sections) {
            if (!section.section) continue;

            // Use live rect for accuracy, cached positions for fallback
            const rect = section.section.getBoundingClientRect();

            // Calculate visibility
            const visibleTop = Math.max(0, rect.top);
            const visibleBottom = Math.min(viewportHeight, rect.bottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            const visibilityPercentage =
                rect.height > 0 ? visibleHeight / rect.height : 0;

            if (
                visibilityPercentage > options.threshold &&
                visibilityPercentage > maxVisibility
            ) {
                maxVisibility = visibilityPercentage;
                activeSection = section;
            }
        }

        // Fallback logic for when no section meets threshold
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

        // Only update DOM if active section changed
        if (scrollspy.lastActiveSection !== activeSection) {
            this.updateActiveClasses(scrollspy, activeSection);
            scrollspy.lastActiveSection = activeSection;
        }
    }

    updateActiveClasses(scrollspy, activeSection) {
        const { sections, options } = scrollspy;

        // Remove active class from all links
        sections.forEach(({ link }) => {
            link.classList.remove(options.activeClass);
        });

        // Add active class to active link
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

        // Clean up event listeners
        if (scrollspy.clickHandler) {
            scrollspy.sections.forEach(({ link }) => {
                link.removeEventListener("click", scrollspy.clickHandler);
            });
        }

        // Clear caches
        scrollspy.cachedPositions.clear();

        // Remove from map
        this.scrollspies.delete(navElement);
    }

    destroyAll() {
        // Clean up global event listeners
        window.removeEventListener("scroll", this.handleScroll);
        window.removeEventListener("resize", this.handleResize);

        // Clean up mutation observer
        if (this.observer) {
            this.observer.disconnect();
        }

        // Clean up all scrollspy instances
        this.scrollspies.forEach((_, navElement) => {
            this.destroy(navElement);
        });

        // Clear timeouts
        if (this.scrollTimeout) {
            cancelAnimationFrame(this.scrollTimeout);
        }
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.scrollspies.clear();
    }
}
