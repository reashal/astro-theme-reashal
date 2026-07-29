interface PagefindResultData {
    url: string;
    excerpt: string;
    plain_excerpt: string;
    meta: Record<string, string>;
}

interface PagefindResult {
    data: () => Promise<PagefindResultData>;
}

interface PagefindModule {
    init: () => Promise<void>;
    options: (options: {
        ranking: {
            metaWeights: Record<string, number>;
        };
    }) => Promise<void>;
    debouncedSearch: (
        query: string,
        options: { filters: { section: string } },
        debounce: number,
    ) => Promise<{ results: PagefindResult[] } | null>;
}

const toggle = document.getElementById("docsSearchToggle");
const panel = document.getElementById("docsSearchPanel");
const input = document.getElementById(
    "docsSearchInput",
) as HTMLInputElement | null;
const prompt = document.getElementById("docsSearchPrompt");
const count = document.getElementById("docsSearchCount");
const empty = document.getElementById("docsSearchEmpty");
const resultsContainer = document.getElementById("docsSearchResults");
const resultTemplate = document.getElementById(
    "docsSearchResultTemplate",
) as HTMLTemplateElement | null;
const pagination = document.getElementById("docsSearchPagination");
const previousPage = document.getElementById(
    "docsSearchPrevious",
) as HTMLButtonElement | null;
const nextPage = document.getElementById(
    "docsSearchNext",
) as HTMLButtonElement | null;
const pageIndicator = document.getElementById("docsSearchPage");
const isDevelopment = import.meta.env.DEV;
const PAGE_SIZE = 6;
const developmentResults = isDevelopment
    ? Array.from(
          document.querySelectorAll<HTMLAnchorElement>(
              ".docs-search-result",
          ),
      )
    : [];

let pagefindPromise: Promise<PagefindModule> | null = null;
let searchSequence = 0;
let currentPage = 1;
let currentPagefindResults: PagefindResult[] = [];

const normalize = (value: string) =>
    value.normalize("NFKC").toLocaleLowerCase("zh-CN").trim();

const developmentIndex = developmentResults.map((result) => {
    const content = result.dataset.searchContent ?? "";
    return {
        result,
        content,
        normalizedContent: normalize(content),
        metadata: result.dataset.searchMetadata ?? "",
        description: result.dataset.searchDescription ?? "",
    };
});
type DevelopmentIndexEntry = (typeof developmentIndex)[number];
let currentDevelopmentResults: DevelopmentIndexEntry[] = [];

const updatePagination = (matches: number) => {
    const totalPages = Math.ceil(matches / PAGE_SIZE);
    if (pagination) pagination.hidden = totalPages <= 1;
    if (previousPage) previousPage.disabled = currentPage <= 1;
    if (nextPage) nextPage.disabled = currentPage >= totalPages;
    if (pageIndicator) {
        pageIndicator.textContent = `${currentPage} / ${totalPages}`;
    }
};

const showPrompt = (message = "输入关键词，寻找一篇随笔") => {
    if (prompt) {
        prompt.hidden = false;
        prompt.textContent = message;
    }
    if (count) count.hidden = true;
    if (empty) empty.hidden = true;
    if (pagination) pagination.hidden = true;
};

const showCount = (matches: number) => {
    if (prompt) prompt.hidden = true;
    if (count) {
        count.hidden = false;
        count.textContent = `找到 ${matches} 篇随笔`;
    }
    if (empty) empty.hidden = matches > 0;
};

const resetResults = () => {
    searchSequence += 1;
    currentPage = 1;
    currentDevelopmentResults = [];
    currentPagefindResults = [];

    if (isDevelopment) {
        developmentIndex.forEach(({ result, description }) => {
            result.hidden = true;
            const excerpt = result.querySelector("small");
            if (excerpt) excerpt.textContent = description;
        });
    } else {
        resultsContainer?.replaceChildren();
    }

    showPrompt();
};

const loadPagefind = () => {
    if (!pagefindPromise) {
        const pagefindUrl = "/pagefind/pagefind.js";
        pagefindPromise = import(
            /* @vite-ignore */ pagefindUrl
        ) as Promise<PagefindModule>;
        pagefindPromise = pagefindPromise.then(async (pagefind) => {
            await pagefind.options({
                ranking: {
                    metaWeights: {
                        title: 5,
                        description: 2,
                        tags: 2,
                    },
                },
            });
            await pagefind.init();
            return pagefind;
        });
        pagefindPromise = pagefindPromise.catch((error) => {
            pagefindPromise = null;
            throw error;
        });
    }

    return pagefindPromise;
};

const renderDevelopmentPage = (keywords: string[]) => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const visibleResults = new Set(
        currentDevelopmentResults.slice(start, start + PAGE_SIZE),
    );
    developmentIndex.forEach((entry) => {
        const isVisible = visibleResults.has(entry);
        entry.result.hidden = !isVisible;

        const excerpt = entry.result.querySelector("small");
        if (excerpt) {
            const positions = keywords
                .map((keyword) => entry.normalizedContent.indexOf(keyword))
                .filter((position) => position >= 0);
            const matchPosition =
                positions.length > 0 ? Math.min(...positions) : -1;

            if (matchPosition >= 0) {
                const start = Math.max(0, matchPosition - 24);
                const end = Math.min(
                    entry.content.length,
                    matchPosition + 56,
                );
                excerpt.textContent = `${start > 0 ? "…" : ""}${entry.content.slice(start, end)}${end < entry.content.length ? "…" : ""}`;
            } else {
                excerpt.textContent = entry.description;
            }
        }
    });

    showCount(currentDevelopmentResults.length);
    updatePagination(currentDevelopmentResults.length);
};

