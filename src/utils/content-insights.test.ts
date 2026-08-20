import assert from "node:assert/strict";
import test from "node:test";
import {
    calculateContentStats,
    calculateMilestones,
    extractMarkdownImagePaths,
    getContentByDateRange,
    getImageReferences,
    getRandomContent,
    type ContentInsight,
    type ImageReference,
} from "./content-insights.ts";

const entries: ContentInsight[] = [
    { id: "m1", type: "moment", title: "一", summary: "", date: "2024-01-01", url: "/#m1" },
    { id: "e1", type: "essay", title: "二", summary: "", date: "2024-01-31", url: "/docs/e1" },
    { id: "m2", type: "moment", title: "三", summary: "", date: "2025-01-01", url: "/#m2" },
];

test("日期范围包含起止日，并能限定内容类型", () => {
    assert.deepEqual(
        getContentByDateRange(entries, { from: "2024-01-01", to: "2024-01-31" }).map(({ id }) => id),
        ["m1", "e1"],
    );
    assert.deepEqual(
        getContentByDateRange(entries, { from: "2024-01-01", to: "2025-01-01", type: "essay" }).map(({ id }) => id),
        ["e1"],
    );
    assert.deepEqual(getContentByDateRange(entries, { from: "2024-02-30" }), []);
    assert.deepEqual(getContentByDateRange(entries, { from: "2025-01-01", to: "2024-01-01" }), []);
});

test("随机探索优先避开当前内容，单候选时仍返回该项", () => {
    assert.equal(getRandomContent(entries, () => 0, "/#m1")?.id, "e1");
    assert.equal(getRandomContent([entries[0]!], () => 0.8, "/#m1")?.id, "m1");
    assert.equal(getRandomContent([], () => 0), undefined);
});

test("图片解析覆盖常用 Markdown 与 HTML 写法并忽略代码", () => {
    const markdown = [
        "![行内](/images/a.png)",
        "![引用][hero]",
        "[hero]: /images/b.webp \"标题\"",
        '<img alt="HTML" src="../images/c.jpg">',
        "`![代码](/images/ignored.png)`",
        "```md\n![围栏](/images/ignored-too.png)\n```",
        "![外链](https://example.com/remote.png)",
    ].join("\n");
    assert.deepEqual(extractMarkdownImagePaths(markdown, "/docs/post"), [
        "/images/a.png",
        "/images/b.webp",
        "/images/c.jpg",
    ]);
});

test("图片引用按规范路径查找并去除重复来源", () => {
    const references: ImageReference[] = [
        { path: "/images/a.png", type: "essay", id: "one", title: "一", field: "正文", url: "/docs/one" },
        { path: "/images/a.png?size=2", type: "essay", id: "one", title: "一", field: "正文", url: "/docs/one" },
        { path: "/images/b.png", type: "moment", id: "two", title: "二", field: "图片 1", url: "/#two" },
    ];
    assert.equal(getImageReferences("https://site.test/images/a.png", references).length, 0);
    assert.equal(getImageReferences("/images/a.png#view", references).length, 1);
});

test("里程计算给出最近达成值与下一刻度", () => {
    assert.deepEqual(calculateContentStats(entries, 9, "2025-01-01"), {
        essays: 1,
        moments: 2,
        images: 9,
        total: 3,
        siteDays: 367,
    });
    const progress = calculateMilestones({ essays: 6, moments: 0, images: 25, total: 6, siteDays: 1000 });
    const essays = progress.find(({ id }) => id === "essays");
    const moments = progress.find(({ id }) => id === "moments");
    const age = progress.find(({ id }) => id === "siteDays");
    assert.deepEqual({ latest: essays?.latest, next: essays?.next }, { latest: 5, next: 10 });
    assert.deepEqual({ latest: moments?.latest, next: moments?.next }, { latest: undefined, next: 1 });
    assert.deepEqual({ latest: age?.latest, next: age?.next }, { latest: 1000, next: 2000 });
});
