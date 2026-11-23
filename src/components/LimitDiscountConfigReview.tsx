import { useState, type ReactNode } from 'react'
import { products } from '../mockData'
import { PERIOD_OPTIONS, WEEKDAY_OPTIONS } from '../mockLimitDiscountData'
import type { LimitDiscountActivityForm, LimitDiscountProductItem, Product } from '../types'
import { discountAreaCoverage, resolveDiscountStoreScope } from '../utils/limitDiscountScope'
import { matchesProductKeyword } from '../utils/productSearch'
import { getResolvedStores } from '../utils/storeRegistry'
import {
  channelSummary, discountStrengthSummary, discountValueLabel, formatDiscountValue, goodsScopeLabel,
  memberTagLabels, participantLabel, sceneLabel, sceneOverrides, sceneSummary, sharedDiscountItem,
  storeModeLabel, storeTagLabels,
} from '../utils/limitDiscountActivity'
import { LimitDiscountAreaPreview } from './LimitDiscountAreaPreview'
import { SelectedProductPager, SelectedProductSearchBar } from './SelectedProductTools'

type Activity = LimitDiscountActivityForm

export function limitDiscountTimeSummary(activity: Activity) {
  const cycle = activity.cycleType === 'weekly'
    ? `每周 · ${WEEKDAY_OPTIONS.filter(({ value }) => activity.weekDays.includes(value)).map(({ label }) => label).join('、') || '未选星期'}`
    : activity.cycleType === 'monthly'
      ? `每月 · ${activity.monthDays.length ? activity.monthDays.join('、') + '日' : '未选日期'}`
      : '每天'
  const slots = activity.timeSlotType === 'specific'
    ? activity.timeSlots.map(({ start, end }) => `${start}–${end}`).join('、') || '未设时段'
    : '全天'
  return `${cycle} / ${slots}`
}

export function limitDiscountUserLimits(activity: Activity) {
  const period = (value: string) => PERIOD_OPTIONS.find(({ value: id }) => id === value)?.label ?? value
  return [
    activity.totalTimesType === 'limited' && `活动期间每人最多 ${activity.totalTimes} 单`,
    activity.frequencyType === 'limited' && `${period(activity.frequencyPeriod)}每人最多 ${activity.frequencyTimes} 单`,
    activity.limitTotalPieces && `活动期间每人最多 ${activity.totalPieces} 件`,
    activity.limitPeriodPieces && `${period(activity.periodPiecesPeriod)}每人最多 ${activity.periodPieces} 件`,
    activity.limitOrderPieces && `每单最多 ${activity.orderPieces} 件`,
  ].filter(Boolean).join('、') || '不限'
}

