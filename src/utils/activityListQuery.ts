import type { PageView } from '../types'

/** 地址参数名：`?type=limit-discount` */
export const ACTIVITY_LIST_QUERY_KEY = 'type'

type ActivityListLink = {
  /** 地址里使用的规范值 */
  type: string
  /** 侧栏导航键，用于高亮与回写地址 */
  navKey: string
  aliases: string[]
  view: PageView
}

const ACTIVITY_LIST_LINKS: ActivityListLink[] = [
  { type: 'bogo', navKey: 'bogo', aliases: ['买1送1', '买一送一'], view: { type: 'list' } },
  { type: 'nth-item', navKey: 'half_item', aliases: ['half-item', 'half_item', '第n件优惠', '第N件优惠'], view: { type: 'multi-item-list' } },
  { type: 'bundle-price', navKey: 'bundle_price', aliases: ['bundle_price', '一口价'], view: { type: 'bundle-price-list' } },
  { type: 'limit-discount', navKey: 'limit_discount', aliases: ['limit_discount', '限时折扣'], view: { type: 'limit-discount-list' } },
  { type: 'full-reduction', navKey: 'full_reduction', aliases: ['full_reduction', '满减', '满减折', '满减/折'], view: { type: 'full-reduction-list' } },
  { type: 'delivery-fee', navKey: 'delivery_fee', aliases: ['delivery_fee', '减配送费'], view: { type: 'delivery-fee-list' } },
  { type: 'member-price', navKey: 'member_price', aliases: ['member_price', '会员价'], view: { type: 'member-price-list' } },
  { type: 'paid-member-price', navKey: 'paid_member_price', aliases: ['paid_member_price', '付费会员价'], view: { type: 'paid-member-price-list' } },
  { type: 'stored-value-pay', navKey: 'stored_value_pay', aliases: ['stored_value_pay', '储值支付优惠', '储值支付'], view: { type: 'stored-value-pay-list' } },
  { type: 'enterprise-discount', navKey: 'enterprise_discount', aliases: ['enterprise_discount', '企业员工折扣'], view: { type: 'enterprise-discount-list' } },
]

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function matchLink(raw: string): ActivityListLink | undefined {
  const key = normalize(raw)
  return ACTIVITY_LIST_LINKS.find((item) => item.type === key || item.aliases.some((alias) => normalize(alias) === key))
}

/** 从地址读出要打开的活动列表；参数为空返回 null，参数无法识别返回 unknown */
export function readActivityListQuery(search: string): { view: PageView } | { unknown: string } | null {
  const raw = new URLSearchParams(search).get(ACTIVITY_LIST_QUERY_KEY)
  if (raw == null || raw.trim() === '') return null
  const link = matchLink(raw)
  if (!link) return { unknown: raw.trim() }
  return { view: link.view }
}

export function activityListTypeForNav(navKey: string): string | null {
  return ACTIVITY_LIST_LINKS.find((item) => item.navKey === navKey)?.type ?? null
}

/** 把当前活动列表写回地址，便于复制分享；不新增浏览历史 */
export function writeActivityListQuery(type: string | null) {
  const url = new URL(window.location.href)
  if (type) url.searchParams.set(ACTIVITY_LIST_QUERY_KEY, type)
  else url.searchParams.delete(ACTIVITY_LIST_QUERY_KEY)
  const next = `${url.pathname}${url.search}${url.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next !== current) window.history.replaceState(null, '', next)
}
