type ViewerImage = {
    url: string;
    alt: string;
};

const viewer = document.getElementById("view-box");
const viewerImage = document.getElementById("view-img") as HTMLImageElement | null;
const viewerStage = document.getElementById("view-stage");
const viewerCaption = document.getElementById("view-caption");
const viewerCounter = document.getElementById("view-counter");
const closeButton = document.getElementById("view-close");
const previousButton = document.getElementById("view-prev") as HTMLButtonElement | null;
const nextButton = document.getElementById("view-next") as HTMLButtonElement | null;
const zoomOutButton = document.getElementById("view-zoom-out");
const zoomInButton = document.getElementById("view-zoom-in");
const scaleButton = document.getElementById("view-scale");
const pageLayout = document.querySelector<HTMLElement>("body > main");

if (
    viewer &&
    viewerImage &&
    viewerStage &&
    viewerCaption &&
    viewerCounter &&
    closeButton &&
    previousButton &&
    nextButton &&
    zoomOutButton &&
    zoomInButton &&
    scaleButton
) {
    const groups = new Map<string, ViewerImage[]>();
    let currentGroup = "";
    let currentIndex = 0;
    let scale = 1;
    let panX = 0;
    let panY = 0;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let pointerPanX = 0;
    let pointerPanY = 0;
    let activePointer: number | null = null;
    let lastFocused: HTMLElement | null = null;

    const isOpen = () => viewer.classList.contains("view-box-show");
    const currentImages = () => groups.get(currentGroup) ?? [];

    const updateTransform = () => {
        viewerImage.style.transform =
            `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`;
        viewerStage.classList.toggle("is-zoomed", scale > 1);
        scaleButton.textContent = `${Math.round(scale * 100)}%`;
    };

    const setScale = (nextScale: number) => {
        scale = Math.min(4, Math.max(1, nextScale));
        if (scale === 1) {
            panX = 0;
            panY = 0;
        }
        updateTransform();
    };

    const resetTransform = () => {
        scale = 1;
        panX = 0;
        panY = 0;
        updateTransform();
    };

    const preloadNeighbors = () => {
        const images = currentImages();
        if (images.length < 2) return;

        for (const offset of [-1, 1]) {
            const neighborIndex =
                (currentIndex + offset + images.length) % images.length;
            const preloadImage = new Image();
            preloadImage.src = images[neighborIndex].url;
        }
    };

    const renderImage = () => {
        const images = currentImages();
        const item = images[currentIndex];
        if (!item) return;

        resetTransform();
        viewer.classList.add("is-loading");
        viewer.classList.remove("has-error");
        viewerImage.alt = item.alt;
        viewerCaption.textContent = item.alt;
        viewerCounter.textContent = `${currentIndex + 1} / ${images.length}`;

        const hasMultipleImages = images.length > 1;
        previousButton.hidden = !hasMultipleImages;
        nextButton.hidden = !hasMultipleImages;
        viewerCounter.hidden = !hasMultipleImages;

        viewerImage.onload = () => {
            viewer.classList.remove("is-loading");
            preloadNeighbors();
        };
        viewerImage.onerror = () => {
            viewer.classList.remove("is-loading");
            viewer.classList.add("has-error");
        };
        viewerImage.src = item.url;

        if (viewerImage.complete) {
            if (viewerImage.naturalWidth > 0) {
                viewerImage.onload?.(new Event("load"));
            } else {
                viewerImage.onerror?.(new Event("error"));
            }
        }
    };

    const openViewer = (groupId: string, index: number) => {
        if (pageLayout?.classList.contains("aside-show")) return;

        const images = groups.get(groupId);
        if (!images?.[index]) return;

        currentGroup = groupId;
        currentIndex = index;
        lastFocused =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
        renderImage();

        viewer.classList.remove("view-box-hide");
        viewer.classList.add("view-box-show");
        viewer.setAttribute("aria-hidden", "false");
        if (pageLayout) pageLayout.inert = true;
        closeButton.focus({ preventScroll: true });
    };

    const closeViewer = () => {
        if (!isOpen()) return;

        viewer.classList.remove("view-box-show", "is-loading", "has-error");
        viewer.classList.add("view-box-hide");
        viewer.setAttribute("aria-hidden", "true");
        if (pageLayout) pageLayout.inert = false;
        resetTransform();
        lastFocused?.focus({ preventScroll: true });
    };

    const moveImage = (direction: -1 | 1) => {
        const images = currentImages();
        if (images.length < 2) return;
        currentIndex =
            (currentIndex + direction + images.length) % images.length;
        renderImage();
    };

    const collectArticleImages = () => {
        const articleImages = Array.from(
            document.querySelectorAll<HTMLImageElement>(
                ".doc img:not(.view-none)",
            ),
        );
        if (articleImages.length === 0) return;

        const groupId = "article-images";
        groups.set(
            groupId,
            articleImages.map((image) => ({
                url: image.currentSrc || image.src,
                alt: image.alt,
            })),
        );
        articleImages.forEach((image, index) => {
            image.addEventListener("click", (event) => {
                event.preventDefault();
                openViewer(groupId, index);
            });
        });
    };

    const collectMomentImages = () => {
        document
            .querySelectorAll<HTMLElement>(".moment-images")
            .forEach((momentSection) => {
                const momentId = momentSection.dataset.momentId;
                if (!momentId) return;

                let images: ViewerImage[] = [];
                try {
                    const parsed = JSON.parse(momentSection.dataset.imgs ?? "[]");
                    if (Array.isArray(parsed)) {
                        images = parsed.filter(
                            (item): item is ViewerImage =>
                                typeof item?.url === "string" &&
                                typeof item?.alt === "string",
                        );
                    }
                } catch {
                    images = [];
                }
                if (images.length === 0) return;

                groups.set(momentId, images);
                momentSection
                    .querySelectorAll<HTMLImageElement>("img")
                    .forEach((image, index) => {
                        image.addEventListener("click", () => {
                            openViewer(momentId, index);
                        });
                    });
                momentSection
                    .querySelector<HTMLElement>(".img-mask-overlay")
                    ?.addEventListener("click", () => {
                        openViewer(momentId, 8);
                    });
            });
    };

    collectArticleImages();
    collectMomentImages();

    closeButton.addEventListener("click", closeViewer);
    previousButton.addEventListener("click", () => moveImage(-1));
    nextButton.addEventListener("click", () => moveImage(1));
    zoomOutButton.addEventListener("click", () => setScale(scale - 0.25));
    zoomInButton.addEventListener("click", () => setScale(scale + 0.25));
    scaleButton.addEventListener("click", resetTransform);

    viewer.addEventListener("click", (event) => {
        if (event.target === viewer) closeViewer();
    });

    viewerStage.addEventListener("click", (event) => {
        if (event.target === viewerStage && scale === 1) closeViewer();
    });

    viewerImage.addEventListener("dblclick", () => {
        setScale(scale === 1 ? 2 : 1);
    });

    viewerStage.addEventListener(
        "wheel",
        (event) => {
            event.preventDefault();
            setScale(scale + (event.deltaY < 0 ? 0.25 : -0.25));
        },
        { passive: false },
    );

    viewerStage.addEventListener("pointerdown", (event) => {
        activePointer = event.pointerId;
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
        pointerPanX = panX;
        pointerPanY = panY;
        viewerStage.setPointerCapture(event.pointerId);
        viewerStage.classList.toggle("is-dragging", scale > 1);
    });

    viewerStage.addEventListener("pointermove", (event) => {
        if (activePointer !== event.pointerId || scale === 1) return;
        panX = pointerPanX + event.clientX - pointerStartX;
        panY = pointerPanY + event.clientY - pointerStartY;
        updateTransform();
    });

    const finishPointerGesture = (event: PointerEvent) => {
        if (activePointer !== event.pointerId) return;

        const deltaX = event.clientX - pointerStartX;
        const deltaY = event.clientY - pointerStartY;
        if (
            scale === 1 &&
            Math.abs(deltaX) > 48 &&
            Math.abs(deltaX) > Math.abs(deltaY) * 1.25
        ) {
            moveImage(deltaX < 0 ? 1 : -1);
        }

        activePointer = null;
        viewerStage.classList.remove("is-dragging");
    };

    viewerStage.addEventListener("pointerup", finishPointerGesture);
    viewerStage.addEventListener("pointercancel", finishPointerGesture);

    document.addEventListener("keydown", (event) => {
        if (!isOpen()) return;

        if (event.key === "Escape") closeViewer();
        if (event.key === "ArrowLeft") moveImage(-1);
        if (event.key === "ArrowRight") moveImage(1);
        if (event.key === "+" || event.key === "=") {
            setScale(scale + 0.25);
        }
        if (event.key === "-") setScale(scale - 0.25);
        if (event.key === "0") resetTransform();

        if (event.key === "Tab") {
            const focusable = Array.from(
                viewer.querySelectorAll<HTMLElement>(
                    "button:not([hidden]):not([disabled]), [tabindex]:not([tabindex='-1'])",
                ),
            );
            const first = focusable[0];
            const last = focusable.at(-1);
            if (!first || !last) return;

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });
}
