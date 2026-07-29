import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
    const siteOrigin = site ?? new URL("https://www.reashal.com");
    const sitemapUrl = new URL("sitemap-index.xml", siteOrigin);

    return new Response(
        ["User-agent: *", "Allow: /", "", `Sitemap: ${sitemapUrl.href}`].join(
            "\n",
        ),
        {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
            },
        },
    );
};
