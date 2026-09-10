/**
 * 活动状态。「已暂停」用于进行中的活动临时下线改规则，改完恢复；
 * 暂停不顺延活动时间，暂停期间到达结束时间的活动直接转「已结束」。
 */
export type ActivityStatus =
  | 'draft'
  | 'pending'
  | 'not_started'
  | 'in_progress'
  | 'paused'
  | 'ended'
  | 'voided'

export type WizardMode = 'create' | 'edit' | 'copy' | 'view'

export type RuleType = 'buyA_getA' | 'buyA_getB'

export type ProductScope = 'all' | 'partial'

export type StoreScope = 'all' | 'partial_include' | 'partial_exclude'

export type CycleType = 'daily' | 'weekly' | 'monthly'

export type TimeSlotType = 'all_day' | 'specific'

export type LimitType = 'unlimited' | 'limited'

export type ParticipationPeriod = 'daily' | 'weekly' | 'monthly'

export type DiscountHitRule = 'highest_price' | 'lowest_price'

export type ShareMutexRelation = 'share_all' | 'mutex_all'

export type DisplayToggle = 'show' | 'hide'

export type ParticipantUser = 'registered_member' | 'all_users'

export interface CouponTemplate {
  id: string
  name: string
  type: string
  validityDaysMin: number
  validityDaysMax: number
}

export interface CouponGiftConfig {
  storageEnabled: boolean
  /** 寄存券展示规则：与实物同时展示 / 仅无库存时展示 */
  storageDisplayRule: StorageDisplayRule
  couponTemplate: CouponTemplate | null
  /** 小程序赠品选择页 - 寄存券入口展示标题（仅赠品组1） */
  displayTitle?: string
}

export type StorageDisplayRule = 'with_physical' | 'when_physical_no_stock'

export interface GiftGroup {
  id: string
  physicalProductIds: string[]
  couponGift: CouponGiftConfig
  /** 小程序赠品选择页 - 赠品组说明图片（个性化展示组标题/说明，未上传时使用默认文案） */
  image?: string
  /** 小程序赠品选择页 - 实物赠品入口展示标题（仅赠品组1） */
  physicalDisplayTitle?: string
  /** 小程序赠品选择页 - 赠品组1副标题说明；未填写则不展示 */
  displaySubtitle?: string
}

export const MAX_GIFT_GROUPS = 2

export interface Product {
  id: string
  skuId: string
  name: string
  categoryId: string
  categoryName: string
  spec: string
  code: string
  barcode: string
  specCode: string
  identifier: string
  price: number
  image?: string
}

export interface Store {
  id: string
  name: string
  regionId: string
  regionName: string
  code: string
  contact: string
  status: 'open' | 'closed'
}

export interface Region {
  id: string
  name: string
}

export interface ActivityForm {
  id: string
  name: string
  /** 点单页展示标题，用户端点单页展示 */
  title: string
  /** 商品卡片展示标签，用户端商品卡片展示 */
  tag: string
  description: string
  startTime: string
  endTime: string
  cycleType: CycleType
  timeSlotType: TimeSlotType
  priority: number
  channels: string[]
  orderTypes: string[]
  ruleType: RuleType
  toppingsDiscount: boolean
  preparationSurchargeDiscount: boolean
  totalParticipationLimitType: LimitType
  totalParticipationLimit: number
  participationFrequencyType: LimitType
  participationFrequencyPeriod: ParticipationPeriod
  participationFrequencyLimit: number
  maxDiscountItemsPerOrderType: LimitType
  maxDiscountItemsPerOrder: number
  discountHitRule: DiscountHitRule
  /** 活动维度：每单最多可发放的寄存券数量 */
  maxStorageCouponsPerOrder: number
  /** 活动维度：寄存券说明 */
  storageCouponDescription: string
  productScope: ProductScope
  productIds: string[]
  giftGroups: GiftGroup[]
  /**
   * 买A送B：第1组赠品优惠上限是否不超过参与商品 SKU 售价。
   * 未配置时视为不限额（整件免费）。
   */
  giftDiscountCapByMainSku?: boolean
  /** 买A送A：寄存券配置 */
  buyAStorageGift: CouponGiftConfig
  /** 买A送A：实物赠品小程序展示标题 */
  buyAPhysicalDisplayTitle?: string
  /** 买A送A：赠品组说明图片 */
  buyAGiftImage?: string
  storeScope: StoreScope
  storeIds: string[]
  shareMutexRelation: ShareMutexRelation
  participantUser: ParticipantUser
  memberTagId: string
  activityCode: string
  titleDisplay: DisplayToggle
  tagDisplay: DisplayToggle
  status: ActivityStatus
  /** 进入「已暂停」的时刻，用于计算暂停时长与超时分级 */
  pausedAt?: string
  /** 创建者账号 ID */
  creator: string
  /** 创建者手机号 */
  creatorPhone: string
  /** 创建者所属机构 */
  creatorOrg: string
  createdAt: string
  updatedAt: string
  operationLogs: ActivityOperationLog[]
}

