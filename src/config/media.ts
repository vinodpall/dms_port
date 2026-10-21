/** 实时媒体与地图配置（可用 .env.local 覆盖，见 docs/media.md） */
export const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || '6f9eaf51960441fa4f813ea2d7e7cfff'
export const AMAP_SECURITY = import.meta.env.VITE_AMAP_SECURITY || ''

/** 机器人摄像头 WebRTC 流（SRS）。原型阶段所有机器人共用 robot_001 的两路流 */
export const CAM_STREAMS: Record<string, { rgb: string; ir: string }> = {
  default: {
    rgb: 'webrtc://39.185.83.71:1985/live/robot_001_cam_rtsp_left',
    ir: 'webrtc://39.185.83.71:1985/live/robot_001_cam_rtsp_right',
  },
}
export const streamsOf = (robotId: string) => CAM_STREAMS[robotId] ?? CAM_STREAMS.default

/** 地图文件（public/maps），后续可替换为按地图名从机器人下载 */
const base = import.meta.env.BASE_URL
export const MAP_FILES = { pcd: `${base}maps/tinyMap.pcd`, pgm: `${base}maps/gridMap.pgm` }
