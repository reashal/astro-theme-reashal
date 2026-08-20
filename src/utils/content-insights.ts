export type ContentKind = "moment" | "essay";

export interface ContentInsight {
    id: string;
    type: ContentKind;
    title: string;
    summary: string;
    date: string;
    url: string;
}

export interface DateRange {
    from?: string;
    to?: string;
    type?: ContentKind | "all";
}

export interface ImageReference {
    path: string;
    type: "essay" | "moment" | "showcase" | "site";
    id: string;
    title: string;
    field: string;
    url: string;
}

export interface MilestoneDefinition {
    id: string;
    label: string;
    unit: string;
    thresholds: readonly number[];
}

export interface MilestoneProgress extends MilestoneDefinition {
    current: number;
    latest?: number;
    next?: number;
}

export interface ContentStats {
    essays: number;
    moments: number;
    images: number;
    total: number;
    siteDays: number;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_IMAGE_EXTENSIONS = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

export const MILESTONE_DEFINITIONS: readonly MilestoneDefinition[] = [
    { id: "essays", label: "随笔", unit: "篇", thresholds: [1, 5, 10, 25, 50, 100] },
    { id: "moments", label: "片刻", unit: "则", thresholds: [1, 10, 25, 50, 100, 250, 500] },
    { id: "images", label: "光影", unit: "张", thresholds: [1, 10, 25, 50, 100, 250, 500] },
    { id: "siteDays", label: "跨度", unit: "天", thresholds: [30, 100, 365, 1000, 2000, 3650] },
];

export function parseCalendarDate(value: string): Date | undefined {
    const match = value.match(DATE_PATTERN);
    if (!match) return undefined;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return undefined;
    }
    return date;
}

export function getContentByDateRange<T extends Pick<ContentInsight, "date" | "type">>(
    entries: readonly T[],
    range: DateRange,
): T[] {
    const from = range.from ? parseCalendarDate(range.from) : undefined;
    const to = range.to ? parseCalendarDate(range.to) : undefined;
    if ((range.from && !from) || (range.to && !to) || (from && to && from > to)) {
        return [];
    }

    return entries.filter((entry) => {
        if (range.type && range.type !== "all" && entry.type !== range.type) {
            return false;
        }
        const date = parseCalendarDate(entry.date);
        if (!date) return false;
        return (!from || date >= from) && (!to || date <= to);
    });
}

export function getRandomContent<T extends Pick<ContentInsight, "url">>(
    entries: readonly T[],
    random: () => number = Math.random,
    currentUrl?: string,
): T | undefined {
    if (entries.length === 0) return undefined;
    const normalizedCurrent = currentUrl ? normalizeContentUrl(currentUrl) : undefined;
    const alternatives = normalizedCurrent
        ? entries.filter((entry) => normalizeContentUrl(entry.url) !== normalizedCurrent)
        : entries;
    const candidates = alternatives.length > 0 ? alternatives : entries;
    const sample = Math.min(Math.max(random(), 0), 0.9999999999999999);
    return candidates[Math.floor(sample * candidates.length)];
}

export function normalizeImagePath(value: string, basePath = "/"): string | undefined {
    const trimmed = value.trim().replace(/^<|>$/g, "");
    if (!trimmed || /^(?:data:|blob:|https?:|\/\/)/i.test(trimmed)) return undefined;
    const withoutQuery = trimmed.split(/[?#]/, 1)[0];
    if (!withoutQuery || !LOCAL_IMAGE_EXTENSIONS.test(withoutQuery)) return undefined;
    try {
        const path = decodeURI(new URL(withoutQuery, `https://local.invalid${basePath}`).pathname);
        return path.replace(/\/{2,}/g, "/");
    } catch {
        return undefined;
    }
}

export function extractMarkdownImagePaths(markdown: string, basePath = "/"): string[] {
    const referenceDefinitions = new Map<string, string>();
    const paths: string[] = [];
    const add = (value: string) => {
        const normalized = normalizeImagePath(value, basePath);
        if (normalized) paths.push(normalized);
    };
    const searchable = markdown
        .replace(/```[\s\S]*?```/g, "")
        .replace(/~~~[\s\S]*?~~~/g, "")
        .replace(/`[^`\n]*`/g, "");

    for (const match of searchable.matchAll(/^\s*\[([^\]]+)\]:\s*(?:<([^>]+)>|(\S+))/gim)) {
        const key = match[1]?.trim().toLowerCase();
        const path = match[2] ?? match[3];
        if (key && path) referenceDefinitions.set(key, path);
    }
    for (const match of searchable.matchAll(/!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\s*\)/g)) {
        add(match[1] ?? match[2] ?? "");
    }
    for (const match of searchable.matchAll(/!\[([^\]]*)\]\[([^\]]*)\]/g)) {
        const key = (match[2] || match[1] || "").trim().toLowerCase();
        const path = referenceDefinitions.get(key);
        if (path) add(path);
    }
    for (const match of searchable.matchAll(/<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi)) {
        add(match[1] ?? match[2] ?? match[3] ?? "");
    }
    return [...new Set(paths)];
}

export function getImageReferences(
    imagePath: string,
    references: readonly ImageReference[],
): ImageReference[] {
    const normalized = normalizeImagePath(imagePath);
    if (!normalized) return [];
    const seen = new Set<string>();
    return references.filter((reference) => {
        if (normalizeImagePath(reference.path) !== normalized) return false;
        const key = `${reference.type}\u0000${reference.id}\u0000${reference.field}\u0000${reference.url}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function calculateContentStats(
    entries: readonly ContentInsight[],
    imageCount: number,
    today: string | Date,
): ContentStats {
    const dates = entries
        .map((entry) => parseCalendarDate(entry.date))
        .filter((date): date is Date => Boolean(date));
    const reference = typeof today === "string" ? parseCalendarDate(today) : today;
    const earliest = dates.length > 0 ? new Date(Math.min(...dates.map(Number))) : undefined;
    const siteDays = earliest && reference && !Number.isNaN(reference.getTime())
        ? Math.max(1, Math.floor((reference.getTime() - earliest.getTime()) / 86_400_000) + 1)
        : 0;
    const essays = entries.filter((entry) => entry.type === "essay").length;
    const moments = entries.filter((entry) => entry.type === "moment").length;
    return {
        essays,
        moments,
        images: Math.max(0, Math.floor(imageCount)),
        total: essays + moments,
        siteDays,
    };
}

export function calculateMilestones(
    stats: ContentStats,
    definitions: readonly MilestoneDefinition[] = MILESTONE_DEFINITIONS,
): MilestoneProgress[] {
    return definitions.map((definition) => {
        const current = stats[definition.id as keyof ContentStats] ?? 0;
        const latest = [...definition.thresholds].reverse().find((value) => value <= current);
        const next = definition.thresholds.find((value) => value > current);
        return { ...definition, current, latest, next };
    });
}

export function normalizeContentUrl(value: string): string {
    try {
        const url = new URL(value, "https://local.invalid");
        return `${url.pathname.replace(/\/$/, "") || "/"}${url.hash}`;
    } catch {
        return value;
    }
}
