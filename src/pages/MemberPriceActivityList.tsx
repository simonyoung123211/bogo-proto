import { ActivityListTable, ActivityScopeLink as SnapshotLink } from '../components/ActivityListTable'
import { RowActionMenu } from '../components/RowActionMenu'
import { useActivityListClock } from '../utils/activityListTime'
import { ActivityListSearchPanel } from '../components/ActivityListSearchPanel'
import { createAdvancedSearchChips } from '../utils/activitySearchChips'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ActivityOperationLogModal } from '../components/ActivityOperationLogModal'
import { PauseConfirmModal, PauseDemoGroup, ResumeConfirmModal } from '../components/ActivityPauseControls'
import { MemberPriceScopeSnapshotModal, type MemberPriceScopeSnapshotType } from '../components/MemberPriceScopeSnapshotModal'
import { MEMBER_LEVELS, MORE_STATUS_TABS, PAUSE_OVERDUE_MINUTES, PRIMARY_STATUS_TABS, STATUS_LABELS } from '../mockData'
import { MEMBER_PRICE_METHOD_LABELS } from '../mockMemberPriceData'
import type { ActivityStatus, MemberPriceActivityForm, MemberPriceListFilters, MemberPriceMethod } from '../types'
import {
  canPause,
  canResume,
  countOverduePaused,
  isExpired,
  resolveResumeStatus,
} from '../utils/activityPause'
import {
  countActivitiesByStatus,
  formatRuleSummary,
  getMemberPriceAudienceShortLabel,
  getMemberPriceAudienceTargetLabels,
  getProductCount,
  getProductSummary,
  getStoreSummary,
  matchesFilters,
  needsMemberPriceTargets,
} from '../utils/memberPriceActivity'

interface MemberPriceActivityListProps {
  activities: MemberPriceActivityForm[]
  onCreate: () => void
  onOpenSettings: () => void
  onView: (id: string) => void
  onViewParticipation: (id: string) => void
  onEdit: (id: string) => void
  onCopy: (id: string) => void
  onPublish: (id: string) => void
  onPause: (id: string) => void
  onResume: (id: string) => void
  onDemoSetPausedMinutes: (id: string, minutes: number) => void
  onVoid: (id: string) => void
  onDelete: (id: string) => void
  onToast?: (message: string) => void
}

const EMPTY_FILTERS: MemberPriceListFilters = {
  keyword: '',
  productName: '',
  productId: '',
  activityCode: '',
  status: 'all',
  priceMethod: 'all',
  memberLevel: 'all',
  startDate: '',
  endDate: '',
  storeId: 'all',
}
const PAGE_SIZE = 10

