import type { IssuedCoupon, Order, OrderItem, OrderStatus, OrderTimelineNode } from './types'
import { couponTemplates, products, stores } from './mockData'

const STORAGE_COUPON_TEMPLATE = couponTemplates[1]

function buildIssuedCoupons(seq: number, count: number, dateKey: string): IssuedCoupon[] {
  return Array.from({ length: count }, (_, i) => ({
    name: STORAGE_COUPON_TEMPLATE.name,
    code: `CP${dateKey}${String(seq).padStart(3, '0')}${String(i + 1).padStart(2, '0')}`,
    templateId: STORAGE_COUPON_TEMPLATE.id,
    validity: `${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)} 至 ${dateKey.slice(0, 4)}-07-22`,
    status: '未使用',
  }))
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  ordered: '已点单',
  made: '已制作',
  picked_up: '已取餐',
  completed: '已完成',
  refunded: '已退款',
  cancelled: '已取消',
}

export const ORDER_STATUS_TABS: (OrderStatus | 'all')[] = [
  'all', 'ordered', 'made', 'picked_up', 'completed', 'refunded', 'cancelled',
]

export const ORDER_SOURCES = ['企业级测试POS', '小程序订单', '微信小程序', '抖音小程序']
export const ORDER_CHANNELS = ['POS', '微信', '支付宝', '抖音']
export const PICKUP_METHODS = ['自提', '堂食', '外卖']

export const GIFT_TYPE_LABELS = {
  physical: '实物赠品',
  storage_coupon: '寄存优惠券',
} as const

/** 赠品标签按统一优惠活动名称展示 */
export const GIFT_TAG_LABELS = {
  physical: '买一送一',
  storage_coupon: '买一送一/寄存券',
} as const

/** 多件优惠商品行标签 */
export const MULTI_ITEM_PROMOTION_LABEL = '第2件半价'

function buildTimeline(status: OrderStatus, baseTime: string, operator: string): OrderTimelineNode[] {
  const t = (offsetMin: number) => addMinutes(baseTime, offsetMin)
  const nodes: OrderTimelineNode[] = [
    { label: '已下单', time: t(0), operator, done: true },
  ]
  if (status === 'cancelled') {
    nodes.unshift({ label: '已取消', time: t(2), operator, done: true })
    return nodes
  }
  nodes.unshift({ label: '已接单', time: t(1), operator: '门店', done: true })
  if (['made', 'picked_up', 'completed', 'refunded'].includes(status)) {
    nodes.unshift({ label: '已制作', time: t(6), operator: '制作员', done: true })
  }
  if (['picked_up', 'completed', 'refunded'].includes(status)) {
    nodes.unshift({ label: '已取餐', time: t(12), operator, done: true })
  }
  if (status === 'completed') {
    nodes.unshift({ label: '已完成', time: t(42), operator, done: true })
  }
  if (status === 'refunded') {
    nodes.unshift({ label: '已退款', time: t(60), operator: '门店', done: true })
  }
  return nodes
}