/** 活动操作日志 */
export interface ActivityOperationLog {
  id: string
  /** 操作类型，如创建活动、编辑活动、发布活动 */
  action: string
  operatorPhone: string
  operatorOrg: string
  operatedAt: string
  detail?: string
}

export interface ListFilters {
  keyword: string
  productName: string
  productId: string
  activityCode: string
  participantUser: ParticipantUser | 'all'
  status: ActivityStatus | 'all'
  ruleType: RuleType | 'all'
  startDate: string
  endDate: string
  storeId: string
}

/** 买一送一通用设置 */
export interface GeneralSettings {
  /** 每单寄存券发放上限 */
  maxGiftStoragePerOrder: number
}

/* ================= 订单管理 ================= */

export type OrderStatus =
  | 'ordered'
  | 'made'
  | 'picked_up'
  | 'completed'
  | 'refunded'
  | 'cancelled'

/** 赠品形态：实物赠品 / 寄存优惠券 */
export type GiftType = 'physical' | 'storage_coupon'

export interface OrderItem {
  id: string
  productId?: string
  name: string
  image?: string
  spec?: string
  /** 商品原价（元） */
  originalPrice: number
  /** 商品数量 */
  quantity: number
  /** 应付金额（元） */
  payable: number
  /** 支付金额（元） */
  paid: number
  /** 是否为活动赠品 */
  isGift: boolean
  /** 赠品形态，仅当 isGift 为 true 时有效 */
  giftType?: GiftType | null
  /** 多件优惠商品行标签，如：第2件半价 */
  promotionLabel?: string
  /** 售后 */
  afterSale: string
  /** 行级订单状态展示 */
  statusLabel: string
}

export type OrderDiscountKind = 'bogo' | 'multi_item'

export interface OrderTimelineNode {
  label: string
  time: string
  operator?: string
  done: boolean
}

/** 发放的寄存券明细 */
export interface IssuedCoupon {
  /** 券名称 */
  name: string
  /** 券码 */
  code: string
  /** 券模版ID */
  templateId: string
  /** 有效期 */
  validity: string
  /** 状态：未使用 / 已核销 / 已过期 */
  status: string
}

export interface OrderDiscount {
  /** 优惠大类：买一送一 / 第N件优惠 */
  kind?: OrderDiscountKind
  /** 优惠类型，如：买一送一 */
  type: string
  /** 优惠名称，如：买A送B */
  name: string
  /** 优惠金额（元），多件优惠等场景使用 */
  discountAmount?: number
  /** 关联的活动ID，用于跳转活动详情 */
  activityId?: string
  /** 活动/优惠券ID（展示） */
  refId: string
  /** 优惠详情，如：优惠总数：2 含赠送产品 */
  detail: string
  /** 该优惠涉及的赠品形态 */
  giftTypes: GiftType[]
  /** 发放的寄存券明细（含寄存券赠品时存在） */
  coupons?: IssuedCoupon[]
}