export function MemberPriceActivityList({
  activities,
  onCreate,
  onOpenSettings,
  onView,
  onViewParticipation,
  onEdit,
  onCopy,
  onPublish,
  onPause,
  onResume,
  onDemoSetPausedMinutes,
  onVoid,
  onDelete,
  onToast,
}: MemberPriceActivityListProps) {
  const [filters, setFilters] = useState<MemberPriceListFilters>(EMPTY_FILTERS)
  const [pauseTarget, setPauseTarget] = useState<MemberPriceActivityForm | null>(null)
  const [resumeTarget, setResumeTarget] = useState<MemberPriceActivityForm | null>(null)
  const [voidTarget, setVoidTarget] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [statusMoreOpen, setStatusMoreOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [logTarget, setLogTarget] = useState<MemberPriceActivityForm | null>(null)
  const [snapshotTarget, setSnapshotTarget] = useState<{ activity: MemberPriceActivityForm; type: MemberPriceScopeSnapshotType } | null>(null)
  const [page, setPage] = useState(1)
  const [enableRowAnim, setEnableRowAnim] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setEnableRowAnim(false), 500)
    return () => window.clearTimeout(timer)
  }, [])
  const now = useActivityListClock(activities)
  const overdueCount = countOverduePaused(activities, now)

  const filtered = useMemo(() => activities.filter((a) => matchesFilters(a, filters)), [activities, filters])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length)

  useEffect(() => { setPage(1) }, [filters])

  const statusCounts = useMemo(() => countActivitiesByStatus(activities, filters), [activities, filters])

  const isMoreStatusActive = MORE_STATUS_TABS.includes(filters.status as ActivityStatus)

  const setStatusTab = (status: ActivityStatus | 'all') => {
    setFilters((f) => ({ ...f, status }))
    setStatusMoreOpen(false)
  }

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS)
  }
  const canEdit = (s: ActivityStatus) => ['draft', 'pending', 'not_started', 'in_progress', 'paused'].includes(s)
  const canPublish = (s: ActivityStatus) => ['draft', 'pending'].includes(s)
  const canVoid = (s: ActivityStatus) => ['pending', 'not_started', 'in_progress', 'paused'].includes(s)
  const canDelete = (s: ActivityStatus) => s === 'draft'

  // 已过结束时间的活动没有暂停的意义，暂停后会立刻被判定为已结束
  const requestPause = (activity: MemberPriceActivityForm) => {
    if (isExpired(activity, now)) {
      onToast?.('该活动已过结束时间，无需暂停')
      return
    }
    setPauseTarget(activity)
  }

  // 暂停期间活动时间照常走，恢复时按当前时刻重新落状态
  const requestResume = (activity: MemberPriceActivityForm) => {
    if (resolveResumeStatus(activity, Date.now()) === 'ended') {
      onToast?.('该活动已过结束时间，恢复后将直接标记为已结束')
    }
    setResumeTarget(activity)
  }

  return (
    <div className="page-card page-card--list">
      <div className="list-info-banner">
        不同等级会员购买指定商品时可享受专享折扣、减价或固定价格，如 VIP 会员 8 折。
        <button type="button" className="link-btn">了解更多</button>
      </div>

      {overdueCount > 0 && (
        <div className="alert-banner alert-banner--danger">
          <span className="alert-banner__icon">!</span>
          <span>
            有 {overdueCount} 个会员价活动暂停超过 {PAUSE_OVERDUE_MINUTES} 分钟未恢复，会员暂时无法享受专享价
          </span>
          <button type="button" className="link-btn" onClick={() => setFilters((f) => ({ ...f, status: 'paused' }))}>
            查看这些活动
          </button>
        </div>
      )}

      <header className="list-page-header list-page-header--compact">
        <div className="list-page-header__main">
          <div className="list-page-header__title-row">
            <h1 className="list-page-header__title">会员价</h1>
            <PageHelpButton open={helpOpen} onToggle={() => setHelpOpen((v) => !v)} onClose={() => setHelpOpen(false)} />
          </div>
        </div>
        <div className="list-page-header__actions">
          <button type="button" className="btn btn--default btn--icon" onClick={onOpenSettings}>
            <IconSettings />
            通用设置
          </button>
          <button type="button" className="btn btn--primary btn--icon" onClick={onCreate}>
            <IconPlus />
            新建活动
          </button>
        </div>
      </header>

      <div className="list-chrome">
        <div className="status-tabs status-tabs--pill">
          {PRIMARY_STATUS_TABS.map((s) => (
            <button key={s} type="button" className={`status-tab ${filters.status === s ? 'is-active' : ''}`} onClick={() => setStatusTab(s)}>
              {STATUS_LABELS[s]}
              <span className="status-tab__count">{statusCounts[s]}</span>
            </button>
          ))}
          <StatusMoreMenu
            open={statusMoreOpen}
            active={isMoreStatusActive}
            activeLabel={isMoreStatusActive ? STATUS_LABELS[filters.status] : '更多状态'}
            activeCount={isMoreStatusActive ? statusCounts[filters.status as ActivityStatus] : undefined}
            onToggle={() => setStatusMoreOpen((v) => !v)}
            onClose={() => setStatusMoreOpen(false)}
          >
            {MORE_STATUS_TABS.map((s) => (
              <button key={s} type="button" className={filters.status === s ? 'is-active' : ''} onClick={() => setStatusTab(s)}>
                {STATUS_LABELS[s]}
                <span className="status-more-menu__count">{statusCounts[s]}</span>
              </button>
            ))}
          </StatusMoreMenu>
        </div>

        <ActivityListSearchPanel
          values={filters}
          resultCount={filtered.length}
          onChange={(field, value) => setFilters((current) => ({ ...current, [field]: value }))}
          onReset={resetFilters}
          advancedFilters={createAdvancedSearchChips(filters, EMPTY_FILTERS, [{ key: 'priceMethod', label: '会员价形式', options: MEMBER_PRICE_METHOD_LABELS }, { key: 'memberLevel', label: '会员等级', options: Object.fromEntries(MEMBER_LEVELS.map((level) => [level.id, level.label])) }, { key: 'startDate', label: '开始日期' }, { key: 'endDate', label: '结束日期' }, { key: 'activityCode', label: '活动编码' }], (patch) => setFilters((current) => ({ ...current, ...patch })))}
          advancedFields={<>
            <div className="filter-item">
              <label>会员价形式</label>
              <select aria-label="会员价形式"
                className="input input--filter"
                value={filters.priceMethod}
                onChange={(e) => setFilters((f) => ({ ...f, priceMethod: e.target.value as MemberPriceListFilters['priceMethod'] }))}
              >
                <option value="all">全部</option>
                {(Object.keys(MEMBER_PRICE_METHOD_LABELS) as MemberPriceMethod[]).map((m) => (
                  <option key={m} value={m}>{MEMBER_PRICE_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </div>
            <div className="filter-item">
              <label>会员等级</label>
              <select aria-label="会员等级"
                className="input input--filter"
                value={filters.memberLevel}
                onChange={(e) => setFilters((f) => ({ ...f, memberLevel: e.target.value as MemberPriceListFilters['memberLevel'] }))}
              >
                <option value="all">全部</option>
                {MEMBER_LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>
            <div className="filter-item activity-search-panel__dates">
              <label>活动时间</label>
              <div className="date-range">
                <input aria-label="活动开始日期" type="date" className="input input--filter" value={filters.startDate} onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))} />
                <span>至</span>
                <input aria-label="活动结束日期" type="date" className="input input--filter" value={filters.endDate} onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="filter-item">
                <label>活动编码</label>
                <input aria-label="活动编码" className="input input--filter" value={filters.activityCode} onChange={(e) => setFilters((f) => ({ ...f, activityCode: e.target.value }))} placeholder="请输入活动编码" />
              </div>
          </>}
        />
      </div>

      <ActivityListTable
        activities={pageRows}
        now={now}
        onToast={onToast}
        onRowClick={onView}
        animated={enableRowAnim}
        extraColumns={['优惠形式']}
        empty={(
          <div className="table-empty-state">
            <p className="table-empty-state__title">暂无活动</p>
            <p className="table-empty-state__desc">调整筛选条件，或新建一个会员价活动</p>
            <button type="button" className="btn btn--primary btn--icon" onClick={onCreate}><IconPlus />新建活动</button>
          </div>
        )}
        renderFields={(a) => ({
          summary: formatRuleSummary(a),
          products: (
            <>
              <SnapshotLink label={`${getProductCount(a)}`} onClick={() => setSnapshotTarget({ activity: a, type: 'products' })} />
              <div className="text-secondary" style={{ fontSize: 12 }}>{getProductSummary(a)}</div>
            </>
          ),
          stores: <SnapshotLink label={getStoreSummary(a)} onClick={() => setSnapshotTarget({ activity: a, type: 'stores' })} />,
          audience: <MemberAudienceCell activity={a} />,
          extra: {
            '优惠形式': <span className={`rule-tag rule-tag--member-${a.priceMethod}`}>{MEMBER_PRICE_METHOD_LABELS[a.priceMethod]}</span>,
          },
          actions: (
            <>
              <button type="button" className="table-actions__view" onClick={() => onView(a.id)}><IconView />查看</button>
              <RowActionMenu open={openMenuId === a.id} onToggle={() => setOpenMenuId((id) => (id === a.id ? null : a.id))} onClose={() => setOpenMenuId(null)}>
                <button type="button" onClick={() => { setLogTarget(a); setOpenMenuId(null) }}>
                  操作日志（{a.operationLogs?.length ?? 0}）
                </button>
                {['not_started', 'in_progress', 'paused', 'ended', 'voided'].includes(a.status) && (
                  <button type="button" onClick={() => { onViewParticipation(a.id); setOpenMenuId(null) }}>参与记录</button>
                )}
                {canEdit(a.status) && <button type="button" onClick={() => { onEdit(a.id); setOpenMenuId(null) }}>编辑</button>}
                <button type="button" onClick={() => { onCopy(a.id); setOpenMenuId(null) }}>复制</button>
                {canPublish(a.status) && <button type="button" onClick={() => { onPublish(a.id); setOpenMenuId(null) }}>发布</button>}
                {canPause(a.status) && (
                  <button type="button" onClick={() => { requestPause(a); setOpenMenuId(null) }}>暂停活动</button>
                )}
                {canResume(a.status) && (
                  <button type="button" onClick={() => { requestResume(a); setOpenMenuId(null) }}>恢复活动</button>
                )}
                {a.status === 'paused' && (
                  <PauseDemoGroup onPick={(m) => { onDemoSetPausedMinutes(a.id, m); setOpenMenuId(null) }} />
                )}
                {canVoid(a.status) && <button type="button" className="is-danger" onClick={() => { setVoidTarget(a.id); setOpenMenuId(null) }}>作废</button>}
                {canDelete(a.status) && <button type="button" className="is-danger" onClick={() => { setDeleteTarget(a.id); setOpenMenuId(null) }}>删除</button>}
              </RowActionMenu>
            </>
          ),
        })}
      />

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
        <PauseConfirmModal
          impact="会员暂时无法享受本活动的专享价"
          onCancel={() => setPauseTarget(null)}
          onConfirm={() => { onPause(pauseTarget.id); setPauseTarget(null) }}
        />
      )}

      {resumeTarget && (
        <ResumeConfirmModal
          effect="会员将立即重新享受本活动的专享价"
          willEnd={resolveResumeStatus(resumeTarget, now) === 'ended'}
          onCancel={() => setResumeTarget(null)}
          onConfirm={() => { onResume(resumeTarget.id); setResumeTarget(null) }}
        />
      )}

      {voidTarget && (
        <div className="modal-overlay" onClick={() => setVoidTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h3>确认作废</h3></div>
            <div className="modal__body">作废后活动将不可恢复，确定要作废该活动吗？</div>
            <div className="modal__footer">
              <button type="button" className="btn btn--default" onClick={() => setVoidTarget(null)}>取消</button>
              <button type="button" className="btn btn--danger" onClick={() => { onVoid(voidTarget); setVoidTarget(null) }}>确认作废</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h3>确认删除</h3></div>
            <div className="modal__body">删除后草稿将不可恢复，确定要删除该活动吗？</div>
            <div className="modal__footer">
              <button type="button" className="btn btn--default" onClick={() => setDeleteTarget(null)}>取消</button>
              <button type="button" className="btn btn--danger" onClick={() => { onDelete(deleteTarget); setDeleteTarget(null) }}>确认删除</button>
            </div>
          </div>
        </div>
      )}

      {logTarget && <ActivityOperationLogModal activity={logTarget as never} onClose={() => setLogTarget(null)} />}
      {snapshotTarget && <MemberPriceScopeSnapshotModal activity={snapshotTarget.activity} type={snapshotTarget.type} onClose={() => setSnapshotTarget(null)} />}
    </div>
  )
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
          <p className="page-help__title">会员价说明</p>
          <p className="page-help__text">面向不同会员等级配置专享价，支持折扣、减价、固定价格三种形式，并可按商品设置默认力度，再为个别业务单独设置。</p>
        </div>
      )}
    </div>
  )
}

