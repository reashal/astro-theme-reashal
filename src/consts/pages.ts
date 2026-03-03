/**
 * 页面配置信息
 * 统一管理各个页面的配置，包括路径、文章来源、描述等
 */

export const PAGE_CONFIG = {
    docs: {
        // 页面路径
        path: "/docs",
        // 文章来源文件夹
        globPatterns: [
            "../pages/about.md",
            "../pages/docs/*.md",
        ],
        // 页面标题
        title: "笔记",
        // 页面描述
        description: "积跬步以至千里",
    },
    life: {
        // 页面路径
        path: "/life",
        // 文章来源文件夹
        globPatterns: [
            "../pages/life/*.md",
        ],
        // 页面标题
        title: "随笔",
        // 页面描述
        description: "希望我的文字不止可以与自己共鸣",
    },
} as const;
