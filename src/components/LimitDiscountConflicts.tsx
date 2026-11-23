import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { STATUS_LABELS } from '../mockData'
import type { LimitDiscountActivityForm } from '../types'
import { resolveActivityProducts } from '../utils/activityProductSearch'
import { channelSummary, formatCreatorDisplay, goodsScopeLabel, isPublishedLimitDiscount, sceneSummary, storeModeLabel } from '../utils/limitDiscountActivity'
import { discountConflictCoverage, findDiscountConflicts, planDiscountConflictRemoval, type DiscountConflict } from '../utils/limitDiscountConflicts'
import { filterProductsByKeyword } from '../utils/productSearch'
import { getResolvedStores } from '../utils/storeRegistry'
import { DetailTable, limitDiscountTimeSummary } from './LimitDiscountConfigReview'
import { SelectedProductSearchBar } from './SelectedProductTools'

type Activity = LimitDiscountActivityForm
type ConflictStore = DiscountConflict['stores'][number]

export interface DiscountConflictActivityActions {
  canEdit: (activity: Activity) => boolean
  onEdit: (id: string) => void
}

const ACTIONS = [
  { step: 0, label: '调整活动时间' },
  { step: 1, label: '调整门店与点位' },
  { step: 2, label: '调整参与商品' },
] as const

function collectStores(conflicts: DiscountConflict[], wholeStore = false): ConflictStore[] {
  const stores = new Map<string, ConflictStore>()
  for (const { stores: overlap } of conflicts) {
    for (const store of overlap) {
      const previous = stores.get(store.id)
      if (wholeStore || store.areas === null || previous?.areas === null) {
        stores.set(store.id, { ...store, areas: null, areaIds: null })
        continue
      }
      const namesById = new Map((previous?.areaIds ?? []).map((id, index) => [id, previous?.areas?.[index] ?? id]))
      store.areaIds?.forEach((id, index) => namesById.set(id, store.areas?.[index] ?? id))
      stores.set(store.id, { ...store, areas: [...namesById.values()], areaIds: [...namesById.keys()] })
    }
  }
  return [...stores.values()]
}

function scopeText(stores: ConflictStore[]) {
  const points = stores.reduce((total, store) => total + (store.areaIds?.length ?? 0), 0)
  const wholeStores = stores.filter((store) => store.areaIds === null).length
  return [`${stores.length} 家门店`, points > 0 && wholeStores > 0 && `${wholeStores} 家整店`, points > 0 && `${points} 个点位`]
    .filter(Boolean).join(' · ')
}

function formatCoverage(coverage: ReturnType<typeof discountConflictCoverage>, specified: boolean) {
  return specified ? `${coverage.stores} 家门店 · ${coverage.areas} 个点位` : `${coverage.stores} 家门店`
}