const MEMBER_AUDIENCE_VISIBLE = 2

function MemberAudienceCell({ activity }: { activity: MemberPriceActivityForm }) {
  const audienceType = activity.audienceType ?? 'specified_level'
  const shortType = getMemberPriceAudienceShortLabel(audienceType)
  const needsTargets = needsMemberPriceTargets(audienceType)
  const labels = getMemberPriceAudienceTargetLabels(activity)
  const visible = labels.slice(0, MEMBER_AUDIENCE_VISIBLE)
  const rest = Math.max(0, labels.length - visible.length)
  const fullTargets = labels.join('、')
  const title = !needsTargets
    ? shortType
    : labels.length === 0
      ? `${shortType} · 未选择`
      : `${shortType}：${fullTargets}`

  if (!needsTargets) {
    return (
      <div className="member-audience-cell" title={title}>
        <span className="member-audience-cell__single">{shortType}</span>
      </div>
    )
  }

  return (
    <div className="member-audience-cell" title={title}>
      <div className="member-audience-cell__type">{shortType}</div>
      <div className="member-audience-cell__targets">
        {labels.length === 0 ? (
          <span className="member-audience-cell__empty">未选择</span>
        ) : (
          <>
            <span className="member-audience-cell__text">{visible.join('、')}</span>
            {rest > 0 && <span className="member-audience-cell__more">+{rest}</span>}
          </>
        )}
      </div>
    </div>
  )
}

