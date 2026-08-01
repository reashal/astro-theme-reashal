const feed = document.getElementById("moments-feed");
const list = document.getElementById("moments-list");
const loader = document.getElementById("moments-loader");
const footer = feed?.querySelector<HTMLElement>(".moments-footer");
const loaderText = loader?.querySelector<HTMLElement>(".moments-loader-text");

if (feed && list && loader && footer && loaderText) {
    const pageCount = Number(feed.dataset.pageCount ?? "1");
    let nextPage = Number(feed.dataset.nextPage ?? "2");
    let isLoading = false;

    const finish = () => {
        loader.hidden = true;
        footer.hidden = false;
        observer.disconnect();
    };

    const loadNextPage = async () => {
        if (isLoading || nextPage > pageCount) return false;

        isLoading = true;
        loader.classList.add("is-loading");
        loaderText.textContent = "正在翻开更早的时光";

        try {
            const response = await fetch(`/fragments/moments/${nextPage}/`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const template = document.createElement("template");
            template.innerHTML = await response.text();
            if (!template.content.querySelector(".moment")) {
                throw new Error("动态片段为空");
            }
            list.append(template.content);
            nextPage += 1;
            feed.dataset.nextPage = String(nextPage);
            document.dispatchEvent(new CustomEvent("moments:updated"));

            if (nextPage > pageCount) {
                finish();
            } else {
                loaderText.textContent = "过往还在岁月笺底";
            }
            return true;
        } catch {
            loader.classList.add("has-error");
            loaderText.textContent = "加载没有成功，点击再试一次";
            return false;
        } finally {
            isLoading = false;
            loader.classList.remove("is-loading");
        }
    };

    const hashTargetId = (() => {
        try {
            return decodeURIComponent(location.hash.slice(1));
        } catch {
            return "";
        }
    })();

    const scrollToHashTarget = () => {
        if (!hashTargetId) return false;
        const target = document.getElementById(hashTargetId);
        if (!target) return false;
        target.scrollIntoView({ block: "start" });
        return true;
    };

    const loadUntilHashTarget = async () => {
        if (!hashTargetId || scrollToHashTarget()) return;
        while (nextPage <= pageCount) {
            const loaded = await loadNextPage();
            if (!loaded) return;
            if (scrollToHashTarget()) return;
        }
    };

    const scrollRoot = document.querySelector<HTMLElement>(".main");
    const observer = new IntersectionObserver(
        (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                void loadNextPage();
            }
        },
        { root: scrollRoot, threshold: 0.25 },
    );

    loader.addEventListener("click", () => {
        loader.classList.remove("has-error");
        void loadUntilHashTarget();
    });

    if (nextPage <= pageCount) {
        observer.observe(loader);
    } else {
        finish();
    }
    void loadUntilHashTarget();
}

export {};
