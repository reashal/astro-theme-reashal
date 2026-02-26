// 网站信息
export const SITE_INFO = {
    // 网站标题
    title: "睿屿青衫",
    // 备案信息（可选，不需要则留空字符串）
    icpNo: "鲁ICP备2026003899号-1",
    // 工信部链接（可选）
    icpLink: "https://beian.miit.gov.cn/",
    // 页面底部结束提示文字
    endTip: "故事暂且讲到这里",
    // 顶部横幅壁纸路径
    wallpaper: "/static/images/wallpaper.webp",
};

// 博主信息
export const AUTHOR_INFO = {
    // 昵称
    name: "睿屿青衫",
    // 头像路径
    avatar: "/static/favicon.svg",
    // 个性签名
    description: "希望我们能在前行的路上久别重逢",
    // 详细介绍（hover时展示，留空时采用description）
    detailDescription: "",
};

// 导航链接
export const NAV_LINKS: { label: string; href: string; icon: string; external?: boolean }[] = [
    { label: "动态", href: "/",                          icon: "iconfont icon-Home" },
    { label: "随笔", href: "/life",                      icon: "iconfont icon-pencil" },
    { label: "笔记", href: "/docs",                      icon: "iconfont icon-pc" },
    { label: "链接", href: "/links",                     icon: "iconfont icon-plane" },
    { label: "仓库", href: "https://github.com/reashal", icon: "iconfont icon-github",  external: true },
    { label: "游弋", href: "https://uuuu.ee",            icon: "iconfont icon-planet",  external: true },
];
