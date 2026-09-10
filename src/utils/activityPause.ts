import type { ActivityStatus } from '../types'
import { PAUSE_OVERDUE_MINUTES, PAUSE_WARN_MINUTES } from '../mockData'

/**
 * 各活动类型共用的「暂停 / 恢复」口径。
 *
 * 暂停用于进行中的活动临时下线改规则，改完恢复。三条已确认口径：
 * 1. 暂停不顺延活动结束时间，活动时间照常走；
 * 2. 暂停期间到达结束时间的活动直接转「已结束」，不再等人恢复；
 * 3. 进行中仍可直接编辑，暂停只是多给一个「安心改规则」的手段。
 */

/** 暂停与恢复所需的最小字段，四类活动表单都满足 */
export interface PausableActivity {
  status: ActivityStatus
  pausedAt?: string
  startTime: string
  endTime: string
}

export type PauseLevel = 'ok' | 'warn' | 'overdue'

export interface PauseInfo {
  minutes: number
  level: PauseLevel
  /** 列表与详情展示的文案 */
  label: string
}

export function canPause(status: ActivityStatus): boolean {
  return status === 'in_progress'
}

export function canResume(status: ActivityStatus): boolean {
  return status === 'paused'
}

function parseTime(value: string): number {
  return new Date(value.replace(/-/g, '/')).getTime()
}

/** 暂停计时只关心状态与暂停时刻，付费会员价（无起止时间）也复用这套 */
interface PauseTimerFields {
  status: string
  pausedAt?: string
}

export function getPauseInfo(
  activity: PauseTimerFields,
  now: number = Date.now(),
): PauseInfo | null {
  if (activity.status !== 'paused' || !activity.pausedAt) return null
  const minutes = Math.max(0, Math.floor((now - parseTime(activity.pausedAt)) / 60_000))
  if (minutes >= PAUSE_OVERDUE_MINUTES) {
    return { minutes, level: 'overdue', label: `已暂停 ${formatDuration(minutes)}，超时未恢复` }
  }
  if (minutes >= PAUSE_WARN_MINUTES) {
    return { minutes, level: 'warn', label: `已暂停 ${formatDuration(minutes)}，请尽快恢复` }
  }
  return { minutes, level: 'ok', label: `已暂停 ${formatDuration(minutes)}` }
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return '不到 1 分钟'
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return rest === 0 ? `${hours} 小时` : `${hours} 小时 ${rest} 分钟`
  const days = Math.floor(hours / 24)
  return `${days} 天 ${hours % 24} 小时`
}

/** 超时（红色档）活动数量，用于列表顶部汇总提醒 */
export function countOverduePaused(
  activities: PauseTimerFields[],
  now: number = Date.now(),
): number {
  return activities.filter((a) => getPauseInfo(a, now)?.level === 'overdue').length
}

/** 活动已过结束时间。演示数据里存在状态仍为「进行中」但时间已过的活动，这类不该再暂停 */
export function isExpired(activity: PausableActivity, now: number = Date.now()): boolean {
  return parseTime(activity.endTime) <= now
}

/** 暂停期间是否已过活动结束时间，到期的活动应转「已结束」 */
export function isPausedExpired(activity: PausableActivity, now: number = Date.now()): boolean {
  return activity.status === 'paused' && isExpired(activity, now)
}

/** 曾在暂停中到期结束的活动：状态已是「已结束」但仍留着暂停时刻 */
export function isEndedWhilePaused(activity: PausableActivity): boolean {
  return activity.status === 'ended' && Boolean(activity.pausedAt)
}

/** 恢复后的目标状态：活动时间照常走，所以按当前时刻重新落状态 */
export function resolveResumeStatus(
  activity: PausableActivity,
  now: number = Date.now(),
): Extract<ActivityStatus, 'not_started' | 'in_progress' | 'ended'> {
  if (parseTime(activity.endTime) <= now) return 'ended'
  if (parseTime(activity.startTime) > now) return 'not_started'
  return 'in_progress'
}
