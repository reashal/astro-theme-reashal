import {
    getContentByDateRange,
    getRandomContent,
    type ContentKind,
} from "../utils/content-insights";

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

const searchRoot = document.querySelector<HTMLElement>(".docs-search");
const searchScope: ContentKind = searchRoot?.dataset.contentScope === "moment" ? "moment" : "essay";
const contentLabel = searchScope === "moment" ? "动态" : "随笔";
const contentUnit = searchScope === "moment" ? "条" : "篇";
const defaultPrompt = searchScope === "moment" ? "输入一句话，找回一则动态" : "输入只言片语，找回一篇随笔";

const toggle = document.getElementById("docsSearchToggle");
const panel = document.getElementById("docsSearchPanel");
const input = document.getElementById("docsSearchInput") as HTMLInputElement | null;
const prompt = document.getElementById("docsSearchPrompt");
const count = document.getElementById("docsSearchCount");
const empty = document.getElementById("docsSearchEmpty");
const resultsContainer = document.getElementById("docsSearchResults");
const resultTemplate = document.getElementById("docsSearchResultTemplate") as HTMLTemplateElement | null;
const pagination = document.getElementById("docsSearchPagination");
const previousPage = document.getElementById("docsSearchPrevious") as HTMLButtonElement | null;
const nextPage = document.getElementById("docsSearchNext") as HTMLButtonElement | null;
const pageIndicator = document.getElementById("docsSearchPage");
const searchMain = document.getElementById("docsSearchMain") as HTMLElement | null;
const timePanel = document.getElementById("timeExplorePanel") as HTMLElement | null;
const timeOpen = document.getElementById("timeExploreOpen");
const timeBack = document.getElementById("timeExploreBack");
const timeGranularity = document.getElementById("timeExploreGranularity") as HTMLSelectElement | null;
const timeYearField = document.getElementById("timeExploreYearField") as HTMLElement | null;
const timeMonthField = document.getElementById("timeExploreMonthField") as HTMLElement | null;
const timeYear = document.getElementById("timeExploreYear") as HTMLSelectElement | null;
const timeMonth = document.getElementById("timeExploreMonth") as HTMLSelectElement | null;
const timeCustom = document.getElementById("timeExploreCustom") as HTMLElement | null;
const timeFrom = document.getElementById("timeExploreFrom") as HTMLInputElement | null;
const timeTo = document.getElementById("timeExploreTo") as HTMLInputElement | null;
const timeStatus = document.getElementById("timeExploreStatus");
const timeEmpty = document.getElementById("timeExploreEmpty") as HTMLElement | null;
const timeEntries = Array.from(document.querySelectorAll<HTMLElement>("[data-time-entry]"));
const timeMonthsData = document.getElementById("timeExploreMonthsData");
const randomExplore = document.getElementById("randomExplore");
const randomExploreData = document.getElementById("randomExploreData");
const isDevelopment = import.meta.env.DEV;
const usesLocalSearch = isDevelopment || searchScope === "moment";
const PAGE_SIZE = 4;
const localResults = usesLocalSearch
    ? Array.from(document.querySelectorAll<HTMLAnchorElement>("#docsSearchResults > .docs-search-result"))
    : [];

let pagefindPromise: Promise<PagefindModule> | null = null;
let searchSequence = 0;
let currentPage = 1;
let currentPagefindResults: PagefindResult[] = [];

const normalize = (value: string) =>
    value.normalize("NFKC").toLocaleLowerCase("zh-CN").trim();

const localIndex = localResults.map((result) => {
    const content = result.dataset.searchContent ?? "";
    return {
        result,
        kind: result.dataset.searchKind as ContentKind | undefined,
        content,
        normalizedContent: normalize(content),
        metadata: result.dataset.searchMetadata ?? "",
        description: result.dataset.searchDescription ?? "",
    };
});
type LocalIndexEntry = (typeof localIndex)[number];
let currentLocalResults: LocalIndexEntry[] = [];

