export class ScrollspyManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.scrollspies = new Map(); // Map to track all scrollspy instances
        this.scrollTimeout = null; // For scroll event throttling
    }

    init() {
        const hasScrollspy = document.querySelector("[data-scrollspy]");
        if (!hasScrollspy) return;

        // Listen for data-scrollspy attributes during initialization
        document.querySelectorAll("[data-scrollspy]").forEach((navElement) => {
            this.createScrollspy(navElement);
        });

        // Setup mutation observer to detect new scrollspy elements
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === "attributes" &&
                    mutation.attributeName === "data-scrollspy"
                ) {
                    this.createScrollspy(mutation.target);
                } else if (mutation.type === "childList") {
                    mutation.addedNodes.forEach((node) => {
                        if (
                            node.nodeType === 1 &&
                            node.hasAttribute("data-scrollspy")
                        ) {
                            this.createScrollspy(node);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-scrollspy"],
        });

        // Global scroll event listener with throttling
        window.addEventListener(
            "scroll",
            () => {
                if (this.scrollTimeout) {
                    window.cancelAnimationFrame(this.scrollTimeout);
                }

                this.scrollTimeout = window.requestAnimationFrame(() => {
                    this.updateAll();
                });
            },
            { passive: true }
        );

        // Listen for window resize to update offsets
        window.addEventListener(
            "resize",
            () => {
                if (this.scrollspies.size > 0) {
                    this.refreshAll();
                }
            },
            { passive: true }
        );
    }

    createScrollspy(navElement) {
        // Get target container from data attribute
        const targetId = navElement.getAttribute("data-scrollspy");
        const targetContainer = document.getElementById(targetId);

        if (!targetContainer) {
            console.warn(
                `Scrollspy target #${targetId} not found for`,
                navElement
            );
            return;
        }

        // Options parsing
        const options = {
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

        // Find all navigation links that point to sections within the target
        const navLinks = Array.from(
            navElement.querySelectorAll('a[href^="#"]')
        );

        // Map sections to links
        const sections = navLinks
            .map((link) => {
                const sectionId = link.getAttribute("href").substring(1);
                const section = document.getElementById(sectionId);

                return {
                    link,
                    section,
                    id: sectionId,
                };
            })
            .filter((item) => item.section !== null);

        if (sections.length === 0) {
            console.warn(
                "No valid section links found for scrollspy",
                navElement
            );
            return;
        }

        // Create scrollspy instance
        const scrollspyInstance = {
            navElement,
            targetContainer,
            sections,
            options,
            refresh: () => this.refreshScrollspy(scrollspyInstance),
        };

        // Add click handlers for smooth scrolling
        if (options.smoothScroll) {
            this.setupSmoothScrolling(scrollspyInstance);
        }

        // Store the scrollspy instance
        this.scrollspies.set(navElement, scrollspyInstance);

        // Initial refresh and update
        this.refreshScrollspy(scrollspyInstance);
        this.updateScrollspy(scrollspyInstance);

        return scrollspyInstance;
    }

    setupSmoothScrolling(scrollspy) {
        scrollspy.sections.forEach(({ link, section }) => {
            link.addEventListener("click", (e) => {
                e.preventDefault();

                const offset = scrollspy.options.offset;
                const top =
                    section.getBoundingClientRect().top +
                    window.scrollY -
                    offset;

                window.scrollTo({
                    top,
                    behavior: "smooth",
                });
            });
        });
    }

    refreshScrollspy(scrollspy) {
        // Update section positions based on current DOM
        scrollspy.sections.forEach((section) => {
            if (section.section) {
                const rect = section.section.getBoundingClientRect();
                section.top = rect.top + window.scrollY;
                section.bottom = section.top + rect.height;
            }
        });
    }

    updateScrollspy(scrollspy) {
        const { sections, options } = scrollspy;

        // Get current scroll position with offset
        const scrollPosition = window.scrollY + options.offset;

        // Get the height of the viewport
        const viewportHeight = window.innerHeight;

        // Calculate visible sections
        const visibleSections = sections.filter((section) => {
            if (!section.section) return false;

            // Refresh section positions
            const rect = section.section.getBoundingClientRect();

            // Calculate visibility percentage
            const visibleTop = Math.max(0, rect.top);
            const visibleBottom = Math.min(viewportHeight, rect.bottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            const visibilityPercentage = visibleHeight / rect.height;

            return visibilityPercentage > options.threshold;
        });

        // Find active section
        let activeSection = null;

        if (visibleSections.length > 0) {
            // Sort by visibility if multiple sections are visible
            if (visibleSections.length > 1) {
                activeSection = visibleSections.reduce((prev, current) => {
                    const prevRect = prev.section.getBoundingClientRect();
                    const currentRect = current.section.getBoundingClientRect();

                    // Calculate visibility percentage for both sections
                    const prevVisibleHeight = Math.max(
                        0,
                        Math.min(viewportHeight, prevRect.bottom) -
                            Math.max(0, prevRect.top)
                    );

                    const currentVisibleHeight = Math.max(
                        0,
                        Math.min(viewportHeight, currentRect.bottom) -
                            Math.max(0, currentRect.top)
                    );

                    const prevVisibility = prevVisibleHeight / prevRect.height;
                    const currentVisibility =
                        currentVisibleHeight / currentRect.height;

                    return currentVisibility > prevVisibility ? current : prev;
                });
            } else {
                activeSection = visibleSections[0];
            }
        } else {
            // Fallback: find the nearest section above current scroll position
            const sectionsAbove = sections.filter(
                (s) => s.top <= scrollPosition
            );

            if (sectionsAbove.length > 0) {
                activeSection = sectionsAbove.reduce((prev, current) =>
                    current.top > prev.top ? current : prev
                );
            } else if (sections.length > 0) {
                // If no sections above, use the first section
                activeSection = sections[0];
            }
        }

        // Update active classes
        sections.forEach(({ link }) => {
            // Remove active class from all links
            link.classList.remove(options.activeClass);
        });

        if (activeSection) {
            // Add active class to the active link
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
        if (this.scrollspies.has(navElement)) {
            const scrollspy = this.scrollspies.get(navElement);

            // Remove event listeners if needed
            if (scrollspy.options.smoothScroll) {
                scrollspy.sections.forEach(({ link }) => {
                    link.removeEventListener("click", () => {});
                });
            }

            // Remove instance from map
            this.scrollspies.delete(navElement);
        }
    }

    destroyAll() {
        this.scrollspies.forEach((_, navElement) => {
            this.destroy(navElement);
        });
        this.scrollspies.clear();
    }
}
