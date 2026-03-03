/**
 * 文章处理工具函数
 * 提供文章获取、排序等通用功能
 */

/**
 * 按时间排序文章
 * @param articles 文章列表
 * @param order 排序方式：desc-倒序，asc-正序
 * @returns 排序后的文章列表
 */
export function sortArticlesByDate<T extends { frontmatter: { pubDate?: string } }>(
    articles: T[],
    order: "desc" | "asc" = "desc"
): T[] {
    return articles.sort((a, b) => {
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