/** 退款记录 */
export interface RefundRecord {
  /** 退款单号 */
  refundNo: string
  /** 退款类型 */
  type: string
  /** 退款金额（元） */
  amount: number
  /** 申请时间 */
  appliedAt: string
  /** 退款原因 */
  reason: string
  /** 退款审核人 */
  auditor: string
  /** 退款状态 */
  status: string
}

export interface Order {
  id: string
  buyerName: string
  buyerPhone: string
  storeId?: string
  storeName: string
  /** 门店编码 */
  storeCode?: string
  pickupNo: string
  makeNo: string
  /** 应付金额（元） */
  payable: number
  /** 实付金额（元） */
  paid: number
  /** 优惠金额（元） */
  discountAmount: number
  createdAt: string
  /** 订单商品数量 */
  itemCount: number
  /** 订单来源 */
  source: string
  /** 渠道 */
  channel: string
  afterSale: string
  status: OrderStatus
  /** 取餐方式：自提 / 堂食 / 外卖 */
  pickupMethod: string
  /** 订单类型 */
  orderType: string
  /** 营业日 */
  businessDay: string
  /** 用餐人数 */
  diners: number
  /** 渠道订单号 */
  channelOrderNo: string
  remark: string
  /** 是否参与买一送一活动 */
  hasBogo: boolean
  /** 是否参与第N件优惠（多件优惠）活动 */
  hasMultiItem?: boolean
  /** 关联的买一送一活动ID */
  activityId?: string
  /** 关联的多件优惠活动ID */
  multiItemActivityId?: string
  /** 发票状态 */
  invoiceStatus?: string
  /** 退款信息（仅已退款订单存在数据） */
  refunds?: RefundRecord[]
  items: OrderItem[]
  timeline: OrderTimelineNode[]
  discounts: OrderDiscount[]
}

export type OrderDatePreset = 'all' | 'today' | 'yesterday' | 'last7' | 'custom'

export type OrderFilterTab = 'search' | 'marketing'

export interface OrderListFilters {
  keyword: string
  storeId: string
  status: OrderStatus | 'all'
  datePreset: OrderDatePreset
  startDate: string
  endDate: string
  /** 营销筛选：优惠类型 */
  marketingType: 'all' | 'bogo' | 'multi_item'
  /** 营销筛选：指定活动 */
  activityId: string
  /** 营销筛选：赠品形态 */
  giftType: 'all' | GiftType
}

/* ================= 活动参与记录（营销事实） ================= */

/** 参与状态：仅统计已支付与已退款两类有效参与 */
export type ParticipationStatus = 'paid' | 'refunded'

/** 参与记录中的赠品简要信息 */
export interface ParticipationGiftBrief {
  name: string
  giftType: GiftType
  quantity: number
  /** 寄存券模板名称（仅寄存券赠品） */
  couponTemplateName?: string
  /** 寄存券有效期（仅寄存券赠品） */
  validity?: string
}

/**
 * 活动参与记录：营销体系内以「活动维度」记录的参与事实，
 * 关联订单号但独立于订单查询，供后续统计分析使用。
 */
export interface ActivityParticipationRecord {
  /** 参与记录ID */
  id: string
  /** 关联活动ID */
  activityId: string
  /** 关联订单号 */
  orderId: string
  /** 参与时间 */
  participatedAt: string
  /** 营业日 */
  businessDay: string
  storeId?: string
  storeName: string
  /** 参与用户昵称/脱敏名 */
  userName: string
  /** 参与用户手机号 */
  userPhone: string
  /** 取餐号 */
  pickupNo: string
  /** 参与渠道 */
  channel: string
  /** 命中规则，如：买A送A / 买A送B */
  ruleName: string
  /** 触发商品名称 */
  triggerProducts: string[]
  /** 赠品明细 */
  giftProducts: ParticipationGiftBrief[]
  /** 涉及赠品形态 */
  giftTypes: GiftType[]
  /** 优惠金额（元） */
  discountAmount: number
  /** 订单类型 */
  orderType: string
  /** 订单来源 */
  source: string
  /** 订单应付金额（元） */
  payable: number
  /** 订单实付金额（元） */
  paid: number
  /** 下单时间 */
  orderedAt: string
  /** 支付时间 */
  paidAt: string
  /** 参与该活动时是否为未消费用户（新客） */
  isNewUserAtParticipation: boolean
  /** 订单状态（履约状态） */
  orderStatus: OrderStatus
  /** 参与状态：已支付 / 已退款 */
  status: ParticipationStatus
}