export function LimitDiscountConflicts({ conflicts, activity, activityIsSaved = true, activityActions, onNavigate, onApply, onRecheck }: {
  conflicts: DiscountConflict[]
  activity: Activity
  activityIsSaved?: boolean
  activityActions?: DiscountConflictActivityActions
  onNavigate?: (step: number) => void
  onApply?: (activity: Activity, message: string) => void
  onRecheck?: () => void
}) {
  const [showAll, setShowAll] = useState(false)
  const [comparisonId, setComparisonId] = useState<string>()
  const [reviewing, setReviewing] = useState(false)
  const comparing = conflicts.find(({ activity }) => activity.id === comparisonId)
  const affected = collectStores(conflicts)
  const specified = activity.areaMode === 'specified'
  const plan = onApply ? planDiscountConflictRemoval(activity, conflicts) : undefined
  const canRemoveAll = plan?.kind === 'ready' && plan.after.stores > 0
  const canReview = plan?.kind === 'ready' && (canRemoveAll || (
    conflicts.length > 1 && conflicts.some((conflict) => {
      const single = planDiscountConflictRemoval(activity, [conflict])
      return single?.kind === 'ready' && single.after.stores > 0
    })
  ))
  const published = isPublishedLimitDiscount(activity.status)
  const actions = published ? [ACTIONS[1], { step: 0, label: '调整活动周期' }] : ACTIONS
  const recommended = plan?.kind === 'unavailable' || published ? 1 : 0
  const visible = showAll ? conflicts : conflicts.slice(0, 3)

  return (
    <section className="ld-conflict-panel" id={onNavigate ? 'ld-submit-conflicts' : undefined}
      aria-label="活动范围冲突" tabIndex={onNavigate ? -1 : undefined}>
      <header className="ld-conflict-panel__summary">
        <span className="ld-conflict-panel__icon" aria-hidden="true">!</span>
        <div className="ld-conflict-panel__heading">
          <h3>检测到 {conflicts.length} 场冲突，暂不能{onNavigate ? '保存' : '提交'}</h3>
          <p>涉及 {scopeText(affected)}。{plan?.kind === 'unavailable' && '当前按标签选店，可到参与门店调整范围。'}</p>
          {plan?.kind === 'ready' && (
            <p className={canRemoveAll ? undefined : 'ld-conflict-panel__impact'}>
              全部排除后，覆盖范围从 {formatCoverage(plan.before, specified)} 变为 {formatCoverage(plan.after, specified)}。
              {!canRemoveAll && (canReview ? '可分批排除，保留至少 1 家参与门店。' : '请调整活动配置，保留至少 1 家参与门店。')}
            </p>
          )}
        </div>
        {onNavigate && (
          <div className="ld-conflict-panel__actions">
            {!canRemoveAll && (
              <button type="button" className="btn btn--primary" onClick={() => onNavigate(recommended)}>{ACTIONS[recommended].label}</button>
            )}
            {canReview && (
              <button type="button" className={`btn ${canRemoveAll ? 'btn--primary' : 'btn--default'}`} aria-haspopup="dialog"
                onClick={() => setReviewing(true)}>{specified ? '预览排除点位' : '预览排除门店'}</button>
            )}
            {actions.filter(({ step }) => canRemoveAll || step !== recommended).map(({ step, label }) => (
              <button key={step} type="button" className="btn btn--default" onClick={() => onNavigate(step)}>{label}</button>
            ))}
          </div>
        )}
        {onRecheck && <button type="button" className="link-btn ld-conflict-panel__recheck" onClick={onRecheck}>重新校验</button>}
      </header>
      <ul className="ld-conflict-panel__list">
        {visible.map((conflict) => {
          const other = conflict.activity
          const name = other.name || '未命名活动'
          const creator = formatCreatorDisplay(other)
          const editable = activityActions?.canEdit(other)
          return (
            <li key={other.id} className="ld-conflict-row">
              <div className="ld-conflict-row__activity">
                <strong>{name}</strong>
                <span className={`status-badge status-badge--${other.status}`}>{STATUS_LABELS[other.status]}</span>
                <p>首个重叠时段 {conflict.time}</p>
              </div>
              <div className="ld-conflict-row__scope">
                <span>{scopeText(conflict.stores)} · {activity.goodsScope === 'all' && other.goodsScope === 'all' ? '全部商品' : `${conflict.productIds.length} 个商品`}</span>
                <small>创建人 {creator.maskedPhone} · {creator.org}</small>
              </div>
              <div className="ld-conflict-row__actions">
                <button type="button" className="link-btn" aria-haspopup="dialog"
                  aria-label={`查看${name}的冲突明细`} onClick={() => setComparisonId(other.id)}>冲突明细</button>
                {editable ? <button type="button" className="link-btn" aria-label={`去修改${name}`}
                  onClick={() => activityActions?.onEdit(other.id)}>去修改</button>
                  : activityActions && <small>仅可查看</small>}
              </div>
            </li>
          )
        })}
      </ul>
      {conflicts.length > 3 && (
        <button type="button" className="link-btn ld-conflict-panel__more" aria-expanded={showAll}
          onClick={() => setShowAll(!showAll)}>{showAll ? '收起冲突活动' : `查看其余 ${conflicts.length - 3} 场冲突`}</button>
      )}
      {comparing && <ConflictComparison key={comparing.activity.id} activity={activity} isSaved={activityIsSaved} conflict={comparing}
        onClose={() => setComparisonId(undefined)}
        onEdit={activityActions?.canEdit(comparing.activity) ? () => activityActions.onEdit(comparing.activity.id) : undefined}
        onAdjust={onNavigate ? () => { setComparisonId(undefined); onNavigate(1) } : undefined} />}
      {reviewing && onApply && (
        <RemovalPreview activity={activity} conflicts={conflicts} selectAllInitially={canRemoveAll} onClose={() => setReviewing(false)}
          onApply={(next, message) => { setReviewing(false); onApply(next, message) }} />
      )}
    </section>
  )
}

