import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { ActivityOperationLogModal } from '../components/ActivityOperationLogModal'
import { MemberPriceScopeSnapshotModal, type MemberPriceScopeSnapshotType } from '../components/MemberPriceScopeSnapshotModal'
import { CHANNELS } from '../mockData'
import { MEMBER_PRICE_METHOD_LABELS } from '../mockMemberPriceData'
import {
  PAID_MEMBER_CARD_STATUS_LABELS,
  PAID_MEMBER_PRICE_STATUS_LABELS,
  PAUSE_OVERDUE_MINUTES,
} from '../mockPaidMemberPriceData'
import type {
  MemberPriceMethod,
  PaidMemberCardTemplate,
  PaidMemberPriceActivityForm,
  PaidMemberPriceListFilters,
  PaidMemberPriceStatus,
} from '../types'
import {
  canDelete,
  canEdit,
  canPause,
  canPublish,
  canResume,
  canViewParticipation,
  canVoid,
  countActivitiesByStatus,
  countInvalidProducts,
  countOverduePaused,
  findRangeConflicts,
  formatConflictMessage,
  formatPaidRuleSummary,
  getCardBenefitSummary,
  getPauseInfo,
  matchesFilters,
} from '../utils/paidMemberPriceActivity'
import {
  formatCreatorDisplay,
  getProductCount,
  getProductSummary,
  getStoreSummary,
} from '../utils/memberPriceActivity'

interface PaidMemberPriceActivityListProps {
  activities: PaidMemberPriceActivityForm[]
  cards: PaidMemberCardTemplate[]
  onCreate: () => void
  onView: (id: string) => void
  onViewParticipation: (id: string) => void
  onEdit: (id: string) => void
  onCopy: (id: string) => void
  onPublish: (id: string) => void
  onPause: (id: string) => void
  onResume: (id: string) => void
  onVoid: (id: string) => void
  onDelete: (id: string) => void
  onDemoSetPausedMinutes: (id: string, minutes: number) => void
  onGoToCards: () => void
  onToast?: (message: string) => void
}

/**
 * 与其他活动共用同一套生命周期顺序，只是付费会员价跟随权益卡生效，
 * 没有「未开始 / 已结束」；已作废没有可折叠的「更多状态」，直接排在末位。
 */
const STATUS_TABS: (PaidMemberPriceStatus | 'all')[] = ['all', 'draft', 'pending', 'in_progress', 'paused', 'voided']

const EMPTY_FILTERS: PaidMemberPriceListFilters = {
  keyword: '',
  productName: '',
  productId: '',
  activityCode: '',
  status: 'all',
  priceMethod: 'all',
  cardTemplateId: 'all',
  cardStatus: 'all',
  storeId: 'all',
}

const CHANNEL_MAP = Object.fromEntries(CHANNELS.map((c) => [c.id, c]))
const PAGE_SIZE = 10