const updatePagination = (matches: number) => {
    const totalPages = Math.ceil(matches / PAGE_SIZE);
    if (pagination) pagination.hidden = totalPages <= 1;
    if (previousPage) previousPage.disabled = currentPage <= 1;
    if (nextPage) nextPage.disabled = currentPage >= totalPages;
    if (pageIndicator) pageIndicator.textContent = `${currentPage} / ${totalPages}`;
};

const showPrompt = (message = defaultPrompt) => {
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
        count.textContent = `找到 ${matches} ${contentUnit}${contentLabel}`;
    }
    if (empty) empty.hidden = matches > 0;
};

const resetResults = () => {
    searchSequence += 1;
    currentPage = 1;
    currentLocalResults = [];
    currentPagefindResults = [];

    if (usesLocalSearch) {
        localIndex.forEach(({ result, description }) => {
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
        pagefindPromise = import(/* @vite-ignore */ pagefindUrl) as Promise<PagefindModule>;
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

const renderLocalPage = (keywords: string[]) => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const visibleResults = new Set(currentLocalResults.slice(start, start + PAGE_SIZE));
    localIndex.forEach((entry) => {
        entry.result.hidden = !visibleResults.has(entry);

        // 动态以正文作标题、日期作副标题；只对随笔生成正文命中片段。
        if (entry.kind === "moment") return;
        const excerpt = entry.result.querySelector("small");
        if (!excerpt) return;
        const positions = keywords
            .map((keyword) => entry.normalizedContent.indexOf(keyword))
            .filter((position) => position >= 0);
        const matchPosition = positions.length > 0 ? Math.min(...positions) : -1;

        if (matchPosition >= 0) {
            const excerptStart = Math.max(0, matchPosition - 24);
            const excerptEnd = Math.min(entry.content.length, matchPosition + 56);
            excerpt.textContent = `${excerptStart > 0 ? "…" : ""}${entry.content.slice(excerptStart, excerptEnd)}${excerptEnd < entry.content.length ? "…" : ""}`;
        } else {
            excerpt.textContent = entry.description;
        }
    });

    showCount(currentLocalResults.length);
    updatePagination(currentLocalResults.length);
};

const renderLocalResults = (query: string) => {
    const keywords = query.split(/\s+/).filter(Boolean);
    currentPage = 1;
    currentLocalResults = localIndex.filter((entry) => {
        const searchValue = `${entry.metadata} ${entry.normalizedContent}`;
        return keywords.every((keyword) => searchValue.includes(keyword));
    });
    renderLocalPage(keywords);
};

const createResult = (result: PagefindResultData) => {
    const link = resultTemplate?.content.firstElementChild?.cloneNode(true) as HTMLAnchorElement | undefined;
    if (!link) throw new Error("搜索结果模板不存在");

    link.href = result.url;
    const title = link.querySelector("strong");
    const excerpt = link.querySelector("small");
    if (title) title.textContent = result.meta.title || "无标题";
    if (excerpt) excerpt.innerHTML = result.excerpt || result.meta.description || result.plain_excerpt || "";
    return link;
};

const renderPagefindPage = async (sequence: number) => {
    const pageToRender = currentPage;
    const start = (pageToRender - 1) * PAGE_SIZE;
    const resultData = await Promise.all(
        currentPagefindResults.slice(start, start + PAGE_SIZE).map((result) => result.data()),
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
        const search = await pagefind.debouncedSearch(query, { filters: { section: "docs" } }, 150);
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
    const matches = usesLocalSearch ? currentLocalResults.length : currentPagefindResults.length;
    const totalPages = Math.ceil(matches / PAGE_SIZE);
    const nextPageNumber = Math.min(Math.max(currentPage + offset, 1), totalPages);
    if (nextPageNumber === currentPage) return;

    currentPage = nextPageNumber;
    if (usesLocalSearch) {
        const query = normalize(input?.value ?? "");
        renderLocalPage(query.split(/\s+/).filter(Boolean));
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
    if (usesLocalSearch) renderLocalResults(query);
    else void renderPagefindResults(query);
};

const prepareSearch = async () => {
    if (usesLocalSearch || !input) return;
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

type SearchMode = "search" | "time";
let searchMode: SearchMode = "search";

const calendarEnd = (year: number, month: number) =>
    new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

let monthsByYear: Record<string, string[]> = {};
try {
    const parsed: unknown = JSON.parse(timeMonthsData?.textContent ?? "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        monthsByYear = Object.fromEntries(
            Object.entries(parsed).filter(
                (entry): entry is [string, string[]] =>
                    Array.isArray(entry[1]) && entry[1].every((month) => typeof month === "string"),
            ),
        );
    }
} catch {
    monthsByYear = {};
}

const populateMonths = (preferredMonth?: string) => {
    if (!timeMonth || !timeYear) return;
    const months = monthsByYear[timeYear.value] ?? [];
    timeMonth.replaceChildren(
        ...months.map((month) => {
            const option = document.createElement("option");
            option.value = month;
            option.textContent = `${Number(month)} 月`;
            return option;
        }),
    );
    if (preferredMonth && months.includes(preferredMonth)) timeMonth.value = preferredMonth;
};

const syncTimeControls = () => {
    if (!timeGranularity || !timeYearField || !timeMonthField || !timeCustom) return;
    const showYear = timeGranularity.value === "year" || timeGranularity.value === "month";
    timeYearField.hidden = !showYear;
    timeMonthField.hidden = timeGranularity.value !== "month";
    timeCustom.hidden = timeGranularity.value !== "custom";
    if (timeGranularity.value === "month") populateMonths(timeMonth?.value);
};

const rangeForTimeSelection = () => {
    if (!timeGranularity || !timeYear || !timeMonth || !timeFrom || !timeTo) {
        return { from: "", to: "" };
    }
    if (timeGranularity.value === "year" && timeYear.value) {
        return { from: `${timeYear.value}-01-01`, to: `${timeYear.value}-12-31` };
    }
    if (timeGranularity.value === "month" && timeYear.value && timeMonth.value) {
        const year = Number(timeYear.value);
        const month = Number(timeMonth.value);
        const prefix = `${timeYear.value}-${timeMonth.value}`;
        return { from: `${prefix}-01`, to: calendarEnd(year, month) };
    }
    if (timeGranularity.value === "custom") {
        return { from: timeFrom.value, to: timeTo.value };
    }
    return { from: "", to: "" };
};

const restoreTimeControls = (from: string, to: string) => {
    if (!timeGranularity || !timeYear || !timeMonth) return;
    const year = from.match(/^(\d{4})-01-01$/)?.[1];
    if (year && to === `${year}-12-31` && monthsByYear[year]) {
        timeGranularity.value = "year";
        timeYear.value = year;
        syncTimeControls();
        return;
    }

    const month = from.match(/^(\d{4})-(\d{2})-01$/);
    if (month) {
        const [, yearValue, monthValue] = month;
        if (
            yearValue &&
            monthValue &&
            to === calendarEnd(Number(yearValue), Number(monthValue)) &&
            monthsByYear[yearValue]?.includes(monthValue)
        ) {
            timeGranularity.value = "month";
            timeYear.value = yearValue;
            populateMonths(monthValue);
            syncTimeControls();
            return;
        }
    }

    timeGranularity.value = from || to ? "custom" : "all";
    syncTimeControls();
};

const syncTimeUrl = (range: { from: string; to: string }) => {
    const url = new URL(location.href);
    url.searchParams.set("explore", "time");
    range.from ? url.searchParams.set("from", range.from) : url.searchParams.delete("from");
    range.to ? url.searchParams.set("to", range.to) : url.searchParams.delete("to");
    url.searchParams.delete("type");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
};

const renderTimeResults = (updateUrl = true) => {
    if (!timeGranularity || !timeStatus || !timeEmpty) return;
    syncTimeControls();
    const range = rangeForTimeSelection();
    const invalid = Boolean(range.from && range.to && range.from > range.to);
    const candidates = timeEntries.map((element, index) => ({
        index,
        date: element.dataset.date ?? "",
        type: searchScope,
    }));
    const visibleIndexes = new Set(
        invalid
            ? []
            : getContentByDateRange(candidates, {
                  from: range.from || undefined,
                  to: range.to || undefined,
                  type: searchScope,
              }).map(({ index }) => index),
    );
    timeEntries.forEach((entry, index) => {
        entry.hidden = !visibleIndexes.has(index);
    });
    timeStatus.textContent = invalid
        ? "起始日期应在结束日期之前"
        : `找到 ${visibleIndexes.size} ${contentUnit}${contentLabel}`;
    timeEmpty.hidden = visibleIndexes.size > 0;
    if (updateUrl) syncTimeUrl(range);
};

const setSearchMode = (mode: SearchMode, updateUrl = true) => {
    searchMode = mode;
    if (searchMain) searchMain.hidden = mode !== "search";
    if (timePanel) timePanel.hidden = mode !== "time";
    if (mode === "time") {
        renderTimeResults(updateUrl);
        requestAnimationFrame(() => timeGranularity?.focus());
    } else {
        if (updateUrl) {
            const url = new URL(location.href);
            url.searchParams.delete("explore");
            url.searchParams.delete("from");
            url.searchParams.delete("to");
            url.searchParams.delete("type");
            history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
        }
        requestAnimationFrame(() => input?.focus());
    }
};

const restoreTimeFromUrl = () => {
    if (!timeFrom || !timeTo) return false;
    const params = new URL(location.href).searchParams;
    if (params.get("explore") !== "time") return false;
    const from = params.get("from") ?? "";
    const to = params.get("to") ?? "";
    timeFrom.value = /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : "";
    timeTo.value = /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : "";
    restoreTimeControls(timeFrom.value, timeTo.value);
    setSearchMode("time", false);
    return true;
};

const setOpen = (open: boolean) => {
    if (!toggle || !panel) return;
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? `关闭${contentLabel}查找` : `打开${contentLabel}查找`);

    if (open) {
        if (searchMode === "time") requestAnimationFrame(() => timeGranularity?.focus());
        else {
            requestAnimationFrame(() => input?.focus());
            void prepareSearch();
        }
    } else {
        if (input) {
            input.disabled = false;
            input.value = "";
        }
        resetResults();
    }
};

toggle?.addEventListener("click", () => setOpen(panel ? panel.hidden !== false : true));
input?.addEventListener("input", renderResults);
input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        const firstMatch = resultsContainer?.querySelector<HTMLAnchorElement>(
            ".docs-search-result:not([hidden])",
        );
        if (firstMatch) window.location.href = firstMatch.href;
    }
});
previousPage?.addEventListener("click", () => changePage(-1));
nextPage?.addEventListener("click", () => changePage(1));
timeOpen?.addEventListener("click", () => setSearchMode("time"));
timeBack?.addEventListener("click", () => setSearchMode("search"));
timeGranularity?.addEventListener("change", () => renderTimeResults());
timeYear?.addEventListener("change", () => {
    populateMonths();
    renderTimeResults();
});
timeMonth?.addEventListener("change", () => renderTimeResults());
timeFrom?.addEventListener("change", () => renderTimeResults());
timeTo?.addEventListener("change", () => renderTimeResults());

randomExplore?.addEventListener("click", () => {
    let candidates: Array<{ url: string }> = [];
    try {
        const parsed: unknown = JSON.parse(randomExploreData?.textContent ?? "[]");
        if (Array.isArray(parsed)) {
            candidates = parsed.filter(
                (item): item is { url: string } =>
                    Boolean(item) && typeof item === "object" && typeof item.url === "string",
            );
        }
    } catch {
        candidates = [];
    }
    const selected = getRandomContent(candidates, Math.random, `${location.pathname}${location.hash}`);
    if (selected) location.assign(selected.url);
});

document.addEventListener("click", (event) => {
    if (
        panel &&
        !panel.hidden &&
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

populateMonths();
if (restoreTimeFromUrl()) setOpen(true);

export {};
