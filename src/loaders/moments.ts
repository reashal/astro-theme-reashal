import { promises as fs } from "node:fs";
import { extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { Loader, LoaderContext } from "astro/loaders";

const DATE_PATTERN = /^\d{4}\.\d{2}\.\d{2}$/;
const MONTH_FILE_PATTERN = /^\d{4}-\d{2}\.json$/;
const CUSTOM_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,79}$/;

const isValidDate = (value: string) => {
    if (!DATE_PATTERN.test(value)) return false;
    const [year, month, day] = value.split(".").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
};

export function momentsLoader(directory: string): Loader {
    const sync = async (context: LoaderContext) => {
        const directoryUrl = new URL(`${directory.replace(/\/?$/, "/")}`, context.config.root);
        const directoryPath = fileURLToPath(directoryUrl);
        const rootPath = fileURLToPath(context.config.root);
        const fileNames = (await fs.readdir(directoryPath))
            .filter((name) => MONTH_FILE_PATTERN.test(name))
            .sort();

        context.store.clear();
        const seenIds = new Set<string>();

        for (const fileName of fileNames) {
            const fileUrl = new URL(fileName, directoryUrl);
            const filePath = fileURLToPath(fileUrl);
            const rawItems: unknown = JSON.parse(await fs.readFile(filePath, "utf8"));

            if (!Array.isArray(rawItems)) {
                throw new TypeError(`${fileName} 顶层必须是数组`);
            }

            for (const rawItem of rawItems) {
                if (
                    typeof rawItem !== "object" ||
                    rawItem === null ||
                    !("date" in rawItem) ||
                    typeof rawItem.date !== "string" ||
                    !isValidDate(rawItem.date)
                ) {
                    throw new TypeError(`${fileName} 中存在无效的动态日期`);
                }

                const expectedMonth = fileName.slice(0, 7).replace("-", ".");
                if (!rawItem.date.startsWith(expectedMonth)) {
                    throw new TypeError(
                        `${rawItem.date} 应放在 ${rawItem.date.slice(0, 7).replace(".", "-")}.json`,
                    );
                }

                let id = rawItem.date.replaceAll(".", "-");
                if ("id" in rawItem) {
                    if (
                        typeof rawItem.id !== "string" ||
                        !CUSTOM_ID_PATTERN.test(rawItem.id)
                    ) {
                        throw new TypeError(
                            `${fileName} 中动态 id 无效：只能使用 1～80 位小写字母、数字、短横线或下划线，并以字母或数字开头`,
                        );
                    }
                    id = rawItem.id;
                }
                if (seenIds.has(id)) {
                    throw new TypeError(`动态 id 重复：${id}`);
                }
                seenIds.add(id);

                const normalizedPath = relative(rootPath, filePath);
                const data = await context.parseData({
                    id,
                    data: rawItem,
                    filePath: normalizedPath,
                });
                context.store.set({
                    id,
                    data,
                    filePath: normalizedPath,
                    digest: context.generateDigest(rawItem),
                });
            }
        }
    };

    return {
        name: "monthly-moments-loader",
        load: async (context) => {
            const directoryUrl = new URL(`${directory.replace(/\/?$/, "/")}`, context.config.root);
            const directoryPath = fileURLToPath(directoryUrl);
            await sync(context);
            context.watcher?.add(directoryPath);
            context.watcher?.on("all", async (event, changedPath) => {
                if (
                    ["add", "change", "unlink"].includes(event) &&
                    changedPath.startsWith(directoryPath) &&
                    extname(changedPath) === ".json"
                ) {
                    await sync(context);
                }
            });
        },
    };
}
