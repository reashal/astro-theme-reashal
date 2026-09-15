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

const READING_LINE_OFFSET = 68;
const POINTER_CAPTURE_DISTANCE = 8;
const POINTER_SWITCH_DISTANCE = 38;
const LINK_CLICK_SUPPRESSION_TIME = 80;
const WHEEL_MIN_DELTA = 4;
const WHEEL_SWITCH_INTERVAL = 280;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const isPanelVisible = (capsule: HTMLElement) =>
    capsule.classList.contains("is-open") ||
    capsule.classList.contains("is-closing");

// 两类胶囊共用外部交互判断，内部列表滚动不触发收起。
const bindOutsideDismiss = (capsule: HTMLElement, close: () => void) => {
    let dismissGesture = false;
    const isOutside = (event: Event) => event.target instanceof Node && !capsule.contains(event.target);
    const consume = (event: Event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
    };
    document.addEventListener("pointerdown", (event) => {
        dismissGesture = isOutside(event) && isPanelVisible(capsule);
        if (!dismissGesture) return;
        consume(event);
        if (capsule.classList.contains("is-open")) close();
    }, true);
    document.addEventListener("pointerup", (event) => {
        if (dismissGesture) consume(event);
    }, true);
    document.addEventListener("pointercancel", () => { dismissGesture = false; }, true);
    document.addEventListener("keydown", () => { dismissGesture = false; }, true);
    const consumeDismissClick = (event: MouseEvent) => {
        // pointerdown 已收起面板，仍需拦截同一次手势随后产生的 click。
        if (dismissGesture || (isOutside(event) && isPanelVisible(capsule))) {
            consume(event);
            if (capsule.classList.contains("is-open")) close();
        }
        dismissGesture = false;
    };
    document.addEventListener("click", consumeDismissClick, true);
    document.addEventListener("auxclick", consumeDismissClick, true);
    const dismiss = (event: Event) => {
        // 拖动阅读滑轨或回顶产生的滚动不属于外部失焦。
        if (event.type === "scroll" && capsule.querySelector("[data-reading-seeking]")) return;
        if (capsule.classList.contains("is-open") &&
            event.target instanceof Node && !capsule.contains(event.target)) close();
    };
    for (const type of ["wheel", "scroll"]) {
        document.addEventListener(type, dismiss, { capture: true, passive: true });
    }
    document.addEventListener("pointerover", (event) => {
        if (event.target instanceof HTMLIFrameElement) dismiss(event);
    }, { passive: true });
    window.addEventListener("blur", () => {
        requestAnimationFrame(() => {
            const focused = document.activeElement;
            if (capsule.classList.contains("is-open") &&
                focused instanceof HTMLIFrameElement && !capsule.contains(focused)) close();
        });
    });
};

