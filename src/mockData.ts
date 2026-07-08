import type { ActivityForm, ActivityOperationLog, ActivityStatus, CouponGiftConfig, CouponTemplate, GiftGroup, Product, Region, RuleType, Store } from './types'

export const CHANNELS = [
  { id: 'wechat', label: '微信小程序', icon: '微' },
  { id: 'alipay', label: '支付宝小程序', icon: '支' },
  { id: 'douyin', label: '抖音小程序', icon: '抖' },
  { id: 'other', label: '其他', icon: '其' },
]

export const ORDER_TYPES = [
  { id: 'dine_in', label: '堂食' },
  { id: 'takeaway', label: '外卖' },
  { id: 'pickup', label: '自提' },
]

export const PARTICIPANT_USER_OPTIONS = [
  { value: 'registered_member', label: '已注册会员' },
  { value: 'all_users', label: '全部用户' },
] as const

export const MEMBER_TAG_OPTIONS = [
  { value: '', label: '请选择' },
  { value: 'tag_vip', label: 'VIP会员' },
  { value: 'tag_new', label: '新客标签' },
  { value: 'tag_active', label: '活跃会员' },
]

export const STATUS_LABELS: Record<string, string> = {
  all: '所有活动',
  draft: '草稿',
  pending: '待发布',
  not_started: '未开始',
  in_progress: '进行中',
  ended: '已结束',
  voided: '已作废',
}

/** 创建者账号信息（演示数据） */
export const CREATOR_PROFILES: Record<string, { phone: string; org: string }> = {
  '10086': { phone: '13800138086', org: '总部营销中心' },
  '205110': { phone: '18620511088', org: '华南区运营部' },
  '10001': { phone: '13912340001', org: '华东区品牌部' },
}

export function getCreatorProfile(creatorId: string) {
  return CREATOR_PROFILES[creatorId] ?? { phone: '13800000000', org: '未分配机构' }
}

export const regions: Region[] = [
  { id: 'r1', name: '华南区' },
  { id: 'r2', name: '华东区' },
  { id: 'r3', name: '华北区' },
  { id: 'r4', name: '西南区' },
]

export const products: Product[] = [
  { id: '1274319774983335937', skuId: '1274319774995918848', name: 'pos 改价商品', categoryId: 'c1', categoryName: '饮品', spec: '--', code: 'SP001', barcode: '--', specCode: '--', identifier: '--', price: 288 },
  { id: '1274319774983335938', skuId: '1274319774995918849', name: '0618标品-1', categoryId: 'c1', categoryName: '饮品', spec: '--', code: 'SP002', barcode: '--', specCode: '--', identifier: '--', price: 1 },
  { id: '1274319774983335939', skuId: '1274319774995918850', name: '仅后台展示', categoryId: 'c1', categoryName: '饮品', spec: '--', code: 'SP003', barcode: '--', specCode: '--', identifier: '--', price: 10 },
  { id: 'p1', skuId: 'p1-sku-001', name: '招牌奶茶', categoryId: 'c1', categoryName: '饮品', spec: '大杯/热', code: 'SP004', barcode: '690001', specCode: 'SKU-001', identifier: 'TAG-001', price: 18 },
  { id: 'p2', skuId: 'p2-sku-001', name: '芝士奶盖茶', categoryId: 'c1', categoryName: '饮品', spec: '中杯/冰', code: 'SP005', barcode: '690002', specCode: 'SKU-002', identifier: 'TAG-002', price: 22 },
  { id: 'p3', skuId: 'p3-sku-001', name: '杨枝甘露', categoryId: 'c1', categoryName: '饮品', spec: '标准', code: 'SP006', barcode: '690003', specCode: 'SKU-003', identifier: 'TAG-003', price: 20 },
  { id: 'p4', skuId: 'p4-sku-001', name: '经典汉堡', categoryId: 'c2', categoryName: '主食', spec: '单人份', code: 'SP007', barcode: '690004', specCode: 'SKU-004', identifier: 'TAG-004', price: 28 },
  { id: 'p5', skuId: 'p5-sku-001', name: '炸鸡套餐', categoryId: 'c2', categoryName: '主食', spec: '套餐', code: 'SP008', barcode: '690005', specCode: 'SKU-005', identifier: 'TAG-005', price: 35 },
  { id: 'p6', skuId: 'p6-sku-001', name: '薯条', categoryId: 'c3', categoryName: '小食', spec: '大份', code: 'SP009', barcode: '690006', specCode: 'SKU-006', identifier: 'TAG-006', price: 12 },
  { id: 'p7', skuId: 'p7-sku-001', name: '蛋挞', categoryId: 'c3', categoryName: '小食', spec: '2个装', code: 'SP010', barcode: '690007', specCode: 'SKU-007', identifier: 'TAG-007', price: 10 },
  { id: 'p8', skuId: 'p8-sku-001', name: '测试商品1', categoryId: 'c1', categoryName: '饮品', spec: '1份', code: 'SP011', barcode: '690008', specCode: 'SKU-008', identifier: 'TAG-008', price: 200 },
]