/** 参与记录筛选条件 */
export interface ParticipationFilters {
  /**
   * 查询的活动范围，空数组表示全部活动。
   * 从活动列表行进入时只含该活动，运营可改成多个活动一起查。
   */
  activityIds: string[]
  /** 订单号/手机号/取餐号 */
  keyword: string
  storeId: string
  status: ParticipationStatus | 'all'
  datePreset: OrderDatePreset
  startDate: string
  endDate: string
  giftType: 'all' | GiftType
}

/* ================= 第N件优惠（多件优惠） ================= */

export type MultiItemRuleType =
  | 'nth_item'
  | 'every_n_items'
  | 'reach_m_discount_n'
  | 'every_reach_m_discount_n'

export type SkuThresholdMode = 'same_sku' | 'cross_sku'

export type DiscountMethod = 'discount' | 'fixed_reduction' | 'special_price'

/** 多件优惠：优惠商品命中规则 */
export type MultiItemDiscountHitRule =
  | 'high_to_low'
  | 'low_to_high'
  | 'every_m_highest'
  | 'every_m_lowest'

export interface MultiItemActivityForm {
  id: string
  name: string
  title: string
  tag: string
  description: string
  startTime: string
  endTime: string
  cycleType: CycleType
  timeSlotType: TimeSlotType
  priority: number
  channels: string[]
  orderTypes: string[]
  ruleType: MultiItemRuleType
  skuThresholdMode: SkuThresholdMode
  discountMethod: DiscountMethod
  discountValue: number
  targetNth: number
  everyN: number
  thresholdM: number
  discountCountN: number
  toppingsDiscount: boolean
  comboSurchargeDiscount: boolean
  preparationSurchargeDiscount: boolean
  totalParticipationLimitType: LimitType
  totalParticipationLimit: number
  participationFrequencyType: LimitType
  participationFrequencyPeriod: ParticipationPeriod
  participationFrequencyLimit: number
  maxDiscountItemsTotalType: LimitType
  maxDiscountItemsTotal: number
  maxDiscountItemsDailyType: LimitType
  maxDiscountItemsDaily: number
  maxDiscountItemsPerOrderType: LimitType
  maxDiscountItemsPerOrder: number
  discountHitRule: MultiItemDiscountHitRule
  productScope: ProductScope
  productIds: string[]
  productSelectionMode: 'include' | 'exclude'
  storeScope: StoreScope
  storeIds: string[]
  shareMutexRelation: ShareMutexRelation
  participantUser: ParticipantUser
  memberTagId: string
  activityCode: string
  titleDisplay: DisplayToggle
  tagDisplay: DisplayToggle
  status: ActivityStatus
  /** 进入「已暂停」的时刻，用于计算暂停时长与超时分级 */
  pausedAt?: string
  creator: string
  creatorPhone: string
  creatorOrg: string
  createdAt: string
  updatedAt: string
  operationLogs: ActivityOperationLog[]
}

export interface MultiItemListFilters {
  keyword: string
  productName: string
  productId: string
  activityCode: string
  participantUser: ParticipantUser | 'all'
  status: ActivityStatus | 'all'
  ruleType: MultiItemRuleType | 'all'
  discountMethod: DiscountMethod | 'all'
  startDate: string
  endDate: string
  storeId: string
}

/* ================= 满减/折 ================= */

export type FullReductionThresholdType = 'order_amount' | 'item_count' | 'diner_count'

