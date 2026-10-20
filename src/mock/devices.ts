import type { Device, DeviceType, DeviceStatus, Capability } from '@/models/device'

const MODELS: Record<DeviceType, { model: string; vendor: string; protocol: Device['protocol']; caps: Capability[]; sensors: string[]; spec: Device['spec'] }[]> = {
  humanoid: [
    { model: 'Walker S1', vendor: '优必选', protocol: 'ROS2', caps: ['collect', 'teleop', 'twin'], sensors: ['双目深度相机 ×2', '3D 激光雷达', 'IMU', '六维力传感器 ×2', '灵巧手触觉阵列'], spec: { dof: 41, payload: '15 kg', speed: '2.0 m/s', endurance: '2 h', ip: 'IP54', size: '1720×560×300 mm', weight: '76 kg' } },
    { model: 'H1', vendor: '宇树科技', protocol: 'SDK', caps: ['collect', 'teleop', 'twin'], sensors: ['深度相机', '3D 激光雷达 MID-360', 'IMU', '关节编码器'], spec: { dof: 27, payload: '10 kg', speed: '3.3 m/s', endurance: '1.5 h', ip: 'IP43', size: '1800×570×220 mm', weight: '47 kg' } },
  ],
  quadruped: [
    { model: 'B2', vendor: '宇树科技', protocol: 'ROS2', caps: ['patrol', 'mapping', 'collect', 'twin'], sensors: ['3D 激光雷达', '前后深度相机', '红外热像仪', '气体传感器', 'IMU'], spec: { dof: 12, payload: '40 kg', speed: '6 m/s', endurance: '4 h', ip: 'IP67', size: '1098×450×645 mm', weight: '60 kg' } },
    { model: 'X30', vendor: '云深处', protocol: 'ROS2', caps: ['patrol', 'mapping', 'rescue'], sensors: ['激光雷达 ×2', '广角相机 ×4', '云台相机', '拾音器'], spec: { dof: 12, payload: '85 kg', speed: '4 m/s', endurance: '4 h', ip: 'IP67', size: '1000×470×685 mm', weight: '56 kg' } },
  ],
  ugv: [
    { model: 'Scout 2.0', vendor: '松灵机器人', protocol: 'ROS2', caps: ['patrol', 'mapping', 'collect'], sensors: ['16 线激光雷达', 'RTK-GNSS', '全景相机', '超声波 ×8'], spec: { payload: '50 kg', speed: '1.5 m/s', endurance: '8 h', ip: 'IP64', size: '930×699×349 mm', weight: '62 kg' } },
  ],
  uav: [
    { model: 'M350 RTK', vendor: '大疆', protocol: 'MAVLink', caps: ['patrol', 'mapping', 'rescue'], sensors: ['H20T 云台相机', 'RTK 模块', '毫米波雷达', '视觉避障 ×6'], spec: { payload: '2.7 kg', speed: '23 m/s', endurance: '55 min', ip: 'IP55', size: '810×670×430 mm', weight: '6.47 kg' } },
  ],
  usv: [
    { model: 'HL-950', vendor: '华测导航', protocol: 'NMEA2000', caps: ['rescue', 'patrol', 'mapping'], sensors: ['船载雷达', '声呐', '光电吊舱', '北斗定位', '救生圈投放器'], spec: { payload: '200 kg', speed: '12 kn', endurance: '6 h', ip: 'IP68', size: '1550×780×560 mm', weight: '35 kg' } },
  ],
}
const LOC: Record<DeviceType, string> = { humanoid: 'A 区机库', quadruped: 'B 区机库', ugv: 'C 区车库', uav: '停机坪', usv: '1 号码头' }
const GROUPS = ['一组', '二组', '三组', '应急组']
const PLAN: [DeviceType, number, string][] = [['humanoid', 8, 'HM'], ['quadruped', 10, 'QD'], ['ugv', 6, 'UG'], ['uav', 6, 'UA'], ['usv', 4, 'US']]
const STATUS_CYCLE: DeviceStatus[] = ['working', 'online', 'working', 'charging', 'online', 'working', 'offline', 'working', 'fault', 'online']
const NAMES: Record<DeviceType, string> = { humanoid: '人形', quadruped: '机器狗', ugv: '无人车', uav: '无人机', usv: '救生船' }

let seed = 7
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]

export const DEVICES: Device[] = PLAN.flatMap(([type, n, code]) =>
  Array.from({ length: n }, (_, i) => {
    const m = MODELS[type][i % MODELS[type].length]
    const status = STATUS_CYCLE[(i * 3 + code.charCodeAt(0)) % STATUS_CYCLE.length]
    const off = status === 'offline'
    const no = String(i + 1).padStart(3, '0')
    return {
      id: `${code}-${no}`,
      sn: `${code}${2024}${String(1000 + i * 37 + code.charCodeAt(1)).padStart(5, '0')}`,
      name: `${NAMES[type]}-${no}`,
      type, model: m.model, vendor: m.vendor, status,
      battery: status === 'charging' ? 20 + Math.round(rnd() * 50) : off ? 0 : 35 + Math.round(rnd() * 64),
      signal: off ? 0 : 1 + Math.floor(rnd() * 4),
      cpu: off ? 0 : 12 + Math.round(rnd() * 70),
      temp: off ? 0 : 34 + Math.round(rnd() * 30),
      location: `${LOC[type]} · ${String.fromCharCode(65 + (i % 3))}-${String(i + 1).padStart(2, '0')}`, group: pick(GROUPS), protocol: m.protocol,
      ipAddr: `10.20.${PLAN.findIndex((p) => p[0] === type) + 1}.${11 + i}`,
      firmware: `v${2 + (i % 2)}.${(i * 3) % 10}.${(i * 7) % 12}`,
      lastSeen: off ? `${2 + i} 小时前` : status === 'fault' ? '3 分钟前' : '刚刚',
      hours: 120 + Math.round(rnd() * 2600),
      caps: m.caps, sensors: m.sensors, spec: m.spec,
      owner: pick(['周工', '赵工', '张杰']),
      commissioned: `2024-${String(1 + (i % 12)).padStart(2, '0')}-${String(3 + i).padStart(2, '0')}`,
    } satisfies Device
  }),
)
