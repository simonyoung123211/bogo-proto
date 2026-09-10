import { PAUSE_OVERDUE_MINUTES } from '../mockData'

/**
 * 各活动类型共用的暂停 / 恢复交互件。
 * 暂停不顺延活动时间，暂停期间到达结束时间的活动直接转「已结束」。
 */

/** 演示用：把暂停起始时间往前拨，方便现场看超时分级的三档颜色 */
export function PauseDemoGroup({ onPick }: { onPick: (minutes: number) => void }) {
  return (
    <div className="row-action-menu__group">
      <span className="row-action-menu__group-label">演示：设置暂停时长</span>
      {[0, 12, 25].map((m) => (
        <button key={m} type="button" className="row-action-menu__sub" onClick={() => onPick(m)}>
          {m === 0 ? '刚暂停（绿色）' : m === 12 ? '12 分钟前（黄色）' : '25 分钟前（红色）'}
        </button>
      ))}
    </div>
  )
}

interface PauseConfirmModalProps {
  /** 暂停对顾客的影响，一句话，如「会员暂时无法享受专享价」 */
  impact: string
  onCancel: () => void
  onConfirm: () => void
}

export function PauseConfirmModal({ impact, onCancel, onConfirm }: PauseConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header"><h3>暂停活动？</h3></div>
        <div className="modal__body">
          <p>暂停期间{impact}，已提交的订单不受影响。</p>
          <p>暂停不会顺延活动时间，活动仍按原结束时间到期；改完请及时点「恢复活动」——超过 {PAUSE_OVERDUE_MINUTES} 分钟未恢复会在列表标记提醒。</p>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onCancel}>取消</button>
          <button type="button" className="btn btn--primary" onClick={onConfirm}>确认暂停</button>
        </div>
      </div>
    </div>
  )
}

interface ResumeConfirmModalProps {
  /** 恢复后顾客侧的变化，一句话，如「会员将立即重新享受专享价」 */
  effect: string
  /** 暂停期间已过结束时间，恢复后直接落「已结束」 */
  willEnd?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ResumeConfirmModal({ effect, willEnd, onCancel, onConfirm }: ResumeConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header"><h3>恢复活动？</h3></div>
        <div className="modal__body">
          {willEnd
            ? '该活动在暂停期间已过结束时间，恢复后会直接标记为「已结束」，不会再对顾客生效。'
            : `恢复后，${effect}。活动仍按原结束时间到期，暂停掉的时间不会补回。`}
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onCancel}>取消</button>
          <button type="button" className="btn btn--primary" onClick={onConfirm}>确认恢复</button>
        </div>
      </div>
    </div>
  )
}
