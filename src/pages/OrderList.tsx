import { useMemo, useState } from 'react'
import { stores } from '../mockData'
import {
  GIFT_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TABS,
  orders as allOrders,
} from '../orderData'
import type { ActivityForm, MultiItemActivityForm, OrderDatePreset, OrderFilterTab, OrderListFilters, OrderStatus } from '../types'
import { createEmptyOrderFilters, formatMoney, hasActiveOrderFilters, matchesOrderFilters } from '../utils/order'

interface OrderListProps {
  activities: ActivityForm[]
  multiItemActivities: MultiItemActivityForm[]
  onView: (orderId: string) => void
  onExport: () => void
}

const DATE_PRESETS: { value: OrderDatePreset; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: 'last7', label: '近7天' },
  { value: 'custom', label: '自定义' },
]

const PAGE_SIZE = 10

export function OrderList({ activities, multiItemActivities, onView, onExport }: OrderListProps) {
  const [tab, setTab] = useState<OrderFilterTab>('search')
  const [filters, setFilters] = useState<OrderListFilters>(createEmptyOrderFilters)
  const [applied, setApplied] = useState<OrderListFilters>(createEmptyOrderFilters)
  const [page, setPage] = useState(1)

  const bogoActivities = useMemo(
    () => activities.filter((a) => a.name.includes('买') || a.tag === '买一送一'),
    [activities],
  )

  const marketingActivities = useMemo(() => {
    if (filters.marketingType === 'bogo') return bogoActivities.map((a) => ({ id: a.id, name: a.name }))
    if (filters.marketingType === 'multi_item') {
      return multiItemActivities.map((a) => ({ id: a.id, name: a.name }))
    }
    return [
      ...bogoActivities.map((a) => ({ id: a.id, name: a.name })),
      ...multiItemActivities.map((a) => ({ id: a.id, name: a.name })),
    ]
  }, [filters.marketingType, bogoActivities, multiItemActivities])

  const filtered = useMemo(
    () => allOrders.filter((o) => matchesOrderFilters(o, applied)),
    [applied],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const apply = (next: OrderListFilters) => {
    setApplied(next)
    setPage(1)
  }

  const handleSearch = () => apply(filters)

  const handleReset = () => {
    const empty = createEmptyOrderFilters()
    setFilters(empty)
    apply(empty)
  }

  const setStatusTab = (status: OrderStatus | 'all') => {
    const next = { ...applied, status }
    setFilters((f) => ({ ...f, status }))
    apply(next)
  }

  const update = (patch: Partial<OrderListFilters>) => setFilters((f) => ({ ...f, ...patch }))

  return (
    <div className="page-card">
      <div className="info-banner">
        订单管理：查询门店订单，支持按门店、状态、时间筛选；通过「营销筛选」可定位参与买一送一、第N件优惠等营销活动的订单。
      </div>

      <div className="order-filter-tabs">
        <button
          type="button"
          className={`order-filter-tab ${tab === 'search' ? 'is-active' : ''}`}
          onClick={() => setTab('search')}
        >
          搜索
        </button>
        <button
          type="button"
          className={`order-filter-tab ${tab === 'marketing' ? 'is-active' : ''}`}
          onClick={() => setTab('marketing')}
        >
          营销筛选
        </button>
      </div>

      <div className="filter-bar">
        {tab === 'search' ? (
          <div className="filter-bar__row">
            <div className="filter-item">
              <label>订单编号/手机号/取餐号</label>
              <input
                className="input input--wide-sm"
                value={filters.keyword}
                onChange={(e) => update({ keyword: e.target.value })}
                placeholder="请输入关键字搜索"
              />
            </div>
            <div className="filter-item">
              <label>所属门店</label>
              <select
                className="input"
                value={filters.storeId}
                onChange={(e) => update({ storeId: e.target.value })}
              >
                <option value="all">全部</option>
                {stores.slice(0, 12).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-item">
              <label>下单时间</label>
              <div className="date-range">
                <input
                  type="date"
                  className="input"
                  value={filters.startDate}
                  onChange={(e) => update({ startDate: e.target.value, datePreset: 'custom' })}
                />
                <span className="date-range__sep">至</span>
                <input
                  type="date"
                  className="input"
                  value={filters.endDate}
                  onChange={(e) => update({ endDate: e.target.value, datePreset: 'custom' })}
                />
              </div>
            </div>
            <div className="filter-actions">
              <button type="button" className="btn btn--primary" onClick={handleSearch}>搜索</button>
              <button type="button" className="btn btn--default" onClick={handleReset}>重置</button>
            </div>
          </div>
        ) : (
          <div className="filter-bar__row">
            <div className="filter-item">
              <label>优惠类型</label>
              <select
                className="input"
                value={filters.marketingType}
                onChange={(e) => update({ marketingType: e.target.value as OrderListFilters['marketingType'] })}
              >
                <option value="all">全部</option>
                <option value="bogo">买一送一</option>
                <option value="multi_item">第N件优惠</option>
              </select>
            </div>
            <div className="filter-item">
              <label>关联活动</label>
              <select
                className="input"
                value={filters.activityId}
                onChange={(e) => update({ activityId: e.target.value })}
              >
                <option value="all">全部活动</option>
                {marketingActivities.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}（{a.id}）</option>
                ))}
              </select>
            </div>
            <div className="filter-item">
              <label>赠品形态</label>
              <select
                className="input"
                value={filters.giftType}
                onChange={(e) => update({ giftType: e.target.value as OrderListFilters['giftType'] })}
              >
                <option value="all">全部</option>
                <option value="physical">{GIFT_TYPE_LABELS.physical}</option>
                <option value="storage_coupon">{GIFT_TYPE_LABELS.storage_coupon}</option>
              </select>
            </div>
            <div className="filter-actions">
              <button type="button" className="btn btn--primary" onClick={handleSearch}>搜索</button>
              <button type="button" className="btn btn--default" onClick={handleReset}>重置</button>
            </div>
          </div>
        )}
      </div>

      <div className="order-date-presets">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            className={`order-date-chip ${filters.datePreset === p.value ? 'is-active' : ''}`}
            onClick={() => {
              const next = { ...filters, datePreset: p.value }
              setFilters(next)
              if (p.value !== 'custom') apply(next)
            }}
          >
            {p.label}
          </button>
        ))}
        {hasActiveOrderFilters(applied) && (
          <span className="order-active-hint">已应用筛选条件</span>
        )}
      </div>

      <div className="toolbar toolbar--end">
        <button type="button" className="btn btn--default" onClick={onExport}>导出</button>
      </div>

      <div className="status-tabs">
        {ORDER_STATUS_TABS.map((s) => (
          <button
            key={s}
            type="button"
            className={`status-tab ${applied.status === s ? 'is-active' : ''}`}
            onClick={() => setStatusTab(s)}
          >
            {s === 'all' ? '全部' : ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="table-scroll">
        <table className="table table--list">
          <thead>
            <tr>
              <th>订单编号</th>
              <th>下单人</th>
              <th>所属门店</th>
              <th>下单人手机号</th>
              <th>取餐号</th>
              <th>应付金额(元)</th>
              <th>实付金额(元)</th>
              <th>优惠金额(元)</th>
              <th>下单时间</th>
              <th>商品数量</th>
              <th>订单来源</th>
              <th>渠道</th>
              <th>营销</th>
              <th>售后</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={15} className="table-empty">暂无数据</td></tr>
            ) : (
              pageRows.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.id}</td>
                  <td>{o.buyerName}</td>
                  <td>{o.storeName}</td>
                  <td className="mono">{o.buyerPhone}</td>
                  <td>{o.pickupNo}</td>
                  <td>{formatMoney(o.payable)}</td>
                  <td>{formatMoney(o.paid)}</td>
                  <td className={o.discountAmount > 0 ? 'order-discount-cell' : ''}>{formatMoney(o.discountAmount)}</td>
                  <td className="table-time">{o.createdAt}</td>
                  <td>{o.itemCount}</td>
                  <td>{o.source}</td>
                  <td>{o.channel}</td>
                  <td>
                    <div className="gift-tag-group">
                      {o.hasBogo && <span className="order-tag order-tag--bogo">买一送一</span>}
                      {o.hasMultiItem && <span className="order-tag order-tag--multi-item">第N件优惠</span>}
                      {!o.hasBogo && !o.hasMultiItem && '-'}
                    </div>
                  </td>
                  <td>{o.afterSale}</td>
                  <td className="table-actions">
                    <button type="button" onClick={() => onView(o.id)}>详情</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination pagination--full">
        <span>共 {filtered.length} 条</span>
        <div className="pagination__pages">
          <button
            type="button"
            className="page-btn"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            上一页
          </button>
          <span className="page-indicator">{currentPage} / {totalPages}</span>
          <button
            type="button"
            className="page-btn"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  )
}
