export type InboxMessageKind = 'S1' | 'S2' | 'mixed'

export interface InboxMessage {
  id: string
  /** 接收人 = 活动创建人账号 */
  recipientCreatorId: string
  title: string
  body: string
  kind: InboxMessageKind
  /** 跳转用：首个活动 ID */
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
  creator: string
  issue: 'S1' | 'S2'
}

/** 按创建人合并生成站内信 */
export function buildClosureInboxMessages(
  storeName: string,
  items: ClosureInboxItem[],
): InboxMessage[] {
  if (items.length === 0) return []

  const byCreator = new Map<string, ClosureInboxItem[]>()
  for (const item of items) {
    const list = byCreator.get(item.creator) ?? []
    list.push(item)
    byCreator.set(item.creator, list)
  }

  const messages: InboxMessage[] = []
  for (const [creator, list] of byCreator) {
    const s1 = list.filter((i) => i.issue === 'S1')
    const s2 = list.filter((i) => i.issue === 'S2')
    const activityIds = list.map((i) => i.activityId)
    const primary = activityIds[0]
    const id = `inbox-${Date.now()}-${creator}-${Math.random().toString(36).slice(2, 6)}`

    if (list.length === 1) {
      const only = list[0]
      if (only.issue === 'S1') {
        messages.push({
          id,
          recipientCreatorId: creator,
          title: '促销活动参与门店已清空',
          body: `门店「${storeName}」已停业，系统已将其从您创建的活动「${only.activityName}」的参与门店中移出，当前有效参与门店为 0。活动状态未变更。请尽快重新选择参与门店，或作废该活动。`,
          kind: 'S1',
          primaryActivityId: primary,
          activityIds,
          storeName,
          createdAt: stamp(),
          read: false,
        })
      } else {
        messages.push({
          id,
          recipientCreatorId: creator,
          title: '促销活动不参与门店已清空',
          body: `门店「${storeName}」已停业，系统已将其从您创建的活动「${only.activityName}」的不参与门店中移出，当前不参与名单为空（未排除任何门店）。活动状态未变更。请确认是否需重新配置。`,
          kind: 'S2',
          primaryActivityId: primary,
          activityIds,
          storeName,
          createdAt: stamp(),
          read: false,
        })
      }
      continue
    }

    const s1Names = s1.map((i) => i.activityName).join('、') || '无'
    const s2Names = s2.map((i) => i.activityName).join('、') || '无'
    messages.push({
      id,
      recipientCreatorId: creator,
      title: '多个促销活动门店配置需处理',
      body: `门店「${storeName}」已停业，您创建的以下活动门店配置已失效（状态未变更）：\n参与门店已清空：${s1Names}\n不参与门店已清空：${s2Names}\n请尽快处理。`,
      kind: s1.length && s2.length ? 'mixed' : s1.length ? 'S1' : 'S2',
      primaryActivityId: primary,
      activityIds,
      storeName,
      createdAt: stamp(),
      read: false,
    })
  }

  return messages
}

export function prependInboxMessages(existing: InboxMessage[], incoming: InboxMessage[]): InboxMessage[] {
  return [...incoming, ...existing].slice(0, 100)
}
