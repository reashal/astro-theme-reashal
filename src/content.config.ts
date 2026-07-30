import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { momentsLoader } from "./loaders/moments";

const requiredString = z.string().min(1);

const mediaSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("image"),
        url: requiredString,
        alt: requiredString,
    }),
    z.object({
        type: z.literal("video"),
        url: requiredString,
        alt: requiredString,
        poster: requiredString.optional(),
    }),
]);

const momentSchema = z.object({
    date: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/),
    para: z.array(requiredString).default([]),
    media: z.array(mediaSchema).default([]),
    music: z.object({
        url: requiredString,
        cover: requiredString,
        title: requiredString,
        artist: requiredString,
    }).optional(),
    loc: z.string().optional(),
    stars: z.array(requiredString).default([]),
    comments: z.array(requiredString).default([]),
});

const moments = defineCollection({
    loader: momentsLoader("src/data/moments"),
    schema: momentSchema,
});

export const collections = { moments };
