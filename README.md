# Astro Theme Reashal

[简体中文](#简体中文) · [English](#english)

## 简体中文

### 项目简介

一个基于 [Astro](https://astro.build/) 构建的个人博客，围绕“动态、随笔、展示”三类内容组织页面。项目采用静态输出，兼顾内容维护、阅读体验、站点发现能力与多镜像部署。

- 在线站点：[www.reashal.com](https://www.reashal.com)
- 技术栈：Astro 7、TypeScript、Pagefind、Giscus

![主题展示](./public/static/images/Theme.png)

### 功能概览

- **动态**：数据按月拆分，每次加载 10 条；支持正文、图片、视频、音乐、地点以及历史点赞和评论。
- **随笔**：使用 Markdown 写作，支持置顶、标签、全文搜索、阅读时间、阅读进度、层级目录、上下篇和相关文章。
- **展示**：在 `/show` 下统一展示物品清单与友情链接，通过 URL hash 切换分类。
- **媒体体验**：同一条动态中的图片和视频可以连续查看；支持图片缩放与拖动、视频播放以及移动端手势。
- **主题与交互**：响应式布局、深浅色模式、代码高亮与复制、分享二维码和 Giscus 评论。
- **站点发现**：自动生成 RSS、Sitemap、robots.txt、Canonical、Open Graph 与文章结构化数据。
- **镜像部署**：不同部署环境可以分别设置站点地址，生成与当前镜像一致的规范链接和订阅地址。

### 环境要求

- Node.js `>= 22.12.0`
- npm（随 Node.js 提供）

### 本地开发

```bash
git clone https://github.com/reashal/astro-theme-reashal.git
cd astro-theme-reashal
npm ci
npm run dev
```

开发服务器默认运行于 `http://localhost:4321`。

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run check` | 执行 Astro 与 TypeScript 检查 |
| `npm run build` | 构建静态站点并生成 Pagefind 索引 |
| `npm run preview` | 本地预览构建产物 |

提交改动前建议至少执行：

```bash
npm run check
npm run build
```

### 项目结构

```text
├── public/                  # 图片、字体和无需构建处理的静态资源
├── src/
│   ├── components/         # 侧边栏、搜索、评论、分享、目录等组件
│   ├── data/moments/       # 按年月拆分的动态 JSON
│   ├── integrations/       # Pagefind 构建集成
│   ├── layouts/            # 基础页面与文章布局
│   ├── loaders/            # 动态内容集合加载器
│   ├── pages/              # Astro 路由与 Markdown 随笔
│   ├── scripts/            # 页面交互逻辑
│   ├── styles/             # 全局及模块样式
│   ├── consts.ts           # 站点与作者信息
│   ├── pages-config.json   # 主导航及页面元信息
│   └── showcase.json       # 展示模块数据
├── astro.config.mjs        # Astro、Sitemap 与 Markdown 配置
└── package.json
```

### 内容维护

#### 动态

动态位于 `src/data/moments/`。每个月对应一个 `YYYY-MM.json` 文件，文件顶层必须是数组；每条动态的 `date` 必须使用 `YYYY.MM.DD` 格式，并与文件名中的年月一致。

完整示例：

```json
[
  {
    "id": "2026-08-01-01",
    "date": "2026.08.01",
    "para": [
      "第一段正文。",
      "第二段正文。"
    ],
    "media": [
      {
        "type": "image",
        "url": "/images/moments/example.jpg",
        "alt": "图片内容说明"
      },
      {
        "type": "video",
        "url": "/videos/example.mp4",
        "poster": "/images/moments/video-cover.jpg",
        "alt": "视频内容说明"
      }
    ],
    "music": {
      "url": "/audio/example.mp3",
      "cover": "/images/moments/album-cover.jpg",
      "title": "歌曲名称",
      "artist": "歌手名称"
    },
    "loc": "山东 · 青岛",
    "stars": ["朋友甲", "朋友乙"],
    "comments": ["一条留存的评论"]
  }
]
```

字段说明：

| 字段 | 类型 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 条件必需 | 一天只有一条动态时可省略；同日多条时必须提供不同 ID |
| `date` | `string` | 是 | 发布日期，格式为 `YYYY.MM.DD` |
| `para` | `string[]` | 否 | 正文段落，一项对应一个自然段 |
| `media` | `Media[]` | 否 | 图片与视频组成的有序数组，可以混合排列 |
| `music` | `object` | 否 | 一条动态最多附带一首音乐 |
| `loc` | `string` | 否 | 地点信息 |
| `stars` | `string[]` | 否 | 留存的点赞者名称；为空时不渲染互动区域 |
| `comments` | `string[]` | 否 | 留存的评论文本；为空时不渲染互动区域 |

`para`、`media`、`stars` 和 `comments` 省略时均按空数组处理。

图片字段：

| 字段 | 是否必需 | 说明 |
| --- | --- | --- |
| `type` | 是 | 固定为 `image` |
| `url` | 是 | 图片地址，支持站内路径或完整 URL |
| `alt` | 是 | 图片替代文本，同时用于媒体查看器的内容说明 |

视频字段：

| 字段 | 是否必需 | 说明 |
| --- | --- | --- |
| `type` | 是 | 固定为 `video` |
| `url` | 是 | 视频文件地址 |
| `alt` | 是 | 视频内容说明 |
| `poster` | 否 | 播放前封面；省略时尝试加载视频首帧作为预览 |

图片和视频按照 `media` 数组中的顺序展示和切换。单条动态超过 9 项媒体时，列表只显示前 9 个预览，并在最后一格标注剩余数量；打开媒体查看器后仍可查看全部内容。媒体资源接近可视区域时才加载，以减少首屏请求。

音乐字段：

| 字段 | 是否必需 | 说明 |
| --- | --- | --- |
| `url` | 是 | 音频文件地址 |
| `cover` | 是 | 封面图片地址 |
| `title` | 是 | 歌曲名称 |
| `artist` | 是 | 歌手名称 |

音乐播放器提供播放、暂停、当前时间、总时长和进度拖动。同一时间只播放一首音乐；开始播放另一首音乐或在媒体查看器中播放视频时，当前音乐会暂停。

自定义 `id` 只能包含 1～80 位小写字母、数字、短横线或下划线，并且必须以字母或数字开头。不同日期按日期倒序展示；日期相同时按 `id` 字典序从小到大展示。动态会以每页 10 条生成静态片段，滚动到底部或点击加载提示后继续载入；带动态锚点访问页面时，会自动加载到目标所在页。

更多独立示例见 [`src/data/moments/README.md`](./src/data/moments/README.md)。

#### 随笔

随笔位于 `src/pages/docs/`，文件名决定访问路径，例如 `007.md` 对应 `/docs/007`。每篇文章都需要以下 frontmatter：

```yaml
---
layout: ../../layouts/Article.astro
title: 文章标题
desc: 用于列表与 SEO 的简短描述
author: 作者名称
source: https://www.reashal.com/docs/007
pubDate: 2026-08-01
updatedDate: 2026-08-02
tags: ["生活", "记录"]
pinned: false
---
```

| 字段 | 是否必需 | 说明 |
| --- | --- | --- |
| `layout` | 是 | 随笔页面布局，通常固定为 `../../layouts/Article.astro` |
| `title` | 是 | 文章标题 |
| `desc` | 是 | 列表摘要及 SEO 描述 |
| `author` | 是 | 作者或原作者名称 |
| `source` | 是 | 完整来源 URL，同时用于文末版权信息 |
| `pubDate` | 是 | 首次发布日期，格式为 `YYYY-MM-DD` |
| `updatedDate` | 否 | 正文最近一次实质性修改日期；题头、格式或 URL 调整不应更新此值 |
| `tags` | 否 | 标签数组，用于标签页和相关文章计算 |
| `pinned` | 否 | 是否置顶，默认为 `false` |

文章正文使用 Markdown。页面会自动生成阅读时间和阅读进度；存在至少 3 个二至六级标题时显示层级目录。相关文章根据共同标签数量排序，最多展示 2 篇。生产构建只索引 `/docs` 下的随笔内容，开发环境则使用本地轻量搜索实现即时调试。

#### 展示

`src/showcase.json` 保存 `/show` 页面数据，当前包含 `stuff`（物品清单）与 `links`（站点镜像、互链朋友和推荐站点）。分类键同时作为 URL hash，例如 `/show#links`。

每个分类可以包含：

| 字段 | 是否必需 | 说明 |
| --- | --- | --- |
| `title` | 是 | 分类名称 |
| `showFooter` | 否 | 是否显示站点名称、网址、头像和描述 |
| `intro` | 否 | “写在前面”的段落数组 |
| `sections` | 是 | 展示分区数组 |

每个分区包含 `title` 和 `cards`。卡片字段如下：

| 字段 | 是否必需 | 说明 |
| --- | --- | --- |
| `title` | 是 | 卡片名称 |
| `description` | 是 | 卡片说明 |
| `link` | 否 | 点击后打开的地址；省略时渲染为非链接卡片 |
| `image` | 否 | 图片或头像地址；加载失败时显示标题首字母占位 |
| `specs` | 否 | 参数标签数组，主要用于物品卡片 |
| `imageMode` | 是 | 卡片展示形态 |

`imageMode` 支持：

| 值 | 用途 |
| --- | --- |
| `text-only` | 纯文字链接卡片 |
| `icon-simple` | 简洁图标卡片 |
| `app-card` | 带头像或站点图标的卡片 |
| `product-card` | 带大图、参数和说明的物品卡片 |

展示数据会在构建时通过 `src/showcase-types.ts` 校验。当前友情链接分类还会加载站点资料卡和 Giscus 评论区。

### 站点配置

| 文件 | 用途 |
| --- | --- |
| `src/consts.ts` | 站点名称、简介、壁纸、备案信息及作者资料 |
| `src/pages-config.json` | 侧边栏入口、页面标题、描述与图标 |
| `src/showcase.json` | 展示模块分类、分区与卡片 |
| `src/components/Giscus.astro` | Giscus 仓库、分类、语言和主题同步配置 |
| `astro.config.mjs` | 站点地址、Markdown 高亮、Sitemap 与 Pagefind |

环境变量：

| 变量 | 是否必需 | 说明 |
| --- | --- | --- |
| `SITE_URL` | 否 | 当前部署的完整站点根地址；默认使用 `https://www.reashal.com` |

不同镜像应分别设置 `SITE_URL`：

```bash
SITE_URL=https://example.com npm run build
```

该值用于 Canonical、RSS、Sitemap、robots.txt、社交分享元信息和结构化数据。请填写包含协议的站点根地址，不要附加页面路径。

### 构建与部署

```bash
npm ci
npm run check
npm run build
```

构建产物位于 `dist/`，可以部署到任意静态托管平台。生产环境应发布 `npm run build` 的完整产物，以确保 Pagefind 搜索索引、RSS、Sitemap 和动态分页片段均已生成。

### 设计与依赖说明

- 页面字体采用 HarmonyOS Sans。
- 评论功能由 [Giscus](https://giscus.app/) 提供。
- 搜索功能由 [Pagefind](https://pagefind.app/) 提供。
- 头图取自“WallPaper - 李擎洲 - 小梨花”。

本仓库同时包含个人文章与媒体资源；引用、转载或二次使用前，请分别确认代码依赖及内容资源的授权范围。

---

## English

### Overview

A personal blog built with [Astro](https://astro.build/) and organized around three content areas: Moments, Essays, and Showcase. The project is statically generated and designed for maintainable content, a polished reading experience, content discovery, and independent mirror deployments.

- Live site: [www.reashal.com](https://www.reashal.com)
- Stack: Astro 7, TypeScript, Pagefind, and Giscus

![Theme preview](./public/static/images/Theme.png)

### Features

- **Moments**: Monthly JSON files, 10-item incremental loading, text, images, videos, music, locations, and archived reactions and comments.
- **Essays**: Markdown authoring with pinned posts, tags, full-text search, reading time, reading progress, hierarchical table of contents, adjacent posts, and related posts.
- **Showcase**: Products and links share the `/show` route and are switched through URL hashes.
- **Media experience**: Images and videos from the same moment can be browsed continuously, with image zooming and panning, video playback, and mobile gestures.
- **Theme and interaction**: Responsive layout, light and dark themes, syntax highlighting, code copying, QR-code sharing, and Giscus comments.
- **Discovery**: RSS, Sitemap, robots.txt, Canonical URLs, Open Graph metadata, and article structured data.
- **Mirror deployments**: Each deployment can generate canonical and feed URLs for its own origin.

### Requirements

- Node.js `>= 22.12.0`
- npm, bundled with Node.js

### Local Development

```bash
git clone https://github.com/reashal/astro-theme-reashal.git
cd astro-theme-reashal
npm ci
npm run dev
```

The development server runs at `http://localhost:4321` by default.

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run check` | Run Astro and TypeScript diagnostics |
| `npm run build` | Build the static site and Pagefind index |
| `npm run preview` | Preview the production build locally |

Before committing changes, run at least:

```bash
npm run check
npm run build
```

### Project Structure

```text
├── public/                  # Images, fonts, and unprocessed static assets
├── src/
│   ├── components/         # Sidebar, search, comments, sharing, and TOC
│   ├── data/moments/       # Monthly Moment JSON files
│   ├── integrations/       # Pagefind build integration
│   ├── layouts/            # Base and essay layouts
│   ├── loaders/            # Moment content collection loader
│   ├── pages/              # Astro routes and Markdown essays
│   ├── scripts/            # Client-side interactions
│   ├── styles/             # Global and module styles
│   ├── consts.ts           # Site and author information
│   ├── pages-config.json   # Main navigation and page metadata
│   └── showcase.json       # Showcase data
├── astro.config.mjs        # Astro, Sitemap, and Markdown configuration
└── package.json
```

### Content Authoring

#### Moments

Moments live in `src/data/moments/`. Each month uses one `YYYY-MM.json` file whose top level must be an array. Every `date` must follow `YYYY.MM.DD` and match the year and month in its filename.

Complete example:

```json
[
  {
    "id": "2026-08-01-01",
    "date": "2026.08.01",
    "para": [
      "The first paragraph.",
      "The second paragraph."
    ],
    "media": [
      {
        "type": "image",
        "url": "/images/moments/example.jpg",
        "alt": "Description of the image"
      },
      {
        "type": "video",
        "url": "/videos/example.mp4",
        "poster": "/images/moments/video-cover.jpg",
        "alt": "Description of the video"
      }
    ],
    "music": {
      "url": "/audio/example.mp3",
      "cover": "/images/moments/album-cover.jpg",
      "title": "Track title",
      "artist": "Artist name"
    },
    "loc": "Qingdao, Shandong",
    "stars": ["Friend A", "Friend B"],
    "comments": ["An archived comment"]
  }
]
```

Moment fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Conditional | May be omitted for a single Moment on a date; required and unique when a date has multiple entries |
| `date` | `string` | Yes | Publication date in `YYYY.MM.DD` format |
| `para` | `string[]` | No | Body paragraphs, with one array item per paragraph |
| `media` | `Media[]` | No | An ordered array containing images and videos in any combination |
| `music` | `object` | No | At most one music item per Moment |
| `loc` | `string` | No | Location label |
| `stars` | `string[]` | No | Archived reactor names; no interaction area is rendered when empty |
| `comments` | `string[]` | No | Archived comment text; no interaction area is rendered when empty |

`para`, `media`, `stars`, and `comments` default to empty arrays when omitted.

Image fields:

| Field | Required | Description |
| --- | --- | --- |
| `type` | Yes | Must be `image` |
| `url` | Yes | An internal path or absolute image URL |
| `alt` | Yes | Alternative text, also used as the media viewer caption |

Video fields:

| Field | Required | Description |
| --- | --- | --- |
| `type` | Yes | Must be `video` |
| `url` | Yes | Video file URL |
| `alt` | Yes | Description of the video |
| `poster` | No | Preview image shown before playback; when omitted, the video first frame is requested as the preview |

Images and videos are displayed and browsed in their `media` array order. If a Moment contains more than nine items, the feed shows the first nine previews and places the remaining count on the last tile; all items remain available in the media viewer. Media sources are loaded only when they approach the viewport to reduce initial requests.

Music fields:

| Field | Required | Description |
| --- | --- | --- |
| `url` | Yes | Audio file URL |
| `cover` | Yes | Cover image URL |
| `title` | Yes | Track title |
| `artist` | Yes | Artist name |

The music player provides play, pause, current time, duration, and seek controls. Only one track plays at a time. Starting another track or playing a video in the media viewer pauses the current track.

A custom `id` must contain 1–80 lowercase letters, digits, hyphens, or underscores, and must start with a letter or digit. Dates are ordered newest first; entries on the same date are ordered by `id` in ascending lexicographical order. Static fragments contain 10 items each and are loaded when the reader reaches the bottom or activates the load control. A URL containing a Moment anchor automatically loads pages until the target is available.

See [`src/data/moments/README.md`](./src/data/moments/README.md) for additional focused examples.

#### Essays

Essays live in `src/pages/docs/`. The filename determines the route; for example, `007.md` becomes `/docs/007`. Every essay requires the following frontmatter:

```yaml
---
layout: ../../layouts/Article.astro
title: Essay title
desc: A short description for lists and SEO
author: Author name
source: https://www.reashal.com/docs/007
pubDate: 2026-08-01
updatedDate: 2026-08-02
tags: ["Life", "Notes"]
pinned: false
---
```

| Field | Required | Description |
| --- | --- | --- |
| `layout` | Yes | Essay layout, normally `../../layouts/Article.astro` |
| `title` | Yes | Essay title |
| `desc` | Yes | List excerpt and SEO description |
| `author` | Yes | Author or original author name |
| `source` | Yes | Absolute source URL used in the copyright block |
| `pubDate` | Yes | Original publication date in `YYYY-MM-DD` format |
| `updatedDate` | No | Date of the latest substantive body edit; metadata, formatting, or URL-only changes should not update it |
| `tags` | No | Tags used by tag pages and related-post ranking |
| `pinned` | No | Whether the essay is pinned; defaults to `false` |

Essay bodies use Markdown. Reading time and progress are generated automatically. The hierarchical table of contents appears when an essay has at least three headings from levels two through six. Related posts are ranked by shared tag count, with at most two displayed. Production builds index only essays under `/docs`; development mode uses a lightweight local implementation for immediate search testing.

#### Showcase

`src/showcase.json` stores data for `/show`. It currently contains `stuff` for products and `links` for mirrors, friends, and recommended sites. Each category key is also its URL hash, such as `/show#links`.

A category can contain:

| Field | Required | Description |
| --- | --- | --- |
| `title` | Yes | Category title |
| `showFooter` | No | Whether to display the site name, URL, avatar, and description |
| `intro` | No | Introductory paragraph array |
| `sections` | Yes | Showcase section array |

Each section contains `title` and `cards`. Card fields are:

| Field | Required | Description |
| --- | --- | --- |
| `title` | Yes | Card title |
| `description` | Yes | Card description |
| `link` | No | URL opened by the card; omission renders a non-link card |
| `image` | No | Image or avatar URL; a title initial is used if loading fails |
| `specs` | No | Specification labels, primarily for product cards |
| `imageMode` | Yes | Visual card variant |

Supported `imageMode` values:

| Value | Use case |
| --- | --- |
| `text-only` | Text-only link card |
| `icon-simple` | Minimal icon card |
| `app-card` | Card with an avatar or site icon |
| `product-card` | Product card with a large image, specifications, and description |

Showcase data is validated by `src/showcase-types.ts` during the build. The current Links category also renders the site profile block and Giscus comments.

### Site Configuration

| File | Purpose |
| --- | --- |
| `src/consts.ts` | Site title, description, wallpaper, ICP information, and author profile |
| `src/pages-config.json` | Sidebar entries, page titles, descriptions, and icons |
| `src/showcase.json` | Showcase categories, sections, and cards |
| `src/components/Giscus.astro` | Giscus repository, category, language, and theme synchronization |
| `astro.config.mjs` | Site origin, Markdown highlighting, Sitemap, and Pagefind |

Environment variable:

| Variable | Required | Description |
| --- | --- | --- |
| `SITE_URL` | No | Absolute root URL for the current deployment; defaults to `https://www.reashal.com` |

Set a separate `SITE_URL` for each mirror:

```bash
SITE_URL=https://example.com npm run build
```

The value is used by Canonical URLs, RSS, Sitemap, robots.txt, social metadata, and structured data. Include the protocol and site root, without a page path.

### Build and Deployment

```bash
npm ci
npm run check
npm run build
```

The output is written to `dist/` and can be deployed to any static hosting provider. Deploy the complete `npm run build` output so that the Pagefind index, RSS feed, Sitemap, and paginated Moment fragments are all available.

### Design and Dependencies

- The interface uses HarmonyOS Sans.
- Comments are powered by [Giscus](https://giscus.app/).
- Search is powered by [Pagefind](https://pagefind.app/).
- The header artwork is “WallPaper - Li Qingzhou - Small Pear Blossoms.”

This repository also contains personal writing and media assets. Before quoting, redistributing, or reusing any part of it, verify the applicable licenses and permissions for both code dependencies and content assets.