export type FullReductionPromoMode = 'tiered' | 'cyclic'

export type FullReductionDiscountType = 'amount_off' | 'percent_off'

export interface FullReductionTier {
  id: string
  threshold: number
  discountType: FullReductionDiscountType
  discountValue: number
}

export interface FullReductionActivityForm {
  id: string
  name: string
  title: string
  tag: string
  description: string
  startTime: string
  endTime: string
  cycleType: CycleType
  timeSlotType: TimeSlotType
  priority: number
  channels: string[]
  orderTypes: string[]
  thresholdType: FullReductionThresholdType
  promoMode: FullReductionPromoMode
  tiers: FullReductionTier[]
  /** 循环满减时使用的单档规则（与 tiers[0] 同步维护亦可） */
  cyclicThreshold: number
  cyclicDiscountType: FullReductionDiscountType
  cyclicDiscountValue: number
  toppingsDiscount: boolean
  packagingFeeDiscount: boolean
  comboSurchargeDiscount: boolean
  preparationSurchargeDiscount: boolean
  totalParticipationLimitType: LimitType
  totalParticipationLimit: number
  participationFrequencyType: LimitType
  participationFrequencyPeriod: ParticipationPeriod
  participationFrequencyLimit: number
  productScope: ProductScope
  productIds: string[]
  productSelectionMode: 'include' | 'exclude'
  storeScope: StoreScope
  storeIds: string[]
  shareMutexRelation: ShareMutexRelation
  participantUser: ParticipantUser
  memberTagId: string
  activityCode: string
  titleDisplay: DisplayToggle
  tagDisplay: DisplayToggle
  status: ActivityStatus
  /** 进入「已暂停」的时刻，用于计算暂停时长与超时分级 */
  pausedAt?: string
  creator: string
  creatorPhone: string
  creatorOrg: string
  createdAt: string
  updatedAt: string
  operationLogs: ActivityOperationLog[]
}

export interface FullReductionListFilters {
  keyword: string
  productName: string
  productId: string
  activityCode: string
  status: ActivityStatus | 'all'
  thresholdType: FullReductionThresholdType | 'all'
  startDate: string
  endDate: string
  storeId: string
}

/* ================= 会员价 ================= */

export type MemberLevelId = 'normal' | 'silver' | 'gold' | 'platinum' | 'diamond'

export type MemberPriceMethod = 'discount' | 'fixed_reduction' | 'special_price'

/** 逐商品会员价配置 */
export interface MemberPriceProductItem {
  productId: string
  /** 折数(如8.5) / 减价金额 / 固定价格，按 priceMethod 解释 */
  value: number
}

/**
 * 会员价与付费会员价共用的「参与商品及优惠」字段。
 * 两类活动的优惠形式、商品正反选、逐商品优惠力度完全一致，
 * 商品配置组件按此接口约束，避免重复实现。
 */
export interface MemberPriceProductCoreFields {
  priceMethod: MemberPriceMethod
  productItems: MemberPriceProductItem[]
  allProductsValue: number
  productScope: ProductScope
  productIds: string[]
  productSelectionMode: 'include' | 'exclude'
  /** 仅普通会员价使用；付费会员价的资格来自权益卡，无此字段 */
  memberLevels?: MemberLevelId[]
}

