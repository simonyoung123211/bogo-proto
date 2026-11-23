import { ActivityListTable } from '../components/ActivityListTable'
import { RowActionMenu } from '../components/RowActionMenu'
import { useActivityListClock } from '../utils/activityListTime'
import { ActivityListSearchPanel } from '../components/ActivityListSearchPanel'
import { createAdvancedSearchChips } from '../utils/activitySearchChips'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ActivityOperationLogModal } from '../components/ActivityOperationLogModal'
import { PauseConfirmModal, PauseDemoGroup, ResumeConfirmModal } from '../components/ActivityPauseControls'
import { MORE_STATUS_TABS, PAUSE_OVERDUE_MINUTES, PRIMARY_STATUS_TABS, STATUS_LABELS } from '../mockData'
import type { ActivityStatus, EnterpriseDiscountActivityForm, EnterpriseDiscountListFilters } from '../types'
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
  getProductSummary,
  getStoreSummary,
  matchesFilters,
} from '../utils/enterpriseDiscountActivity'

interface EnterpriseDiscountActivityListProps {
  activities: EnterpriseDiscountActivityForm[]
  onCreate: () => void
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

const EMPTY_FILTERS: EnterpriseDiscountListFilters = {
  keyword: '',
  productName: '',
  productId: '',
  status: 'all',
  startDate: '',
  endDate: '',
}

export function EnterpriseDiscountActivityList({
  activities,
  onCreate,
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
}: EnterpriseDiscountActivityListProps) {
  const [filters, setFilters] = useState<EnterpriseDiscountListFilters>(EMPTY_FILTERS)
  const [pauseTarget, setPauseTarget] = useState<EnterpriseDiscountActivityForm | null>(null)
  const [resumeTarget, setResumeTarget] = useState<EnterpriseDiscountActivityForm | null>(null)
  const [voidTarget, setVoidTarget] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [statusMoreOpen, setStatusMoreOpen] = useState(false)
  const [logTarget, setLogTarget] = useState<EnterpriseDiscountActivityForm | null>(null)
  const now = useActivityListClock(activities)

  const filtered = useMemo(() => activities.filter((activity) => matchesFilters(activity, filters)), [activities, filters])
  const statusCounts = useMemo(() => countActivitiesByStatus(activities, filters), [activities, filters])
  const overdueCount = countOverduePaused(activities, now)
  const isMoreStatusActive = MORE_STATUS_TABS.includes(filters.status as ActivityStatus)

  const setStatusTab = (status: ActivityStatus | 'all') => {
    setFilters((current) => ({ ...current, status }))
    setStatusMoreOpen(false)
  }

  const canEdit = (status: ActivityStatus) => ['draft', 'pending', 'not_started', 'in_progress', 'paused'].includes(status)
  const canPublish = (status: ActivityStatus) => ['draft', 'pending'].includes(status)
  const canVoid = (status: ActivityStatus) => ['pending', 'not_started', 'in_progress', 'paused'].includes(status)
  const canDelete = (status: ActivityStatus) => status === 'draft'

  return (
    <div className="page-card page-card--list">
      {overdueCount > 0 && (
        <div className="list-alert">
          有 {overdueCount} 个企业员工折扣活动暂停超过 {PAUSE_OVERDUE_MINUTES} 分钟未恢复，企业员工暂时无法享受折扣
        </div>
      )}

      <header className="list-page-header list-page-header--compact">
        <div className="list-page-header__main">
          <h1 className="list-page-header__title">企业员工折扣</h1>
          <p className="text-secondary">为企业客户的员工配置专属折扣。门店与商品范围的配置方式与满减一致。</p>
        </div>
        <div className="list-page-header__actions">
          <button type="button" className="btn btn--primary btn--icon" onClick={onCreate}>新建活动</button>
        </div>
      </header>

      <div className="list-chrome">
        <div className="status-tabs status-tabs--pill">
          {PRIMARY_STATUS_TABS.map((status) => (
            <button
              key={status}
              type="button"
              className={`status-tab ${filters.status === status ? 'is-active' : ''}`}
              onClick={() => setStatusTab(status)}
            >
              {STATUS_LABELS[status]}
              <span className="status-tab__count">{statusCounts[status]}</span>
            </button>
          ))}
          <StatusMoreMenu
            open={statusMoreOpen}
            active={isMoreStatusActive}
            activeLabel={isMoreStatusActive ? STATUS_LABELS[filters.status] : '更多状态'}
            onToggle={() => setStatusMoreOpen((open) => !open)}
            onClose={() => setStatusMoreOpen(false)}
          >
            {MORE_STATUS_TABS.map((status) => (
              <button key={status} type="button" className={filters.status === status ? 'is-active' : ''} onClick={() => setStatusTab(status)}>
                {STATUS_LABELS[status]}
                <span className="status-more-menu__count">{statusCounts[status]}</span>
              </button>
            ))}
          </StatusMoreMenu>
        </div>

        <ActivityListSearchPanel
          values={filters}
          resultCount={filtered.length}
          onChange={(field, value) => setFilters((current) => ({ ...current, [field]: value }))}
          onReset={() => setFilters(EMPTY_FILTERS)}
          advancedFilters={createAdvancedSearchChips(filters, EMPTY_FILTERS, [{ key: 'startDate', label: '开始日期' }, { key: 'endDate', label: '结束日期' }], (patch) => setFilters((current) => ({ ...current, ...patch })))}
          keywordLabel="活动名称 / ID / 企业"
          keywordPlaceholder="搜索活动名称、ID 或企业名称"
          advancedFields={<>
            <div className="filter-item activity-search-panel__dates"><label>活动时间</label><div className="date-range"><input aria-label="活动开始日期" type="date" className="input input--filter" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} /><span>至</span><input aria-label="活动结束日期" type="date" className="input input--filter" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} /></div></div>
          </>}
        />
      </div>

