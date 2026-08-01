import { z } from "astro/zod";

const cardSchema = z.object({
    title: z.string(),
    description: z.string(),
    link: z.string().optional(),
    image: z.string().optional(),
    imageMode: z.enum([
        "text-only",
        "icon-simple",
        "app-card",
        "product-card",
    ]),
    specs: z.array(z.string()).optional(),
});

const sectionSchema = z.object({
    title: z.string(),
    cards: z.array(cardSchema),
});

const showcaseConfigSchema = z.object({
    title: z.string(),
    showFooter: z.boolean().optional(),
    intro: z.array(z.string()).optional(),
    sections: z.array(sectionSchema),
});

export const showcasesSchema = z.object({
    showcases: z.record(z.string(), showcaseConfigSchema),
});