export interface MemberPriceActivityForm {
  id: string
  name: string
  title: string
  tag: string
  description: string
  startTime: string
  endTime: string
  cycleType: CycleType
  timeSlotType: TimeSlotType
  priority: number
  channels: string[]
  orderTypes: string[]
  memberLevels: MemberLevelId[]
  priceMethod: MemberPriceMethod
  productItems: MemberPriceProductItem[]
  /** 商品范围为全部商品时的统一优惠值，按 priceMethod 解释 */
  allProductsValue: number
  toppingsDiscount: boolean
  comboSurchargeDiscount: boolean
  preparationSurchargeDiscount: boolean
  totalParticipationLimitType: LimitType
  totalParticipationLimit: number
  participationFrequencyType: LimitType
  participationFrequencyPeriod: ParticipationPeriod
  participationFrequencyLimit: number
  maxDiscountItemsTotalType: LimitType
  maxDiscountItemsTotal: number
  maxDiscountItemsDailyType: LimitType
  maxDiscountItemsDaily: number
  maxDiscountItemsPerOrderType: LimitType
  maxDiscountItemsPerOrder: number
  productScope: ProductScope
  productIds: string[]
  productSelectionMode: 'include' | 'exclude'
  storeScope: StoreScope
  storeIds: string[]
  shareMutexRelation: ShareMutexRelation
  participantUser: ParticipantUser
  memberTagId: string
  activityCode: string
  titleDisplay: DisplayToggle
  tagDisplay: DisplayToggle
  memberPriceTagDisplay: DisplayToggle
  status: ActivityStatus
  /** 进入「已暂停」的时刻，用于计算暂停时长与超时分级 */
  pausedAt?: string
  creator: string
  creatorPhone: string
  creatorOrg: string
  createdAt: string
  updatedAt: string
  operationLogs: ActivityOperationLog[]
}

export interface MemberPriceListFilters {
  keyword: string
  productName: string
  productId: string
  activityCode: string
  status: ActivityStatus | 'all'
  priceMethod: MemberPriceMethod | 'all'
  memberLevel: MemberLevelId | 'all'
  startDate: string
  endDate: string
  storeId: string
}

/** 会员价在用户端商品卡片中的通用展示设置 */
export interface MemberPriceGeneralSettings {
  customPromotionTagEnabled: boolean
  tagContentMode: 'default' | 'member_level' | 'custom'
  customTagText: string
  styleMode: 'default' | 'custom'
  backgroundStyle: 'solid' | 'image'
  /** 图片背景：左侧价格段背景图（建议高30px、宽最大116px） */
  leftBackgroundImage: string
  /** 图片背景：右侧文案段背景图（建议高30px、宽最大130px） */
  rightBackgroundImage: string
  /** 左侧价格段（活动价）配色 */
  leftBackgroundColor: string
  leftTextColor: string
  /** 右侧文案段（活动名称）配色 */
  rightBackgroundColor: string
  rightTextColor: string
  tagPosition: 'default' | 'inline'
  showOriginalPrice: boolean
  /** 划线价开启时，会员价活动生效的活动价展示颜色 */
  activityPriceColor: string
}

/* ================= 付费会员价 ================= */

/**
 * 付费会员价活动状态机（五态）。
 * 与普通活动的差异：无「未开始 / 已结束」，新增「已暂停」；
 * 待发布 → 进行中由关联付费会员卡的上架动作驱动；
 * 草稿用于在旧活动仍生效时准备替换配置，不因卡上架自动生效。
 */
export type PaidMemberPriceStatus = 'draft' | 'pending' | 'in_progress' | 'paused' | 'voided'

/** 付费会员卡模版的售卖状态 */
export type PaidMemberCardStatus = 'on_sale' | 'off_shelf' | 'stopped'

/** 付费会员卡的售卖规格（如 7 天 / 15 天 / 30 天） */
export interface PaidMemberCardSpec {
  id: string
  label: string
  /** 有效天数 */
  days: number
  /** 是否为体验卡规格 */
  isExperience?: boolean
}

/** 按规格设置的权益额度 */
export interface PaidMemberBenefitSpecLimit {
  specId: string
  /** 优惠权益次数（次） */
  count: number
  /** 优惠商品件数（件） */
  items: number
}

/** 权益卡中的一条付费会员价权益：只定义额度，不定义商品与价格 */
export interface PaidMemberPriceBenefit {
  id: string
  name: string
  description: string
  icon: string
  /** 有效期内每人优惠总次数 */
  totalCountLimitType: LimitType
  /** 有效期内每人优惠总件数 */
  totalItemsLimitType: LimitType
  /** 限制时按规格填写的额度 */
  specLimits: PaidMemberBenefitSpecLimit[]
  /** 体验卡是否享受本权益 */
  experienceCardEnabled: boolean
  createdAt: string
}