function StatusMoreMenu({ open, active, activeLabel, activeCount, onToggle, onClose, children }: {
  open: boolean; active: boolean; activeLabel: string; activeCount?: number; onToggle: () => void; onClose: () => void; children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])
  return (
    <div className="status-more-menu" ref={ref}>
      <button type="button" className={`status-tab status-tab--more ${active ? 'is-active' : ''}`} onClick={onToggle}>
        {activeLabel}{activeCount !== undefined && <span className="status-tab__count">{activeCount}</span>}<IconChevron />
      </button>
      {open && <div className="status-more-menu__dropdown" role="menu">{children}</div>}
    </div>
  )
}

function IconChevron() { return <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M3 4.5l3 3 3-3" /></svg> }
function IconPlus() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M8 3v10M3 8h10" /></svg> }
function IconView() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><circle cx="8" cy="8" r="2.5" /><path d="M2 8s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" /></svg> }
function IconHelp() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><circle cx="8" cy="8" r="6" /><path d="M6.2 6a2 2 0 013.5 1.5c0 1.5-2 1.5-2 3M8 12h.01" /></svg> }
function IconSettings() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><circle cx="8" cy="8" r="2.2" /><path d="M6.7 2.3l.5-1h1.6l.5 1 1 .4 1.1-.3 1.1 1.1-.3 1.1.4 1 .9.5v1.6l-.9.5-.4 1 .3 1.1-1.1 1.1-1.1-.3-1 .4-.5 1H7.2l-.5-1-1-.4-1.1.3-1.1-1.1.3-1.1-.4-1-.9-.5V6.1l.9-.5.4-1-.3-1.1 1.1-1.1 1.1.3 1-.4z" /></svg> }