// 按真实入口尺寸收拢；中途反向操作从当前画面接续，避免跳帧。
const preparePanelMotion = (capsule: HTMLElement, panel: HTMLElement, opening: boolean) => {
    const current = !panel.hidden ? getComputedStyle(panel) : null;
    const transform = current?.transform;
    const opacity = current?.opacity;
    panel.hidden = false;
    panel.style.setProperty("--toc-entry-scale-x", String(capsule.offsetWidth / panel.offsetWidth));
    panel.style.setProperty("--toc-entry-scale-y", String(Math.min(1, capsule.offsetHeight / panel.offsetHeight)));
    const interrupted = opening ? capsule.classList.contains("is-closing") : capsule.classList.contains("is-open");
    panel.style.setProperty("--toc-motion-from", interrupted && transform && transform !== "none" ? transform : "translateY(-50%) scale(var(--toc-entry-scale-x), var(--toc-entry-scale-y))");
    panel.style.setProperty("--toc-motion-opacity", interrupted && opacity ? opacity : "0");
};

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
    const searchToggle =
        articleToc.querySelector<HTMLButtonElement>("#docsSearchToggle");
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
    if (articleToc.dataset.hasDirectory === "false" && tocToggleButton && tocPanel) {
        const pageName = articleToc.dataset.pageName || "页面";
        let restoreFocus = false;
        const finishClose = () => {
            articleToc.classList.remove("is-closing");
            tocPanel.hidden = true;
            articleToc.dispatchEvent(new Event("article-tools:closed"));
            if (restoreFocus) tocToggleButton.focus({ preventScroll: true });
            restoreFocus = false;
        };
        const setOpen = (open: boolean) => {
            if (open === articleToc.classList.contains("is-open")) return;
            preparePanelMotion(articleToc, tocPanel, open);
            articleToc.classList.remove("is-closing");
            articleToc.classList.toggle("is-open", open);
            tocPanel.inert = !open;
            tocToggleButton.setAttribute("aria-expanded", String(open));
            tocToggleButton.setAttribute("aria-label", `${open ? "收起" : "展开"}${pageName}工具`);
            if (open) {
                tocPanel.hidden = false;
                if (searchToggle?.getAttribute("aria-expanded") !== "true") searchToggle?.click();
            } else if (reducedMotion.matches) {
                finishClose();
            } else {
                articleToc.classList.add("is-closing");
            }
        };
        tocToggleButton.setAttribute("aria-label", `展开${pageName}工具`);
        tocToggleButton.addEventListener("click", () => setOpen(!articleToc.classList.contains("is-open")));
        articleToc.addEventListener("article-tools:open", () => {
            if (!articleToc.classList.contains("is-open")) setOpen(true);
        });
        articleToc.addEventListener("article-tools:close", () => {
            restoreFocus = true;
            setOpen(false);
        });
        tocPanel.addEventListener("animationend", (event) => {
            if (event.target === tocPanel && event.animationName === "article-toc-collapse" && articleToc.classList.contains("is-closing")) finishClose();
        });
        bindOutsideDismiss(articleToc, () => setOpen(false));
        if (searchToggle?.getAttribute("aria-expanded") === "true") setOpen(true);
        return;
    }
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
    const panelTitle =
        articleToc.querySelector<HTMLAnchorElement>("[data-toc-panel-title]");

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

    const summaryTicks = Array.from(articleToc.querySelectorAll<HTMLElement>("[data-toc-tick]"));
    const syncSummaryTicks = () => {
        const current = Math.max(0, summaryTicks.findIndex(tick => tick.dataset.tocTick === activeNode.id));
        const start = Math.max(0, Math.min(current - 4, summaryTicks.length - 9));
        summaryTicks.forEach((tick, index) => {
            tick.hidden = index < start || index >= start + 9;
            tick.classList.toggle("is-current", index === current);
            tick.classList.toggle("is-read", index < current);
        });
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
        if (panelTitle) {
            const parent = tocSlides[activeSlideIndex].parent;
            panelTitle.textContent = parent.text;
            panelTitle.title = parent.text;
            panelTitle.href = `#${encodeURIComponent(parent.id)}`;
        }

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
        syncSummaryTicks();
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
        if (articleToc.classList.contains("is-open") && !articleToc.querySelector("[data-reading-seeking]")) {
            renderHierarchy(activeNode);
        }
    };

    const requestTocSync = () => {
        if (tocFrame) return;
        tocFrame = requestAnimationFrame(syncActiveHeading);
    };

    let restoreToggleFocus = false;
    articleToc.addEventListener("article-tools:closed", () => {
        if (restoreToggleFocus) tocToggleButton.focus({ preventScroll: true });
        restoreToggleFocus = false;
    });
    const setTocOpen = (isOpen: boolean) => {
        if (isOpen === articleToc.classList.contains("is-open")) return;
        preparePanelMotion(articleToc, tocPanel, isOpen);
        tocPanel.inert = !isOpen;
        articleToc.classList.remove("is-closing");
        articleToc.classList.toggle("is-open", isOpen);
        tocToggleButton.setAttribute(
            "aria-expanded",
            String(isOpen),
        );

        if (isOpen) {
            restoreToggleFocus = false;
            tocPanel.hidden = false;
            renderHierarchy(activeNode, true);
            if (document.activeElement === tocToggleButton) tocViewport.focus({ preventScroll: true });
            tocToggleButton.setAttribute(
                "aria-label",
                "收起标题导航",
            );
        } else {
            if (
                tocPanel.hidden ||
                reducedMotion.matches
            ) {
                tocPanel.hidden = true;
                articleToc.dispatchEvent(new Event("article-tools:closed"));
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
        articleToc.dispatchEvent(new Event("article-tools:closed"));
    });
    articleToc.addEventListener("article-tools:open", () => {
        if (!articleToc.classList.contains("is-open")) setTocOpen(true);
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

    bindOutsideDismiss(articleToc, () => setTocOpen(false));

    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            !event.defaultPrevented &&
            searchToggle?.getAttribute("aria-expanded") !== "true" &&
            articleToc.classList.contains("is-open")
        ) {
            restoreToggleFocus = true;
            setTocOpen(false);
        }
    });

    scrollContainer.addEventListener("scroll", requestTocSync, {
        passive: true,
    });
    window.addEventListener("resize", requestTocSync);

    activeNode = findActiveHeading();
    updateSummary();
    renderHierarchy(activeNode, true);
    if (searchToggle?.getAttribute("aria-expanded") === "true") {
        setTocOpen(true);
    }
};

initArticleToc();
