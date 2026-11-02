// 极简天文计算：只求解"今晚月亮是什么样、头顶有哪些亮星"
// 精度约 ±1°，对一片装饰性夜空来说足够真实

export const OBSERVER = {
  name: '西安 · 未央',
  latitude: 34.35,
  longitude: 108.94,
  timezone: 'Asia/Shanghai',
}

const DEG = Math.PI / 180
const RAD = 180 / Math.PI
const norm360 = (deg: number) => ((deg % 360) + 360) % 360

/** 距 J2000 的天数 */
const daysSinceJ2000 = (date: Date) => date.getTime() / 86400000 - 10957.5

/** 太阳视黄经（度） */
const sunLongitude = (d: number) => {
  const meanLongitude = 280.459 + 0.98564736 * d
  const meanAnomaly = (357.529 + 0.98560028 * d) * DEG
  const lambda = meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.020 * Math.sin(2 * meanAnomaly)
  return norm360(lambda)
}

/** 月相角（0° 新月，180° 满月） */
const moonPhaseAngle = (d: number) => norm360(297.8501921 + 12.19074912 * d)

/** 黄经 → 赤经赤纬（度） */
const eclipticToEquatorial = (longitudeDeg: number, d: number) => {
  const obliquity = (23.4393 - 3.563e-7 * d) * DEG
  const lambda = longitudeDeg * DEG
  const dec = Math.asin(Math.sin(obliquity) * Math.sin(lambda)) * RAD
  const ra = norm360(Math.atan2(Math.cos(obliquity) * Math.sin(lambda), Math.cos(lambda)) * RAD)
  return { ra, dec }
}

/** 格林尼治恒星时（度） */
const greenwichSiderealTime = (d: number) =>
  norm360(280.46061837 + 360.98564736629 * d)

/** 赤道坐标 → 地平坐标；az 自正北顺时针 */
export const equatorialToHorizontal = (raDeg: number, decDeg: number, lstDeg: number, latDeg: number) => {
  const hourAngle = norm360(lstDeg - raDeg) * DEG
  const dec = decDeg * DEG
  const lat = latDeg * DEG

  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(hourAngle)
  const alt = Math.asin(Math.min(1, Math.max(-1, sinAlt))) * RAD

  const az = norm360(
    Math.atan2(-Math.cos(dec) * Math.sin(hourAngle), Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(hourAngle)) * RAD,
  )

  return { alt, az }
}

export interface BrightStar {
  name: string
  ra: number // 小时
  dec: number // 度
  mag: number
  group?: string
}