export function PaidMemberPriceActivityList({
  activities,
  cards,
  onCreate,
  onView,
  onViewParticipation,
  onEdit,
  onCopy,
  onPublish,
  onPause,
  onResume,
  onVoid,
  onDelete,
  onDemoSetPausedMinutes,
  onGoToCards,
  onToast,
}: PaidMemberPriceActivityListProps) {
  const [filters, setFilters] = useState<PaidMemberPriceListFilters>(EMPTY_FILTERS)
  const [pauseTarget, setPauseTarget] = useState<PaidMemberPriceActivityForm | null>(null)
  const [resumeTarget, setResumeTarget] = useState<PaidMemberPriceActivityForm | null>(null)
  const [voidTarget, setVoidTarget] = useState<PaidMemberPriceActivityForm | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PaidMemberPriceActivityForm | null>(null)
  const [filterExpanded, setFilterExpanded] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [logTarget, setLogTarget] = useState<PaidMemberPriceActivityForm | null>(null)
  const [snapshotTarget, setSnapshotTarget] = useState<{ activity: PaidMemberPriceActivityForm; type: MemberPriceScopeSnapshotType } | null>(null)
  const [page, setPage] = useState(1)

  // 暂停时长需要实时跳变颜色，用页面级单一定时器驱动，仅在存在暂停活动时启动
  const hasPaused = activities.some((a) => a.status === 'paused')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!hasPaused) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [hasPaused])

  const filtered = useMemo(
    () => activities.filter((a) => matchesFilters(a, filters, cards)),
    [activities, filters, cards],
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length)

  useEffect(() => { setPage(1) }, [filters])

  const statusCounts = useMemo(
    () => countActivitiesByStatus(activities, filters, cards),
    [activities, filters, cards],
  )
  const overdueCount = countOverduePaused(activities, now)

  const setStatusTab = (status: PaidMemberPriceStatus | 'all') => {
    setFilters((f) => ({ ...f, status }))
  }

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS)
    setFilterExpanded(false)
  }

  const copyActivityId = async (id: string, e: ReactMouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(id)
      onToast?.('活动 ID 已复制')
    } catch {
      onToast?.('复制失败，请手动复制')
    }
  }

  const stopRowClick = (e: ReactMouseEvent) => e.stopPropagation()

  const requestResume = (activity: PaidMemberPriceActivityForm) => {
    const conflicts = findRangeConflicts(activity, activities)
    if (conflicts.length > 0) {
      onToast?.(`无法恢复：${formatConflictMessage(conflicts)}`)
      return
    }
    setResumeTarget(activity)
  }

  const cardOf = (activity: PaidMemberPriceActivityForm) =>
    cards.find((c) => c.id === activity.cardTemplateId)

  return (
    <div className="page-card page-card--list">
      <div className="list-info-banner">
        付费会员价与付费权益卡中的「付费会员价权益」强关联，无活动起止时间，卡上架后自动生效。
        大范围调整规则时，请先新建草稿配齐，再作废旧活动并发布新活动。
        <button type="button" className="link-btn" onClick={onGoToCards}>管理付费权益卡</button>
      </div>

      {overdueCount > 0 && (
        <div className="alert-banner alert-banner--danger">
          <span className="alert-banner__icon">!</span>
          <span>
            有 {overdueCount} 个付费会员价活动暂停超过 {PAUSE_OVERDUE_MINUTES} 分钟未恢复，持卡顾客暂时无法享受专属价
          </span>
          <button
            type="button"
            className="link-btn"
            onClick={() => setFilters((f) => ({ ...f, status: 'paused' }))}
          >
            查看这些活动
          </button>
        </div>
      )}

      <header className="list-page-header list-page-header--compact">
        <div className="list-page-header__main">
          <div className="list-page-header__title-row">
            <h1 className="list-page-header__title">付费会员价</h1>
            <PageHelpButton open={helpOpen} onToggle={() => setHelpOpen((v) => !v)} onClose={() => setHelpOpen(false)} />
          </div>
        </div>
        <div className="list-page-header__actions">
          <button type="button" className="btn btn--default btn--icon" onClick={onGoToCards}>
            <IconCard />
            付费权益卡
          </button>
          <button type="button" className="btn btn--primary btn--icon" onClick={onCreate}>
            <IconPlus />
            新建活动
          </button>
        </div>
      </header>

      <div className="list-chrome">
        <div className="status-tabs status-tabs--pill">
          {STATUS_TABS.map((s) => (
            <button key={s} type="button" className={`status-tab ${filters.status === s ? 'is-active' : ''}`} onClick={() => setStatusTab(s)}>
              {PAID_MEMBER_PRICE_STATUS_LABELS[s]}
              <span className="status-tab__count">{statusCounts[s]}</span>
            </button>
          ))}
        </div>

        <div className="list-toolbar">
          <div className="list-toolbar__fields">
            <div className="filter-item">
              <label>活动名称/ID</label>
              <input className="input input--filter" value={filters.keyword} onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))} placeholder="请输入活动名称或 ID" />
            </div>
            <div className="filter-item">
              <label>关联权益卡</label>
              <select
                className="input input--filter"
                value={filters.cardTemplateId}
                onChange={(e) => setFilters((f) => ({ ...f, cardTemplateId: e.target.value }))}
              >
                <option value="all">全部</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-item">
              <label>卡在售状态</label>
              <select
                className="input input--filter"
                value={filters.cardStatus}
                onChange={(e) => setFilters((f) => ({ ...f, cardStatus: e.target.value as PaidMemberPriceListFilters['cardStatus'] }))}
              >
                {(['all', 'on_sale', 'off_shelf', 'stopped'] as const).map((s) => (
                  <option key={s} value={s}>{PAID_MEMBER_CARD_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="filter-item">
              <label>优惠形式</label>
              <select
                className="input input--filter"
                value={filters.priceMethod}
                onChange={(e) => setFilters((f) => ({ ...f, priceMethod: e.target.value as PaidMemberPriceListFilters['priceMethod'] }))}
              >
                <option value="all">全部</option>
                {(Object.keys(MEMBER_PRICE_METHOD_LABELS) as MemberPriceMethod[]).map((m) => (
                  <option key={m} value={m}>{MEMBER_PRICE_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="list-toolbar__actions">
            <span className="list-toolbar__hint">筛选即时生效</span>
            <button type="button" className="btn btn--default btn--icon btn--sm" onClick={resetFilters}><IconReset />重置</button>
            <button type="button" className={`list-toolbar__toggle ${filterExpanded ? 'is-expanded' : ''}`} onClick={() => setFilterExpanded((v) => !v)}>
              <IconFilter />更多筛选<IconChevron />
            </button>
          </div>
        </div>

        {filterExpanded && (
          <div className="list-toolbar list-toolbar--expanded">
            <div className="list-toolbar__fields">
              <div className="filter-item">
                <label>活动商品名称</label>
                <input
                  className="input input--filter"
                  value={filters.productName}
                  onChange={(e) => setFilters((f) => ({ ...f, productName: e.target.value }))}
                  placeholder="请输入活动商品名称"
                />
              </div>
              <div className="filter-item">
                <label>活动商品 ID</label>
                <input
                  className="input input--filter"
                  value={filters.productId}
                  onChange={(e) => setFilters((f) => ({ ...f, productId: e.target.value }))}
                  placeholder="请输入商品 ID 或 SKU ID"
                />
              </div>
              <div className="filter-item">
                <label>活动编码</label>
                <input className="input input--filter" value={filters.activityCode} onChange={(e) => setFilters((f) => ({ ...f, activityCode: e.target.value }))} placeholder="请输入活动编码" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="table-wrap table-wrap--list">
        <table className="table table--list table--activity">
          <thead>
            <tr>
              <th>活动名称</th>
              <th>关联权益卡</th>
              <th>卡在售状态</th>
              <th>优惠形式</th>
              <th>参与商品数</th>
              <th>参与门店</th>
              <th>投放渠道</th>
              <th>状态</th>
              <th className="table-col--optional">创建者</th>
              <th className="table-col--meta">更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11}>
                  <div className="table-empty-state">
                    <p className="table-empty-state__title">暂无活动</p>
                    <p className="table-empty-state__desc">调整筛选条件，或新建一个付费会员价活动</p>
                    <button type="button" className="btn btn--primary btn--icon" onClick={onCreate}><IconPlus />新建活动</button>
                  </div>
                </td>
              </tr>
            ) : pageRows.map((a) => {
              const summary = getCardBenefitSummary(a, cards)
              const pauseInfo = getPauseInfo(a, now)
              const invalidCount = countInvalidProducts(a)
              const cardOffShelfWhileRunning = a.status === 'in_progress' && summary.cardStatus !== 'on_sale'
              return (
                <tr key={a.id} className={`table-row--clickable table-row--status-${a.status}`} onClick={() => onView(a.id)}>
                  <td>
                    <div className="activity-name-cell">
                      <div className="activity-name-cell__top">
                        <span className="activity-name-cell__name">{a.name || '未命名活动'}</span>
                      </div>
                      <div className="activity-name-cell__rule">{formatPaidRuleSummary(a)}</div>
                      <button type="button" className="activity-name-cell__id" title="点击复制活动 ID" onClick={(e) => copyActivityId(a.id, e)}>{a.id}</button>
                    </div>
                  </td>
                  <td>
                    <div className="card-benefit-cell">
                      <span className="card-benefit-cell__card">{summary.cardName}</span>
                      <span className="card-benefit-cell__benefit">{summary.benefitName}</span>
                      <span className="card-benefit-cell__id">{a.benefitId || '-'}</span>
                    </div>
                  </td>
                  <td>
                    {summary.cardStatus ? (
                      <div className={`card-status-cell ${cardOffShelfWhileRunning ? 'card-status-cell--warn' : ''}`}>
                        <span className={`status-badge status-badge--dot card-status--${summary.cardStatus}`}>
                          {PAID_MEMBER_CARD_STATUS_LABELS[summary.cardStatus]}
                        </span>
                        {cardOffShelfWhileRunning && (
                          <span className="card-status-cell__hint">卡已下架，已购卡用户仍在享用</span>
                        )}
                      </div>
                    ) : <span className="text-secondary">-</span>}
                  </td>
                  <td>
                    <span className={`rule-tag rule-tag--member-${a.priceMethod}`}>{MEMBER_PRICE_METHOD_LABELS[a.priceMethod]}</span>
                  </td>
                  <td onClick={stopRowClick}>
                    <SnapshotLink label={`${getProductCount(a)}`} onClick={() => setSnapshotTarget({ activity: a, type: 'products' })} />
                    <div className="text-secondary" style={{ fontSize: 12 }}>{getProductSummary(a)}</div>
                    {invalidCount > 0 && <div className="text-warning" style={{ fontSize: 12 }}>含 {invalidCount} 个已失效商品</div>}
                  </td>
                  <td onClick={stopRowClick}><SnapshotLink label={getStoreSummary(a)} onClick={() => setSnapshotTarget({ activity: a, type: 'stores' })} /></td>
                  <td onClick={stopRowClick}><ChannelChips channels={a.channels} /></td>
                  <td>
                    <div className="status-cell">
                      <span className={`status-badge status-badge--dot status-badge--${a.status}`}>
                        {PAID_MEMBER_PRICE_STATUS_LABELS[a.status]}
                      </span>
                      {a.status === 'pending' && (
                        <span className="status-cell__hint">关联卡未上架</span>
                      )}
                      {pauseInfo && (
                        <span className={`pause-timer pause-timer--${pauseInfo.level}`} title={pauseInfo.label}>
                          {pauseInfo.label}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-col--optional"><CreatorCell activity={a} /></td>
                  <td className="table-col--meta table-time"><TimestampCell value={a.updatedAt ?? a.createdAt} /></td>
                  <td className="table-actions" onClick={stopRowClick}>
                    <button type="button" className="table-actions__view" onClick={() => onView(a.id)}><IconView />查看</button>
                    <RowActionMenu open={openMenuId === a.id} onToggle={() => setOpenMenuId((id) => (id === a.id ? null : a.id))} onClose={() => setOpenMenuId(null)}>
                      <button type="button" onClick={() => { setLogTarget(a); setOpenMenuId(null) }}>
                        操作日志（{a.operationLogs?.length ?? 0}）
                      </button>
                      {canViewParticipation(a.status) && (
                        <button type="button" onClick={() => { onViewParticipation(a.id); setOpenMenuId(null) }}>参与记录</button>
                      )}
                      {canEdit(a.status) && (
                        <button type="button" onClick={() => { onEdit(a.id); setOpenMenuId(null) }}>
                          {a.status === 'in_progress' ? '编辑（仅展示信息）' : '编辑'}
                        </button>
                      )}
                      <button type="button" onClick={() => { onCopy(a.id); setOpenMenuId(null) }}>复制</button>
                      {canPublish(a.status) && (
                        <button type="button" onClick={() => { onPublish(a.id); setOpenMenuId(null) }}>发布</button>
                      )}
                      {canPause(a.status) && (
                        <button type="button" onClick={() => { setPauseTarget(a); setOpenMenuId(null) }}>暂停活动</button>
                      )}
                      {canResume(a.status) && (
                        <button type="button" onClick={() => { requestResume(a); setOpenMenuId(null) }}>恢复活动</button>
                      )}
                      {a.status === 'paused' && (
                        <div className="row-action-menu__group">
                          <span className="row-action-menu__group-label">演示：设置暂停时长</span>
                          {[0, 12, 25].map((m) => (
                            <button
                              key={m}
                              type="button"
                              className="row-action-menu__sub"
                              onClick={() => { onDemoSetPausedMinutes(a.id, m); setOpenMenuId(null) }}
                            >
                              {m === 0 ? '刚暂停（绿色）' : m === 12 ? '12 分钟前（黄色）' : '25 分钟前（红色）'}
                            </button>
                          ))}
                        </div>
                      )}
                      {canVoid(a.status) && (
                        <button type="button" className="is-danger" onClick={() => { setVoidTarget(a); setOpenMenuId(null) }}>作废</button>
                      )}
                      {canDelete(a.status) && (
                        <button type="button" className="is-danger" onClick={() => { setDeleteTarget(a); setOpenMenuId(null) }}>删除</button>
                      )}
                    </RowActionMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="pagination pagination--full">
        <span>共 {filtered.length} 条{filtered.length > 0 && `，当前第 ${rangeStart}–${rangeEnd} 条`}</span>
        {filtered.length > PAGE_SIZE && (
          <div className="pagination__pages">
            <button type="button" className="page-btn" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>上一页</button>
            <span className="page-indicator">{currentPage} / {totalPages}</span>
            <button type="button" className="page-btn" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>下一页</button>
          </div>
        )}
      </div>

      {pauseTarget && (
        <div className="modal-overlay" onClick={() => setPauseTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h3>暂停活动？</h3></div>
            <div className="modal__body">
              <p>暂停期间持卡顾客暂时无法享受本活动的专属价，已提交的订单不受影响。</p>
              <p>暂停后可修改活动规则，改完请及时点「恢复活动」——超过 {PAUSE_OVERDUE_MINUTES} 分钟未恢复会在列表标记提醒。</p>
            </div>
            <div className="modal__footer">
              <button type="button" className="btn btn--default" onClick={() => setPauseTarget(null)}>取消</button>
              <button type="button" className="btn btn--primary" onClick={() => { onPause(pauseTarget.id); setPauseTarget(null) }}>确认暂停</button>
            </div>
          </div>
        </div>
      )}

      {resumeTarget && (
        <div className="modal-overlay" onClick={() => setResumeTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h3>恢复活动？</h3></div>
            <div className="modal__body">恢复后，持卡顾客将立即重新享受本活动的专属价。</div>
            <div className="modal__footer">
              <button type="button" className="btn btn--default" onClick={() => setResumeTarget(null)}>取消</button>
              <button type="button" className="btn btn--primary" onClick={() => { onResume(resumeTarget.id); setResumeTarget(null) }}>确认恢复</button>
            </div>
          </div>
        </div>
      )}

      {voidTarget && (
        <div className="modal-overlay" onClick={() => setVoidTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h3>作废活动？作废后不可恢复。</h3></div>
            <div className="modal__body">
              {!hasOtherActiveActivity(voidTarget, activities) && (
                <p>
                  本活动是「{getCardBenefitSummary(voidTarget, cards).cardName} · {getCardBenefitSummary(voidTarget, cards).benefitName}」权益的
                  <strong>唯一生效活动</strong>，作废后持卡顾客将永久无法享受该权益，可能引发客诉。
                </p>
              )}
              <p>
                当前约 <strong>{(cardOf(voidTarget)?.holderCount ?? 0).toLocaleString()}</strong> 位有效期内的持卡顾客会受影响。
              </p>
              <p>如果只是想临时改规则，请使用「暂停」；大范围调整请先新建草稿再作废本活动。</p>
            </div>
            <div className="modal__footer">
              <button type="button" className="btn btn--default" onClick={() => setVoidTarget(null)}>取消</button>
              <button type="button" className="btn btn--danger" onClick={() => { onVoid(voidTarget.id); setVoidTarget(null) }}>仍要作废</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h3>删除草稿？</h3></div>
            <div className="modal__body">
              删除后不可恢复。草稿「{deleteTarget.name || '未命名活动'}」尚未对外生效，删除不影响持卡顾客。
            </div>
            <div className="modal__footer">
              <button type="button" className="btn btn--default" onClick={() => setDeleteTarget(null)}>取消</button>
              <button type="button" className="btn btn--danger" onClick={() => { onDelete(deleteTarget.id); setDeleteTarget(null) }}>确认删除</button>
            </div>
          </div>
        </div>
      )}

      {logTarget && <ActivityOperationLogModal activity={logTarget as never} onClose={() => setLogTarget(null)} />}
      {snapshotTarget && (
        <MemberPriceScopeSnapshotModal
          activity={snapshotTarget.activity as never}
          type={snapshotTarget.type}
          onClose={() => setSnapshotTarget(null)}
        />
      )}
    </div>
  )
}

/** 同权益下是否还有其他生效活动，用于作废弹窗的「唯一生效活动」警示 */
function hasOtherActiveActivity(
  target: PaidMemberPriceActivityForm,
  all: PaidMemberPriceActivityForm[],
): boolean {
  return all.some(
    (a) =>
      a.id !== target.id &&
      a.benefitId === target.benefitId &&
      (a.status === 'in_progress' || a.status === 'paused'),
  )
}

function SnapshotLink({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="snapshot-link cell-ellipsis" title={`点击查看快照：${label}`} onClick={onClick}>{label}</button>
}

function CreatorCell({ activity }: { activity: PaidMemberPriceActivityForm }) {
  const { maskedPhone, org } = formatCreatorDisplay(activity)
  return <div className="creator-cell" title={`${maskedPhone} · ${org}`}><div className="creator-cell__phone">{maskedPhone}</div><div className="creator-cell__org">{org}</div></div>
}

function TimestampCell({ value }: { value: string }) {
  const [date, time] = value.split(' ')
  return <div className="timestamp-cell" title={value}><div>{date}</div>{time && <div className="timestamp-cell__time">{time}</div>}</div>
}

function PageHelpButton({ open, onToggle, onClose }: { open: boolean; onToggle: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])
  return (
    <div className="page-help" ref={ref}>
      <button type="button" className={`list-page-header__help ${open ? 'is-active' : ''}`} aria-label="功能说明" onClick={onToggle}><IconHelp /></button>
      {open && (
        <div className="page-help__popover" role="tooltip">
          <p className="page-help__title">付费会员价说明</p>
          <p className="page-help__text">
            与付费权益卡中的付费会员价权益强关联，无活动起止时间。卡上架后「待发布」活动自动生效（草稿不会自动生效）。
            分钟级改规则用暂停；大范围调整请新建草稿配齐后，作废旧活动再发布。
          </p>
        </div>
      )}
    </div>
  )
}

function ChannelChips({ channels }: { channels: string[] }) {
  if (channels.length === 0) return <span className="text-secondary">-</span>
  return (
    <div className="channel-chips">
      {channels.map((id) => {
        const ch = CHANNEL_MAP[id]
        if (!ch) return null
        return <span key={id} className={`channel-chip channel-chip--${id}`}>{ch.icon}</span>
      })}
    </div>
  )
}

function RowActionMenu({ open, onToggle, onClose, children }: { open: boolean; onToggle: () => void; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])
  return (
    <div className="row-action-menu" ref={ref}>
      <button type="button" className="row-action-menu__trigger" onClick={onToggle}>更多<IconChevron /></button>
      {open && <div className="row-action-menu__dropdown" role="menu">{children}</div>}
    </div>
  )
}

function IconChevron() { return <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M3 4.5l3 3 3-3" /></svg> }
function IconPlus() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M8 3v10M3 8h10" /></svg> }
function IconFilter() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><path d="M2 4h12M4 8h8M6 12h4" /></svg> }
function IconReset() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><path d="M3 8a5 5 0 019-2M13 8a5 5 0 01-9 2" /><path d="M12 3v3h-3M4 13v-3h3" /></svg> }
function IconView() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><circle cx="8" cy="8" r="2.5" /><path d="M2 8s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" /></svg> }
function IconHelp() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><circle cx="8" cy="8" r="6" /><path d="M6.2 6a2 2 0 013.5 1.5c0 1.5-2 1.5-2 3M8 12h.01" /></svg> }
function IconCard() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><rect x="2" y="4" width="12" height="8" rx="1.5" /><path d="M2 7h12" /></svg> }
