const root = document.documentElement;

document.addEventListener(
    "pointerdown",
    () => {
        root.dataset.inputMode = "pointer";
    },
    { capture: true, passive: true },
);

document.addEventListener(
    "keydown",
    (event) => {
        if (
            event.key === "Escape" ||
            event.metaKey ||
            event.ctrlKey ||
            event.altKey
        ) {
            return;
        }
        root.dataset.inputMode = "keyboard";
    },
    { capture: true },
);
