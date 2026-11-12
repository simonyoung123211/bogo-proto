import type { DiscountConflict } from '../utils/limitDiscountConflicts'

export function LimitDiscountConflicts({ conflicts }: { conflicts: DiscountConflict[] }) {
  return (
    <section className="mp-conflict mp-conflict--danger" aria-label="活动范围冲突">
      <strong>与 {conflicts.length} 个限时折扣活动冲突</strong>
      <p className="field-hint">请调整重叠的门店区域、活动时间或其他参与范围。</p>
      {conflicts.map(({ activity, time, stores }) => (
        <div key={activity.id} className="ld-conflict-item">
          <strong>{activity.name}</strong> <small>{activity.id}</small>
          <p>首个重叠时段 {time}</p>
          <ul>{stores.map((store) => (
            <li key={store.id}>{store.name} · {store.areas?.join('、') ?? '不限区域'}</li>
          ))}</ul>
        </div>
      ))}
    </section>
  )
}
