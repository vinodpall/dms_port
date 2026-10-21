# 实时媒体与地图组件

业务模块（机器人业务管理）的地图与视频已由原型绘制改为真实组件，位于 `src/components/viz/`。

| 组件 | 说明 |
| --- | --- |
| `PointCloudView.vue` | three.js 渲染 PCD 点云（ascii / binary / binary_compressed），支持 3D / 俯视切换、高度 / 强度着色，叠加路线、任务点与机器人位置；`live` 模式模拟建图逐步显示 |
| `gridmap.ts` | 解析 PGM（P2/P5）栅格地图并按深色主题渲染，`BizMap` 栅格模式支持滚轮缩放、拖拽平移 |
| `SatMap.vue` | 高德地图 JS API 2.0，卫星 + 路网图层，叠加路线、点位、机器人与重定位箭头 |
| `WebRtcVideo.vue` | SRS WebRTC 拉流（`webrtc://host:1985/app/stream`），断线指数退避自动重连，支持全屏 |

## 地图文件

- 默认文件：`public/maps/tinyMap.pcd`（点云）、`public/maps/gridMap.pgm`（栅格，0.2 m/px）。
- 替换文件后，需同步 `src/views/proto/biz/geo.ts` 中的 `GRID_RECT` 与 `toReal / toFrame` 换算（PGM 原点、分辨率）。
- 点云与栅格已配准：`px = x / 0.2 + 267.74`，`py = 284.49 − y / 0.2`。

## 视频流（WebRTC）

流地址在 `src/config/media.ts` 的 `CAM_STREAMS` 中按机器人配置（可见光 `rgb`、红外 `ir`）。

浏览器向 SRS 发起 SDP 握手时存在跨域 / 混合内容问题，因此统一走同源代理：

```
POST /rtc-proxy/{host}[:port]/rtc/v1/play/  →  http://{host}:1985/rtc/v1/play/
```

- 开发 / `vite preview`：`vite.config.ts` 中的 `rtc-proxy` 插件已处理。
- 生产（nginx）示例：

```nginx
location ~ ^/rtc-proxy/([^/:]+)(?::\d+)?/(.*)$ {
    resolver 223.5.5.5;
    proxy_pass http://$1:1985/$2;
    proxy_set_header Host $1;
}
```

- 也可设置 `VITE_RTC_API` 直接指定握手接口前缀。媒体数据走 UDP 8000（SRS 默认），需保证浏览器到 SRS 的 UDP 可达。

## 高德地图

在项目根目录创建 `.env.local`：

```
VITE_AMAP_KEY=你的 Web 端 Key
VITE_AMAP_SECURITY=对应的安全密钥（jscode）
```

未配置时使用 robot_web 中的默认 Key；生产环境请申请本项目专用 Key 并配置域名白名单。
