import qrcode from "qrcode-generator";

const shareContainer =
    document.querySelector<HTMLElement>(".share-container[data-site-name]");
const shareButton = document.getElementById("share-btn");
const overlay = document.getElementById("share-overlay");
const copyButton = document.getElementById("copy-btn");
const titleElement = document.getElementById("share-card-title");
const descriptionElement = document.getElementById("share-card-desc");
const linkInput = document.getElementById(
    "share-link-input",
) as HTMLInputElement | null;
const qrCanvas = document.getElementById(
    "qrcode-canvas",
) as HTMLCanvasElement | null;

if (
    shareContainer &&
    shareButton &&
    overlay &&
    copyButton &&
    titleElement &&
    descriptionElement &&
    linkInput &&
    qrCanvas
) {
    const siteName = shareContainer.dataset.siteName ?? "";
    let currentTitle = "";
    let currentUrl = "";
    let currentDescription = "";

    const getPaletteColor = (name: string) =>
        getComputedStyle(document.documentElement)
            .getPropertyValue(name)
            .trim();

    const drawQrCode = () => {
        const context = qrCanvas.getContext("2d");
        if (!context) return;

        const size = 150;
        qrCanvas.width = size;
        qrCanvas.height = size;

        try {
            const qr = qrcode(0, "M");
            qr.addData(currentUrl);
            qr.make();

            context.fillStyle = getPaletteColor("--color-white");
            context.fillRect(0, 0, size, size);

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

    shareButton.addEventListener("click", () => {
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

        overlay.classList.add("show");
        drawQrCode();
    });

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) overlay.classList.remove("show");
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
            alert("已复制到剪贴板");
        } catch {
            linkInput.select();
            alert("复制失败，请手动复制链接");
        }
    });
}
