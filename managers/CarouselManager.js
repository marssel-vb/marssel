import { CarouselStyles } from "../styles/CarouselStyles.js";
import { LRUCache } from "../utils/LRUCache.js";

export class CarouselManager {
    constructor(marssel) {
        this.marssel = marssel;
        this.carouselStyles = new CarouselStyles(marssel.styleManager);
        this.carousels = new LRUCache(30);
        this.activeCarousel = null;
        this.touchStartX = 0;
    }

    init() {
        if (!document.querySelector("[class*='carousel-']")) return;

        this.carouselStyles.addBaseStyles();
        document
            .querySelectorAll("[class*='carousel-']")
            .forEach((el) => this.initializeCarousel(el));
        this.setupObserver();
        this.setupEventListeners();
    }

    setupObserver() {
        new MutationObserver((mutations) => {
            for (const { addedNodes } of mutations) {
                for (const node of addedNodes) {
                    if (node.nodeType !== 1) continue;

                    const isCarousel = [...(node.classList || [])].some((cls) =>
                        cls.startsWith("carousel-"),
                    );
                    if (isCarousel) this.initializeCarousel(node);

                    node.querySelectorAll("[class*='carousel-']").forEach(
                        (el) => this.initializeCarousel(el),
                    );
                }
            }
        }).observe(document.body, { childList: true, subtree: true });
    }

    setupEventListeners() {
        const setActiveFromEvent = (target) => {
            const container = target.closest(".carousel-container");
            const id = container?.dataset.carouselId;
            if (id && this.carousels.has(id)) this.activeCarousel = id;
        };

        document.addEventListener(
            "touchstart",
            (e) => {
                this.touchStartX = e.touches[0].clientX;
                setActiveFromEvent(e.target);
            },
            { passive: true },
        );

        document.addEventListener(
            "touchend",
            (e) => {
                const swipeDistance =
                    e.changedTouches[0].clientX - this.touchStartX;
                const carousel = this.carousels.get(this.activeCarousel);
                if (!carousel) return;
                if (swipeDistance > 50) carousel.prevSlide();
                else if (swipeDistance < -50) carousel.nextSlide();
            },
            { passive: true },
        );

        document.addEventListener(
            "mouseenter",
            (e) => {
                const container = e
                    .composedPath()
                    .find(
                        (el) =>
                            el instanceof HTMLElement &&
                            el.classList.contains("carousel-container"),
                    );
                if (
                    container?.dataset.carouselId &&
                    this.carousels.has(container.dataset.carouselId)
                ) {
                    this.activeCarousel = container.dataset.carouselId;
                }
            },
            true,
        );
    }

    initializeCarousel(element) {
        const container = element.closest(".carousel-container");
        if (!container || container.dataset.carouselId) return;

        const generateUID = () =>
            `carousel-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        const carouselId = generateUID();

        container.dataset.carouselId = carouselId;

        const carousel = new Carousel(container, this.marssel);
        carousel.init();
        this.carousels.set(carouselId, carousel);
    }
}

class Carousel {
    constructor(container, marssel) {
        this.container = container;
        this.marssel = marssel;
        this.currentSlide = 0;
        this.autoplay = container.dataset.autoplay === "true";
        this.interval = parseInt(container.dataset.interval || "5000", 10);
        this.autoplayTimer = null;
    }

    init() {
        this.setupStructure();
        this.slides = [...this.container.querySelectorAll(".carousel-slide")];
        this.setupNavigation();
        this.setupIndicators();
        this.goToSlide(0);
        if (this.autoplay) this.startAutoplay();
    }

    setupStructure() {
        if (!this.container.querySelector(".carousel-track")) {
            const track = document.createElement("div");
            track.className = "carousel-track";

            [...this.container.children].forEach((child) => {
                if (
                    child.classList.contains("carousel-nav-button") ||
                    child.classList.contains("carousel-indicators")
                )
                    return;

                const slide = child.classList.contains("carousel-slide")
                    ? child
                    : Object.assign(document.createElement("div"), {
                          className: "carousel-slide",
                          innerHTML: child.outerHTML,
                      });

                if (!child.classList.contains("carousel-slide")) child.remove();
                track.appendChild(slide);
            });

            this.container.appendChild(track);
        }

        this.container.querySelectorAll(".carousel-slide").forEach((slide) => {
            const captionText = slide.dataset.caption;
            if (captionText && !slide.querySelector(".carousel-caption")) {
                const caption = document.createElement("div");
                caption.className = "carousel-caption";
                caption.textContent = captionText;
                slide.appendChild(caption);
            }
        });
    }

    setupNavigation() {
        const createButton = (className, label, handler) => {
            let btn = this.container.querySelector(`.${className}`);
            if (!btn) {
                btn = document.createElement("button");
                btn.className = `carousel-nav-button ${className}`;
                btn.innerHTML = label;
                btn.setAttribute(
                    "aria-label",
                    `${className.includes("prev") ? "Previous" : "Next"} slide`,
                );
                this.container.appendChild(btn);
            }
            btn.addEventListener("click", handler);
        };

        createButton("carousel-prev", "&lsaquo;", () => this.prevSlide());
        createButton("carousel-next", "&rsaquo;", () => this.nextSlide());
    }

    setupIndicators() {
        const container =
            this.container.querySelector(".carousel-indicators") ||
            this.container.appendChild(
                Object.assign(document.createElement("div"), {
                    className: "carousel-indicators",
                }),
            );

        container.innerHTML = "";
        this.indicators = this.slides.map((_, i) => {
            const dot = document.createElement("span");
            dot.className = "carousel-indicator";
            dot.dataset.slideIndex = i;
            dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
            dot.addEventListener("click", () => this.goToSlide(i));
            container.appendChild(dot);
            return dot;
        });
    }

    startAutoplay() {
        this.stopAutoplay();
        this.autoplayTimer = setInterval(() => this.nextSlide(), this.interval);

        if (this.container.dataset.pauseOnHover !== "false") {
            this.container.addEventListener("mouseenter", () =>
                this.stopAutoplay(),
            );
            this.container.addEventListener("mouseleave", () =>
                this.startAutoplay(),
            );
        }
    }

    stopAutoplay() {
        if (this.autoplayTimer) clearInterval(this.autoplayTimer);
    }

    goToSlide(index) {
        const total = this.slides.length;
        this.currentSlide = (index + total) % total;
        const track = this.container.querySelector(".carousel-track");
        track.style.transform = `translateX(-${this.currentSlide * 100}%)`;

        this.indicators.forEach((dot, i) => {
            dot.classList.toggle("active", i === this.currentSlide);
        });

        if (this.autoplay) {
            this.stopAutoplay();
            this.startAutoplay();
        }
    }

    nextSlide() {
        this.goToSlide(this.currentSlide + 1);
    }

    prevSlide() {
        this.goToSlide(this.currentSlide - 1);
    }
}