export function LimitDiscountConfigReview({ activity, onEdit, showTrial = false }: {
  activity: Activity
  onEdit?: (step: number) => void
  showTrial?: boolean
}) {
  const { eligibleStores, policyExcludedStores } = resolveDiscountStoreScope(activity)
  const { selected, selectedAreaCount } = discountAreaCoverage(activity, eligibleStores)
  const activeTags = activity.storeMode === 'tag_include' || activity.storeMode === 'tag_exclude'
    ? storeTagLabels(activity.storeTagIds) : ''
  const overrides = activity.goodsScope === 'include' ? [] : sceneOverrides(activity, sharedDiscountItem(activity))
  const exclusions = [
    activity.holidayInactive && '法定节假日',
    ...activity.inactiveRanges.filter(({ start, end }) => start && end).map(({ start, end }) => `${start}–${end}`),
  ].filter(Boolean).join('、') || '未设置'
  const stock = activity.goodsScope === 'include'
    ? '按商品分别设置' : activity.activityStock == null ? '不限量' : `${activity.activityStock} 件`
  const priceAddons = [
    activity.toppingDiscount === 'yes' && '加料',
    activity.comboSurchargeDiscount === 'yes' && '套餐加价',
    activity.practiceSurchargeDiscount === 'yes' && '做法加价',
  ].filter(Boolean).join('、') || '均不参与优惠'
  return (
    <div className="ld-config-review" aria-label={onEdit ? '配置复核' : '完整配置'}>
      <Review title="基础信息与投放时间" editLabel="修改基础信息" onEdit={onEdit && (() => onEdit(0))} rows={[
        ['活动名称', activity.name || '未填写'],
        ['参与渠道', channelSummary(activity)],
        ['参与业务 / 场景', sceneSummary(activity)],
        ['活动时间', `${activity.startTime || '未设置'} 至 ${activity.endTime || '未设置'}`],
        ['周期 / 时段', limitDiscountTimeSummary(activity)],
        ['不生效日期', exclusions],
      ]} />
      <Review title="活动规则" rows={[
        ['门槛限制', activity.thresholdType === 'limited' ? `消费金额满 ${activity.thresholdAmount} 元` : '不限'],
        ...(activity.thresholdType === 'limited' ? [
          ['门槛商品', activity.thresholdGoodsScope === 'all' ? '全部商品' : `${activity.thresholdGoodsScope === 'exclude' ? '排除' : '指定'} ${activity.thresholdProductIds.length} 个商品`],
          ['计入门槛的加价项', [
            activity.thresholdIncludeTopping && '加料', activity.thresholdIncludeCombo && '套餐加价',
            activity.thresholdIncludePractice && '做法加价',
          ].filter(Boolean).join('、') || '无'],
        ] as [string, string][] : []),
        ['参与优惠的加价项', priceAddons],
        ['优惠商品命中', activity.hitRule === 'lowest_price' ? '优惠售价低到高的商品' : '优惠售价高到低的商品'],
        ['用户限购', limitDiscountUserLimits(activity)],
        ['参与用户', participantLabel(activity)],
      ]} />
      <Review title="参与门店与点餐区域" editLabel="修改门店与点位" onEdit={onEdit && (() => onEdit(1))} rows={[
        ['门店范围', `${storeModeLabel(activity)}${activeTags ? `（${activeTags}）` : ''}`],
        ['门店策略扣除', `${policyExcludedStores.length} 家`],
        ['区域限制', activity.areaMode === 'specified' ? `指定区域 · ${selectedAreaCount} 个点位` : '不限区域'],
        ['配置覆盖', `${activity.areaMode === 'specified' ? selected.length : eligibleStores.length} 家门店`],
      ]}>
        <StoreDetail activity={activity} />
        {selected.length > 0 && (
          <ul className="ld-area-summary">{selected.map(({ store, areas }) => <li key={store.id}>{store.name} · {areas.map(({ name }) => name).join('、')}</li>)}</ul>
        )}
        {showTrial && activity.areaMode === 'specified' && <LimitDiscountAreaPreview activity={activity} />}
      </Review>
      <Review title="商品与优惠" editLabel="修改商品与优惠" onEdit={onEdit && (() => onEdit(2))} rows={[
        ['参与商品', goodsScopeLabel(activity)],
        ['优惠力度', discountStrengthSummary(activity)],
        ...(overrides.length ? [['分业务优惠', overrides.map(({ sceneId, value }) => `${sceneLabel(sceneId)} ${formatDiscountValue(activity.discountMethod, value)}`).join('、')]] as [string, string][] : []),
        ['活动库存', stock],
      ]}>
        <GoodsDetail activity={activity} />
      </Review>
      <Review title="高级选项与展示" rows={[
        ['共享互斥', activity.shareMutexRelation === 'share_all' ? '全部活动 / 券共享' : '全部活动 / 券互斥'],
        ['活动标题', `${activity.title || '未填写'} · ${activity.titleDisplay === 'show' ? '展示' : '不展示'}`],
        ['商品促销标签', `${activity.goodsLabel || '未填写'} · ${activity.goodsLabelDisplay === 'show' ? '展示' : '不展示'}`],
        ['打标签', memberTagLabels(activity.memberTagIds)],
        ['活动编码', activity.activityCode || '未设置'],
        ['快捷检索名称', activity.searchKeyword || '未设置'],
        ['活动说明', activity.description || '未填写'],
      ]} />
    </div>
  )
}

