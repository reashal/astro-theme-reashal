# 动态数据

每个月使用一个 `YYYY-MM.json` 文件，文件内是当月动态数组；`date` 必须与文件名中的年月一致。

图片与视频按实际展示顺序放入同一个 `media` 数组：

```json
{
  "date": "2026.07.30",
  "media": [
    {
      "type": "image",
      "url": "/images/example.jpg",
      "alt": "图片说明"
    },
    {
      "type": "video",
      "url": "/videos/example.mp4",
      "poster": "/images/video-cover.jpg",
      "alt": "视频说明"
    }
  ]
}
```

视频的 `poster` 可省略，但建议提供，避免列表中出现空白封面。音乐使用独立的 `music` 字段：

```json
{
  "date": "2026.07.29",
  "music": {
    "url": "/audio/example.mp3",
    "cover": "/images/album.jpg",
    "title": "歌名",
    "artist": "歌手"
  }
}
```

`para`、`loc`、`stars` 和 `comments` 的写法与原来一致。一天只有一条动态时可以省略 `id`，系统会使用日期作为 ID。同一天需要发布多条动态时，必须添加不同的 `id`：

```json
[
  {
    "id": "2026-07-30-01",
    "date": "2026.07.30",
    "para": ["当天第一条动态"]
  },
  {
    "id": "2026-07-30-02",
    "date": "2026.07.30",
    "para": ["当天第二条动态"]
  }
]
```

自定义 `id` 只能使用 1～80 位小写字母、数字、短横线或下划线，并以字母或数字开头；同日动态按照 `id` 字典序从小到大展示。
