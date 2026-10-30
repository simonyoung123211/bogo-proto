import { CHANNELS, ORDER_TYPES } from '../mockData'
import { MEMBER_PRICE_METHOD_LABELS, createEmptyMemberPriceOfferGroup } from '../mockMemberPriceData'
import type { MemberPriceActivityForm, MemberPriceOfferGroup } from '../types'
import {
  formatMemberPriceGroupTabSummary,
  formatPriceMethodValue,
  getMemberPriceAudienceLabel,
  previewMemberSamplePrice,
  supportsMemberPriceMultiGroup,
} from '../utils/memberPriceActivity'

const SAMPLE_NAME = '洛神花茶'
const SAMPLE_ORIGIN = 18

interface MemberPricePhonePreviewProps {
  activity: MemberPriceActivityForm
  previewGroupId?: string
  onPreviewGroupChange?: (groupId: string) => void
}

export function MemberPricePhonePreview({
  activity,
  previewGroupId,
}: MemberPricePhonePreviewProps) {
  const audienceType = activity.audienceType ?? 'specified_level'
  const groups = activity.groups?.length
    ? activity.groups
    : [createEmptyMemberPriceOfferGroup({ targetIds: activity.memberLevels ?? [] })]
  const multi = supportsMemberPriceMultiGroup(audienceType)
  const activeGroup =
    groups.find((g) => g.id === previewGroupId) ?? groups[0] ?? createEmptyMemberPriceOfferGroup()
  const samplePrice = previewMemberSamplePrice(
    activeGroup.priceMethod,
    activeGroup.allProductsValue,
    SAMPLE_ORIGIN,
  )
  const showTitle = activity.titleDisplay !== 'hide'
  const showTag = activity.tagDisplay !== 'hide' || activity.memberPriceTagDisplay !== 'hide'
  const tagText = activity.tag?.trim() || '会员价'
  const banner = activity.title?.trim() || activity.name?.trim() || '会员优惠'
  const channelText = activity.channels
    .map((id) => CHANNELS.find((c) => c.id === id)?.label)
    .filter(Boolean)
    .join('、') || '未选渠道'
  const sceneText = activity.orderTypes
    .map((id) => ORDER_TYPES.find((o) => o.id === id)?.label)
    .filter(Boolean)
    .slice(0, 3)
    .join('/') || '未选场景'
  const pickupOn = activity.orderTypes.some((id) => id === 'dine_in' || id === 'pickup')
  const takeawayOn = activity.orderTypes.some((id) => id.startsWith('takeaway'))

  return (
    <aside className="mp-aside" aria-label="点单页预览（示意）">
      <div className="phone">
        <div className="phone-status"><span>10:46</span><span>5G ▰　▣</span></div>
        <div className="phone-shop">
          <div>
            <b>门店名称 ›</b>
            <small>距您 1.7km</small>
          </div>
          <span className="phone-eat">
            <em className={pickupOn ? 'is-on' : ''}>自取</em>
            <em className={takeawayOn ? 'is-on' : ''}>外卖</em>
          </span>
        </div>

        {showTitle && (
          <div className="phone-banner">
            <span className="banner-tag">{banner}</span>
            <span className="banner-more">点击查看 ›</span>
          </div>
        )}

        <div className="phone-menu">
          <div className="phone-rail">
            <span>活动</span>
            <span>热销推荐</span>
            <span>招牌主食</span>
            <span>小食搭配</span>
            <span>清爽饮品</span>
          </div>
          <div className="phone-content">
            <div className="phone-cat">活动</div>
            <div className="phone-product">
              <div className="art" aria-hidden />
              <div className="phone-p-body">
                <div className="phone-p-name">{SAMPLE_NAME}</div>
                {showTag && <span className="phone-chip">{tagText}</span>}
                <div className="phone-price">
                  <small>¥</small>
                  {formatMoney(samplePrice)}
                  <del>¥{SAMPLE_ORIGIN}</del>
                  <span className="phone-add">+</span>
                </div>
                <div className="phone-method">
                  {MEMBER_PRICE_METHOD_LABELS[activeGroup.priceMethod]}
                  {' · '}
                  {formatPriceMethodValue(activeGroup.priceMethod, activeGroup.allProductsValue)}
                </div>
              </div>
            </div>
            <div className="phone-product">
              <div className="art art--alt" aria-hidden />
              <div className="phone-p-body">
                <div className="phone-p-name">招牌主食</div>
                <small className="phone-sold">总售 300+</small>
                <div className="phone-price phone-price--plain">
                  <small>¥</small>26
                  <span className="phone-add">+</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="phone-bottom">
          <span>点单</span>
          <span>订单</span>
          <span>我的</span>
        </div>
      </div>

      <p className="preview-caption">
        顾客侧展示示意 · 商品、图片及原价为固定样例
        <br />
        优惠标签与价格跟随配置，实际效果以订单为准
      </p>

      <div className="aside-card">
        <h3>当前配置</h3>
        <div className="aside-line"><span>优惠会员</span><b>{getMemberPriceAudienceLabel(audienceType)}</b></div>
        {multi && (
          <div className="aside-line">
            <span>当前方案</span>
            <b>{schemeFoot(activeGroup, audienceType)}</b>
          </div>
        )}
        <div className="aside-line"><span>适用渠道</span><b>{channelText}</b></div>
        <div className="aside-line"><span>业务场景</span><b>{sceneText}</b></div>
      </div>
    </aside>
  )
}

function formatMoney(n: number) {
  return n % 1 ? n.toFixed(1) : String(n)
}

function schemeFoot(group: MemberPriceOfferGroup, audienceType: MemberPriceActivityForm['audienceType']) {
  const summary = formatMemberPriceGroupTabSummary(audienceType ?? 'specified_level', group.targetIds)
  return summary || '未选择'
}