const renderDevelopmentResults = (query: string) => {
    const keywords = query.split(/\s+/).filter(Boolean);
    currentPage = 1;
    currentDevelopmentResults = developmentIndex.filter((entry) => {
        const searchValue = `${entry.metadata} ${entry.normalizedContent}`;
        return keywords.every((keyword) => searchValue.includes(keyword));
    });
    renderDevelopmentPage(keywords);
};

const createResult = (result: PagefindResultData) => {
    const link = resultTemplate?.content.firstElementChild?.cloneNode(
        true,
    ) as HTMLAnchorElement | undefined;
    if (!link) throw new Error("搜索结果模板不存在");

    link.href = result.url;

    const title = link.querySelector("strong");
    const excerpt = link.querySelector("small");
    if (title) title.textContent = result.meta.title || "无标题";
    if (excerpt) {
        excerpt.innerHTML =
            result.excerpt ||
            result.meta.description ||
            result.plain_excerpt ||
            "";
    }

    return link;
};

const renderPagefindPage = async (sequence: number) => {
    const pageToRender = currentPage;
    const start = (pageToRender - 1) * PAGE_SIZE;
    const resultData = await Promise.all(
        currentPagefindResults
            .slice(start, start + PAGE_SIZE)
            .map((result) => result.data()),
    );
    if (sequence !== searchSequence || pageToRender !== currentPage) return;

    resultsContainer?.replaceChildren(...resultData.map(createResult));
    showCount(currentPagefindResults.length);
    updatePagination(currentPagefindResults.length);
};

const renderPagefindResults = async (query: string) => {
    const currentSearch = ++searchSequence;
    if (count) {
        count.hidden = false;
        count.textContent = "正在搜索…";
    }
    if (prompt) prompt.hidden = true;
    if (empty) empty.hidden = true;

    try {
        const pagefind = await loadPagefind();
        const search = await pagefind.debouncedSearch(
            query,
            { filters: { section: "docs" } },
            150,
        );

        if (!search || currentSearch !== searchSequence) return;

        currentPage = 1;
        currentPagefindResults = search.results;
        await renderPagefindPage(currentSearch);
    } catch (error) {
        console.error("随笔搜索加载失败", error);
        if (currentSearch !== searchSequence) return;
        resultsContainer?.replaceChildren();
        showPrompt("搜索暂时不可用，请稍后重试");
    }
};

const changePage = (offset: number) => {
    const matches = isDevelopment
        ? currentDevelopmentResults.length
        : currentPagefindResults.length;
    const totalPages = Math.ceil(matches / PAGE_SIZE);
    const nextPageNumber = Math.min(
        Math.max(currentPage + offset, 1),
        totalPages,
    );
    if (nextPageNumber === currentPage) return;

    currentPage = nextPageNumber;
    if (isDevelopment) {
        const query = normalize(input?.value ?? "");
        renderDevelopmentPage(query.split(/\s+/).filter(Boolean));
    } else {
        const currentRender = ++searchSequence;
        void renderPagefindPage(currentRender);
    }
};

const renderResults = () => {
    const query = normalize(input?.value ?? "");
    if (!query) {
        resetResults();
        return;
    }

    if (isDevelopment) {
        renderDevelopmentResults(query);
    } else {
        void renderPagefindResults(query);
    }
};

const prepareSearch = async () => {
    if (isDevelopment || !input) return;
    input.disabled = true;
    showPrompt("正在准备全文搜索…");

    try {
        await loadPagefind();
        input.disabled = false;
        if (panel?.hidden) return;
        showPrompt();
        input.focus();
    } catch (error) {
        console.error("随笔搜索初始化失败", error);
        input.disabled = false;
        if (panel?.hidden) return;
        showPrompt("搜索暂时不可用，请稍后重试");
    }
};

const setOpen = (open: boolean) => {
    if (!toggle || !panel) return;
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "关闭随笔搜索" : "搜索随笔");

    if (open) {
        requestAnimationFrame(() => input?.focus());
        void prepareSearch();
    } else {
        if (input) {
            input.disabled = false;
            input.value = "";
        }
        resetResults();
    }
};

toggle?.addEventListener("click", () => {
    setOpen(panel?.hidden ?? true);
});

input?.addEventListener("input", renderResults);
input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        const firstMatch =
            resultsContainer?.querySelector<HTMLAnchorElement>(
                ".docs-search-result:not([hidden])",
            );
        if (firstMatch) window.location.href = firstMatch.href;
    }
});
previousPage?.addEventListener("click", () => changePage(-1));
nextPage?.addEventListener("click", () => changePage(1));

document.addEventListener("click", (event) => {
    if (
        !panel?.hidden &&
        event.target instanceof Node &&
        !panel.contains(event.target) &&
        !toggle?.contains(event.target)
    ) {
        setOpen(false);
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel?.hidden) {
        setOpen(false);
        toggle?.focus();
    }
});
