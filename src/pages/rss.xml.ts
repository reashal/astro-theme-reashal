import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { AUTHOR_INFO, SITE_INFO } from "../consts";
import { getDocsArticles, sortArticlesByDate } from "../utils/articles";

const escapeHtml = (value: string) =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

const getMomentTitle = (date: string, paragraphs: string[]) => {
    const firstParagraph = paragraphs[0]?.trim();
    if (!firstParagraph) return `动态 · ${date}`;
    return firstParagraph.length > 36
        ? `${firstParagraph.slice(0, 36)}…`
        : firstParagraph;
};

export const GET: APIRoute = async (context) => {
    const site = context.site ?? new URL("https://www.reashal.com");
    const articles = sortArticlesByDate(getDocsArticles());
    const moments = await getCollection("moments");

    const articleItems = articles.map(({ frontmatter, url }) => ({
        title: frontmatter.title,
        description: frontmatter.desc,
        link: url,
        pubDate: new Date(frontmatter.pubDate),
        author: frontmatter.author || AUTHOR_INFO.name,
        categories: ["随笔", ...frontmatter.tags],
    }));

    const momentItems = moments.map(({ data }) => {
        const momentId = data.date.replaceAll(".", "");
        const description = [
            ...data.para,
            data.loc ? `地点：${data.loc}` : "",
        ]
            .filter(Boolean)
            .join("\n");
        const content = [
            ...data.para.map(
                (paragraph) => `<p>${escapeHtml(paragraph)}</p>`,
            ),
            ...data.imgs.map((image) => {
                const imageUrl = new URL(image.url, site).href;
                return `<p><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(image.alt)}" loading="lazy"></p>`;
            }),
            data.loc
                ? `<p>地点：${escapeHtml(data.loc)}</p>`
                : "",
        ]
            .filter(Boolean)
            .join("");

        return {
            title: getMomentTitle(data.date, data.para),
            description: description || `发布于 ${data.date} 的动态`,
            content,
            link: new URL(`/#${momentId}`, site).href,
            pubDate: new Date(
                `${data.date.replaceAll(".", "-")}T00:00:00+08:00`,
            ),
            author: AUTHOR_INFO.name,
            categories: ["动态"],
        };
    });

    const items = [...articleItems, ...momentItems].sort(
        (a, b) => b.pubDate.getTime() - a.pubDate.getTime(),
    );

    return rss({
        title: `${SITE_INFO.title}的更新`,
        description: SITE_INFO.description,
        site,
        items,
        customData: [
            "<language>zh-cn</language>",
            `<copyright>Copyright © ${new Date().getFullYear()} ${AUTHOR_INFO.name}</copyright>`,
        ].join(""),
    });
};
