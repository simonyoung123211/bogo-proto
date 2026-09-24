import type { ActivityForm, ActivityOperationLog, ActivityStatus, Store, StoreScope } from '../types'
import { getResolvedStores, isStoreClosed, markStoreClosed } from './storeRegistry'

export type StoreConfigIssue = 'S1' | 'S1_all_closed' | 'S2' | 'S3'

const TERMINAL: ActivityStatus[] = ['ended', 'voided']

export function isTerminalActivityStatus(status: ActivityStatus): boolean {
  return TERMINAL.includes(status)
}

export const STORE_ISSUE_LABELS: Record<StoreConfigIssue, string> = {
  S1: '有效参与门店为 0',
  S1_all_closed: '参与门店均已停业',
  S2: '不参与门店已清空',
  S3: '不参与门店均已停业',
}

export const STORE_ISSUE_DETAIL: Record<StoreConfigIssue, string> = {
  S1: '参与门店已清空（含因门店已停业被系统自动移出）。请重新选择参与门店，或作废本活动。',
  S1_all_closed: '当前参与名单中的门店均已停业。系统清理后将变为「有效参与门店为 0」。请重新选择参与门店，或作废本活动。',
  S2: '不参与门店已清空（含因门店已停业被系统自动移出）。当前未排除任何门店，效果接近「全部门店参与」。请确认是否需重新指定不参与门店。',
  S3: '不参与名单中的门店均已停业，排除配置已失效。清理后不参与名单将清空。',
}

export function resolveStoreConfigIssue(
  activity: { status: ActivityStatus; storeScope: StoreScope; storeIds: string[] },
): StoreConfigIssue | null {
  if (isTerminalActivityStatus(activity.status)) return null
  if (activity.storeScope === 'all') return null

  const ids = activity.storeIds ?? []
  if (activity.storeScope === 'partial_include') {
    if (ids.length === 0) return 'S1'
    if (ids.every((id) => isStoreClosed(id))) return 'S1_all_closed'
    return null
  }
  if (activity.storeScope === 'partial_exclude') {
    if (ids.length === 0) return 'S2'
    if (ids.every((id) => isStoreClosed(id))) return 'S3'
    return null
  }
  return null
}

function nowStamp() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function makeLog(action: string, detail: string): ActivityOperationLog {
  return {
    id: `log-closure-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action,
    operatorPhone: '系统',
    operatorOrg: '系统自动',
    operatedAt: nowStamp(),
    detail,
  }
}

export interface ClosureAffectedActivity {
  activityId: string
  activityName: string
  creator: string
  listKind: 'include' | 'exclude'
  enteredIssue: StoreConfigIssue | null
  previousIssue: StoreConfigIssue | null
}

export interface ApplyStoreClosureResult {
  store: Store
  activities: ActivityForm[]
  affected: ClosureAffectedActivity[]
  newlyFailed: ClosureAffectedActivity[]
}

/**
 * 模拟门店已停业：标记门店 + 从非终态活动的指定参与/不参与名单剔除。
 */
export function applyStoreClosedCleanup(
  activities: ActivityForm[],
  storeId: string,
): ApplyStoreClosureResult | null {
  const store = markStoreClosed(storeId)
  if (!store) return null

  const affected: ClosureAffectedActivity[] = []
  const next = activities.map((activity) => {
    if (isTerminalActivityStatus(activity.status)) return activity
    if (activity.storeScope === 'all') return activity
    if (!activity.storeIds.includes(storeId)) return activity

    const previousIssue = resolveStoreConfigIssue(activity)
    const listKind: 'include' | 'exclude' =
      activity.storeScope === 'partial_exclude' ? 'exclude' : 'include'
    const nextIds = activity.storeIds.filter((id) => id !== storeId)
    const patched: ActivityForm = {
      ...activity,
      storeIds: nextIds,
      updatedAt: nowStamp(),
      operationLogs: [
        makeLog(
          '系统自动移出门店',
          listKind === 'include'
            ? `因门店已停业，系统自动移出参与门店「${store.name}（${store.code}）」`
            : `因门店已停业，系统自动移出不参与门店「${store.name}（${store.code}）」`,
        ),
        ...(activity.operationLogs ?? []),
      ],
    }

    const enteredIssue = resolveStoreConfigIssue(patched)
    if (enteredIssue === 'S1' && previousIssue !== 'S1') {
      patched.operationLogs = [
        makeLog('门店配置失效', '移除后参与门店名单已为空，活动状态未变更'),
        ...patched.operationLogs,
      ]
    }
    if (enteredIssue === 'S2' && previousIssue !== 'S2') {
      patched.operationLogs = [
        makeLog('门店配置失效', '移除后不参与门店名单已为空，活动状态未变更'),
        ...patched.operationLogs,
      ]
    }

    affected.push({
      activityId: activity.id,
      activityName: activity.name || activity.id,
      creator: activity.creator,
      listKind,
      enteredIssue,
      previousIssue,
    })
    return patched
  })

  const newlyFailed = affected.filter((a) => {
    const nextIssue = a.enteredIssue
    if (!nextIssue) return false
    if (nextIssue === 'S1' || nextIssue === 'S2') {
      return a.previousIssue !== nextIssue
    }
    return false
  })

  return { store, activities: next, affected, newlyFailed }
}

/** 选店：仅营业中门店可选 */
export function getSelectableStores(): Store[] {
  return getResolvedStores().filter((s) => s.status === 'open')
}