export const categories = [
  { id: 'all', name: '所有商品类目' },
  { id: 'c1', name: '饮品' },
  { id: 'c2', name: '主食' },
  { id: 'c3', name: '小食' },
]

const storeNames = [
  'A店测试门店', 'B店旗舰店', 'C店万达店', 'D店机场店', 'E店大学城店',
  'F店商业街店', 'G店社区店', 'H店高铁站店',
]

export const stores: Store[] = storeNames.flatMap((name, i) =>
  regions.map((region, j) => ({
    id: `s${i * 4 + j + 1}`,
    name: `${name}-${region.name}`,
    regionId: region.id,
    regionName: region.name,
    code: `ST${String(i * 4 + j + 1).padStart(4, '0')}`,
    contact: `店长${i + 1}`,
    status: ((i + j) % 5 === 0 ? 'closed' : 'open') as Store['status'],
  })),
).slice(0, 24)

export const couponTemplates: CouponTemplate[] = [
  { id: '1268615157461635072', name: '测试', type: '商品券', validityDaysMin: 1, validityDaysMax: 366 },
  { id: '1268615157461635073', name: '买一送一寄存券', type: '商品券', validityDaysMin: 7, validityDaysMax: 30 },
  { id: '1268615157461635074', name: '饮品兑换券', type: '商品券', validityDaysMin: 1, validityDaysMax: 90 },
]

export const DEFAULT_PHYSICAL_GIFT_DISPLAY_TITLE = '当单立享'
export const DEFAULT_STORAGE_COUPON_DISPLAY_TITLE = '我要寄存，下次用'
export const GIFT_DISPLAY_TITLE_MAX = 12

export function createEmptyCouponGift(): CouponGiftConfig {
  return {
    storageEnabled: false,
    storageDisplayRule: 'with_physical',
    couponTemplate: null,
    displayTitle: DEFAULT_STORAGE_COUPON_DISPLAY_TITLE,
  }
}

