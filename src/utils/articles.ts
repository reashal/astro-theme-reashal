/**
 * 文章处理工具函数
 * 提供文章获取、排序等通用功能
 */
import { articleModuleSchema, type ArticleModule } from "../types";

const docsModules = import.meta.glob("../pages/docs/*.md", { eager: true });

export function getDocsArticles(): ArticleModule[] {
    const result = articleModuleSchema.array().safeParse(Object.values(docsModules));
    if (!result.success) {
        throw new Error(
            `随笔数据校验失败：${JSON.stringify(result.error.issues)}`,
        );
    }
    return result.data;
}

/**
 * 按时间排序文章
 * @param articles 文章列表
 * @param order 排序方式：desc-倒序，asc-正序
 * @returns 排序后的文章列表
 */
export function sortArticlesByDate<T extends { frontmatter: { pubDate?: string } }>(
    articles: readonly T[],
    order: "desc" | "asc" = "desc"
): T[] {
    return [...articles].sort((a, b) => {
        const dateA = new Date(a.frontmatter.pubDate || '1970-01-01');
        const dateB = new Date(b.frontmatter.pubDate || '1970-01-01');
        return order === "desc" 
            ? dateB.getTime() - dateA.getTime()
            : dateA.getTime() - dateB.getTime();
    });
}

/**
 * 分离置顶文章和普通文章
 * @param articles 文章列表
 * @returns { pinned: 置顶文章, normal: 普通文章 }
 */
export function separatePinnedArticles<T extends { frontmatter: { pinned?: boolean } }>(
    articles: T[]
): { pinned: T[]; normal: T[] } {
    const pinned = articles.filter(post => post.frontmatter.pinned === true);
    const normal = articles.filter(post => post.frontmatter.pinned !== true);
    return { pinned, normal };
}

/**
 * 处理文章列表：分离置顶文章并排序
 * @param articles 文章列表
 * @returns 处理后的文章列表（置顶文章在前，按时间排序）
 */
export function processArticles<T extends { frontmatter: { pinned?: boolean; pubDate?: string } }>(
    articles: T[]
): T[] {
    const { pinned, normal } = separatePinnedArticles(articles);
    
    // 分别排序
    const sortedPinned = sortArticlesByDate(pinned, "desc");
    const sortedNormal = sortArticlesByDate(normal, "desc");
    
    // 合并：置顶文章在前
    return [...sortedPinned, ...sortedNormal];
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
