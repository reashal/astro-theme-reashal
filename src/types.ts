import { z } from "astro/zod";

export const pagesConfigSchema = z.object({
    pages: z.array(
        z.object({
            title: z.string(),
            description: z.string(),
            path: z.string(),
            type: z.enum(["moments", "category", "showcase", "external"]),
            icon: z.string(),
            hiddenInAside: z.boolean().optional(),
            dataSource: z.object({
                type: z.enum(["file", "folder", "config", "none"]),
                path: z.string().optional(),
            }),
        }),
    ),
});

export type PageConfig = z.infer<typeof pagesConfigSchema>["pages"][number];

export const articleFrontmatterSchema = z.object({
    title: z.string(),
    desc: z.string(),
    author: z.string(),
    source: z.string().url(),
    pubDate: z.preprocess((value) => {
        if (value instanceof Date) return value.toISOString().slice(0, 10);
        if (typeof value === "string") return value.slice(0, 10);
        return value;
    }, z.string().regex(/^\d{4}-\d{1,2}-\d{1,2}$/)),
    tags: z.array(z.string()).optional(),
    pinned: z.boolean().optional(),
});

export const articleModuleSchema = z.object({
    frontmatter: articleFrontmatterSchema,
    url: z.string(),
});

export type ArticleFrontmatter = z.infer<typeof articleFrontmatterSchema>;
export type ArticleModule = z.infer<typeof articleModuleSchema>;
