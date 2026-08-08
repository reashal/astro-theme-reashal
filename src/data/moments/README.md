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

`para`、`loc`、`stars` 和 `comments` 的写法与原来一致。旧动态可以继续省略 `id`，系统会使用日期作为兼容 ID。通过 Content Studio 新增动态时，会根据调用方给出的 `date` 和创建时的本地时间自动生成精确到毫秒的 ID：

```json
[
  {
    "id": "2026-07-30T14:36:22.481",
    "date": "2026.07.30",
    "para": ["当天第一条动态"]
  },
  {
    "id": "2026-07-30T18:05:09.103",
    "date": "2026.07.30",
    "para": ["当天第二条动态"]
  }
]
```

同一毫秒发生碰撞时，Content Core 会将毫秒加一；同日动态按时间从新到旧展示。旧的自定义 ID 仍然兼容，并作为稳定排序兜底。
