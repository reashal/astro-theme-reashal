const showcase = document.querySelector<HTMLElement>(".showcase");

if (showcase) {
    const tabs = Array.from(
        showcase.querySelectorAll<HTMLAnchorElement>("[data-showcase-tab]"),
    );
    const panels = Array.from(
        showcase.querySelectorAll<HTMLElement>("[data-showcase-panel]"),
    );
    const descriptions = Array.from(
        showcase.querySelectorAll<HTMLElement>(".showcase-description"),
    );
    const linkDescriptionCards = Array.from(
        showcase.querySelectorAll<HTMLElement>(".showcase-link-card--friend"),
    );
    let descriptionSyncFrame = 0;

    const syncDescriptionOverflow = () => {
        for (const description of descriptions) {
            const summary = description.querySelector<HTMLParagraphElement>("p");
            const isTruncated = summary
                ? summary.scrollHeight - summary.clientHeight > 1
                : false;
            description.classList.toggle("is-truncated", isTruncated);
        }

        for (const card of linkDescriptionCards) {
            const viewport = card.querySelector<HTMLElement>(
                ".showcase-link-description-viewport",
            );
            const summary = card.querySelector<HTMLElement>(
                "[data-link-description]",
            );
            if (!viewport || !summary) continue;

            const scrollDistance = Math.max(
                0,
                summary.scrollWidth - viewport.clientWidth,
            );
            const scrollDuration = Math.min(
                2.8,
                Math.max(1.1, scrollDistance / 36.8),
            );

            summary.style.setProperty(
                "--showcase-link-description-distance",
                `${scrollDistance}px`,
            );
            summary.style.setProperty(
                "--showcase-link-description-duration",
                `${scrollDuration}s`,
            );
            card.classList.toggle(
                "is-description-truncated",
                scrollDistance > 1,
            );
        }
    };

    const scheduleDescriptionSync = () => {
        cancelAnimationFrame(descriptionSyncFrame);
        descriptionSyncFrame = requestAnimationFrame(syncDescriptionOverflow);
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let selectedId: string | undefined;
    let panelAnimation: Animation | undefined;
    let switchRevision = 0;

    const activateShowcase = async (requestedId: string, updateUrl: boolean) => {
        const id = panels.some(
            (panel) => panel.dataset.showcasePanel === requestedId,
        )
            ? requestedId
            : panels[0]?.dataset.showcasePanel;
        if (!id || id === selectedId) return;
        const animate = selectedId !== undefined;
        selectedId = id;
        const revision = ++switchRevision;
        const previous = panels.find((panel) => !panel.hidden);
        const next = panels.find((panel) => panel.dataset.showcasePanel === id)!;
        // 连续点击时从当前透明度接续，不闪回上一帧，也不排队播放。
        const previousOpacity = previous ? getComputedStyle(previous).opacity : "1";
        panelAnimation?.cancel();

        for (const tab of tabs) {
            const active = tab.dataset.showcaseTab === id;
            tab.classList.toggle("active", active);
            if (active) tab.setAttribute("aria-current", "page");
            else tab.removeAttribute("aria-current");
        }
        if (updateUrl && location.hash !== `#${id}`) {
            history.pushState(null, "", `/show#${id}`);
        }

        if (animate && previous && previous !== next) {
            panelAnimation = previous.animate(
                [{ opacity: previousOpacity }, { opacity: 0 }],
                { duration: reducedMotion.matches ? 50 : 80,
                    easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" },
            );
            await panelAnimation.finished.catch(() => {});
            if (revision !== switchRevision) return;
            panelAnimation.cancel();
        }

        for (const panel of panels) panel.hidden = panel !== next;
        scheduleDescriptionSync();

        if (animate) {
            panelAnimation = next.animate(
                [
                    { opacity: previous === next ? previousOpacity : 0,
                        transform: reducedMotion.matches || previous === next
                            ? "none" : "translateY(5px)" },
                    { opacity: 1, transform: "none" },
                ],
                { duration: reducedMotion.matches ? 100 : 180,
                    easing: "cubic-bezier(.22, 1, .36, 1)" },
            );
            await panelAnimation.finished.catch(() => {});
            if (revision !== switchRevision) return;
            panelAnimation = undefined;
        }
    };

    for (const tab of tabs) {
        tab.addEventListener("click", (event) => {
            event.preventDefault();
            activateShowcase(tab.dataset.showcaseTab ?? "", true);
        });
    }

    window.addEventListener("popstate", () => {
        activateShowcase(location.hash.slice(1), false);
    });
    window.addEventListener("resize", scheduleDescriptionSync);
    document.fonts.ready.then(scheduleDescriptionSync);

    activateShowcase(location.hash.slice(1), false);

    const images = showcase.querySelectorAll<HTMLImageElement>(
        ".showcase-avatar img, .showcase-large-image img, .showcase-link-avatar img",
    );
    for (const image of images) {
        const setLoaded = (loaded: boolean) => {
            image.hidden = !loaded;
            image.parentElement?.classList.toggle("no-image", !loaded);
        };

        if (image.complete) {
            setLoaded(image.naturalWidth > 0 && image.naturalHeight > 0);
            continue;
        }

        image.addEventListener("error", () => setLoaded(false), { once: true });
        image.addEventListener("load", () => setLoaded(true), { once: true });
    }
}

export {};
