import type { CollectionEntry } from "astro:content";

export const MOMENTS_PAGE_SIZE = 10;

export type MomentEntry = CollectionEntry<"moments">;
export type MomentData = MomentEntry["data"] & { id: string };
const TIMESTAMP_ID_PATTERN = /^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2}:\d{2}\.\d{3})$/;
type MomentsPage = {
    moments: MomentData[];
    page: number;
};

export const sortMoments = (moments: MomentEntry[]) =>
    [...moments].sort((a, b) => {
        const dateOrder = b.data.date.localeCompare(a.data.date);
        if (dateOrder !== 0) return dateOrder;
        const leftTime = a.id.match(TIMESTAMP_ID_PATTERN)?.[1] ?? "";
        const rightTime = b.id.match(TIMESTAMP_ID_PATTERN)?.[1] ?? "";
        const timeOrder = rightTime.localeCompare(leftTime);
        if (timeOrder !== 0) return timeOrder;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

const serializeMoment = ({ id, data }: MomentEntry): MomentData => ({
    id,
    ...data,
});

export const paginateMoments = (moments: MomentEntry[]): MomentsPage[] => {
    const sortedMoments = sortMoments(moments);
    const pageCount = Math.ceil(sortedMoments.length / MOMENTS_PAGE_SIZE);

    return Array.from({ length: pageCount }, (_, index) => ({
        moments: sortedMoments
            .slice(
                index * MOMENTS_PAGE_SIZE,
                (index + 1) * MOMENTS_PAGE_SIZE,
            )
            .map(serializeMoment),
        page: index + 1,
    }));
};

export const getMomentDomId = (moment: Pick<MomentData, "id">) =>
    /^\d{4}-\d{2}-\d{2}$/.test(moment.id)
        ? moment.id.replaceAll("-", "")
        : `moment-${moment.id}`;