export function createEmptyGiftGroup(): GiftGroup {
  return {
    id: `gg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    physicalProductIds: [],
    couponGift: createEmptyCouponGift(),
    physicalDisplayTitle: DEFAULT_PHYSICAL_GIFT_DISPLAY_TITLE,
  }
}

export function createEmptyActivity(): ActivityForm {
  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + 14)
  return {
    id: `ACT${Date.now()}`,
    name: '',
    title: '',
    tag: '',
    description: '',
    startTime: formatDateTime(now),
    endTime: formatDateTime(end),
    cycleType: 'daily',
    timeSlotType: 'all_day',
    priority: 1,
    channels: ['wechat', 'alipay'],
    orderTypes: ['dine_in', 'takeaway', 'pickup'],
    ruleType: 'buyA_getA',
    toppingsDiscount: true,
    preparationSurchargeDiscount: true,
    totalParticipationLimitType: 'limited',
    totalParticipationLimit: 1,
    participationFrequencyType: 'limited',
    participationFrequencyPeriod: 'daily',
    participationFrequencyLimit: 1,
    maxDiscountItemsPerOrderType: 'limited',
    maxDiscountItemsPerOrder: 1,
    discountHitRule: 'lowest_price',
    maxStorageCouponsPerOrder: 50,
    storageCouponDescription: '',
    productScope: 'partial',
    productIds: [],
    giftGroups: [],
    buyAStorageGift: createEmptyCouponGift(),
    buyAPhysicalDisplayTitle: DEFAULT_PHYSICAL_GIFT_DISPLAY_TITLE,
    buyAGiftImage: undefined,
    storeScope: 'partial_include',
    storeIds: [],
    shareMutexRelation: 'mutex_all',
    participantUser: 'registered_member',
    memberTagId: '',
    activityCode: '',
    titleDisplay: 'show',
    tagDisplay: 'show',
    status: 'draft',
    creator: '10086',
    creatorPhone: getCreatorProfile('10086').phone,
    creatorOrg: getCreatorProfile('10086').org,
    createdAt: formatDateTime(now),
    updatedAt: formatDateTime(now),
    operationLogs: [{
      id: `log-create-${Date.now()}`,
      action: '创建活动',
      operatorPhone: getCreatorProfile('10086').phone,
      operatorOrg: getCreatorProfile('10086').org,
      operatedAt: formatDateTime(now),
      detail: '创建活动草稿',
    }],
  }
}

function buildMockActivities(total: number): ActivityForm[] {
  const curated = buildCuratedActivities()
  const generated: ActivityForm[] = []
  for (let i = curated.length; i < total; i++) {
    generated.push(buildGeneratedActivity(i + 1))
  }
  return [...curated, ...generated].map(ensureAuditFields)
}

function ensureAuditFields(activity: ActivityForm): ActivityForm {
  const updatedAt = activity.updatedAt ?? activity.createdAt
  const profile = { phone: activity.creatorPhone, org: activity.creatorOrg }
  const logs = activity.operationLogs?.length
    ? activity.operationLogs
    : buildMockOperationLogs(
        activity.id,
        activity.name,
        activity.status,
        profile,
        activity.createdAt,
        updatedAt,
      )
  return { ...activity, updatedAt, operationLogs: logs }
}

function buildCuratedActivities(): ActivityForm[] {
  return [
  {
    ...createEmptyActivity(),
    id: 'ACT20240617001',
    name: '买一送一',
    title: '夏日买赠',
    tag: '买一送一',
    description: '夏日饮品买赠活动',
    startTime: '2026-05-01 00:00:00',
    endTime: '2026-09-30 23:59:59',
    productScope: 'all',
    productIds: [],
    storeScope: 'partial_include',
    storeIds: ['s1'],
    status: 'in_progress',
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2024-06-15 10:00:00',
    updatedAt: '2024-06-16 14:30:00',
  },
  {
    ...createEmptyActivity(),
    id: 'ACT20240817002',
    name: '买一送一',
    startTime: '2026-06-01 00:00:00',
    endTime: '2026-08-31 23:59:59',
    productScope: 'partial',
    productIds: ['p1', 'p2', 'p3'],
    storeScope: 'all',
    storeIds: [],
    status: 'in_progress',
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2024-08-10 09:00:00',
    updatedAt: '2024-08-12 11:20:00',
  },
  {
    ...createEmptyActivity(),
    id: 'ACT20241201007',
    name: '买A送B促销',
    ruleType: 'buyA_getB',
    startTime: '2024-12-01 00:00:00',
    endTime: '2024-12-31 23:59:59',
    productScope: 'partial',
    productIds: ['p1', 'p2'],
    maxStorageCouponsPerOrder: 2,
    storageCouponDescription: '赠品可寄存，下次到店核销使用。',
    giftGroups: [
      {
        id: 'gg-sample-1',
        physicalProductIds: ['1274319774983335937', '1274319774983335938', '1274319774983335939'],
        physicalDisplayTitle: '当单立享',
        couponGift: {
          storageEnabled: true,
          storageDisplayRule: 'with_physical',
          couponTemplate: couponTemplates[0],
          displayTitle: '我要寄存，下次用',
        },
      },
      {
        id: 'gg-sample-2',
        physicalProductIds: ['p3'],
        couponGift: {
          storageEnabled: true,
          storageDisplayRule: 'when_physical_no_stock',
          couponTemplate: couponTemplates[1],
        },
      },
    ],
    storeScope: 'partial_include',
    storeIds: ['s1', 's2'],
    status: 'in_progress',
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2024-11-28 10:00:00',
    updatedAt: '2024-12-02 16:45:00',
  },
  {
    ...createEmptyActivity(),
    id: 'ACT20240901003',
    name: '秋季买一送一',
    startTime: '2024-09-01 00:00:00',
    endTime: '2024-09-30 23:59:59',
    productScope: 'partial',
    productIds: ['p4', 'p5'],
    storeScope: 'partial_include',
    storeIds: ['s2', 's3'],
    status: 'ended',
    creator: '10001',
    creatorPhone: getCreatorProfile('10001').phone,
    creatorOrg: getCreatorProfile('10001').org,
    createdAt: '2024-08-25 14:00:00',
    updatedAt: '2024-09-30 23:59:59',
  },
  {
    ...createEmptyActivity(),
    id: 'ACT20241001004',
    name: '买一送一草稿',
    status: 'draft',
    productScope: 'partial',
    productIds: ['p6'],
    storeScope: 'partial_include',
    storeIds: ['s5'],
    creator: '10086',
    creatorPhone: getCreatorProfile('10086').phone,
    creatorOrg: getCreatorProfile('10086').org,
    createdAt: '2024-10-01 11:00:00',
    updatedAt: '2024-10-08 09:15:00',
  },
  {
    ...createEmptyActivity(),
    id: 'ACT20241015005',
    name: '待发布活动',
    status: 'pending',
    startTime: '2025-07-01 00:00:00',
    endTime: '2025-07-31 23:59:59',
    productScope: 'all',
    storeScope: 'all',
    creator: '10086',
    creatorPhone: getCreatorProfile('10086').phone,
    creatorOrg: getCreatorProfile('10086').org,
    createdAt: '2024-10-15 16:00:00',
    updatedAt: '2024-10-20 10:00:00',
  },
  {
    ...createEmptyActivity(),
    id: 'ACT20241101006',
    name: '已作废活动',
    status: 'voided',
    productScope: 'partial',
    productIds: ['p7'],
    storeScope: 'partial_include',
    storeIds: ['s8'],
    creator: '10086',
    creatorPhone: getCreatorProfile('10086').phone,
    creatorOrg: getCreatorProfile('10086').org,
    createdAt: '2024-11-01 08:00:00',
    updatedAt: '2024-11-05 17:30:00',
  },
  ]
}

const MOCK_STATUSES: ActivityStatus[] = [
  'in_progress', 'in_progress', 'in_progress', 'in_progress',
  'draft', 'draft', 'draft',
  'pending', 'pending',
  'not_started', 'not_started',
  'ended', 'ended', 'ended', 'ended',
  'voided', 'voided',
]

const MOCK_CREATORS = ['10086', '205110', '10001'] as const

const MOCK_NAME_THEMES = [
  '夏日饮品', '秋季特惠', '冬季暖饮', '春季上新', '周年庆',
  '会员日', '新店开业', '周末狂欢', '下午茶', '夜宵专场',
  '招牌推荐', '爆款返场', '限时买赠', '门店联动', '渠道专享',
]

const MOCK_CHANNEL_SETS = [
  ['wechat', 'alipay'],
  ['wechat'],
  ['wechat', 'alipay', 'douyin'],
  ['wechat', 'douyin'],
  ['alipay', 'douyin'],
] as const

function buildGeneratedActivity(seq: number): ActivityForm {
  const status = MOCK_STATUSES[seq % MOCK_STATUSES.length]
  const creator = MOCK_CREATORS[seq % MOCK_CREATORS.length]
  const profile = getCreatorProfile(creator)
  const ruleType: RuleType = seq % 4 === 0 ? 'buyA_getB' : 'buyA_getA'
  const theme = MOCK_NAME_THEMES[seq % MOCK_NAME_THEMES.length]
  const name = `${theme}买一送一-${String(seq).padStart(2, '0')}`
  const id = `ACT2026${String(seq).padStart(5, '0')}`

  const month = (seq % 12) + 1
  const { startTime, endTime } = activityWindowForStatus(status, month, seq)
  const createdAt = shiftDateTime(startTime, -3 - (seq % 5), 9 + (seq % 8))
  const updatedAt = shiftDateTime(createdAt, seq % 7, 10 + (seq % 10))

  const productIds = products
    .slice(seq % 3, (seq % 3) + 2 + (seq % 3))
    .map((p) => p.id)
  const storeIds = stores
    .slice(seq % 5, (seq % 5) + 1 + (seq % 3))
    .map((s) => s.id)

  const activity: ActivityForm = {
    ...createEmptyActivity(),
    id,
    name,
    title: theme,
    tag: '买一送一',
    description: `${name}演示数据`,
    startTime,
    endTime,
    ruleType,
    channels: [...MOCK_CHANNEL_SETS[seq % MOCK_CHANNEL_SETS.length]],
    productScope: seq % 5 === 0 ? 'all' : 'partial',
    productIds: seq % 5 === 0 ? [] : productIds,
    storeScope: seq % 4 === 0 ? 'all' : 'partial_include',
    storeIds: seq % 4 === 0 ? [] : storeIds,
    status,
    creator,
    creatorPhone: profile.phone,
    creatorOrg: profile.org,
    createdAt,
    updatedAt,
    operationLogs: buildMockOperationLogs(id, name, status, profile, createdAt, updatedAt),
  }

  if (ruleType === 'buyA_getB') {
    activity.giftGroups = [
      {
        id: `gg-${id}-1`,
        physicalProductIds: productIds.slice(0, 2),
        physicalDisplayTitle: DEFAULT_PHYSICAL_GIFT_DISPLAY_TITLE,
        couponGift: {
          storageEnabled: seq % 2 === 0,
          storageDisplayRule: 'with_physical',
          couponTemplate: seq % 2 === 0 ? couponTemplates[seq % couponTemplates.length] : null,
          displayTitle: DEFAULT_STORAGE_COUPON_DISPLAY_TITLE,
        },
      },
    ]
    activity.maxStorageCouponsPerOrder = 2 + (seq % 3)
    activity.storageCouponDescription = '赠品可寄存，下次到店核销使用。'
  }

  return activity
}

function activityWindowForStatus(
  status: ActivityStatus,
  month: number,
  seq: number,
): { startTime: string; endTime: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const year = status === 'ended' || status === 'voided' ? 2025 : 2026
  const dayStart = 1 + (seq % 20)
  const dayEnd = Math.min(dayStart + 14 + (seq % 10), 28)

  switch (status) {
    case 'in_progress':
      return {
        startTime: '2026-05-01 00:00:00',
        endTime: '2026-09-30 23:59:59',
      }
    case 'not_started':
      return {
        startTime: '2026-08-01 00:00:00',
        endTime: '2026-10-31 23:59:59',
      }
    case 'pending':
      return {
        startTime: `2026-${pad(month)}-${pad(dayStart)} 00:00:00`,
        endTime: `2026-${pad(Math.min(month + 1, 12))}-${pad(dayEnd)} 23:59:59`,
      }
    case 'ended':
      return {
        startTime: `${year}-${pad(month)}-${pad(dayStart)} 00:00:00`,
        endTime: `${year}-${pad(month)}-${pad(dayEnd)} 23:59:59`,
      }
    case 'voided':
      return {
        startTime: `2025-${pad(month)}-${pad(dayStart)} 00:00:00`,
        endTime: `2025-${pad(month)}-${pad(dayEnd)} 23:59:59`,
      }
    default:
      return {
        startTime: `2026-${pad(month)}-${pad(dayStart)} 00:00:00`,
        endTime: `2026-${pad(Math.min(month + 2, 12))}-${pad(dayEnd)} 23:59:59`,
      }
  }
}

function shiftDateTime(base: string, dayOffset: number, hour: number): string {
  const d = new Date(base.replace(/-/g, '/'))
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hour, (dayOffset * 7) % 60, 0)
  return formatDateTime(d)
}

function buildMockOperationLogs(
  id: string,
  name: string,
  status: ActivityStatus,
  profile: { phone: string; org: string },
  createdAt: string,
  updatedAt: string,
): ActivityOperationLog[] {
  const logs: ActivityOperationLog[] = [{
    id: `log-${id}-create`,
    action: '创建活动',
    operatorPhone: profile.phone,
    operatorOrg: profile.org,
    operatedAt: createdAt,
    detail: `创建活动「${name}」`,
  }]

  if (['pending', 'not_started', 'in_progress', 'ended', 'voided'].includes(status)) {
    logs.unshift({
      id: `log-${id}-publish`,
      action: '发布活动',
      operatorPhone: profile.phone,
      operatorOrg: profile.org,
      operatedAt: shiftDateTime(createdAt, 1, 14),
      detail: `发布活动「${name}」`,
    })
  }
  if (status === 'voided') {
    logs.unshift({
      id: `log-${id}-void`,
      action: '作废活动',
      operatorPhone: profile.phone,
      operatorOrg: profile.org,
      operatedAt: updatedAt,
      detail: `作废活动「${name}」`,
    })
  }
  if (status === 'draft' && updatedAt !== createdAt) {
    logs.unshift({
      id: `log-${id}-edit`,
      action: '编辑活动',
      operatorPhone: profile.phone,
      operatorOrg: profile.org,
      operatedAt: updatedAt,
      detail: `编辑活动「${name}」`,
    })
  }

  return logs
}

function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const initialActivities: ActivityForm[] = buildMockActivities(56)
