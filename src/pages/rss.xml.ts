import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { AUTHOR_INFO, SITE_INFO } from "../consts";
import { getDocsArticles, sortArticlesByDate } from "../utils/articles";
import { getMomentDomId } from "../utils/moments";

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
        pubDate: new Date(frontmatter.updatedDate ?? frontmatter.pubDate),
        author: frontmatter.author || AUTHOR_INFO.name,
        categories: ["随笔", ...(frontmatter.tags ?? [])],
    }));

    const momentItems = moments.map(({ id, data }) => {
        const momentId = getMomentDomId({ id });
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
            ...data.media.map((media) => {
                const mediaUrl = new URL(media.url, site).href;
                if (media.type === "video") {
                    const poster = media.poster
                        ? ` poster="${escapeHtml(new URL(media.poster, site).href)}"`
                        : "";
                    return `<p><video src="${escapeHtml(mediaUrl)}"${poster} controls playsinline>${escapeHtml(media.alt)}</video></p>`;
                }
                return `<p><img src="${escapeHtml(mediaUrl)}" alt="${escapeHtml(media.alt)}" loading="lazy"></p>`;
            }),
            data.music
                ? `<p>正在听：${escapeHtml(data.music.title)} · ${escapeHtml(data.music.artist)}</p><p><audio src="${escapeHtml(new URL(data.music.url, site).href)}" controls></audio></p>`
                : "",
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
