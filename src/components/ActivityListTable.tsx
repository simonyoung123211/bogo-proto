import type { ReactNode } from 'react'
import { CHANNELS, STATUS_LABELS } from '../mockData'
import type { ActivityForm, ActivityStatus } from '../types'
import { formatCreatorDisplay } from '../utils/activity'
import { getActivityExpiryReminder } from '../utils/activityListTime'
import { getPauseInfo, isEndedWhilePaused } from '../utils/activityPause'

interface ListActivity extends Pick<ActivityForm, 'id' | 'name' | 'channels' | 'creator' | 'creatorPhone' | 'creatorOrg'> {
  status: ActivityStatus
  startTime?: string
  endTime?: string
  createdAt?: string
  updatedAt?: string
  pausedAt?: string
}

interface RowFields {
  summary?: ReactNode
  products: ReactNode
  stores: ReactNode
  audience: ReactNode
  statusHint?: ReactNode
  extra?: Record<string, ReactNode>
  actions: ReactNode
}

interface ChannelOption {
  id: string
  label: string
  icon: string
}

interface ActivityListTableProps<T extends ListActivity> {
  activities: readonly T[]
  now: number
  renderFields: (activity: T) => RowFields
  empty: ReactNode
  extraColumns?: readonly string[]
  animated?: boolean
  inheritedTime?: string
  channelOptions?: readonly ChannelOption[]
  onRowClick?: (id: string) => void
  onToast?: (message: string) => void
}

const MAIN_COLUMNS = ['活动名称', '状态', '活动时间', '参与商品', '参与门店', '参与渠道', '适用人群']
const CREATION_COLUMNS = ['创建方', '创建时间', '更新时间']

export function ActivityListTable<T extends ListActivity>({
  activities, now, renderFields, empty, extraColumns = [], animated, inheritedTime,
  channelOptions = CHANNELS, onRowClick, onToast,
}: ActivityListTableProps<T>) {
  const columns = [...MAIN_COLUMNS, ...extraColumns, ...CREATION_COLUMNS]
  return (
    <div className="table-wrap table-wrap--list" role="region" aria-label="活动列表" tabIndex={0}>
      <table className="table table--list table--activity activity-list-table">
        <thead>
          <tr>
            {columns.map((column) => <th scope="col" key={column}>{column}</th>)}
            <th scope="col" className="activity-list-table__actions">操作</th>
          </tr>
        </thead>
        <tbody className={animated ? 'table--animate-in' : undefined}>
          {activities.length === 0 ? <tr><td colSpan={columns.length + 1}>{empty}</td></tr> : activities.map((activity, index) => {
            const fields = renderFields(activity)
            return (
              <tr key={activity.id} className={`table-row--status-${activity.status}${onRowClick ? ' table-row--clickable' : ''}`}
                style={animated ? { animationDelay: `${Math.min(index, 12) * 30}ms` } : undefined}
                onClick={onRowClick ? () => onRowClick(activity.id) : undefined}>
                <td>
                  <div className="activity-name-cell">
                    <div className="activity-name-cell__top"><span className="activity-name-cell__name">{activity.name || '未命名活动'}</span></div>
                    {fields.summary && <div className="activity-name-cell__rule">{fields.summary}</div>}
                    <button type="button" className="activity-name-cell__id" title="点击复制活动 ID" onClick={async (event) => {
                      event.stopPropagation()
                      try {
                        await navigator.clipboard.writeText(activity.id)
                        onToast?.('活动 ID 已复制')
                      } catch {
                        onToast?.('复制失败，请手动复制')
                      }
                    }}>{activity.id}</button>
                  </div>
                </td>
                <td><ActivityStatusCell activity={activity} now={now} hint={fields.statusHint} /></td>
                <td className="table-time"><ActivityTimeCell activity={activity} now={now} inheritedTime={inheritedTime} /></td>
                <td className="activity-list-table__scope">{fields.products}</td>
                <td className="activity-list-table__scope">{fields.stores}</td>
                <td onClick={(event) => event.stopPropagation()}><ActivityChannels channels={activity.channels} options={channelOptions} /></td>
                <td className="activity-list-table__audience">{fields.audience}</td>
                {extraColumns.map((column) => <td key={column}>{fields.extra?.[column] ?? '—'}</td>)}
                <td><CreatorCell activity={activity} /></td>
                <td><TimestampCell value={activity.createdAt} /></td>
                <td><TimestampCell value={activity.updatedAt || activity.createdAt} /></td>
                <td className="activity-list-table__actions" onClick={(event) => event.stopPropagation()}>
                  <div className="table-actions">{fields.actions}</div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ActivityTimeCell({ activity, now, inheritedTime }: { activity: ListActivity; now: number; inheritedTime?: string }) {
  if (inheritedTime) return <span>{inheritedTime}</span>
  const reminder = getActivityExpiryReminder(activity, now)
  return (
    <>
      <div><span className="table-time__label">起</span>{activity.startTime || '—'}</div>
      <div className="activity-list-time__end">
        <span><span className="table-time__label">止</span>{activity.endTime || '—'}</span>
        {reminder && <span className={`activity-expiry-reminder activity-expiry-reminder--${reminder.level}`}>{reminder.label}</span>}
      </div>
    </>
  )
}

function ActivityStatusCell({ activity, now, hint }: { activity: ListActivity; now: number; hint?: ReactNode }) {
  const pauseInfo = getPauseInfo(activity, now)
  return (
    <div className="status-cell">
      <span className={`status-badge status-badge--dot status-badge--${activity.status}`}>{STATUS_LABELS[activity.status]}</span>
      {hint && <span className="status-cell__hint">{hint}</span>}
      {pauseInfo && <span className={`pause-timer pause-timer--${pauseInfo.level}`} title={pauseInfo.label}>{pauseInfo.label}</span>}
      {isEndedWhilePaused(activity) && <span className="status-cell__hint">暂停中到期结束</span>}
    </div>
  )
}

function ActivityChannels({ channels, options }: { channels: readonly string[]; options: readonly ChannelOption[] }) {
  const selected = channels.map((id) => options.find((option) => option.id === id) ?? { id, label: id, icon: id.slice(0, 1) })
  if (selected.length === 0) return <span className="text-secondary">—</span>
  const label = selected.map((channel) => channel.label).join('、')
  return (
    <div title={label}>
      <div className="channel-chips" aria-hidden="true">
        {selected.map((channel) => <span key={channel.id} className={`channel-chip channel-chip--${channel.id}`}>{channel.icon}</span>)}
      </div>
      <div className="text-secondary">
        {selected.map((channel, index) => (
          <span key={channel.id} className="activity-list-channel-label">{channel.label}{index < selected.length - 1 ? '、' : ''}</span>
        ))}
      </div>
    </div>
  )
}

function CreatorCell({ activity }: { activity: ListActivity }) {
  const { maskedPhone, org } = formatCreatorDisplay(activity)
  return (
    <div className="creator-cell" title={`${maskedPhone} · ${org}`}>
      <div className="creator-cell__phone">{maskedPhone}</div>
      <div className="creator-cell__org">{org}</div>
    </div>
  )
}

function TimestampCell({ value }: { value?: string }) {
  const [date, time] = (value || '—').split(' ')
  return <div className="timestamp-cell" title={value}><div>{date}</div>{time && <div className="timestamp-cell__time">{time}</div>}</div>
}

export function ActivityScopeLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="snapshot-link cell-ellipsis" title={`点击查看快照：${label}`} onClick={(event) => {
      event.stopPropagation()
      onClick()
    }}>{label}</button>
  )
}