/** 常见亮星（含北斗、猎户、仙后、天鹅四个便于辨认的星群） */
export const BRIGHT_STARS: BrightStar[] = [
  { name: '天枢', ra: 11.062, dec: 61.75, mag: 1.79, group: 'beidou' },
  { name: '天璇', ra: 11.031, dec: 56.38, mag: 2.37, group: 'beidou' },
  { name: '天玑', ra: 11.897, dec: 53.69, mag: 2.44, group: 'beidou' },
  { name: '天权', ra: 12.257, dec: 57.03, mag: 3.31, group: 'beidou' },
  { name: '玉衡', ra: 12.9, dec: 55.96, mag: 1.76, group: 'beidou' },
  { name: '开阳', ra: 13.398, dec: 54.92, mag: 2.23, group: 'beidou' },
  { name: '摇光', ra: 13.792, dec: 49.31, mag: 1.86, group: 'beidou' },

  { name: '参宿四', ra: 5.919, dec: 7.41, mag: 0.5, group: 'orion' },
  { name: '参宿五', ra: 5.418, dec: 6.35, mag: 1.64, group: 'orion' },
  { name: '参宿七', ra: 5.242, dec: -8.2, mag: 0.13, group: 'orion' },
  { name: '参宿六', ra: 5.796, dec: -9.67, mag: 2.09, group: 'orion' },
  { name: '参宿一', ra: 5.679, dec: -1.94, mag: 1.74, group: 'orion' },
  { name: '参宿二', ra: 5.603, dec: -1.2, mag: 1.69, group: 'orion' },
  { name: '参宿三', ra: 5.533, dec: -0.3, mag: 2.25, group: 'orion' },

  { name: '王良四', ra: 0.675, dec: 56.54, mag: 2.24, group: 'cassiopeia' },
  { name: '王良一', ra: 0.153, dec: 59.15, mag: 2.28, group: 'cassiopeia' },
  { name: '策', ra: 0.945, dec: 60.72, mag: 2.15, group: 'cassiopeia' },
  { name: '阁道三', ra: 1.431, dec: 60.24, mag: 2.68, group: 'cassiopeia' },
  { name: '阁道二', ra: 1.907, dec: 63.67, mag: 3.37, group: 'cassiopeia' },

  { name: '天津四', ra: 20.690, dec: 45.28, mag: 1.25, group: 'cygnus' },
  { name: '天津一', ra: 20.370, dec: 40.26, mag: 2.23, group: 'cygnus' },
  { name: '奚仲四', ra: 19.750, dec: 45.13, mag: 2.87, group: 'cygnus' },
  { name: '辇道增七', ra: 19.512, dec: 27.96, mag: 2.9, group: 'cygnus' },
  { name: '天津二', ra: 20.770, dec: 33.97, mag: 2.46, group: 'cygnus' },

  { name: '天狼星', ra: 6.752, dec: -16.72, mag: -1.46 },
  { name: '织女星', ra: 18.615, dec: 38.78, mag: 0.03 },
  { name: '牛郎星', ra: 19.846, dec: 8.87, mag: 0.77 },
  { name: '五车二', ra: 5.278, dec: 45.99, mag: 0.08 },
  { name: '南河三', ra: 7.655, dec: 5.22, mag: 0.34 },
  { name: '大角星', ra: 14.261, dec: 19.18, mag: -0.05 },
  { name: '角宿一', ra: 13.419, dec: -11.16, mag: 0.97 },
  { name: '心宿二', ra: 16.490, dec: -26.43, mag: 1.06 },
  { name: '北落师门', ra: 22.961, dec: -29.62, mag: 1.16 },
  { name: '轩辕十四', ra: 10.139, dec: 11.97, mag: 1.35 },
  { name: '毕宿五', ra: 4.599, dec: 16.51, mag: 0.85 },
  { name: '北河三', ra: 7.755, dec: 28.03, mag: 1.14 },
  { name: '北河二', ra: 7.577, dec: 31.89, mag: 1.58 },
  { name: '北极星', ra: 2.530, dec: 89.26, mag: 1.98 },
]

/** 星座/星群连线（用星名索引） */
export const CONSTELLATION_LINES: { from: string; to: string; group: string }[] = [
  { from: '天枢', to: '天璇', group: 'beidou' },
  { from: '天璇', to: '天玑', group: 'beidou' },
  { from: '天玑', to: '天权', group: 'beidou' },
  { from: '天权', to: '玉衡', group: 'beidou' },
  { from: '玉衡', to: '开阳', group: 'beidou' },
  { from: '开阳', to: '摇光', group: 'beidou' },
  { from: '天枢', to: '天权', group: 'beidou' },

  { from: '参宿四', to: '参宿五', group: 'orion' },
  { from: '参宿五', to: '参宿三', group: 'orion' },
  { from: '参宿三', to: '参宿二', group: 'orion' },
  { from: '参宿二', to: '参宿一', group: 'orion' },
  { from: '参宿一', to: '参宿四', group: 'orion' },
  { from: '参宿三', to: '参宿六', group: 'orion' },
  { from: '参宿二', to: '参宿七', group: 'orion' },

  { from: '王良一', to: '王良四', group: 'cassiopeia' },
  { from: '王良四', to: '策', group: 'cassiopeia' },
  { from: '策', to: '阁道三', group: 'cassiopeia' },
  { from: '阁道三', to: '阁道二', group: 'cassiopeia' },

  { from: '奚仲四', to: '天津四', group: 'cygnus' },
  { from: '天津一', to: '天津二', group: 'cygnus' },
  { from: '天津一', to: '辇道增七', group: 'cygnus' },
  { from: '天津一', to: '天津四', group: 'cygnus' },
]

