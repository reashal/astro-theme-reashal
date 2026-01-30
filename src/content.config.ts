// 1. 从 `astro:content` 导入工具函数
import { defineCollection } from 'astro:content';

// 2. 导入加载器
import { glob, file } from 'astro/loaders';

// 3. 导入 Zod
import { z } from 'astro/zod';

// 4. 定义“动态”集合
const moments = defineCollection({
    loader: file("src/moments.json", {
        parser: (text) => {
            const items = JSON.parse(text);
            // 使用 map 遍历，利用索引 index 生成唯一 ID
            return items.map((item: any, index: number) => ({
                // 生成类似"moment-0", "moment-1" 的 ID
                id: `moment-${index}`,
                ...item,
            }));
        }
    })
})

// 5. 导出一个 `collections` 对象来注册你的集合
export const collections = { moments };