function Review({ title, rows, editLabel, onEdit, children }: {
  title: string
  rows: [string, string][]
  editLabel?: string
  onEdit?: () => void
  children?: ReactNode
}) {
  return (
    <section className="promo-card ld-review-card">
      <div className="promo-card__head">
        <h3>{title}</h3>
        {onEdit && <button type="button" className="link-btn" onClick={onEdit}>{editLabel}</button>}
      </div>
      <div className="promo-card__body">
        <dl className="ld-review-card__rows">
          {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        {children}
      </div>
    </section>
  )
}

const REVIEW_PAGE_SIZE = 10

function useDetailPage<T>(rows: T[]) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(rows.length / REVIEW_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = rows.slice((currentPage - 1) * REVIEW_PAGE_SIZE, currentPage * REVIEW_PAGE_SIZE)
  return { pageRows, currentPage, totalPages, setPage }
}

function StoreDetail({ activity }: { activity: LimitDiscountActivityForm }) {
  const [keyword, setKeyword] = useState('')
  if (activity.storeMode !== 'include' && activity.storeMode !== 'exclude') return null
  const picked = getResolvedStores().filter((store) => activity.storeIds.includes(store.id))
  const kw = keyword.trim()
  const filtered = kw
    ? picked.filter((store) => store.name.includes(kw) || store.code.includes(kw) || store.regionName.includes(kw))
    : picked
  const title = activity.storeMode === 'include' ? '参与门店明细' : '不参与门店明细'
  return (
    <DetailBlock title={`${title}（${picked.length}家）`} empty={picked.length === 0} emptyText="未选择门店">
      <SelectedProductSearchBar
        keyword={keyword}
        onChange={(value) => setKeyword(value)}
        filteredCount={filtered.length}
        totalCount={picked.length}
        itemLabel="门店"
        placeholder="在已选门店中查找：名称 / 编码 / 区域"
      />
      <DetailTable
        key={kw}
        rows={filtered}
        filtering={kw.length > 0}
        rowKey={(store) => store.id}
        emptyText={`没有匹配「${kw}」的已选门店`}
        columns={<>
          <th>门店名称</th><th>门店编码</th><th>所属区域</th><th>营业状态</th>
        </>}
        renderRow={(store) => (
          <>
            <td>{store.name}</td>
            <td>{store.code}</td>
            <td>{store.regionName}</td>
            <td>
              <span className={`status-dot ${store.status === 'open' ? 'status-dot--green' : 'status-dot--gray'}`}>
                {store.status === 'open' ? '营业中' : '已停业'}
              </span>
            </td>
          </>
        )}
      />
    </DetailBlock>
  )
}

function GoodsDetail({ activity }: { activity: LimitDiscountActivityForm }) {
  const [keyword, setKeyword] = useState('')
  if (activity.goodsScope === 'all') return null
  const rows = activity.productItems
    .map((item) => ({ item, product: products.find((p) => p.id === item.productId) }))
    .filter((row): row is { item: LimitDiscountProductItem; product: Product } => Boolean(row.product))
  const kw = keyword.trim().toLowerCase()
  const filtered = kw
    ? rows.filter(({ product }) => matchesProductKeyword(product, kw)
      || [product.spec, product.barcode, product.specCode, product.identifier].some((text) => text.toLowerCase().includes(kw)))
    : rows
  const isInclude = activity.goodsScope === 'include'
  const method = activity.discountMethod
  const valueLabel = discountValueLabel(method)
  const title = isInclude ? '参与商品明细' : '不参与商品明细'
  return (
    <DetailBlock title={`${title}（${rows.length}个）`} empty={rows.length === 0} emptyText="未选择商品">
      <SelectedProductSearchBar
        keyword={keyword}
        onChange={setKeyword}
        filteredCount={filtered.length}
        totalCount={rows.length}
        itemLabel="商品"
        placeholder="在已选商品中查找：名称 / 商品 ID / SKU ID / 编码 / 规格 / 条码"
      />
      <DetailTable
        key={kw}
        rows={filtered}
        filtering={kw.length > 0}
        rowKey={(row) => row.item.productId}
        emptyText={`没有匹配「${kw}」的已选商品`}
        columns={<>
          <th>商品名称</th>
          <th>规格</th>
          <th>商品条码</th>
          <th>销售价</th>
          {isInclude && <th>默认{valueLabel}</th>}
          {isInclude && <th>业务单独设置</th>}
          {isInclude && <th>活动库存</th>}
        </>}
        renderRow={({ item, product }) => {
          const overrides = sceneOverrides(activity, item)
          return (
            <>
              <td>{product.name}</td>
              <td>{product.spec}</td>
              <td>{product.barcode}</td>
              <td>¥{product.price}</td>
              {isInclude && <td>{formatDiscountValue(method, item.discountValue)}</td>}
              {isInclude && (
                <td>
                  {overrides.length === 0 ? <span className="field-hint">无，全部按默认</span> : (
                    <div className="ld-review-overrides">
                      {overrides.map(({ sceneId, value }) => (
                        <span key={sceneId} className="ld-override-tag">
                          {sceneLabel(sceneId)}<strong>{formatDiscountValue(method, value)}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              )}
              {isInclude && <td>{item.stock == null ? '不限量' : `${item.stock} 件`}</td>}
            </>
          )
        }}
      />
    </DetailBlock>
  )
}

function DetailBlock({ title, empty, emptyText, children }: { title: string; empty: boolean; emptyText: string; children: React.ReactNode }) {
  return (
    <div className="ld-review-detail">
      <div className="ld-review-detail__title">{title}</div>
      {empty ? <p className="field-hint">{emptyText}</p> : children}
    </div>
  )
}

export function DetailTable<T>({ rows, filtering, rowKey, emptyText, columns, renderRow, showSinglePageCount = true }: {
  rows: T[]
  filtering: boolean
  rowKey: (row: T) => string
  emptyText: string
  columns: React.ReactNode
  renderRow: (row: T) => React.ReactNode
  showSinglePageCount?: boolean
}) {
  const { pageRows, currentPage, totalPages, setPage } = useDetailPage(rows)
  return (
    <>
      <div className="ld-review-detail__scroll">
        <table className="table">
          <thead><tr>{columns}</tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="table-empty" colSpan={100}>{emptyText}</td></tr>
            ) : pageRows.map((row) => <tr key={rowKey(row)}>{renderRow(row)}</tr>)}
          </tbody>
        </table>
      </div>
      {rows.length > 0 && (showSinglePageCount || totalPages > 1) && (
        <SelectedProductPager
          total={rows.length}
          pageSize={REVIEW_PAGE_SIZE}
          currentPage={currentPage}
          totalPages={totalPages}
          filtering={filtering}
          onChange={setPage}
        />
      )}
    </>
  )
}
