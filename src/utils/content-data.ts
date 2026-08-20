import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { getCollection } from "astro:content";
import { AUTHOR_INFO, SITE_INFO } from "../consts";
import showcaseConfigJson from "../showcase.json";
import { showcasesSchema } from "../showcase-types";
import { getDocsArticles } from "./articles";
import {
    calculateContentStats,
    calculateMilestones,
    extractMarkdownImagePaths,
    normalizeImagePath,
    type ContentInsight,
    type ContentStats,
    type ImageReference,
    type MilestoneProgress,
} from "./content-insights";
import { getMomentDomId, sortMoments } from "./moments";

const rawMarkdownModules = import.meta.glob<string>("../pages/**/*.md", {
    eager: true,
    query: "?raw",
    import: "default",
});
const IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

export interface SiteContentData {
    entries: ContentInsight[];
    momentSearchEntries: Array<{
        url: string;
        date: string;
        text: string;
    }>;
    references: ImageReference[];
    stats: ContentStats;
    milestones: MilestoneProgress[];
}

const plainText = (value: string) =>
    value
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const excerpt = (value: string, maxLength = 88) => {
    const text = plainText(value);
    return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
};

async function listPublicImages(directory: string, prefix = ""): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
        entries.map(async (entry) => {
            const relative = `${prefix}/${entry.name}`;
            if (entry.isDirectory()) {
                return listPublicImages(`${directory}/${entry.name}`, relative);
            }
            return IMAGE_EXTENSION.test(entry.name) ? [relative] : [];
        }),
    );
    return nested.flat().sort((left, right) => left.localeCompare(right));
}

function addReference(
    references: ImageReference[],
    candidate: Omit<ImageReference, "path"> & { path?: string },
) {
    if (!candidate.path) return;
    const path = normalizeImagePath(candidate.path, candidate.url);
    if (!path) return;
    references.push({ ...candidate, path });
}

async function buildSiteContentData(): Promise<SiteContentData> {
    const articles = getDocsArticles();
    const moments = sortMoments(await getCollection("moments"));
    const references: ImageReference[] = [];

    const essayEntries: ContentInsight[] = articles.map((article) => ({
        id: article.url,
        type: "essay",
        title: article.frontmatter.title,
        summary: article.frontmatter.desc,
        date: article.frontmatter.pubDate,
        url: article.url,
    }));
    const momentEntries: ContentInsight[] = moments.map((moment) => {
        const date = moment.data.date.replaceAll(".", "-");
        const summary = excerpt(moment.data.para.join(" ")) || moment.data.media[0]?.alt || "一则影像记录";
        return {
            id: moment.id,
            type: "moment",
            title: `动态 · ${date}`,
            summary,
            date,
            url: `/#${getMomentDomId({ id: moment.id })}`,
        };
    });
    const momentSearchEntries = moments.map((moment) => ({
        url: `/#${getMomentDomId({ id: moment.id })}`,
        date: moment.data.date.replaceAll(".", "-"),
        text: plainText(moment.data.para.join(" ")),
    }));

    for (const article of articles) {
        const filename = article.url.split("/").filter(Boolean).at(-1);
        const raw = filename ? rawMarkdownModules[`../pages/docs/${filename}.md`] : undefined;
        if (!raw) continue;
        for (const path of extractMarkdownImagePaths(raw, article.url)) {
            addReference(references, {
                path,
                type: "essay",
                id: article.url,
                title: article.frontmatter.title,
                field: "正文",
                url: article.url,
            });
        }
    }

    const aboutRaw = rawMarkdownModules["../pages/about.md"];
    if (aboutRaw) {
        for (const path of extractMarkdownImagePaths(aboutRaw, "/about")) {
            addReference(references, {
                path,
                type: "site",
                id: "about",
                title: "关于",
                field: "正文",
                url: "/about",
            });
        }
    }

    for (const moment of moments) {
        const url = `/#${getMomentDomId({ id: moment.id })}`;
        const title = `动态 · ${moment.data.date.replaceAll(".", "-")}`;
        moment.data.media.forEach((media, index) => {
            addReference(references, {
                path: media.type === "image" ? media.url : media.poster,
                type: "moment",
                id: moment.id,
                title,
                field: media.type === "image" ? `图片 ${index + 1}` : "视频封面",
                url,
            });
        });
        addReference(references, {
            path: moment.data.music?.cover,
            type: "moment",
            id: moment.id,
            title,
            field: "音乐封面",
            url,
        });
    }

    const showcase = showcasesSchema.parse(showcaseConfigJson);
    for (const [showcaseId, config] of Object.entries(showcase.showcases)) {
        for (const section of config.sections) {
            for (const card of section.cards) {
                addReference(references, {
                    path: card.image,
                    type: "showcase",
                    id: `${showcaseId}:${card.title}`,
                    title: card.title,
                    field: `${config.title} · ${section.title}`,
                    url: `/show#${showcaseId}`,
                });
            }
        }
    }

    addReference(references, {
        path: SITE_INFO.wallpaper,
        type: "site",
        id: "site-wallpaper",
        title: "站点页头",
        field: "wallpaper",
        url: "/",
    });
    addReference(references, {
        path: AUTHOR_INFO.avatar,
        type: "site",
        id: "site-avatar",
        title: AUTHOR_INFO.name,
        field: "avatar",
        url: "/about",
    });

    const publicDirectory = join(process.cwd(), "public");
    const imagePaths = await listPublicImages(publicDirectory);
    const entries = [...essayEntries, ...momentEntries].sort((left, right) =>
        right.date.localeCompare(left.date),
    );
    const today = new Date().toISOString().slice(0, 10);
    const stats = calculateContentStats(entries, imagePaths.length, today);

    return {
        entries,
        momentSearchEntries,
        references,
        stats,
        milestones: calculateMilestones(stats),
    };
}

let contentDataPromise: Promise<SiteContentData> | undefined;

export function getSiteContentData(): Promise<SiteContentData> {
    contentDataPromise ??= buildSiteContentData();
    return contentDataPromise;
}
