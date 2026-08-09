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
        }),
    ),
});

const articleDateStringSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
        const [year, month, day] = value.split("-").map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        return (
            date.getUTCFullYear() === year &&
            date.getUTCMonth() === month - 1 &&
            date.getUTCDate() === day
        );
    }, "日期不是有效的公历日期");

const articleDateSchema = z.preprocess((value) => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }
    if (typeof value === "string") return value.slice(0, 10);
    return value;
}, articleDateStringSchema);

export const articleFrontmatterSchema = z.object({
    title: z.string(),
    desc: z.string(),
    author: z.string().optional(),
    source: z.url().optional(),
    pubDate: articleDateSchema,
    updatedDate: articleDateSchema.optional(),
    tags: z.array(z.string()).optional(),
    pinned: z.boolean().optional(),
});

export const articleModuleSchema = z.object({
    frontmatter: articleFrontmatterSchema,
    url: z.string(),
});

export type ArticleFrontmatter = z.infer<typeof articleFrontmatterSchema>;
export type ArticleModule = z.infer<typeof articleModuleSchema>;
