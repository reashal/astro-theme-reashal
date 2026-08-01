const codeBlocks = document.querySelectorAll<HTMLElement>(
    ".article-content pre",
);

const createSvgElement = <K extends keyof SVGElementTagNameMap>(
    tagName: K,
    attributes: Record<string, string>,
) => {
    const element = document.createElementNS(
        "http://www.w3.org/2000/svg",
        tagName,
    );
    Object.entries(attributes).forEach(([name, value]) => {
        element.setAttribute(name, value);
    });
    return element;
};

const copyWithFallback = async (text: string) => {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const legacyDocument = document as unknown as {
        execCommand: (commandId: string) => boolean;
    };
    const copied = legacyDocument.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Copy command failed");
};

codeBlocks.forEach((codeBlock) => {
    if (codeBlock.dataset.copyEnhanced === "true") return;

    const code = codeBlock.querySelector("code");
    if (!code) return;

    codeBlock.dataset.copyEnhanced = "true";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy-button";
    button.setAttribute("aria-label", "复制代码");

    const icon = createSvgElement("svg", {
        viewBox: "0 0 24 24",
        "aria-hidden": "true",
    });
    const iconPath = createSvgElement("path", {
        d: "M8 8h10v10H8zM6 16H4V4h12v2",
    });
    icon.append(iconPath);

    const label = document.createElement("span");
    label.textContent = "复制";
    button.append(icon, label);

    let resetTimer = 0;
    const resetButton = () => {
        button.classList.remove("is-copied");
        button.setAttribute("aria-label", "复制代码");
        iconPath.setAttribute("d", "M8 8h10v10H8zM6 16H4V4h12v2");
        label.textContent = "复制";
    };

    button.addEventListener("click", async () => {
        window.clearTimeout(resetTimer);
        try {
            await copyWithFallback(code.textContent ?? "");
            button.classList.add("is-copied");
            button.setAttribute("aria-label", "代码已复制");
            iconPath.setAttribute("d", "m6.5 12.5 3.5 3.5 7.5-8");
            label.textContent = "已复制";
            resetTimer = window.setTimeout(resetButton, 1800);
        } catch {
            button.setAttribute("aria-label", "复制失败");
            label.textContent = "复制失败";
            resetTimer = window.setTimeout(resetButton, 1800);
        }
    });

    codeBlock.append(button);
});

export {};
