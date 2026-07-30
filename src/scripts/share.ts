const shareContainer =
    document.querySelector<HTMLElement>(".share-container[data-site-name]");
const shareButton = document.getElementById("share-btn");
const overlay = document.getElementById("share-overlay");
const closeButton = document.getElementById("share-close");
const copyButton = document.getElementById("copy-btn");
const titleElement = document.getElementById("share-card-title");
const descriptionElement = document.getElementById("share-card-desc");
const linkInput = document.getElementById(
    "share-link-input",
) as HTMLInputElement | null;
const qrCanvas = document.getElementById(
    "qrcode-canvas",
) as HTMLCanvasElement | null;
const feedback = document.getElementById("share-feedback");
const pageLayout = document.querySelector<HTMLElement>("body > main");

if (
    shareContainer &&
    shareButton &&
    overlay &&
    closeButton &&
    copyButton &&
    titleElement &&
    descriptionElement &&
    linkInput &&
    qrCanvas &&
    feedback
) {
    const siteName = shareContainer.dataset.siteName ?? "";
    let currentTitle = "";
    let currentUrl = "";
    let currentDescription = "";
    let lastFocused: HTMLElement | null = null;
    let closeTimer = 0;
    let qrCodeFactoryPromise: Promise<
        typeof import("qrcode-generator").default
    > | null = null;

    const isOpen = () => !overlay.hidden;
    const focusableSelector =
        "button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])";

    const setFeedback = (message: string) => {
        feedback.textContent = message;
    };

    const getPaletteColor = (name: string) =>
        getComputedStyle(document.documentElement)
            .getPropertyValue(name)
            .trim();

    const loadQrCodeFactory = () => {
        qrCodeFactoryPromise ??= import("qrcode-generator").then(
            ({ default: factory }) => factory,
        );
        return qrCodeFactoryPromise;
    };

    const drawQrCode = async (url: string) => {
        const context = qrCanvas.getContext("2d");
        if (!context) return;

        const size = 150;
        qrCanvas.width = size;
        qrCanvas.height = size;
        context.fillStyle = getPaletteColor("--color-white");
        context.fillRect(0, 0, size, size);

        try {
            const qrcode = await loadQrCodeFactory();
            if (url !== currentUrl) return;

            const qr = qrcode(0, "M");
            qr.addData(url);
            qr.make();

            const moduleCount = qr.getModuleCount();
            const moduleSize = size / moduleCount;
            context.fillStyle = getPaletteColor("--color-black");

            for (let row = 0; row < moduleCount; row += 1) {
                for (let column = 0; column < moduleCount; column += 1) {
                    if (!qr.isDark(row, column)) continue;
                    context.fillRect(
                        column * moduleSize,
                        row * moduleSize,
                        Math.ceil(moduleSize),
                        Math.ceil(moduleSize),
                    );
                }
            }
        } catch (error) {
            console.error("QRCode generation error:", error);
            context.fillStyle = getPaletteColor("--color-white");
            context.fillRect(0, 0, size, size);
            context.fillStyle = getPaletteColor("--color-black");
            context.font = "12px sans-serif";
            context.textAlign = "center";
            context.fillText("二维码生成失败", size / 2, size / 2);
        }
    };

    const openShare = () => {
        window.clearTimeout(closeTimer);
        currentUrl = window.location.href;
        currentTitle = document.title.split("｜")[0].trim();
        currentDescription =
            document
                .querySelector('meta[name="description"]')
                ?.getAttribute("content") ?? "";

        titleElement.textContent = currentTitle;
        descriptionElement.textContent = currentDescription;
        descriptionElement.hidden = !currentDescription;
        linkInput.value = currentUrl;
        setFeedback("");

        const focused = document.activeElement;
        lastFocused =
            focused instanceof HTMLElement &&
            !focused.closest("aside")
                ? focused
                : shareButton;
        overlay.hidden = false;
        overlay.setAttribute("aria-hidden", "false");
        if (pageLayout) pageLayout.inert = true;
        shareContainer.inert = true;
        void drawQrCode(currentUrl);
        requestAnimationFrame(() => {
            overlay.classList.add("show");
            closeButton.focus({ preventScroll: true });
        });
    };

    const closeShare = () => {
        if (!isOpen()) return;

        overlay.classList.remove("show");
        overlay.setAttribute("aria-hidden", "true");
        if (pageLayout) pageLayout.inert = false;
        shareContainer.inert = false;

        if (lastFocused?.isConnected && !lastFocused.inert) {
            lastFocused.focus({ preventScroll: true });
        } else {
            shareButton.focus({ preventScroll: true });
        }
        lastFocused = null;

        const finishClose = () => {
            overlay.hidden = true;
        };
        if (
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
            finishClose();
        } else {
            closeTimer = window.setTimeout(finishClose, 300);
        }
    };

    shareButton.addEventListener("click", openShare);
    closeButton.addEventListener("click", closeShare);

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeShare();
    });

    copyButton.addEventListener("click", async () => {
        const text = [
            `我从『${siteName}』为您分享了一篇文章～`,
            `标题：${currentTitle}`,
            `摘要：${currentDescription || "暂无摘要"}`,
            `链接：${currentUrl}`,
        ].join("\n");

        try {
            await navigator.clipboard.writeText(text);
            setFeedback("分享内容已复制");
        } catch {
            linkInput.select();
            linkInput.focus();
            setFeedback("自动复制失败，请手动复制链接");
        }
    });

    document.addEventListener("keydown", (event) => {
        if (!isOpen()) return;

        if (event.key === "Escape") {
            event.preventDefault();
            closeShare();
            return;
        }
        if (event.key !== "Tab") return;

        const focusable = Array.from(
            overlay.querySelectorAll<HTMLElement>(focusableSelector),
        ).filter((element) => !element.hidden);
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
    });
}
