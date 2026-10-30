import { useMemo, useState } from 'react'
import { STATUS_LABELS } from '../mockData'
import type { MemberPriceActivityForm } from '../types'
import {
  buildMemberPriceConflictCompare,
  excludeConflictStoresFromMemberPrice,
  findMemberPriceConflicts,
  type MemberPriceConflict,
  type MemberPriceConflictCompareRow,
  type MemberPriceConflictToken,
} from '../utils/memberPriceActivity'

interface MemberPriceConflictPanelProps {
  activity: MemberPriceActivityForm
  activities: MemberPriceActivityForm[]
  readOnly?: boolean
  onChange: (activity: MemberPriceActivityForm) => void
  onGoStep: (step: number) => void
  onToast?: (message: string) => void
  /** 打开存量冲突活动编辑；saveDraftFirst 时先落当前草稿再跳转 */
  onEditStockActivity?: (id: string, options?: { saveDraftFirst?: boolean }) => void
}

export function MemberPriceConflictPanel({
  activity,
  activities,
  readOnly,
  onChange,
  onGoStep,
  onToast,
  onEditStockActivity,
}: MemberPriceConflictPanelProps) {
  const conflicts = useMemo(
    () => findMemberPriceConflicts(activity, activities),
    [activity, activities],
  )
  const [picked, setPicked] = useState<string[]>([])
  const [detailId, setDetailId] = useState<string | null>(null)
  const [adjustCurrentId, setAdjustCurrentId] = useState<string | null>(null)
  const [editStockId, setEditStockId] = useState<string | null>(null)

  if (conflicts.length === 0) {
    return (
      <div className="mp-conflict mp-conflict--ok" role="status">
        <div className="mp-conflict__title">冲突校验：未发现同类活动范围重叠</div>
        <p className="mp-conflict__hint">
          已对照待发布 / 未开始 / 进行中 / 暂停（未过期）的会员价活动，当前配置可继续保存。
        </p>
      </div>
    )
  }

  const pickedConflicts = conflicts.filter((c) => picked.includes(c.activity.id))
  const excludeStoreIds = [...new Set(pickedConflicts.flatMap((c) => c.storeIds))]
  const detail = conflicts.find((c) => c.activity.id === detailId) ?? null
  const detailIndex = detail ? conflicts.findIndex((c) => c.activity.id === detail.activity.id) : -1
  const adjustCurrent = conflicts.find((c) => c.activity.id === adjustCurrentId) ?? null
  const editStock = conflicts.find((c) => c.activity.id === editStockId) ?? null

  const togglePick = (id: string) => {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const applyExcludeStores = () => {
    if (excludeStoreIds.length === 0) return
    const next = excludeConflictStoresFromMemberPrice(activity, excludeStoreIds)
    if (next.storeScope === 'partial_include' && next.storeIds.length === 0) {
      onToast?.('排除后没有可参与门店，请改调时间、商品或优惠会员范围')
      return
    }
    onChange(next)
    setPicked([])
    onToast?.(`已排除 ${excludeStoreIds.length} 家冲突门店，请再次确认冲突结果`)
  }

  return (
    <div className="mp-conflict" id="mp-conflict-box">
      <div className="mp-conflict__title">
        ！冲突校验：检测到 {conflicts.length} 个同类活动与本活动范围重叠
      </div>
      <p className="mp-conflict__hint">
        可调整
        <button type="button" className="link-btn" onClick={() => onGoStep(0)}>时间 / 渠道 / 优惠会员</button>
        {' / '}
        <button type="button" className="link-btn" onClick={() => onGoStep(1)}>门店</button>
        {' / '}
        <button type="button" className="link-btn" onClick={() => onGoStep(2)}>商品</button>
        ，或勾选下方冲突活动后排除重叠门店。解除冲突后才能保存生效类活动。
      </p>

      <div className="mp-conflict__cards">
        {conflicts.map((item) => (
          <article key={item.activity.id} className={`mp-conflict__card ${picked.includes(item.activity.id) ? 'is-picked' : ''}`}>
            <div className="mp-conflict__card-head">
              {!readOnly && (
                <input
                  type="checkbox"
                  checked={picked.includes(item.activity.id)}
                  aria-label={`选择冲突活动 ${item.activity.name}`}
                  onChange={() => togglePick(item.activity.id)}
                />
              )}
              <b>{item.activity.name || '未命名活动'}</b>
              <span className={`status-badge status-badge--${item.activity.status}`}>
                {STATUS_LABELS[item.activity.status] ?? item.activity.status}
              </span>
            </div>
            <div className="mp-conflict__tags">
              <span>时间 {shortRange(item.activity.startTime, item.activity.endTime)}</span>
              <span className="is-hit">重叠门店 {item.storeIds.length} 家</span>
              <span className="is-hit">重叠商品 {item.productIds.length} 个</span>
              <span className="is-hit">优惠会员 {item.audienceHint}</span>
            </div>
            <p className="mp-conflict__guide">
              可通过排除 {item.storeNames.join('、')}
              {item.storeIds.length > item.storeNames.length ? ' 等' : ''}
              解除门店重叠；也可缩短活动时间或缩小商品 / 会员范围。
            </p>
            <div className="mp-conflict__card-foot">
              <span>创建人：{item.activity.creator}</span>
              <span className="mp-conflict__card-actions">
                <button type="button" className="link-btn" onClick={() => setDetailId(item.activity.id)}>冲突明细</button>
                {!readOnly && (
                  <>
                    <span className="mp-conflict__sep">|</span>
                    <button type="button" className="link-btn" onClick={() => setAdjustCurrentId(item.activity.id)}>
                      修改当前活动
                    </button>
                    <span className="mp-conflict__sep">|</span>
                    <button
                      type="button"
                      className="link-btn"
                      disabled={!onEditStockActivity}
                      title={!onEditStockActivity ? '暂不支持跳转编辑存量活动' : undefined}
                      onClick={() => setEditStockId(item.activity.id)}
                    >
                      修改存量活动
                    </button>
                  </>
                )}
              </span>
            </div>
          </article>
        ))}
      </div>

      {!readOnly && picked.length > 0 && (
        <div className="mp-conflict__fix">
          <div>
            <b>排除 {excludeStoreIds.length} 家门店</b>
            <p className="mp-conflict__hint">
              {excludeStoreIds.length === 0
                ? '所选冲突活动暂无重叠门店'
                : `将把重叠门店从本活动参与范围中排除：${pickedConflicts.flatMap((c) => c.storeNames).slice(0, 6).join('、')}${excludeStoreIds.length > 6 ? '…' : ''}`}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={excludeStoreIds.length === 0}
            onClick={applyExcludeStores}
          >
            排除冲突门店
          </button>
        </div>
      )}

      {detail && (
        <ConflictCompareModal
          current={activity}
          conflict={detail}
          conflicts={conflicts}
          activeIndex={detailIndex}
          readOnly={readOnly}
          onSelectConflict={(id) => setDetailId(id)}
          onClose={() => setDetailId(null)}
          onGoStep={(step) => { setDetailId(null); onGoStep(step) }}
          onEditCurrent={() => { setDetailId(null); setAdjustCurrentId(detail.activity.id) }}
          onEditStock={onEditStockActivity ? () => { setDetailId(null); setEditStockId(detail.activity.id) } : undefined}
        />
      )}

      {adjustCurrent && !readOnly && (
        <AdjustCurrentModal
          conflict={adjustCurrent}
          onClose={() => setAdjustCurrentId(null)}
          onGoStep={(step) => { setAdjustCurrentId(null); onGoStep(step) }}
          onOpenDetail={() => { setAdjustCurrentId(null); setDetailId(adjustCurrent.activity.id) }}
        />
      )}

      {editStock && !readOnly && onEditStockActivity && (
        <EditStockConfirmModal
          conflict={editStock}
          currentName={activity.name || '未命名活动'}
          onClose={() => setEditStockId(null)}
          onGoDirect={() => {
            const id = editStock.activity.id
            setEditStockId(null)
            onEditStockActivity(id)
          }}
          onSaveDraftThenGo={() => {
            const id = editStock.activity.id
            setEditStockId(null)
            onEditStockActivity(id, { saveDraftFirst: true })
          }}
        />
      )}
    </div>
  )
}

function AdjustCurrentModal({
  conflict,
  onClose,
  onGoStep,
  onOpenDetail,
}: {
  conflict: MemberPriceConflict
  onClose: () => void
  onGoStep: (step: number) => void
  onOpenDetail: () => void
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>修改当前活动</h3>
        </div>
        <div className="modal__body">
          <p className="mp-conflict__hint" style={{ marginBottom: 12 }}>
            与「{conflict.activity.name || '未命名活动'}」重叠。选择要调整的当前配置维度：
          </p>
          <div className="mp-conflict-adjust-list">
            <button type="button" className="mp-conflict-adjust-list__item" onClick={() => onGoStep(0)}>
              <b>调整时间 / 渠道 / 优惠会员</b>
              <span>缩短时间或缩小会员范围</span>
            </button>
            <button type="button" className="mp-conflict-adjust-list__item" onClick={() => onGoStep(1)}>
              <b>调整参与门店</b>
              <span>排除重叠门店：{conflict.storeNames.join('、') || `${conflict.storeIds.length} 家`}</span>
            </button>
            <button type="button" className="mp-conflict-adjust-list__item" onClick={() => onGoStep(2)}>
              <b>调整参与商品</b>
              <span>缩小商品范围，重叠 {conflict.productIds.length} 个</span>
            </button>
            <button type="button" className="mp-conflict-adjust-list__item" onClick={onOpenDetail}>
              <b>先看冲突明细对照</b>
              <span>对比当前与存量配置后再决定</span>
            </button>
          </div>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  )
}

function EditStockConfirmModal({
  conflict,
  currentName,
  onClose,
  onGoDirect,
  onSaveDraftThenGo,
}: {
  conflict: MemberPriceConflict
  currentName: string
  onClose: () => void
  onGoDirect: () => void
  onSaveDraftThenGo: () => void
}) {
  const other = conflict.activity
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>修改存量活动</h3>
        </div>
        <div className="modal__body">
          <p className="mp-conflict__hint" style={{ marginBottom: 8 }}>
            将离开「{currentName}」的编辑页，打开存量活动进行修改以解除冲突。
          </p>
          <div className="mp-conflict-stock-target">
            <b>{other.name || '未命名活动'}</b>
            <span className={`status-badge status-badge--${other.status}`}>
              {STATUS_LABELS[other.status]}
            </span>
            <em>{other.id}</em>
          </div>
          <p className="mp-conflict__hint" style={{ marginTop: 10, marginBottom: 0 }}>
            未保存的当前修改不会自动保留，建议先保存草稿再前往。
          </p>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
          <button type="button" className="btn btn--default" onClick={onGoDirect}>直接前往</button>
          <button type="button" className="btn btn--primary" onClick={onSaveDraftThenGo}>保存草稿并前往</button>
        </div>
      </div>
    </div>
  )
}

