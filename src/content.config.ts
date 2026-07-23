import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const momentSchema = z.object({
    date: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/),
    para: z.array(z.string()).default([]),
    imgs: z.array(
        z.object({
            url: z.string(),
            alt: z.string(),
        }),
    ).default([]),
    loc: z.string().optional(),
    stars: z.array(z.string()).default([]),
    comments: z.array(z.string()).default([]),
});

const moments = defineCollection({
    loader: file("src/moments.json", {
        parser: (text) => {
            const items = z.array(momentSchema).parse(JSON.parse(text));
            return items.map((item) => ({
                id: item.date.replaceAll(".", "-"),
                ...item,
            }));
        }
    }),
    schema: momentSchema,
});

export const collections = { moments };
