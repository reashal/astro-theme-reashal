type ViewerMedia =
    | {
          type: "image";
          url: string;
          alt: string;
      }
    | {
          type: "video";
          url: string;
          alt: string;
          poster?: string;
      };

const viewer = document.getElementById("view-box");
const viewerImage = document.getElementById("view-img") as HTMLImageElement | null;
const viewerVideo = document.getElementById("view-video") as HTMLVideoElement | null;
const viewerStage = document.getElementById("view-stage");
const viewerCaption = document.getElementById("view-caption");
const viewerCounter = document.getElementById("view-counter");
const loadingText = document.getElementById("view-loading");
const errorText = document.getElementById("view-error");
const closeButton = document.getElementById("view-close");
const previousButton = document.getElementById("view-prev") as HTMLButtonElement | null;
const nextButton = document.getElementById("view-next") as HTMLButtonElement | null;
const zoomOutButton = document.getElementById("view-zoom-out");
const zoomInButton = document.getElementById("view-zoom-in");
const scaleButton = document.getElementById("view-scale");
const viewerTools = viewer?.querySelector<HTMLElement>(".view-tools");
const pageLayout = document.querySelector<HTMLElement>("body > main");
const shareContainer =
    document.querySelector<HTMLElement>(".share-container");

if (
    viewer &&
    viewerImage &&
    viewerVideo &&
    viewerStage &&
    viewerCaption &&
    viewerCounter &&
    loadingText &&
    errorText &&
    closeButton &&
    previousButton &&
    nextButton &&
    zoomOutButton &&
    zoomInButton &&
    scaleButton &&
    viewerTools
) {
    const groups = new Map<string, ViewerMedia[]>();
    const initializedSections = new WeakSet<HTMLElement>();
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
    const currentMedia = () => groups.get(currentGroup) ?? [];
    const currentItem = () => currentMedia()[currentIndex];
    const isCurrentImage = () => currentItem()?.type === "image";

    const updateTransform = () => {
        viewerImage.style.transform =
            `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`;
        viewerStage.classList.toggle("is-zoomed", scale > 1);
        scaleButton.textContent = `${Math.round(scale * 100)}%`;
    };

    const setScale = (nextScale: number) => {
        if (!isCurrentImage()) return;
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

    const stopVideo = () => {
        viewerVideo.onloadeddata = null;
        viewerVideo.onerror = null;
        viewerVideo.pause();
        viewerVideo.removeAttribute("src");
        viewerVideo.removeAttribute("poster");
        viewerVideo.load();
    };

    const preloadNeighbors = () => {
        const media = currentMedia();
        if (media.length < 2) return;

        for (const offset of [-1, 1]) {
            const neighborIndex =
                (currentIndex + offset + media.length) % media.length;
            const neighbor = media[neighborIndex];
            const preview =
                neighbor?.type === "image" ? neighbor.url : neighbor?.poster;
            if (!preview) continue;
            const preloadImage = new Image();
            preloadImage.src = preview;
        }
    };

    const renderMedia = () => {
        const media = currentMedia();
        const item = media[currentIndex];
        if (!item) return;

        viewerImage.onload = null;
        viewerImage.onerror = null;
        stopVideo();
        resetTransform();
        viewer.classList.add("is-loading");
        viewer.classList.remove("has-error", "is-video");
        viewerStage.classList.remove("is-video");
        viewerCaption.textContent = item.alt;
        viewerCounter.textContent = `${currentIndex + 1} / ${media.length}`;
        loadingText.textContent =
            item.type === "video" ? "正在载入视频" : "正在载入图片";
        errorText.textContent =
            item.type === "video"
                ? "视频暂时无法载入"
                : "图片暂时无法载入";

        const hasMultipleMedia = media.length > 1;
        previousButton.hidden = !hasMultipleMedia;
        nextButton.hidden = !hasMultipleMedia;
        viewerCounter.hidden = !hasMultipleMedia;
        viewerTools.hidden = item.type !== "image";

        if (item.type === "video") {
            document.dispatchEvent(new CustomEvent("media-viewer:video"));
            viewer.classList.add("is-video");
            viewerStage.classList.add("is-video");
            viewerImage.hidden = true;
            viewerVideo.hidden = false;
            viewerVideo.poster = item.poster ?? "";
            viewerVideo.src = item.url;
            viewerVideo.onloadeddata = () => {
                viewer.classList.remove("is-loading");
                preloadNeighbors();
                void viewerVideo.play().catch(() => {
                    // 自动播放被浏览器拦截时，保留原生播放按钮。
                });
            };
            viewerVideo.onerror = () => {
                viewer.classList.remove("is-loading");
                viewer.classList.add("has-error");
            };
            viewerVideo.load();
            return;
        }

        viewerVideo.hidden = true;
        viewerImage.hidden = false;
        viewerImage.alt = item.alt;
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

    const openViewer = (
        groupId: string,
        index: number,
        trigger?: HTMLElement,
    ) => {
        if (pageLayout?.classList.contains("aside-show")) {
            const retry = (event: AnimationEvent) => {
                if (
                    event.target !== pageLayout ||
                    event.animationName !== "hide-aside"
                ) {
                    return;
                }
                pageLayout.removeEventListener("animationend", retry);
                openViewer(groupId, index, trigger);
            };
            pageLayout.addEventListener("animationend", retry);
            return;
        }
        const media = groups.get(groupId);
        if (!media?.[index]) return;

        currentGroup = groupId;
        currentIndex = index;
        lastFocused =
            trigger ??
            (document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null);
        renderMedia();

        viewer.classList.remove("view-box-hide");
        viewer.classList.add("view-box-show");
        viewer.setAttribute("aria-hidden", "false");
        if (pageLayout) pageLayout.inert = true;
        if (shareContainer) shareContainer.inert = true;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                closeButton.focus({ preventScroll: true });
            });
        });
    };

    const closeViewer = () => {
        if (!isOpen()) return;

        stopVideo();
        viewer.classList.remove(
            "view-box-show",
            "is-loading",
            "has-error",
            "is-video",
        );
        viewer.classList.add("view-box-hide");
        viewer.setAttribute("aria-hidden", "true");
        if (pageLayout) pageLayout.inert = false;
        if (shareContainer) shareContainer.inert = false;
        resetTransform();
        if (lastFocused?.isConnected && !lastFocused.inert) {
            lastFocused.focus({ preventScroll: true });
        }
        lastFocused = null;
    };

    const moveMedia = (direction: -1 | 1) => {
        const media = currentMedia();
        if (media.length < 2) return;
        currentIndex =
            (currentIndex + direction + media.length) % media.length;
        renderMedia();
    };

    const addKeyboardActivation = (
        trigger: HTMLElement,
        activate: () => void,
    ) => {
        trigger.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
            }
        });
        trigger.addEventListener("keyup", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            activate();
        });
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
                type: "image",
                url: image.currentSrc || image.src,
                alt: image.alt,
            })),
        );
        articleImages.forEach((image, index) => {
            image.tabIndex = 0;
            image.setAttribute("role", "button");
            image.setAttribute("aria-haspopup", "dialog");
            image.setAttribute(
                "aria-label",
                image.alt
                    ? `查看大图：${image.alt}`
                    : `查看文章图片 ${index + 1}`,
            );
            image.addEventListener("click", (event) => {
                event.preventDefault();
                openViewer(groupId, index, image);
            });
            addKeyboardActivation(image, () => {
                openViewer(groupId, index, image);
            });
        });
    };

    const collectMomentMedia = () => {
        document
            .querySelectorAll<HTMLElement>("[data-media-group]")
            .forEach((section) => {
                if (initializedSections.has(section)) return;
                const groupId = section.dataset.mediaGroup;
                if (!groupId) return;

                let media: ViewerMedia[] = [];
                try {
                    const parsed = JSON.parse(section.dataset.media ?? "[]");
                    if (Array.isArray(parsed)) {
                        media = parsed.filter(
                            (item): item is ViewerMedia =>
                                (item?.type === "image" ||
                                    item?.type === "video") &&
                                typeof item.url === "string" &&
                                typeof item.alt === "string",
                        );
                    }
                } catch {
                    media = [];
                }
                if (media.length === 0) return;

                groups.set(groupId, media);
                initializedSections.add(section);
                section
                    .querySelectorAll<HTMLElement>("[data-media-index]")
                    .forEach((trigger) => {
                        const index = Number(trigger.dataset.mediaIndex);
                        if (!Number.isInteger(index) || !media[index]) return;
                        trigger.setAttribute("aria-haspopup", "dialog");
                        trigger.addEventListener("click", () => {
                            openViewer(groupId, index, trigger);
                        });
                    });
            });
    };

    collectArticleImages();
    collectMomentMedia();
    document.addEventListener("moments:updated", collectMomentMedia);

    closeButton.addEventListener("click", closeViewer);
    previousButton.addEventListener("click", () => moveMedia(-1));
    nextButton.addEventListener("click", () => moveMedia(1));
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
            if (!isCurrentImage()) return;
            event.preventDefault();
            setScale(scale + (event.deltaY < 0 ? 0.25 : -0.25));
        },
        { passive: false },
    );

    viewerStage.addEventListener("pointerdown", (event) => {
        if (!isCurrentImage()) return;
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
            moveMedia(deltaX < 0 ? 1 : -1);
        }

        activePointer = null;
        viewerStage.classList.remove("is-dragging");
    };

    viewerStage.addEventListener("pointerup", finishPointerGesture);
    viewerStage.addEventListener("pointercancel", finishPointerGesture);

    document.addEventListener("keydown", (event) => {
        if (!isOpen()) return;

        if (event.key === "Escape") {
            event.preventDefault();
            closeViewer();
        }
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveMedia(-1);
        }
        if (event.key === "ArrowRight") {
            event.preventDefault();
            moveMedia(1);
        }
        if (event.key === "+" || event.key === "=") {
            setScale(scale + 0.25);
        }
        if (event.key === "-") setScale(scale - 0.25);
        if (event.key === "0") resetTransform();

        if (event.key === "Tab") {
            const focusable = Array.from(
                viewer.querySelectorAll<HTMLElement>(
                    "button:not([hidden]):not([disabled]), video:not([hidden]), [tabindex]:not([tabindex='-1'])",
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

export {};
