import { fileURLToPath } from "node:url";
import * as pagefind from "pagefind";

const formatErrors = (errors) => errors.filter(Boolean).join("\n");

export default function pagefindIntegration() {
    return {
        name: "reashal-pagefind",
        hooks: {
            "astro:build:done": async ({ dir, logger }) => {
                const outputDirectory = fileURLToPath(dir);
                const searchDirectory = fileURLToPath(new URL("pagefind/", dir));

                try {
                    const created = await pagefind.createIndex({
                        verbose: false,
                        writePlayground: false,
                    });

                    if (!created.index || created.errors.length > 0) {
                        throw new Error(
                            formatErrors(created.errors) ||
                                "Pagefind 索引初始化失败",
                        );
                    }

                    const indexed = await created.index.addDirectory({
                        path: outputDirectory,
                        glob: "docs/*/index.html",
                    });

                    if (indexed.errors.length > 0) {
                        throw new Error(formatErrors(indexed.errors));
                    }

                    const written = await created.index.writeFiles({
                        outputPath: searchDirectory,
                    });

                    if (written.errors.length > 0) {
                        throw new Error(formatErrors(written.errors));
                    }

                    logger.info(`已索引 ${indexed.page_count} 篇随笔`);
                } finally {
                    await pagefind.close();
                }
            },
        },
    };
}
