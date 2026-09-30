import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ActivityOperationLogModal } from '../components/ActivityOperationLogModal'
import { PauseConfirmModal, PauseDemoGroup, ResumeConfirmModal } from '../components/ActivityPauseControls'
import { CHANNELS, MORE_STATUS_TABS, PAUSE_OVERDUE_MINUTES, PRIMARY_STATUS_TABS, STATUS_LABELS } from '../mockData'
import type { ActivityStatus, EnterpriseDiscountActivityForm, EnterpriseDiscountListFilters } from '../types'
import {
  canPause,
  canResume,
  countOverduePaused,
  getPauseInfo,
  isEndedWhilePaused,
  isExpired,
  resolveResumeStatus,
} from '../utils/activityPause'
import {
  countActivitiesByStatus,
  formatCreatorDisplay,
  formatRuleSummary,
  getActivityRemainingLabel,
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
  status: 'all',
  startDate: '',
  endDate: '',
}

const CHANNEL_MAP = Object.fromEntries(CHANNELS.map((channel) => [channel.id, channel]))

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
  const hasPaused = activities.some((activity) => activity.status === 'paused')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!hasPaused) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [hasPaused])

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

        <div className="list-toolbar">
          <div className="list-toolbar__fields">
            <div className="filter-item">
              <label>活动名称/企业</label>
              <input
                className="input"
                placeholder="请输入活动名称、ID 或企业名称"
                value={filters.keyword}
                onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
              />
            </div>
          </div>
          <button type="button" className="btn btn--default" onClick={() => setFilters(EMPTY_FILTERS)}>重置</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>活动名称</th>
              <th>企业折扣</th>
              <th>参与商品</th>
              <th>参与门店</th>
              <th>活动时间</th>
              <th>投放渠道</th>
              <th>状态</th>
              <th>创建者</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <div className="table-empty-state">
                    <p className="table-empty-state__title">暂无活动</p>
                    <p className="table-empty-state__desc">调整筛选条件，或新建一个企业员工折扣活动</p>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map((activity) => {
              const pauseInfo = getPauseInfo(activity, now)
              const remaining = getActivityRemainingLabel(activity)
              const creator = formatCreatorDisplay(activity)
              return (
                <tr key={activity.id}>
                  <td>
                    <div className="activity-name-cell">
                      <div className="activity-name-cell__name">{activity.name || '未命名活动'}</div>
                      <div className="activity-name-cell__rule">{formatRuleSummary(activity)}</div>
                      <button
                        type="button"
                        className="activity-name-cell__id"
                        onClick={async (event) => {
                          event.stopPropagation()
                          try {
                            await navigator.clipboard.writeText(activity.id)
                            onToast?.('活动 ID 已复制')
                          } catch {
                            onToast?.('复制失败，请手动复制')
                          }
                        }}
                      >
                        {activity.id}
                      </button>
                    </div>
                  </td>
                  <td>{activity.enterprises.length} 家企业</td>
                  <td>{getProductSummary(activity)}</td>
                  <td>{getStoreSummary(activity)}</td>
                  <td className="table-time">
                    <div><span className="table-time__label">起</span>{activity.startTime}</div>
                    <div><span className="table-time__label">止</span>{activity.endTime}</div>
                    {remaining && <span className="time-remaining">{remaining}</span>}
                  </td>
                  <td>
                    {activity.channels.map((id) => (
                      <span key={id} className="channel-chip" title={CHANNEL_MAP[id]?.label}>{CHANNEL_MAP[id]?.icon ?? id.slice(0, 1)}</span>
                    ))}
                  </td>
                  <td>
                    <div className="status-cell">
                      <span className={`status-badge status-badge--dot status-badge--${activity.status}`}>{STATUS_LABELS[activity.status]}</span>
                      {pauseInfo && <span className={`pause-timer pause-timer--${pauseInfo.level}`}>{pauseInfo.label}</span>}
                      {isEndedWhilePaused(activity) && <span className="status-cell__hint">暂停中到期结束</span>}
                    </div>
                  </td>
                  <td>
                    <div>{creator.maskedPhone}</div>
                    <div className="text-secondary">{creator.org}</div>
                  </td>
                  <td className="table-actions" onClick={(event) => event.stopPropagation()}>
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
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

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

function RowActionMenu({
  open,
  onToggle,
  onClose,
  children,
}: {
  open: boolean
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
    <div className="row-action-menu" ref={ref}>
      <button type="button" className="row-action-menu__trigger" onClick={onToggle}>更多</button>
      {open && <div className="row-action-menu__dropdown" role="menu">{children}</div>}
    </div>
  )
}
