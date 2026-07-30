export interface TocHeadingSource<THeading> {
    id: string;
    text: string;
    depth: number;
    heading: THeading;
}

export interface TocNode<THeading> extends TocHeadingSource<THeading> {
    parent?: TocNode<THeading>;
    children: TocNode<THeading>[];
}

export interface TocSlide<THeading> {
    parent: TocNode<THeading>;
    activeChild: TocNode<THeading>;
}

export const buildTocHierarchy = <THeading>(
    rootSource: TocHeadingSource<THeading>,
    headingSources: readonly TocHeadingSource<THeading>[],
) => {
    const root: TocNode<THeading> = {
        ...rootSource,
        children: [],
    };
    const nodes: TocNode<THeading>[] = [];
    const stack: TocNode<THeading>[] = [root];

    for (const source of headingSources) {
        while (
            stack.length > 1 &&
            stack.at(-1)!.depth >= source.depth
        ) {
            stack.pop();
        }

        const parent = stack.at(-1) ?? root;
        const node: TocNode<THeading> = {
            ...source,
            parent,
            children: [],
        };
        parent.children.push(node);
        nodes.push(node);
        stack.push(node);
    }

    return { root, nodes };
};

export const buildTocSlides = <THeading>(
    node: TocNode<THeading>,
): TocSlide<THeading>[] => {
    const slides: TocSlide<THeading>[] = [];
    let pathNode: TocNode<THeading> | undefined = node;

    while (pathNode?.parent) {
        slides.unshift({
            parent: pathNode.parent,
            activeChild: pathNode,
        });
        pathNode = pathNode.parent;
    }

    return slides;
};

export const clampTocSlideIndex = (
    index: number,
    slideCount: number,
) => Math.max(0, Math.min(index, Math.max(0, slideCount - 1)));

export const preserveTocSlideIndex = (
    previousSlideCount: number,
    previousIndex: number,
    nextSlideCount: number,
    showDefault: boolean,
) => {
    if (showDefault) return Math.max(0, nextSlideCount - 1);

    const distanceFromDefault =
        previousSlideCount - 1 - previousIndex;
    return clampTocSlideIndex(
        nextSlideCount - 1 - distanceFromDefault,
        nextSlideCount,
    );
};

export const getSwipeSlideOffset = (
    distanceX: number,
    distanceY: number,
    minimumDistance: number,
) => {
    if (
        Math.abs(distanceX) < minimumDistance ||
        Math.abs(distanceX) <= Math.abs(distanceY)
    ) {
        return 0;
    }

    return distanceX > 0 ? -1 : 1;
};

export const getWheelSlideOffset = (
    deltaX: number,
    deltaY: number,
    minimumDelta: number,
) => {
    const levelDelta =
        Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
    if (Math.abs(levelDelta) < minimumDelta) return 0;
    return levelDelta < 0 ? -1 : 1;
};
