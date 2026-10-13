import type { InboxMessage } from '../utils/inbox'

interface InboxDrawerProps {
  open: boolean
  messages: InboxMessage[]
  currentCreatorId: string
  onClose: () => void
  onOpenActivity: (activityId: string) => void
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}

export function InboxDrawer({
  open,
  messages,
  currentCreatorId,
  onClose,
  onOpenActivity,
  onMarkRead,
  onMarkAllRead,
}: InboxDrawerProps) {
  if (!open) return null

  const mine = messages.filter((m) => m.recipientCreatorId === currentCreatorId)
  const others = messages.filter((m) => m.recipientCreatorId !== currentCreatorId)
  const unreadMine = mine.filter((m) => !m.read).length

  return (
    <div className="modal-overlay inbox-overlay" onClick={onClose}>
      <div className="inbox-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="inbox-drawer__header">
          <div>
            <h3>站内信</h3>
            <p className="inbox-drawer__sub">空名单/失效态通知 · 正式规则发给活动创建人</p>
          </div>
          <button type="button" className="modal__close" onClick={onClose}>×</button>
        </div>
        <div className="inbox-drawer__toolbar">
          <span>发给我的未读 {unreadMine}</span>
          <button type="button" className="btn btn--default btn--sm" onClick={onMarkAllRead} disabled={unreadMine === 0}>
            全部已读
          </button>
        </div>
        <div className="inbox-drawer__body">
          {mine.length === 0 && others.length === 0 && (
            <div className="table-empty">暂无站内信。可在买1送1 列表使用「模拟门店已停业」触发。</div>
          )}
          {mine.length > 0 && (
            <section className="inbox-section">
              <div className="inbox-section__title">发给我的（创建人 = 当前账号）</div>
              {mine.map((m) => (
                <InboxCard
                  key={m.id}
                  message={m}
                  onOpen={() => {
                    onMarkRead(m.id)
                    onOpenActivity(m.primaryActivityId)
                  }}
                  onMarkRead={() => onMarkRead(m.id)}
                />
              ))}
            </section>
          )}
          {others.length > 0 && (
            <section className="inbox-section">
              <div className="inbox-section__title">发给其他创建人（演示可见）</div>
              {others.map((m) => (
                <InboxCard
                  key={m.id}
                  message={m}
                  showRecipient
                  onOpen={() => {
                    onMarkRead(m.id)
                    onOpenActivity(m.primaryActivityId)
                  }}
                  onMarkRead={() => onMarkRead(m.id)}
                />
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function InboxCard({
  message,
  showRecipient,
  onOpen,
  onMarkRead,
}: {
  message: InboxMessage
  showRecipient?: boolean
  onOpen: () => void
  onMarkRead: () => void
}) {
  return (
    <article className={`inbox-card ${message.read ? '' : 'is-unread'}`}>
      <div className="inbox-card__top">
        <strong>{message.title}</strong>
        <time>{message.createdAt}</time>
      </div>
      {showRecipient && (
        <div className="inbox-card__meta">接收人账号：{message.recipientCreatorId}</div>
      )}
      <p className="inbox-card__body">{message.body}</p>
      <div className="inbox-card__actions">
        <button type="button" className="btn btn--primary btn--sm" onClick={onOpen}>
          查看活动
        </button>
        {!message.read && (
          <button type="button" className="btn btn--default btn--sm" onClick={onMarkRead}>
            标为已读
          </button>
        )}
      </div>
    </article>
  )
}