function ConflictComparison({ activity, isSaved, conflict, onClose, onEdit, onAdjust }: {
  activity: Activity
  isSaved: boolean
  conflict: DiscountConflict
  onClose: () => void
  onEdit?: () => void
  onAdjust?: () => void
}) {
  const storesRef = useRef<HTMLHeadingElement>(null)
  const productsRef = useRef<HTMLHeadingElement>(null)
  const [copied, setCopied] = useState('')
  const other = conflict.activity
  const creator = formatCreatorDisplay(other)
  const allProducts = activity.goodsScope === 'all' && other.goodsScope === 'all'
  const span = (start: string, end: string) => <>{start}<br />至 {end}</>
  const coverage = (item: Activity) => <>{storeModeLabel(item)}<small>实际覆盖 {formatCoverage(discountConflictCoverage(item), item.areaMode === 'specified')}</small></>
  const jumpTo = (target: HTMLHeadingElement | null) => {
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'nearest' })
  }
  const rows: [string, ReactNode, ReactNode, ReactNode][] = [
    ['起止时间', span(activity.startTime, activity.endTime), span(other.startTime, other.endTime), span(conflict.dateRange.start, conflict.dateRange.end)],
    ['周期与时段', limitDiscountTimeSummary(activity), limitDiscountTimeSummary(other), <><small>首个实际重叠时段</small>{conflict.time}</>],
    ['参与渠道', channelSummary(activity), channelSummary(other), channelSummary({ ...activity, channels: conflict.channels })],
    ['业务场景', sceneSummary(activity), sceneSummary(other), sceneSummary({ ...activity, orderTypes: conflict.scenes })],
    ['门店与点位', coverage(activity), coverage(other), <>{scopeText(conflict.stores)} <button type="button" className="link-btn"
      onClick={() => jumpTo(storesRef.current)}>查看名单</button></>],
    ['参与商品', goodsScopeLabel(activity), goodsScopeLabel(other), allProducts ? '全部参与商品重叠' : <>{conflict.productIds.length} 个商品 <button type="button"
      className="link-btn" onClick={() => jumpTo(productsRef.current)}>查看商品</button></>],
  ]
  return (
    <LimitDiscountConflictDialog title="冲突明细" onClose={onClose} footer={
      <>
        <button type="button" className="btn btn--default" onClick={onClose}>关闭</button>
        {onAdjust && <button type="button" className="btn btn--default" onClick={onAdjust}>调整本活动范围</button>}
        {onEdit && <button type="button" className="btn btn--primary" onClick={onEdit}>去修改对方活动</button>}
      </>
    }>
      <p className="ld-conflict-dialog__notice">两场活动的配置在下列条件上重叠。实际重叠时段取决于双方的周期、时段和不生效日期。</p>
      <div className="ld-conflict-dialog__table">
        <table className="table table--compact">
          <thead>
            <tr>
              <th scope="col">对比项</th>
              <th scope="col"><small>本活动 · {onAdjust ? '编辑中' : STATUS_LABELS[activity.status]}</small><strong>{activity.name || '未命名活动'}</strong>
                <small>{isSaved ? `活动 ID ${activity.id}` : '未保存，暂无活动 ID'}</small></th>
              <th scope="col">
                <small>对方活动 · {STATUS_LABELS[other.status]}</small><strong>{other.name || '未命名活动'}</strong>
                <small>活动 ID {other.id} <button type="button" className="link-btn" onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(other.id)
                    setCopied('活动 ID 已复制')
                  } catch {
                    setCopied('请选中活动 ID 后复制')
                  }
                }}>复制 ID</button></small>
                {copied && <small role="status">{copied}</small>}
                <small>创建人 {creator.maskedPhone} · {creator.org}</small>
                {!onEdit && <small>如需调整对方活动，可联系创建人。</small>}
              </th>
              <th scope="col">重叠部分</th>
            </tr>
          </thead>
          <tbody>{rows.map(([label, a, b, overlap]) => <tr key={label}><th scope="row">{label}</th><td>{a}</td><td>{b}</td><td>{overlap}</td></tr>)}</tbody>
        </table>
      </div>
      <section className="ld-conflict-dialog__detail">
        <h4 ref={storesRef} tabIndex={-1}>重叠门店（{conflict.stores.length}）</h4>
        <ConflictStoreTable stores={conflict.stores} />
      </section>
      {!allProducts && (
        <section className="ld-conflict-dialog__detail">
          <h4 ref={productsRef} tabIndex={-1}>重叠商品（{conflict.productIds.length}）</h4>
          <ConflictProductTable productIds={conflict.productIds} />
        </section>
      )}
    </LimitDiscountConflictDialog>
  )
}

