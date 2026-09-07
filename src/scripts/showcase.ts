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

    const activateShowcase = (requestedId: string, updateUrl: boolean) => {
        const id = panels.some(
            (panel) => panel.dataset.showcasePanel === requestedId,
        )
            ? requestedId
            : panels[0]?.dataset.showcasePanel;
        if (!id) return;

        for (const tab of tabs) {
            const active = tab.dataset.showcaseTab === id;
            tab.classList.toggle("active", active);
            if (active) tab.setAttribute("aria-current", "page");
            else tab.removeAttribute("aria-current");
        }
        for (const panel of panels) {
            panel.hidden = panel.dataset.showcasePanel !== id;
        }

        scheduleDescriptionSync();
        if (updateUrl && location.hash !== `#${id}`) {
            history.pushState(null, "", `/show#${id}`);
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
