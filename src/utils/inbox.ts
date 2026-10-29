export type InboxMessageKind = 'S1' | 'S2' | 'mixed'

export interface InboxMessage {
  id: string
  /** 接收人 = 活动创建人账号 */
  recipientCreatorId: string
  title: string
  body: string
  kind: InboxMessageKind
  /** 跳转用：活动 ID */
  primaryActivityId: string
  activityIds: string[]
  storeName: string
  createdAt: string
  read: boolean
}

const INBOX_KEY = 'promo-inbox-v1'

function readAll(): InboxMessage[] {
  try {
    const raw = localStorage.getItem(INBOX_KEY)
    if (!raw) return []
    return JSON.parse(raw) as InboxMessage[]
  } catch {
    return []
  }
}

function writeAll(list: InboxMessage[]) {
  localStorage.setItem(INBOX_KEY, JSON.stringify(list))
}

export function loadInboxMessages(): InboxMessage[] {
  return readAll()
}

export function saveInboxMessages(list: InboxMessage[]) {
  writeAll(list)
}

export function countUnreadInbox(messages: InboxMessage[], creatorId?: string): number {
  return messages.filter((m) => !m.read && (!creatorId || m.recipientCreatorId === creatorId)).length
}

function stamp() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export interface ClosureInboxItem {
  activityId: string
  activityName: string
  /** 活动类型名称，如「买1送N」 */
  activityTypeName: string
  creator: string
  issue: 'S1' | 'S2'
}

/** 按活动各发 1 条站内信（发给活动创建人） */
export function buildClosureInboxMessages(
  storeName: string,
  items: ClosureInboxItem[],
): InboxMessage[] {
  if (items.length === 0) return []

  return items.map((item) => {
    const id = `inbox-${Date.now()}-${item.activityId}-${Math.random().toString(36).slice(2, 6)}`
    const title = `【${item.activityTypeName}】【${item.activityName}】已自动暂停`
    const meta = `活动类型：${item.activityTypeName}\n活动名称：${item.activityName}\n活动ID：${item.activityId}`
    if (item.issue === 'S1') {
      return {
        id,
        recipientCreatorId: item.creator,
        title,
        body: `${meta}\n参与门店均已停业，系统已自动暂停。请重新选择参与门店后恢复，或作废活动。`,
        kind: 'S1' as const,
        primaryActivityId: item.activityId,
        activityIds: [item.activityId],
        storeName,
        createdAt: stamp(),
        read: false,
      }
    }
    return {
      id,
      recipientCreatorId: item.creator,
      title,
      body: `${meta}\n不参与门店均已停业，排除配置已失效，系统已自动暂停。请重新配置门店范围后恢复。`,
      kind: 'S2' as const,
      primaryActivityId: item.activityId,
      activityIds: [item.activityId],
      storeName,
      createdAt: stamp(),
      read: false,
    }
  })
}

export function prependInboxMessages(existing: InboxMessage[], incoming: InboxMessage[]): InboxMessage[] {
  return [...incoming, ...existing].slice(0, 100)
}
