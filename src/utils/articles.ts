import { articleModuleSchema, type ArticleModule } from "../types";

const docsModules = import.meta.glob("../pages/docs/*.md", { eager: true });
let articleCache: readonly ArticleModule[] | undefined;

export function getDocsArticles(): readonly ArticleModule[] {
    if (articleCache) return articleCache;

    const result = articleModuleSchema.array().safeParse(Object.values(docsModules));
    if (!result.success) {
        throw new Error(
            `随笔数据校验失败：${JSON.stringify(result.error.issues)}`,
        );
    }
    articleCache = result.data;
    return articleCache;
}

type DatedArticle = { frontmatter: { pubDate: string } };

const compareArticleDates = (
    left: DatedArticle,
    right: DatedArticle,
    order: "desc" | "asc",
) => {
    const leftDate = left.frontmatter.pubDate;
    const rightDate = right.frontmatter.pubDate;
    return order === "desc"
        ? rightDate.localeCompare(leftDate)
        : leftDate.localeCompare(rightDate);
};

export function sortArticlesByDate<T extends DatedArticle>(
    articles: readonly T[],
    order: "desc" | "asc" = "desc",
): T[] {
    return [...articles].sort((left, right) =>
        compareArticleDates(left, right, order),
    );
}

export function processArticles<T extends { frontmatter: { pinned?: boolean; pubDate: string } }>(
    articles: readonly T[],
): T[] {
    return [...articles].sort((left, right) => {
        const pinnedOrder =
            Number(right.frontmatter.pinned === true) -
            Number(left.frontmatter.pinned === true);
        return pinnedOrder || compareArticleDates(left, right, "desc");
    });
}

export function getArticleTagCounts(
    articles: readonly Pick<ArticleModule, "frontmatter">[],
): Map<string, number> {
    const counts = new Map<string, number>();
    for (const article of articles) {
        for (const tag of article.frontmatter.tags ?? []) {
            counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
    }
    return counts;
}

/**
 * 根据 Markdown 正文估算阅读时间。
 * 中文按每分钟 300 字、英文及数字按每分钟 200 词计算。
 */
export function estimateReadingMinutes(markdown: string): number {
    const content = markdown
        .replace(/^---[\s\S]*?---/, "")
        .replace(/```[\s\S]*?```/g, (block) => block.replace(/[`]/g, " "))
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/<[^>]+>/g, " ");

    const chineseCharacters =
        content.match(/[\p{Script=Han}]/gu)?.length ?? 0;
    const words =
        content.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length ?? 0;

    return Math.max(1, Math.ceil(chineseCharacters / 300 + words / 200));
}
