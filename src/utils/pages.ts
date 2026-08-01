import pagesConfigJson from "../pages-config.json";
import { pagesConfigSchema } from "../types";

export const pagesConfig = pagesConfigSchema.parse(pagesConfigJson).pages;

export const getPageConfig = (path: string) => {
    const config = pagesConfig.find((page) => page.path === path);
    if (!config) {
        throw new Error(`pages-config.json 缺少 "${path}" 页面配置`);
    }
    return config;
};