      <ActivityListTable
        activities={filtered}
        now={now}
        onToast={onToast}
        extraColumns={['企业折扣']}
        empty={(
          <div className="table-empty-state">
            <p className="table-empty-state__title">暂无活动</p>
            <p className="table-empty-state__desc">调整筛选条件，或新建一个企业员工折扣活动</p>
          </div>
        )}
        renderFields={(activity) => ({
          summary: formatRuleSummary(activity),
          products: getProductSummary(activity),
          stores: getStoreSummary(activity),
          audience: '指定企业员工',
          extra: {
            '企业折扣': (
              <>
                {activity.enterprises.length}
                家企业
              </>
            ),
          },
          actions: (
            <>
              <button type="button" className="table-actions__view" onClick={() => onView(activity.id)}>查看</button>
              <RowActionMenu
                open={openMenuId === activity.id}
                onToggle={() => setOpenMenuId((id) => (id === activity.id ? null : activity.id))}
                onClose={() => setOpenMenuId(null)}
              >
                <button type="button" onClick={() => { setLogTarget(activity); setOpenMenuId(null) }}>
                  操作日志（{activity.operationLogs?.length ?? 0}）
                </button>
                {['not_started', 'in_progress', 'paused', 'ended', 'voided'].includes(activity.status) && (
                  <button type="button" onClick={() => { onViewParticipation(activity.id); setOpenMenuId(null) }}>参与记录</button>
                )}
                {canEdit(activity.status) && <button type="button" onClick={() => { onEdit(activity.id); setOpenMenuId(null) }}>编辑</button>}
                <button type="button" onClick={() => { onCopy(activity.id); setOpenMenuId(null) }}>复制</button>
                {canPublish(activity.status) && <button type="button" onClick={() => { onPublish(activity.id); setOpenMenuId(null) }}>发布</button>}
                {canPause(activity.status) && (
                  <button type="button" onClick={() => {
                    if (isExpired(activity, now)) {
                      onToast?.('该活动已过结束时间，无需暂停')
                      return
                    }
                    setPauseTarget(activity)
                    setOpenMenuId(null)
                  }}>暂停活动</button>
                )}
                {canResume(activity.status) && (
                  <button type="button" onClick={() => { setResumeTarget(activity); setOpenMenuId(null) }}>恢复活动</button>
                )}
                {activity.status === 'paused' && (
                  <PauseDemoGroup onPick={(minutes) => { onDemoSetPausedMinutes(activity.id, minutes); setOpenMenuId(null) }} />
                )}
                {canVoid(activity.status) && <button type="button" className="is-danger" onClick={() => { setVoidTarget(activity.id); setOpenMenuId(null) }}>作废</button>}
                {canDelete(activity.status) && <button type="button" className="is-danger" onClick={() => { setDeleteTarget(activity.id); setOpenMenuId(null) }}>删除</button>}
              </RowActionMenu>
            </>
          ),
        })}
      />

      <div className="pagination pagination--full">
        <span>共 {filtered.length} 条</span>
      </div>

      {pauseTarget && (
        <PauseConfirmModal
          impact="企业员工暂时无法享受本活动折扣"
          onCancel={() => setPauseTarget(null)}
          onConfirm={() => { onPause(pauseTarget.id); setPauseTarget(null) }}
        />
      )}
      {resumeTarget && (
        <ResumeConfirmModal
          effect="企业员工将立即重新享受本活动折扣"
          willEnd={resolveResumeStatus(resumeTarget, now) === 'ended'}
          onCancel={() => setResumeTarget(null)}
          onConfirm={() => { onResume(resumeTarget.id); setResumeTarget(null) }}
        />
      )}
      {voidTarget && (
        <ConfirmDialog title="确认作废" body="作废后活动将不可恢复，确定要作废该活动吗？" confirmLabel="确认作废" danger onCancel={() => setVoidTarget(null)} onConfirm={() => { onVoid(voidTarget); setVoidTarget(null) }} />
      )}
      {deleteTarget && (
        <ConfirmDialog title="确认删除" body="删除后草稿将不可恢复，确定要删除该活动吗？" confirmLabel="确认删除" danger onCancel={() => setDeleteTarget(null)} onConfirm={() => { onDelete(deleteTarget); setDeleteTarget(null) }} />
      )}
      {logTarget && <ActivityOperationLogModal activity={logTarget as never} onClose={() => setLogTarget(null)} />}
    </div>
  )
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal--sm" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header"><h3>{title}</h3></div>
        <div className="modal__body">{body}</div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onCancel}>取消</button>
          <button type="button" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

function StatusMoreMenu({
  open,
  active,
  activeLabel,
  onToggle,
  onClose,
  children,
}: {
  open: boolean
  active: boolean
  activeLabel: string
  onToggle: () => void
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])
  return (
    <div className="status-more-menu" ref={ref}>
      <button type="button" className={`status-tab status-tab--more ${active ? 'is-active' : ''}`} onClick={onToggle}>
        {activeLabel}
      </button>
      {open && <div className="status-more-menu__dropdown" role="menu">{children}</div>}
    </div>
  )
}