export interface SkyStar extends BrightStar {
  alt: number
  az: number
  brightness: number
}

export interface MoonInfo {
  alt: number
  az: number
  illumination: number // 0~1
  waxing: boolean
  phaseName: string
  visible: boolean
}

export interface SkySnapshot {
  sunAlt: number
  sunAz: number
  moon: MoonInfo
  stars: SkyStar[]
}

const phaseNameOf = (k: number, waxing: boolean) => {
  if (k < 0.04) return '新月'
  if (k > 0.96) return '满月'
  if (k > 0.44 && k < 0.56) return waxing ? '上弦月' : '下弦月'
  if (waxing) return k < 0.44 ? '蛾眉月' : '盈凸月'
  return k < 0.44 ? '残月' : '亏凸月'
}

/** 一次性算出此刻我们能看到的天空 */
export const computeSky = (date: Date = new Date(), latDeg = OBSERVER.latitude, lonDeg = OBSERVER.longitude): SkySnapshot => {
  const d = daysSinceJ2000(date)
  const lst = norm360(greenwichSiderealTime(d) + lonDeg)

  // 太阳：用来判断此刻是黄昏、深夜还是白天
  const sunEqu = eclipticToEquatorial(sunLongitude(d), d)
  const sunH = equatorialToHorizontal(sunEqu.ra, sunEqu.dec, lst, latDeg)

  // 月亮：黄经 ≈ 太阳黄经 + 月相角；用于判断位置与照亮比例
  const elongation = moonPhaseAngle(d)
  const moonEqu = eclipticToEquatorial(norm360(sunLongitude(d) + elongation), d)
  const moonH = equatorialToHorizontal(moonEqu.ra, moonEqu.dec, lst, latDeg)
  const illumination = (1 - Math.cos(elongation * DEG)) / 2

  const stars: SkyStar[] = BRIGHT_STARS.map((star) => {
    const { alt, az } = equatorialToHorizontal(star.ra * 15, star.dec, lst, latDeg)
    // 低空大气消光：越靠近地平线越暗
    const extinction = Math.pow(Math.max(0, Math.sin(Math.max(alt, 0) * DEG)), 0.55)
    const magnitudeBrightness = Math.min(1, Math.max(0.25, (4.2 - star.mag) / 5.5))
    return {
      ...star,
      alt,
      az,
      brightness: alt > 0 ? Math.min(1, magnitudeBrightness * (0.35 + 0.65 * extinction)) : 0,
    }
  })

  return {
    sunAlt: sunH.alt,
    sunAz: sunH.az,
    moon: {
      alt: moonH.alt,
      az: moonH.az,
      illumination,
      waxing: elongation < 180,
      phaseName: phaseNameOf(illumination, elongation < 180),
      visible: moonH.alt > 0 && illumination > 0.02,
    },
    stars: stars.filter((star) => star.alt > 1 && star.brightness > 0.05),
  }
}

/** 屏幕上的投影：把整片天空当作一幅 360° 长卷 */
export const projectAltAz = (alt: number, az: number) => ({
  x: 4 + (az / 360) * 92,
  y: 66 - (Math.max(0, Math.min(90, alt)) / 90) * 60,
})

/** 月相亮面的 SVG 路径（圆心 50,50，半径 46） */
export const moonLitPath = (illumination: number, waxing: boolean) => {
  const R = 46
  if (illumination >= 0.985) return 'M 4,50 A 46,46 0 1,1 96,50 A 46,46 0 1,1 4,50 Z'

  const k = Math.max(0.02, Math.min(0.98, illumination))
  const rx = Math.max(1.2, R * Math.abs(1 - 2 * k))
  const outerSweep = waxing ? 1 : 0
  // 凸月时终结线鼓向暗侧，蛾眉月时鼓向亮侧
  const gibbous = k > 0.5
  const terminatorSweep = gibbous ? outerSweep : outerSweep ^ 1

  return `M 50,4 A 46,46 0 0 ${outerSweep} 50,96 A ${rx.toFixed(2)},46 0 0 ${terminatorSweep} 50,4 Z`
}
