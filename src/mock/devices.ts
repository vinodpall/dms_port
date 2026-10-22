import type { Device, DeviceModel, DeviceStatus, DeviceType } from '@/models/device'
import { AREAS, OWNERS } from '@/models/device'

const M = (id: string, type: DeviceType, name: string, vendor: string, protocol: DeviceModel['protocol'], cameras: string[], spec: DeviceModel['spec']): DeviceModel => ({ id, type, name, vendor, protocol, cameras, spec })

export const MODELS: DeviceModel[] = [
  M('qd-b2', 'quadruped', 'B2', '宇树科技', 'ROS2', ['前视', '后视', '云台'], { speed: '6 m/s', endurance: '4 h', payload: '40 kg', weight: '60 kg' }),
  M('qd-go2', 'quadruped', 'Go2 EDU', '宇树科技', 'SDK', ['前视'], { speed: '3.7 m/s', endurance: '2 h', payload: '8 kg', weight: '15 kg' }),
  M('qd-x30', 'quadruped', 'X30', '云深处', 'ROS2', ['前视', '后视', '云台'], { speed: '4 m/s', endurance: '4 h', payload: '85 kg', weight: '56 kg' }),
  M('qd-lite3', 'quadruped', 'Lite3', '云深处', 'ROS2', ['前视'], { speed: '2.5 m/s', endurance: '1.5 h', payload: '7.5 kg', weight: '12 kg' }),
  M('qd-spot', 'quadruped', 'Spot', 'Boston Dynamics', 'SDK', ['前视', '左侧', '右侧', '后视'], { speed: '1.6 m/s', endurance: '1.5 h', payload: '14 kg', weight: '32 kg' }),
  M('ug-scout', 'ugv', 'Scout 2.0', '松灵机器人', 'ROS2', ['前视', '全景'], { speed: '1.5 m/s', endurance: '8 h', payload: '50 kg', weight: '62 kg' }),
  M('ug-hunter', 'ugv', 'Hunter SE', '松灵机器人', 'ROS2', ['前视', '后视'], { speed: '4.8 m/s', endurance: '6 h', payload: '50 kg', weight: '42 kg' }),
  M('ug-bunker', 'ugv', 'Bunker Mini', '松灵机器人', 'ROS2', ['前视'], { speed: '1.5 m/s', endurance: '4 h', payload: '35 kg', weight: '55 kg' }),
  M('ua-m350', 'uav', 'M350 RTK', '大疆', 'MAVLink', ['云台', '下视'], { speed: '23 m/s', endurance: '55 min', payload: '2.7 kg', weight: '6.5 kg' }),
  M('ua-m30t', 'uav', 'M30T', '大疆', 'MAVLink', ['广角', '变焦', '红外'], { speed: '23 m/s', endurance: '41 min', payload: '—', weight: '3.8 kg' }),
  M('ua-m3e', 'uav', 'Mavic 3E', '大疆', 'MAVLink', ['广角', '长焦'], { speed: '21 m/s', endurance: '45 min', payload: '—', weight: '0.9 kg' }),
  M('ua-m4t', 'uav', 'Matrice 4T', '大疆', 'MAVLink', ['广角', '变焦', '红外'], { speed: '21 m/s', endurance: '49 min', payload: '—', weight: '1.2 kg' }),
  M('ua-x500', 'uav', 'X500 V2', 'Holybro', 'MAVLink', ['前视'], { speed: '15 m/s', endurance: '18 min', payload: '1 kg', weight: '1.3 kg' }),
  M('hm-walker', 'humanoid', 'Walker S1', '优必选', 'ROS2', ['头部', '左腕', '右腕'], { speed: '2 m/s', endurance: '2 h', payload: '15 kg', weight: '76 kg' }),
  M('hm-h1', 'humanoid', 'H1', '宇树科技', 'SDK', ['头部'], { speed: '3.3 m/s', endurance: '1.5 h', payload: '10 kg', weight: '47 kg' }),
]

const COUNT = [3, 4, 2, 2, 1, 3, 2, 2, 2, 3, 2, 1, 2, 3, 2]
const CODE: Record<DeviceType, string> = { quadruped: 'QD', ugv: 'UG', uav: 'UA', humanoid: 'HM' }
const NAME: Record<DeviceType, string> = { quadruped: '机器狗', ugv: '无人车', uav: '无人机', humanoid: '人形' }
const AREA: Record<DeviceType, number[]> = { quadruped: [0, 1], ugv: [2, 1], uav: [3], humanoid: [0] }
const CYCLE: DeviceStatus[] = ['working', 'idle', 'working', 'charging', 'idle', 'offline', 'working', 'idle', 'fault', 'working', 'idle']
const GAITS = ['行走', '小跑', '爬楼']

let seed = 11
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
const r1 = (n: number) => Math.round(n * 10) / 10

const seq: Record<DeviceType, number> = { quadruped: 0, ugv: 0, uav: 0, humanoid: 0 }
let k = 0
export const DEVICES: Device[] = MODELS.flatMap((m, mi) =>
  Array.from({ length: COUNT[mi] }, () => {
    const t = m.type
    const n = ++seq[t]
    const status = CYCLE[k++ % CYCLE.length]
    const off = status === 'offline'
    const run = status === 'working'
    const no = String(n).padStart(2, '0')
    const ai = AREA[t][n % AREA[t].length]
    return {
      id: `${CODE[t]}-${no}`,
      sn: `${CODE[t]}24${String(10350 + n * 37 + mi * 11).padStart(6, '0')}`,
      name: `${NAME[t]}-${no}`,
      type: t, modelId: m.id, status,
      battery: off ? 0 : status === 'charging' ? 30 + Math.round(rnd() * 40) : 25 + Math.round(rnd() * 74),
      ip: `10.20.${['quadruped', 'ugv', 'uav', 'humanoid'].indexOf(t) + 1}.${10 + n}`,
      area: AREAS[ai],
      owner: OWNERS[(n + mi) % OWNERS.length],
      firmware: n % 4 === 1 && mi % 3 !== 2 ? `v${2 + (mi % 2)}.${(mi * 3) % 9}.${mi % 4}` : `v${2 + (mi % 2)}.${(mi * 3) % 9 + 1}.${(mi * 2) % 5}`,
      commissioned: `2025-${String(1 + ((n * 5 + mi) % 12)).padStart(2, '0')}-${String(3 + ((n * 7) % 25)).padStart(2, '0')}`,
      lastSeen: off ? `${2 + n} 小时前` : '刚刚',
      tm: {
        speed: run ? r1(0.4 + rnd() * (t === 'uav' ? 8 : 1.4)) : 0,
        latency: off ? 0 : 24 + Math.round(rnd() * 50),
        x: r1(4 + rnd() * 52), y: r1(4 + rnd() * 32), yaw: Math.round(rnd() * 360),
        ...(t === 'uav' ? { alt: run ? r1(20 + rnd() * 60) : 0 } : {}),
        ...(t === 'quadruped' ? { gait: run ? GAITS[n % 3] : '站立' } : {}),
        ...(t === 'humanoid' ? { joint: status === 'fault' ? '异常' as const : '正常' as const } : {}),
      },
    } satisfies Device
  }),
)