function RemovalPreview({ activity, conflicts, selectAllInitially, onClose, onApply }: {
  activity: Activity
  conflicts: DiscountConflict[]
  selectAllInitially: boolean
  onClose: () => void
  onApply: (activity: Activity, message: string) => void
}) {
  const [selectedIds, setSelectedIds] = useState(() => new Set(selectAllInitially ? conflicts.map(({ activity }) => activity.id) : []))
  const selected = conflicts.filter(({ activity }) => selectedIds.has(activity.id))
  const plan = planDiscountConflictRemoval(activity, selected)
  const change = plan?.kind === 'ready' ? plan : undefined
  const specified = activity.areaMode === 'specified'
  const stores = collectStores(selected, !specified)
  const count = change ? (specified ? change.before.areas - change.after.areas : change.before.stores - change.after.stores) : 0
  const remaining = conflicts.length > 1 && change?.after.stores
    ? findDiscountConflicts(change.next, conflicts.map(({ activity }) => activity))
    : undefined
  return (
    <LimitDiscountConflictDialog title={specified ? '预览排除点位' : '预览排除门店'} onClose={onClose} footer={
      <>
        <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
        <button type="button" className="btn btn--primary" disabled={!count || !change?.after.stores}
          onClick={() => {
            if (change?.after.stores && count) onApply(change.next, specified ? `已排除 ${count} 个冲突点位` : `已排除 ${count} 家冲突门店`)
          }}>确认排除</button>
      </>
    }>
      {conflicts.length > 1 && (
        <fieldset className="ld-conflict-dialog__choices">
          <legend>选择要处理的冲突活动（{selected.length}/{conflicts.length}）</legend>
          <div className="ld-conflict-dialog__choice-list">
            {conflicts.map(({ activity, stores }) => (
              <label key={activity.id} className="checkbox ld-conflict-dialog__choice">
                <input type="checkbox" aria-label={activity.name || activity.id} checked={selectedIds.has(activity.id)}
                  onChange={(event) => {
                    const checked = event.target.checked
                    setSelectedIds((previous) => {
                      const next = new Set(previous)
                      if (checked) next.add(activity.id)
                      else next.delete(activity.id)
                      return next
                    })
                  }} />
                <span>{activity.name || '未命名活动'}</span>
                <small>{scopeText(stores)}</small>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {change ? (
        <>
          <dl className="ld-conflict-dialog__impact" aria-live="polite">
            <div><dt>排除前覆盖</dt><dd>{formatCoverage(change.before, specified)}</dd></div>
            <div><dt>将排除</dt><dd>{specified ? `${count} 个点位 · 涉及 ${stores.length} 家门店` : scopeText(stores)}</dd></div>
            <div><dt>排除后剩余</dt><dd>{formatCoverage(change.after, specified)}</dd></div>
          </dl>
          {change.after.stores === 0 ? (
            <p className="alert-banner alert-banner--warning">排除后没有参与门店，请减少排除范围或返回调整配置。</p>
          ) : (
            <>
              {remaining && (
                <div className="ld-conflict-dialog__result">
                  <strong role="status">预计解除 {conflicts.length - remaining.length} 场冲突 · 仍有 {remaining.length} 场待处理</strong>
                  {remaining.length > 0 && (
                    <details>
                      <summary>查看排除后仍冲突的活动</summary>
                      <ul className="ld-conflict-dialog__remaining">
                        {remaining.map(({ activity, stores }) => (
                          <li key={activity.id}><span>{activity.name || '未命名活动'}</span><small>{scopeText(stores)}</small></li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
              <p className="field-hint">{specified ? '表中的点位将退出本活动的所有时段，同店其余已选点位会保留。' : '表中的门店及店内点位将退出本活动的所有时段。'}确认后更新本次配置。</p>
            </>
          )}
          <ConflictStoreTable stores={stores} wholeStore={!specified} scopeHeading={specified ? '将排除点位' : '排除范围'} />
        </>
      ) : <p className="field-hint">{selectAllInitially ? '请选择要处理的冲突活动。' : '请选择要先处理的活动。勾选全部会清空覆盖。'}</p>}
    </LimitDiscountConflictDialog>
  )
}

function ConflictStoreTable({ stores, wholeStore = false, scopeHeading = '重叠范围' }: {
  stores: ConflictStore[]
  wholeStore?: boolean
  scopeHeading?: string
}) {
  const [keyword, setKeyword] = useState('')
  const term = keyword.trim().toLowerCase()
  const storeById = new Map(getResolvedStores().map((store) => [store.id, store]))
  const rows = stores.map((store) => ({ ...store, code: storeById.get(store.id)?.code ?? '—' }))
    .filter(({ id, name, code, areas }) => [id, name, code, ...(areas ?? [])].some((value) => value.toLowerCase().includes(term)))

  return (
    <div className="ld-conflict-dialog__stores">
      <SelectedProductSearchBar keyword={keyword} onChange={setKeyword} filteredCount={rows.length}
        totalCount={stores.length} itemLabel="门店" placeholder={wholeStore ? '搜索门店名称、编码或 ID' : '搜索门店名称、编码、ID 或点位'} />
      <DetailTable key={term} rows={rows} rowKey={({ id }) => id} filtering={Boolean(term)} emptyText="未找到匹配的门店或点位" showSinglePageCount={false}
        columns={<><th>门店名称</th><th>门店编码</th><th>门店 ID</th><th>{scopeHeading}</th></>}
        renderRow={({ name, code, id, areas }) => <><td>{name}</td><td>{code}</td><td>{id}</td><td>{areas?.join('、') ?? '整店'}</td></>} />
    </div>
  )
}

function ConflictProductTable({ productIds }: { productIds: string[] }) {
  const [keyword, setKeyword] = useState('')
  const products = resolveActivityProducts({ productScope: 'partial', productSelectionMode: 'include', productIds })
  const rows = filterProductsByKeyword(products, keyword)
  return (
    <div className="ld-conflict-dialog__stores">
      <SelectedProductSearchBar keyword={keyword} onChange={setKeyword} filteredCount={rows.length}
        totalCount={products.length} placeholder="搜索商品名称、编码、商品 ID 或 SKU ID" />
      <DetailTable key={keyword.trim()} rows={rows} rowKey={({ id }) => id} filtering={Boolean(keyword.trim())} emptyText="未找到匹配的商品"
        showSinglePageCount={false} columns={<><th>商品名称</th><th>商品编码</th><th>商品 ID</th><th>SKU ID</th></>}
        renderRow={({ name, code, id, skuId }) => <><td>{name}</td><td>{code || '—'}</td><td>{id}</td><td>{skuId || '—'}</td></>} />
    </div>
  )
}

export function LimitDiscountConflictDialog({ title, children, footer, onClose }: {
  title: string
  children: ReactNode
  footer: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog?.showModal()
    return () => {
      dialog?.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog ref={ref} className="modal modal--xl ld-area-dialog ld-conflict-dialog" aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }}
      onCancel={(event) => { event.preventDefault(); onClose() }}>
      <header className="modal__header">
        <h3 id={titleId}>{title}</h3>
        <button type="button" className="modal__close" aria-label="关闭弹窗" onClick={onClose}>×</button>
      </header>
      <div className="modal__body modal__body--scroll">{children}</div>
      <footer className="modal__footer">{footer}</footer>
    </dialog>
  )
}