/** 付费会员卡模版 */
export interface PaidMemberCardTemplate {
  id: string
  name: string
  status: PaidMemberCardStatus
  specs: PaidMemberCardSpec[]
  benefits: PaidMemberPriceBenefit[]
  /** 有效期内持卡人数，用于作废/暂停弹窗提示影响范围 */
  holderCount: number
  updatedAt: string
}

export interface PaidMemberPriceActivityForm extends MemberPriceProductCoreFields {
  id: string
  name: string
  title: string
  tag: string
  description: string
  /** 关联的付费会员卡模版，创建后不可更换 */
  cardTemplateId: string
  /** 关联的付费会员价权益 ID，创建后不可更换 */
  benefitId: string
  cycleType: CycleType
  timeSlotType: TimeSlotType
  priority: number
  channels: string[]
  orderTypes: string[]
  priceMethod: MemberPriceMethod
  productItems: MemberPriceProductItem[]
  allProductsValue: number
  toppingsDiscount: boolean
  comboSurchargeDiscount: boolean
  preparationSurchargeDiscount: boolean
  /** 保留：每天优惠件数（单日交易维度风控） */
  maxDiscountItemsDailyType: LimitType
  maxDiscountItemsDaily: number
  /** 保留：每单优惠件数（单笔交易维度风控） */
  maxDiscountItemsPerOrderType: LimitType
  maxDiscountItemsPerOrder: number
  productScope: ProductScope
  productIds: string[]
  productSelectionMode: 'include' | 'exclude'
  storeScope: StoreScope
  storeIds: string[]
  shareMutexRelation: ShareMutexRelation
  activityCode: string
  titleDisplay: DisplayToggle
  tagDisplay: DisplayToggle
  memberPriceTagDisplay: DisplayToggle
  status: PaidMemberPriceStatus
  /** 进入「已暂停」的时刻，用于计算暂停时长与超时分级 */
  pausedAt?: string
  creator: string
  creatorPhone: string
  creatorOrg: string
  createdAt: string
  updatedAt: string
  operationLogs: ActivityOperationLog[]
}

export interface PaidMemberPriceListFilters {
  keyword: string
  productName: string
  productId: string
  activityCode: string
  status: PaidMemberPriceStatus | 'all'
  priceMethod: MemberPriceMethod | 'all'
  cardTemplateId: string
  cardStatus: PaidMemberCardStatus | 'all'
  storeId: string
}

export type PageView =
  | { type: 'list' }
  | { type: 'wizard'; mode: WizardMode; activityId?: string; step?: number }
  /** 不传 activityId 表示进入全量活动的参与记录查询 */
  | { type: 'activity-participation'; activityId?: string }
  | { type: 'multi-item-list' }
  | { type: 'multi-item-wizard'; mode: WizardMode; activityId?: string; step?: number }
  | { type: 'multi-item-participation'; activityId: string }
  | { type: 'member-price-list' }
  | { type: 'member-price-settings' }
  | { type: 'member-price-wizard'; mode: WizardMode; activityId?: string; step?: number }
  | { type: 'member-price-participation'; activityId: string }
  | { type: 'full-reduction-list' }
  | { type: 'full-reduction-wizard'; mode: WizardMode; activityId?: string; step?: number }
  | { type: 'full-reduction-participation'; activityId: string }
  | { type: 'paid-member-price-list' }
  | { type: 'paid-member-price-wizard'; mode: WizardMode; activityId?: string; step?: number; from?: 'card-list' }
  | { type: 'paid-member-price-participation'; activityId: string }
  | { type: 'paid-member-card-list' }
  | { type: 'order-list' }
  | { type: 'order-detail'; orderId: string; from?: 'order-list' | 'activity-participation' | 'multi-item-participation' | 'member-price-participation' | 'full-reduction-participation' | 'paid-member-price-participation'; activityId?: string }