function addMinutes(time: string, minutes: number): string {
  const d = new Date(time.replace(/-/g, '/'))
  d.setMinutes(d.getMinutes() + minutes)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function businessDayOf(time: string): string {
  return time.slice(0, 10)
}

/** 手工构造的详情样例订单：买A送B，含实物赠品 + 寄存优惠券（对齐截图） */
const showcaseOrder: Order = {
  id: 'D00235197897058492',
  buyerName: '187****2157',
  buyerPhone: '187****2157',
  storeId: 's1',
  storeName: '安徽宿松石府百货店',
  storeCode: 'ST0001',
  pickupNo: '027',
  makeNo: '027',
  payable: 36,
  paid: 36,
  discountAmount: 34,
  createdAt: '2026-06-22 15:46:10',
  itemCount: 4,
  source: '小程序订单',
  channel: '微信',
  afterSale: '-',
  status: 'completed',
  pickupMethod: '自提',
  orderType: '普通订单',
  businessDay: '2026-06-22',
  diners: 4,
  channelOrderNo: '1274319774983335944',
  remark: '少冰少糖',
  hasBogo: true,
  activityId: 'ACT20241201007',
  invoiceStatus: '未开票',
  refunds: [],
  items: [
    { id: 'oi-1', productId: 'p4', name: '杯壁', image: products[3].image, spec: '默认/1份', originalPrice: 4, quantity: 5, payable: 20, paid: 20, isGift: false, giftType: null, afterSale: '-', statusLabel: '已完成' },
    { id: 'oi-2', productId: 'p5', name: '全鸡', image: products[4].image, spec: '默认/1份', originalPrice: 10, quantity: 1, payable: 16, paid: 16, isGift: false, giftType: null, afterSale: '-', statusLabel: '已完成' },
    { id: 'oi-3', productId: 'p1', name: '0元招牌奶茶（赠品）', image: products[3].image, spec: '大杯/热', originalPrice: 18, quantity: 1, payable: 0, paid: 0, isGift: true, giftType: 'physical', afterSale: '-', statusLabel: '已完成' },
    { id: 'oi-4', productId: 'p3', name: '0元杨枝甘露寄存咖啡（赠品）', spec: '默认/1份', originalPrice: 20, quantity: 1, payable: 0, paid: 0, isGift: true, giftType: 'storage_coupon', afterSale: '-', statusLabel: '已完成' },
  ],
  timeline: buildTimeline('completed', '2026-06-22 15:46:10', '187****2157'),
  discounts: [
    {
      kind: 'bogo',
      type: '买一送一',
      name: '买A送B',
      activityId: 'ACT20241201007',
      refId: '37763898845921123:3',
      detail: '优惠总数：2，含赠送产品',
      giftTypes: ['physical', 'storage_coupon'],
      coupons: [
        {
          name: STORAGE_COUPON_TEMPLATE.name,
          code: 'CP2026062200001',
          templateId: STORAGE_COUPON_TEMPLATE.id,
          validity: '2026-06-22 至 2026-07-22',
          status: '未使用',
        },
      ],
    },
  ],
}

/** 手工构造的详情样例订单：第N件优惠，含商品行标签与优惠汇总 */
const multiItemShowcaseOrder: Order = {
  id: 'D00235197897058493',
  buyerName: '156****8319',
  buyerPhone: '156****8319',
  storeId: 's1',
  storeName: '安徽宿松石府百货店',
  storeCode: 'ST0001',
  pickupNo: '028',
  makeNo: '028',
  payable: 40,
  paid: 31,
  discountAmount: 9,
  createdAt: '2026-06-22 16:12:30',
  itemCount: 3,
  source: '小程序订单',
  channel: '微信',
  afterSale: '-',
  status: 'completed',
  pickupMethod: '自提',
  orderType: '普通订单',
  businessDay: '2026-06-22',
  diners: 2,
  channelOrderNo: '1274319774983335945',
  remark: '-',
  hasBogo: false,
  hasMultiItem: true,
  multiItemActivityId: 'MI20250628001',
  invoiceStatus: '未开票',
  refunds: [],
  items: [
    {
      id: 'mi-oi-1',
      productId: 'p1',
      name: '招牌奶茶',
      image: products[0].image,
      spec: '大杯/少冰',
      originalPrice: 18,
      quantity: 2,
      payable: 36,
      paid: 27,
      isGift: false,
      giftType: null,
      promotionLabel: MULTI_ITEM_PROMOTION_LABEL,
      afterSale: '-',
      statusLabel: '已完成',
    },
    {
      id: 'mi-oi-2',
      productId: 'p4',
      name: '杯壁',
      image: products[3].image,
      spec: '默认/1份',
      originalPrice: 4,
      quantity: 1,
      payable: 4,
      paid: 4,
      isGift: false,
      giftType: null,
      afterSale: '-',
      statusLabel: '已完成',
    },
  ],
  timeline: buildTimeline('completed', '2026-06-22 16:12:30', '156****8319'),
  discounts: [
    {
      kind: 'multi_item',
      type: '第N件优惠',
      name: '第2件半价',
      activityId: 'MI20250628001',
      refId: 'MI20250628001',
      detail: '优惠件数：1；命中商品：招牌奶茶；规则：第2件5折（同一活动商品）',
      giftTypes: [],
      discountAmount: 9,
    },
  ],
}

interface GeneratedSpec {
  status: OrderStatus
  bogo?: 'none' | 'physical' | 'storage' | 'both'
  multiItem?: boolean
  source: string
  channel: string
  pickup: string
}

const generatedSpecs: GeneratedSpec[] = [
  { status: 'ordered', bogo: 'none', source: '企业级测试POS', channel: 'POS', pickup: '堂食' },
  { status: 'ordered', bogo: 'physical', source: '企业级测试POS', channel: 'POS', pickup: '自提' },
  { status: 'made', bogo: 'none', source: '企业级测试POS', channel: 'POS', pickup: '堂食' },
  { status: 'made', bogo: 'both', source: '小程序订单', channel: '微信', pickup: '自提' },
  { status: 'picked_up', bogo: 'storage', source: '小程序订单', channel: '微信', pickup: '自提', multiItem: true },
  { status: 'completed', bogo: 'physical', source: '小程序订单', channel: '支付宝', pickup: '外卖' },
  { status: 'completed', bogo: 'none', source: '企业级测试POS', channel: 'POS', pickup: '堂食' },
  { status: 'picked_up', bogo: 'none', source: '抖音小程序', channel: '抖音', pickup: '自提', multiItem: true },
  { status: 'refunded', bogo: 'physical', source: '小程序订单', channel: '微信', pickup: '自提' },
  { status: 'cancelled', bogo: 'none', source: '企业级测试POS', channel: 'POS', pickup: '堂食' },
  { status: 'made', bogo: 'storage', source: '小程序订单', channel: '微信', pickup: '外卖' },
  { status: 'completed', bogo: 'both', source: '小程序订单', channel: '支付宝', pickup: '自提' },
  { status: 'ordered', bogo: 'none', source: '企业级测试POS', channel: 'POS', pickup: '堂食' },
  { status: 'completed', bogo: 'physical', source: '微信小程序', channel: '微信', pickup: '自提' },
  { status: 'picked_up', bogo: 'both', source: '小程序订单', channel: '支付宝', pickup: '堂食' },
  { status: 'made', bogo: 'none', source: '企业级测试POS', channel: 'POS', pickup: '外卖' },
  { status: 'refunded', bogo: 'none', source: '抖音小程序', channel: '抖音', pickup: '自提' },
  { status: 'completed', bogo: 'storage', source: '小程序订单', channel: '微信', pickup: '自提' },
  { status: 'ordered', bogo: 'physical', source: '小程序订单', channel: '微信', pickup: '堂食' },
  { status: 'cancelled', bogo: 'physical', source: '企业级测试POS', channel: 'POS', pickup: '堂食' },
]

const buyerPhones = ['187****2157', '156****8319', '155****9982', '157****9092', '138****6688', '-']

function buildGiftItems(kind: GeneratedSpec['bogo']): OrderItem[] {
  const items: OrderItem[] = []
  if (kind === 'physical' || kind === 'both') {
    items.push({
      id: `gift-phy-${Math.random().toString(36).slice(2, 7)}`,
      productId: 'p1',
      name: '0元招牌奶茶（赠品）',
      image: products[3].image,
      spec: '大杯/热',
      originalPrice: 18,
      quantity: 1,
      payable: 0,
      paid: 0,
      isGift: true,
      giftType: 'physical',
      afterSale: '-',
      statusLabel: '已完成',
    })
  }
  if (kind === 'storage' || kind === 'both') {
    items.push({
      id: `gift-cou-${Math.random().toString(36).slice(2, 7)}`,
      productId: 'p3',
      name: '0元杨枝甘露寄存咖啡（赠品）',
      spec: '默认/1份',
      originalPrice: 20,
      quantity: 1,
      payable: 0,
      paid: 0,
      isGift: true,
      giftType: 'storage_coupon',
      afterSale: '-',
      statusLabel: '已完成',
    })
  }
  return items
}

function applyMultiItemDiscount(baseItem: OrderItem): { item: OrderItem; discountAmount: number } {
  const qty = baseItem.quantity
  if (qty < 2) {
    return { item: baseItem, discountAmount: 0 }
  }
  const unitDiscount = baseItem.originalPrice * 0.5
  const discountedQty = Math.floor(qty / 2)
  const discountAmount = unitDiscount * discountedQty
  return {
    item: {
      ...baseItem,
      payable: baseItem.originalPrice * qty,
      paid: baseItem.originalPrice * qty - discountAmount,
      promotionLabel: MULTI_ITEM_PROMOTION_LABEL,
    },
    discountAmount,
  }
}

function generateOrders(): Order[] {
  return generatedSpecs.map((spec, i) => {
    const seq = i + 1
    const store = stores[i % stores.length]
    const baseProduct = products[(i % 5) + 3]
    const qty = (i % 3) + 1 + (spec.multiItem ? 1 : 0)
    const baseItemRaw: OrderItem = {
      id: `oi-${seq}-1`,
      productId: baseProduct.id,
      name: baseProduct.name,
      image: baseProduct.image,
      spec: baseProduct.spec,
      originalPrice: baseProduct.price,
      quantity: qty,
      payable: baseProduct.price * qty,
      paid: baseProduct.price * qty,
      isGift: false,
      giftType: null,
      afterSale: '-',
      statusLabel: ORDER_STATUS_LABELS[spec.status],
    }
    const multiItemDiscount = spec.multiItem ? applyMultiItemDiscount(baseItemRaw) : null
    const baseItem = multiItemDiscount?.item ?? baseItemRaw
    const giftItems = spec.bogo !== 'none' ? buildGiftItems(spec.bogo) : []
    const items = [baseItem, ...giftItems]
    const payable = items.reduce((s, it) => s + it.originalPrice * it.quantity, 0)
    const paid = items.reduce((s, it) => s + it.paid, 0)
    const discountAmount = payable - paid

    const day = 22 - (i % 5)
    const hour = 9 + (i % 10)
    const minute = (i * 7) % 60
    const createdAt = `2026-06-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:10`
    const buyerName = buyerPhones[i % buyerPhones.length]
    const hasBogo = spec.bogo !== 'none' && spec.bogo !== undefined
    const hasMultiItem = Boolean(spec.multiItem && multiItemDiscount && multiItemDiscount.discountAmount > 0)
    const giftTypes = giftItems.map((g) => g.giftType!).filter(Boolean)
    const storageCount = giftItems.filter((g) => g.giftType === 'storage_coupon').length
    const dateKey = createdAt.slice(0, 10).replace(/-/g, '')
    const issuedCoupons = storageCount > 0 ? buildIssuedCoupons(seq, storageCount, dateKey) : undefined

    const orderId = `D0017821${String(123456789 + seq * 137).slice(0, 9)}${String(seq).padStart(3, '0')}`
    const refunds: Order['refunds'] = spec.status === 'refunded'
      ? [{
          refundNo: `RF${dateKey}${String(seq).padStart(4, '0')}`,
          type: '整单退款',
          amount: paid,
          appliedAt: addMinutes(createdAt, 60),
          reason: ['用户取消', '门店缺货', '制作超时'][i % 3],
          auditor: '门店店长',
          status: '退款成功',
        }]
      : []

    return {
      id: orderId,
      buyerName,
      buyerPhone: buyerName,
      storeId: store.id,
      storeName: store.name,
      storeCode: store.code,
      pickupNo: String(seq).padStart(4, '0'),
      makeNo: String(seq).padStart(4, '0'),
      payable,
      paid,
      discountAmount,
      createdAt,
      itemCount: items.reduce((s, it) => s + it.quantity, 0),
      source: spec.source,
      channel: spec.channel,
      afterSale: spec.status === 'refunded' ? '退款成功' : '-',
      status: spec.status,
      pickupMethod: spec.pickup,
      orderType: '普通订单',
      businessDay: businessDayOf(createdAt),
      diners: (i % 4) + 1,
      channelOrderNo: `12743197749${String(seq).padStart(8, '0')}`,
      remark: i % 3 === 0 ? '少冰少糖' : '-',
      hasBogo,
      hasMultiItem,
      activityId: hasBogo ? (spec.bogo === 'physical' ? 'ACT20240617001' : 'ACT20241201007') : undefined,
      multiItemActivityId: hasMultiItem ? 'MI20250628001' : undefined,
      invoiceStatus: '未开票',
      refunds,
      items,
      timeline: buildTimeline(spec.status, createdAt, buyerName),
      discounts: [
        ...(hasBogo
          ? [
              {
                kind: 'bogo' as const,
                type: '买一送一',
                name: spec.bogo === 'physical' ? '买A送A' : '买A送B',
                activityId: spec.bogo === 'physical' ? 'ACT20240617001' : 'ACT20241201007',
                refId: `377638988459${String(20000 + seq).slice(0, 5)}:${seq % 5}`,
                detail: `优惠总数：${giftTypes.length}，含赠送产品`,
                giftTypes,
                coupons: issuedCoupons,
              },
            ]
          : []),
        ...(hasMultiItem && multiItemDiscount
          ? [
              {
                kind: 'multi_item' as const,
                type: '第N件优惠',
                name: '第2件半价',
                activityId: 'MI20250628001',
                refId: 'MI20250628001',
                detail: `优惠件数：${Math.floor(baseItem.quantity / 2)}；命中商品：${baseItem.name}；规则：第2件5折（同一活动商品）`,
                giftTypes: [],
                discountAmount: multiItemDiscount.discountAmount,
              },
            ]
          : []),
      ],
    }
  })
}

export const orders: Order[] = [showcaseOrder, multiItemShowcaseOrder, ...generateOrders()]