function ConflictCompareModal({
  current,
  conflict,
  conflicts,
  activeIndex,
  readOnly,
  onSelectConflict,
  onClose,
  onGoStep,
  onEditCurrent,
  onEditStock,
}: {
  current: MemberPriceActivityForm
  conflict: MemberPriceConflict
  conflicts: MemberPriceConflict[]
  activeIndex: number
  readOnly?: boolean
  onSelectConflict: (id: string) => void
  onClose: () => void
  onGoStep: (step: number) => void
  onEditCurrent?: () => void
  onEditStock?: () => void
}) {
  const rows = useMemo(
    () => buildMemberPriceConflictCompare(current, conflict),
    [current, conflict],
  )
  const other = conflict.activity

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--xl mp-conflict-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h3>冲突明细 · 配置对照</h3>
            <p className="modal__subtitle">
              当前活动「{current.name || '未命名'}」与存量活动对比；红色高亮为重叠枚举，任改一类即可推进解除冲突
            </p>
          </div>
        </div>
        <div className="modal__body modal__body--scroll">
          {conflicts.length > 1 && (
            <div className="mp-conflict-switch" role="tablist" aria-label="切换冲突活动">
              {conflicts.map((c, i) => (
                <button
                  key={c.activity.id}
                  type="button"
                  role="tab"
                  aria-selected={c.activity.id === other.id}
                  className={`mp-conflict-switch__item ${c.activity.id === other.id ? 'is-on' : ''}`}
                  onClick={() => onSelectConflict(c.activity.id)}
                >
                  <span className="mp-conflict-switch__idx">{i + 1}</span>
                  <span className="mp-conflict-switch__name">{c.activity.name || c.activity.id}</span>
                  <span className={`status-badge status-badge--${c.activity.status}`}>
                    {STATUS_LABELS[c.activity.status]}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="mp-conflict-compare__meta">
            <div>
              <span>对照活动</span>
              <b>{other.name || '未命名活动'}</b>
              <em>{other.id}</em>
              <span className={`status-badge status-badge--${other.status}`}>
                {STATUS_LABELS[other.status]}
              </span>
            </div>
            <div>
              <span>创建人</span>
              <b>{other.creator}</b>
              <span>第 {Math.max(activeIndex, 0) + 1} / {conflicts.length} 个冲突</span>
            </div>
          </div>

          <div className="mp-conflict-compare__banner" role="note">
            时间、优惠会员、门店、商品、渠道、场景均有交集；下表「重叠项」列已标红，优先调整门店或优惠会员通常最快解除。
          </div>

          <div className="mp-conflict-compare">
            <div className="mp-conflict-compare__head" aria-hidden>
              <span>配置项</span>
              <span>当前活动</span>
              <span>冲突活动</span>
              <span>重叠项（需调整）</span>
            </div>
            {rows.map((row) => (
              <CompareRow key={row.key} row={row} onGoStep={onGoStep} />
            ))}
          </div>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>关闭</button>
          {!readOnly && onEditStock && (
            <button type="button" className="btn btn--default" onClick={onEditStock}>修改存量活动</button>
          )}
          {!readOnly && onEditCurrent && (
            <button type="button" className="btn btn--default" onClick={onEditCurrent}>修改当前活动</button>
          )}
          {!readOnly && (
            <button type="button" className="btn btn--primary" onClick={() => onGoStep(1)}>去改门店</button>
          )}
        </div>
      </div>
    </div>
  )
}

function CompareRow({
  row,
  onGoStep,
}: {
  row: MemberPriceConflictCompareRow
  onGoStep: (step: number) => void
}) {
  return (
    <div className="mp-conflict-compare__row">
      <div className="mp-conflict-compare__label">
        <b>{row.label}</b>
        <button type="button" className="link-btn" onClick={() => onGoStep(row.step)}>去调整</button>
      </div>
      <div className="mp-conflict-compare__cell">
        <p className="mp-conflict-compare__summary">{row.currentSummary}</p>
        <TokenList tokens={row.currentTokens} />
      </div>
      <div className="mp-conflict-compare__cell">
        <p className="mp-conflict-compare__summary">{row.otherSummary}</p>
        <TokenList tokens={row.otherTokens} />
      </div>
      <div className="mp-conflict-compare__cell mp-conflict-compare__cell--hit">
        <p className="mp-conflict-compare__summary mp-conflict-compare__summary--hit">{row.overlapHint}</p>
        <TokenList tokens={row.overlapTokens} forceHit />
      </div>
    </div>
  )
}

function TokenList({
  tokens,
  forceHit,
}: {
  tokens: MemberPriceConflictToken[]
  forceHit?: boolean
}) {
  if (tokens.length === 0) return null
  const visible = tokens.slice(0, 12)
  const more = tokens.length - visible.length
  return (
    <div className="mp-conflict-tokens">
      {visible.map((t) => (
        <span
          key={t.id}
          className={`mp-conflict-token ${(forceHit || t.hit) ? 'is-hit' : ''}`}
          title={t.label}
        >
          {t.label}
        </span>
      ))}
      {more > 0 && <span className="mp-conflict-token mp-conflict-token--more">+{more}</span>}
    </div>
  )
}

function shortRange(start: string, end: string) {
  const s = start.slice(0, 10)
  const e = end.slice(0, 10)
  return `${s} ~ ${e}`
}
