import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import pagefindIntegration from './src/integrations/pagefind.mjs';

// 各镜像可分别设置该变量，生成属于自身的 canonical、订阅和站点地图地址。
const site = process.env.SITE_URL?.trim() || 'https://www.reashal.com';

export default defineConfig({
    site,
    integrations: [
        sitemap({
            filter: (page) => !page.endsWith('/404/'),
            namespaces: {
                news: false,
                video: false,
                xhtml: false,
            },
        }),
        pagefindIntegration(),
    ],
});
