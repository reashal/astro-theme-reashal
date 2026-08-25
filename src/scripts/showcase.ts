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
    let descriptionSyncFrame = 0;

    const syncDescriptionOverflow = () => {
        for (const description of descriptions) {
            const summary = description.querySelector<HTMLParagraphElement>("p");
            const isTruncated = summary
                ? summary.scrollHeight - summary.clientHeight > 1
                : false;
            description.classList.toggle("is-truncated", isTruncated);
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

    activateShowcase(location.hash.slice(1), false);

    const images = showcase.querySelectorAll<HTMLImageElement>(
        ".showcase-avatar img, .showcase-large-image img",
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
