import {
    buildTocHierarchy,
    buildTocSlides,
    clampTocSlideIndex,
    getSwipeSlideOffset,
    getWheelSlideOffset,
    preserveTocSlideIndex,
    type TocNode,
    type TocSlide,
} from "./article-toc-model";

const TITLE_OVERFLOW_TOLERANCE = 5;
const TITLE_SCROLL_SPEED = 46;
const TITLE_SCROLL_TRAVEL_RATIO = .8;
const TITLE_SCROLL_MIN_DURATION = .8;
const TITLE_SCROLL_MAX_DURATION = 2.2;
const READING_LINE_OFFSET = 68;
const POINTER_CAPTURE_DISTANCE = 8;
const POINTER_SWITCH_DISTANCE = 38;
const LINK_CLICK_SUPPRESSION_TIME = 80;
const WHEEL_MIN_DELTA = 4;
const WHEEL_SWITCH_INTERVAL = 280;

const initArticleToc = () => {
    const articleToc =
        document.querySelector<HTMLElement>("[data-article-toc]");
    const scrollContainer =
        document.querySelector<HTMLElement>(".main");
    if (!articleToc || !scrollContainer) return;

    const tocToggleButton =
        articleToc.querySelector<HTMLButtonElement>(
            "[data-article-toc-toggle]",
        );
    const summaryCurrent =
        articleToc.querySelector<HTMLElement>(
            "[data-toc-summary-current]",
        );
    const tocPanel =
        articleToc.querySelector<HTMLElement>("#articleTocPanel");
    const tocViewport =
        articleToc.querySelector<HTMLElement>("[data-toc-viewport]");
    const tocTrack =
        articleToc.querySelector<HTMLElement>("[data-toc-track]");
    const previousLevelButton =
        articleToc.querySelector<HTMLButtonElement>(
            "[data-toc-previous]",
        );
    const nextLevelButton =
        articleToc.querySelector<HTMLButtonElement>("[data-toc-next]");
    const levelStatus =
        articleToc.querySelector<HTMLElement>(
            "[data-toc-level-status]",
        );
    const articleTitle =
        document.querySelector<HTMLElement>(".article-title");
    const articleLead =
        document.querySelector<HTMLElement>(".article-lead");

    if (
        !tocToggleButton ||
        !summaryCurrent ||
        !tocPanel ||
        !tocViewport ||
        !tocTrack ||
        !previousLevelButton ||
        !nextLevelButton ||
        !levelStatus ||
        !articleTitle ||
        !articleLead
    ) {
        return;
    }

    const headingData = Array.from(
        articleToc.querySelectorAll<HTMLElement>("[data-toc-heading]"),
    );
    const headingSources = headingData.flatMap((item) => {
        const depth = Number(item.dataset.depth);
        const id = item.dataset.slug || "";
        const heading = document.getElementById(id);
        if (!heading || !Number.isFinite(depth)) return [];

        return [{
            id,
            text: item.textContent?.trim() || id,
            depth,
            heading,
        }];
    });
    const { nodes: headingNodes } = buildTocHierarchy(
        {
            id: "article-start",
            text: articleTitle.textContent?.trim() || "本文",
            depth: 1,
            heading: articleLead,
        },
        headingSources,
    );

    const firstHeading = headingNodes[0];
    if (!firstHeading) return;

    let tocFrame = 0;
    let summaryMarqueeFrame = 0;
    let activeNode = firstHeading;
    let tocSlides: TocSlide<HTMLElement>[] = [];
    let activeSlideIndex = 0;
    let pointerStartX: number | undefined;
    let pointerStartY: number | undefined;
    let activePointerId: number | undefined;
    let touchStartX: number | undefined;
    let touchStartY: number | undefined;
    let suppressLinkClickUntil = 0;
    let lastWheelSwitch = 0;

    const syncSummaryMarquee = () => {
        summaryMarqueeFrame = 0;
        summaryCurrent.classList.remove("is-overflowing");
        tocToggleButton.classList.remove("has-overflowing-title");

        const buttonStyle = window.getComputedStyle(tocToggleButton);
        const contentWidth =
            tocToggleButton.clientWidth -
            Number.parseFloat(buttonStyle.paddingLeft) -
            Number.parseFloat(buttonStyle.paddingRight);
        const overflowDistance = Math.max(
            0,
            summaryCurrent.scrollWidth - contentWidth,
        );
        const isOverflowing =
            overflowDistance > TITLE_OVERFLOW_TOLERANCE;
        const scrollDuration = Math.min(
            TITLE_SCROLL_MAX_DURATION,
            Math.max(
                TITLE_SCROLL_MIN_DURATION,
                overflowDistance /
                    (TITLE_SCROLL_SPEED * TITLE_SCROLL_TRAVEL_RATIO),
            ),
        );

        summaryCurrent.style.setProperty(
            "--toc-title-scroll-distance",
            `${overflowDistance}px`,
        );
        summaryCurrent.style.setProperty(
            "--toc-title-duration",
            `${scrollDuration}s`,
        );
        summaryCurrent.classList.toggle(
            "is-overflowing",
            isOverflowing,
        );
        tocToggleButton.classList.toggle(
            "has-overflowing-title",
            isOverflowing,
        );
    };

    const requestSummaryMarqueeSync = () => {
        cancelAnimationFrame(summaryMarqueeFrame);
        summaryMarqueeFrame = requestAnimationFrame(
            syncSummaryMarquee,
        );
    };

    const createHeadingLink = (
        node: TocNode<HTMLElement>,
        className?: string,
    ) => {
        const link = document.createElement("a");
        link.href = `#${node.id}`;
        link.textContent = node.text;
        link.title = node.text;
        link.draggable = false;
        if (className) link.className = className;
        return link;
    };

    const updateSlidePosition = (
        nextIndex: number,
        focusViewport = false,
    ) => {
        if (tocSlides.length === 0) return;
        activeSlideIndex = clampTocSlideIndex(
            nextIndex,
            tocSlides.length,
        );
        tocTrack.style.transform =
            `translateX(-${activeSlideIndex * 100}%)`;
        previousLevelButton.disabled = activeSlideIndex === 0;
        nextLevelButton.disabled =
            activeSlideIndex === tocSlides.length - 1;
        levelStatus.textContent =
            `${activeSlideIndex + 1} / ${tocSlides.length}`;

        if (focusViewport) {
            tocViewport.focus({ preventScroll: true });
        }
    };

    const renderHierarchy = (
        node: TocNode<HTMLElement>,
        showDefault = false,
    ) => {
        const previousSlideCount = tocSlides.length;
        const previousIndex = activeSlideIndex;
        const nextSlides = buildTocSlides(node);
        tocSlides = nextSlides;
        tocTrack.replaceChildren();

        for (const { parent, activeChild } of tocSlides) {
            const slide = document.createElement("section");
            slide.className = "article-toc-slide";
            slide.setAttribute(
                "aria-label",
                `${parent.text}的子标题`,
            );

            const headingList = document.createElement("ol");
            headingList.className = "article-toc-heading-list";
            const parentItem = document.createElement("li");
            parentItem.className = "article-toc-parent-item";
            parentItem.append(
                createHeadingLink(
                    parent,
                    "article-toc-parent-link",
                ),
            );
            headingList.append(parentItem);

            for (const child of parent.children) {
                const listItem = document.createElement("li");
                const link = createHeadingLink(child);
                if (child === activeChild) {
                    link.classList.add("is-active");
                    link.setAttribute("aria-current", "location");
                }
                listItem.append(link);
                headingList.append(listItem);
            }

            slide.append(headingList);
            tocTrack.append(slide);
        }

        const nextIndex = preserveTocSlideIndex(
            previousSlideCount,
            previousIndex,
            tocSlides.length,
            showDefault,
        );
        updateSlidePosition(nextIndex);
    };

    const updateSummary = () => {
        summaryCurrent.textContent = activeNode.text;
        summaryCurrent.title = activeNode.text;
        tocToggleButton.setAttribute(
            "aria-label",
            `展开标题导航，当前标题：${activeNode.text}`,
        );
        requestSummaryMarqueeSync();
    };

    const findActiveHeading = () => {
        const readingLine =
            scrollContainer.getBoundingClientRect().top +
            READING_LINE_OFFSET;
        let nextActiveNode = firstHeading;

        for (const node of headingNodes) {
            if (
                node.heading.getBoundingClientRect().top <= readingLine
            ) {
                nextActiveNode = node;
            } else {
                break;
            }
        }

        return nextActiveNode;
    };

    const syncActiveHeading = () => {
        tocFrame = 0;
        const nextActiveNode = findActiveHeading();
        if (activeNode === nextActiveNode) return;
        activeNode = nextActiveNode;
        updateSummary();
        renderHierarchy(activeNode);
    };

    const requestTocSync = () => {
        if (tocFrame) return;
        tocFrame = requestAnimationFrame(syncActiveHeading);
    };

    const setTocOpen = (isOpen: boolean) => {
        articleToc.classList.remove("is-closing");
        articleToc.classList.toggle("is-open", isOpen);
        tocToggleButton.setAttribute(
            "aria-expanded",
            String(isOpen),
        );

        if (isOpen) {
            tocPanel.hidden = false;
            renderHierarchy(activeNode, true);
            tocToggleButton.setAttribute(
                "aria-label",
                "收起标题导航",
            );
        } else {
            if (
                tocPanel.hidden ||
                window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                ).matches
            ) {
                tocPanel.hidden = true;
            } else {
                articleToc.classList.add("is-closing");
            }
            tocToggleButton.setAttribute(
                "aria-label",
                `展开标题导航，当前标题：${activeNode.text}`,
            );
        }
    };

    tocPanel.addEventListener("animationend", (event) => {
        if (
            event.target !== tocPanel ||
            event.animationName !== "article-toc-collapse" ||
            !articleToc.classList.contains("is-closing")
        ) {
            return;
        }

        articleToc.classList.remove("is-closing");
        tocPanel.hidden = true;
    });

    const jumpToHeading = (
        target: HTMLElement,
        hash: string,
    ) => {
        setTocOpen(false);
        if (window.location.hash === hash) {
            window.history.replaceState(null, "", hash);
        } else {
            window.history.pushState(null, "", hash);
        }
        target.scrollIntoView({
            behavior: "auto",
            block: "start",
        });
    };

    const resetPointerState = (pointerId: number) => {
        pointerStartX = undefined;
        pointerStartY = undefined;
        activePointerId = undefined;
        tocViewport.classList.remove("is-dragging");
        if (tocViewport.hasPointerCapture(pointerId)) {
            tocViewport.releasePointerCapture(pointerId);
        }
    };

    const resetTouchState = () => {
        touchStartX = undefined;
        touchStartY = undefined;
        tocViewport.classList.remove("is-dragging");
    };

    const switchLevelFromSwipe = (
        distanceX: number,
        distanceY: number,
    ) => {
        const offset = getSwipeSlideOffset(
            distanceX,
            distanceY,
            POINTER_SWITCH_DISTANCE,
        );
        if (offset === 0) return;

        suppressLinkClickUntil =
            performance.now() + LINK_CLICK_SUPPRESSION_TIME;
        updateSlidePosition(activeSlideIndex + offset);
    };

    tocToggleButton.addEventListener("click", () => {
        if (articleToc.classList.contains("is-open")) {
            jumpToHeading(
                activeNode.heading,
                `#${encodeURIComponent(activeNode.id)}`,
            );
        } else {
            setTocOpen(true);
        }
    });

    tocPanel.addEventListener("click", (event) => {
        if (performance.now() < suppressLinkClickUntil) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        if (!(event.target instanceof Element)) return;
        const link = event.target.closest<HTMLAnchorElement>(
            'a[href^="#"]',
        );
        if (!link) return;

        event.preventDefault();
        const id = decodeURIComponent(link.hash.slice(1));
        const target = document.getElementById(id);
        if (target) jumpToHeading(target, link.hash);
    });

    tocPanel.addEventListener("dragstart", (event) => {
        event.preventDefault();
    });

    previousLevelButton.addEventListener("click", () => {
        updateSlidePosition(activeSlideIndex - 1, true);
    });
    nextLevelButton.addEventListener("click", () => {
        updateSlidePosition(activeSlideIndex + 1, true);
    });

    tocViewport.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            updateSlidePosition(activeSlideIndex - 1);
        }
        if (event.key === "ArrowRight") {
            event.preventDefault();
            updateSlidePosition(activeSlideIndex + 1);
        }
    });

    tocViewport.addEventListener("pointerdown", (event) => {
        if (
            event.pointerType === "touch" ||
            !event.isPrimary ||
            event.button !== 0
        ) {
            return;
        }
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
        activePointerId = event.pointerId;
    });

    tocViewport.addEventListener("pointermove", (event) => {
        if (
            pointerStartX === undefined ||
            pointerStartY === undefined ||
            event.pointerId !== activePointerId ||
            tocViewport.hasPointerCapture(event.pointerId)
        ) {
            return;
        }

        const distanceX = Math.abs(event.clientX - pointerStartX);
        const distanceY = Math.abs(event.clientY - pointerStartY);
        if (
            distanceX < POINTER_CAPTURE_DISTANCE ||
            distanceX <= distanceY
        ) {
            return;
        }

        tocViewport.classList.add("is-dragging");
        tocViewport.setPointerCapture(event.pointerId);
    });

    tocViewport.addEventListener("pointerup", (event) => {
        if (
            pointerStartX === undefined ||
            event.pointerId !== activePointerId
        ) {
            return;
        }

        const distanceX = event.clientX - pointerStartX;
        const distanceY =
            event.clientY - (pointerStartY ?? event.clientY);
        resetPointerState(event.pointerId);
        switchLevelFromSwipe(distanceX, distanceY);
    });

    tocViewport.addEventListener("pointercancel", (event) => {
        if (event.pointerType === "touch") return;
        resetPointerState(event.pointerId);
    });

    tocViewport.addEventListener(
        "touchstart",
        (event) => {
            if (event.touches.length !== 1) return;
            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
        },
        { passive: true },
    );

    tocViewport.addEventListener(
        "touchmove",
        (event) => {
            if (
                touchStartX === undefined ||
                touchStartY === undefined ||
                event.touches.length !== 1
            ) {
                return;
            }

            const distanceX =
                event.touches[0].clientX - touchStartX;
            const distanceY =
                event.touches[0].clientY - touchStartY;
            if (
                Math.abs(distanceX) < POINTER_CAPTURE_DISTANCE ||
                Math.abs(distanceX) <= Math.abs(distanceY)
            ) {
                return;
            }

            event.preventDefault();
            tocViewport.classList.add("is-dragging");
        },
        { passive: false },
    );

    tocViewport.addEventListener(
        "touchend",
        (event) => {
            if (
                touchStartX === undefined ||
                touchStartY === undefined ||
                event.changedTouches.length !== 1
            ) {
                resetTouchState();
                return;
            }

            const distanceX =
                event.changedTouches[0].clientX - touchStartX;
            const distanceY =
                event.changedTouches[0].clientY - touchStartY;
            resetTouchState();
            switchLevelFromSwipe(distanceX, distanceY);
        },
        { passive: true },
    );

    tocViewport.addEventListener(
        "touchcancel",
        resetTouchState,
        { passive: true },
    );

    tocViewport.addEventListener(
        "wheel",
        (event) => {
            const offset = getWheelSlideOffset(
                event.deltaX,
                event.deltaY,
                WHEEL_MIN_DELTA,
            );
            if (offset === 0) return;

            event.preventDefault();
            const now = performance.now();
            if (now - lastWheelSwitch < WHEEL_SWITCH_INTERVAL) return;

            lastWheelSwitch = now;
            updateSlidePosition(activeSlideIndex + offset);
        },
        { passive: false },
    );

    const closeTocFromOutside = (event: Event) => {
        if (
            articleToc.classList.contains("is-open") &&
            event.target instanceof Node &&
            !articleToc.contains(event.target)
        ) {
            setTocOpen(false);
        }
    };

    document.addEventListener(
        "pointerdown",
        closeTocFromOutside,
        { passive: true },
    );
    document.addEventListener(
        "touchstart",
        closeTocFromOutside,
        { passive: true },
    );
    document.addEventListener(
        "wheel",
        closeTocFromOutside,
        { capture: true, passive: true },
    );
    document.addEventListener(
        "pointerover",
        (event) => {
            if (event.target instanceof HTMLIFrameElement) {
                closeTocFromOutside(event);
            }
        },
        { passive: true },
    );
    document.addEventListener("click", closeTocFromOutside);

    window.addEventListener("blur", () => {
        requestAnimationFrame(() => {
            const focusedElement = document.activeElement;
            if (
                articleToc.classList.contains("is-open") &&
                focusedElement instanceof HTMLIFrameElement &&
                !articleToc.contains(focusedElement)
            ) {
                setTocOpen(false);
            }
        });
    });

    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            articleToc.classList.contains("is-open")
        ) {
            setTocOpen(false);
            tocToggleButton.focus({ preventScroll: true });
        }
    });

    scrollContainer.addEventListener("scroll", requestTocSync, {
        passive: true,
    });
    window.addEventListener("resize", requestTocSync);
    window.addEventListener("resize", requestSummaryMarqueeSync);

    activeNode = findActiveHeading();
    updateSummary();
    renderHierarchy(activeNode, true);
    document.fonts?.ready.then(requestSummaryMarqueeSync);
};

initArticleToc();
