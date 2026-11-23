import { useEffect, useId, useRef, useState } from 'react'
import { DISCOUNT_STORE_POLICY_REASONS, storeHasDiscountTag } from '../mockLimitDiscountAreas'
import { LIMIT_DISCOUNT_STORE_TAGS } from '../mockLimitDiscountData'
import type { LimitDiscountActivityForm, LimitDiscountStoreMode, Store } from '../types'
import { discountAreaCoverage, resolveDiscountStoreScope } from '../utils/limitDiscountScope'
import { LimitDiscountAreaFields } from './LimitDiscountAreaFields'
import { LimitDiscountStoreTagPicker, type StoreTagOption } from './LimitDiscountStoreTagPicker'
import { PromoFormRow, PromoSection } from './promoWizardUi'
import { StorePicker } from './StorePicker'

const STORE_MODES = [
  { value: 'all', label: '全部门店' },
  { value: 'include', label: '指定门店参与' },
  { value: 'exclude', label: '指定门店不参与' },
  { value: 'tag_include', label: '指定门店标签参与' },
  { value: 'tag_exclude', label: '指定门店标签不参与' },
] as const

const OPPOSITE_MODE: Partial<Record<LimitDiscountStoreMode, LimitDiscountStoreMode>> = {
  include: 'exclude',
  exclude: 'include',
  tag_include: 'tag_exclude',
  tag_exclude: 'tag_include',
}

interface StoreDetails {
  title: string
  note: string
  stores: Store[]
  empty: string
}

interface Props {
  activity: LimitDiscountActivityForm
  onChange: (activity: LimitDiscountActivityForm) => void
}

export function LimitDiscountStoreScopeFields({ activity, onChange }: Props) {
  const [details, setDetails] = useState<StoreDetails | null>(null)
  const [pickingTags, setPickingTags] = useState(false)
  const [reversed, setReversed] = useState(false)
  const { storeMode, storeIds, storeTagIds, areaMode } = activity
  const { scopeError, openStores, tagMatches, matchedStores, policyExcludedStores, eligibleStores } = resolveDiscountStoreScope(activity)
  const coverage = discountAreaCoverage(activity, eligibleStores)
  const byStore = storeMode === 'include' || storeMode === 'exclude'
  const byTag = storeMode === 'tag_include' || storeMode === 'tag_exclude'
  const excluding = storeMode === 'exclude' || storeMode === 'tag_exclude'
  const tagOptions: StoreTagOption[] = byTag ? LIMIT_DISCOUNT_STORE_TAGS.map((tag) => ({
    ...tag,
    linkedStores: openStores.filter((store) => storeHasDiscountTag(store.id, tag.id)),
  })) : []
  const selectedTags = tagOptions.filter((tag) => storeTagIds.includes(tag.id))

  function changeMode(value: LimitDiscountStoreMode) {
    setReversed(value === OPPOSITE_MODE[storeMode])
    onChange({ ...activity, storeMode: value })
  }

  function changeTags(ids: string[]) {
    setReversed(false)
    onChange({ ...activity, storeTagIds: ids })
  }

  function showPolicyStores(stores: Store[], currentScope: boolean) {
    setDetails({
      title: currentScope ? '策略扣除门店' : '门店策略（示例）',
      note: currentScope ? '以下门店符合当前门店规则，因门店策略被扣除。' : '以下营业门店的演示策略设为不适用限时折扣。',
      stores,
      empty: '当前没有需扣除的策略门店',
    })
  }

  return (
    <PromoSection title="参与门店">
      <div className="ld-scope-policy">
        <p className="field-hint">门店策略设为不适用限时折扣的门店将从可参与范围及选区中扣除。</p>
        <button type="button" className="link-btn" aria-haspopup="dialog"
          onClick={() => showPolicyStores(openStores.filter(({ id }) => DISCOUNT_STORE_POLICY_REASONS[id]), false)}>查看策略门店</button>
      </div>
      <PromoFormRow label="门店范围" required>
        <div className="radio-group">
          {STORE_MODES.map(({ value, label }) => (
            <label key={value} className="radio">
              <input type="radio" name="limitDiscountStoreMode" checked={storeMode === value} onChange={() => changeMode(value)} />
              {label}
            </label>
          ))}
        </div>
        {reversed && byStore && storeIds.length > 0 && (
          <p className="field-hint" role="status">原名单中的 {storeIds.length} 家门店现作为{excluding ? '不参与' : '参与'}名单。</p>
        )}
        {reversed && byTag && selectedTags.length > 0 && (
          <p className="field-hint" role="status">原来选中的 {selectedTags.length} 个标签现用于{excluding ? '排除' : '纳入'}门店。</p>
        )}
      </PromoFormRow>
      {byStore && (
        <StorePicker
          hideScopeRadios searchById searchSelected
          scope={excluding ? 'partial_exclude' : 'partial_include'}
          selectedIds={storeIds}
          selectedTitle={excluding ? '不参与门店' : '参与门店'}
          storeRestrictions={excluding ? undefined : DISCOUNT_STORE_POLICY_REASONS}
          onScopeChange={() => undefined}
          onChange={(ids) => { setReversed(false); onChange({ ...activity, storeIds: ids }) }}
        />
      )}
      {byTag && (
        <PromoFormRow label="门店标签" required>
          <div className="ld-scope-tags">
            <div className="ld-scope-tags__toolbar">
              <button type="button" className="btn btn--default" aria-haspopup="dialog"
                onClick={() => setPickingTags(true)}>{selectedTags.length ? '调整标签' : '选择标签'}</button>
              <span className="field-hint" role="status">
                {selectedTags.length
                  ? `已选 ${selectedTags.length} 个标签 · ${excluding ? '排除' : '命中'} ${tagMatches.length} 家营业门店（已去重）`
                  : '尚未选择标签'}
              </span>
            </div>
            {selectedTags.length > 0 && (
              <div className="ld-scope-tags__table">
                <table className="table table--compact" aria-label="已选门店标签">
                  <thead>
                    <tr><th>标签名称</th><th>关联营业门店</th><th>操作</th></tr>
                  </thead>
                  <tbody>
                    {selectedTags.map(({ id, label, linkedStores }) => (
                      <tr key={id}>
                        <td>{label}</td>
                        <td>{linkedStores.length} 家</td>
                        <td className="ld-scope-tags__actions">
                          <button type="button" className="link-btn" aria-haspopup="dialog" aria-label={`查看${label}关联门店`}
                            onClick={() => setDetails({
                              title: `${label} · 关联门店`,
                              note: excluding ? '该标签关联的营业门店均已列入排除范围。' : '策略不适用的门店将从活动候选中扣除。',
                              stores: linkedStores,
                              empty: '此标签暂无关联的营业门店',
                            })}>查看门店</button>
                          <button type="button" className="link-btn" aria-label={`移除${label}`}
                            onClick={() => changeTags(storeTagIds.filter((tag) => tag !== id))}>移除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {pickingTags && (
            <LimitDiscountStoreTagPicker tags={tagOptions} selectedIds={storeTagIds} excluding={excluding}
              onClose={() => setPickingTags(false)}
              onConfirm={(ids) => { changeTags(ids); setPickingTags(false) }} />
          )}
        </PromoFormRow>
      )}
      <LimitDiscountAreaFields activity={activity} coverage={coverage} scopeError={scopeError} onChange={onChange} />
      <section className="ld-scope-review" aria-labelledby="ld-scope-review-title">
        <h3 id="ld-scope-review-title">生效门店核对</h3>
        {scopeError ? <p className="field-hint">{scopeError}，配置完成后显示核对结果。</p> : (
          <dl className="ld-scope-review__counts" aria-live="polite">
            <div><dt>门店规则命中</dt><dd>{matchedStores.length} 家</dd></div>
            <div>
              <dt>策略扣除</dt>
              <dd>{policyExcludedStores.length} 家
                {policyExcludedStores.length > 0 && <button type="button" className="link-btn" aria-haspopup="dialog"
                  onClick={() => showPolicyStores(policyExcludedStores, true)}>查看明细</button>}
              </dd>
            </div>
            <div><dt>实际可参与</dt><dd>{eligibleStores.length} 家</dd></div>
            {areaMode === 'specified' && (
              <>
                <div><dt>有可选点餐区</dt><dd>{coverage.availableStoreCount} 家</dd></div>
                <div><dt>已选点位覆盖</dt><dd>{coverage.selected.length} 家 · {coverage.selectedAreaCount} 个区域</dd></div>
              </>
            )}
          </dl>
        )}
        {!scopeError && excluding && (
          <p className="field-hint">从 {openStores.length} 家营业门店中先排除 {openStores.length - matchedStores.length} 家，再扣除剩余范围内的策略门店。</p>
        )}
      </section>
      {details && <StoreDetailsDialog details={details} onClose={() => setDetails(null)} />}
    </PromoSection>
  )
}

function StoreDetailsDialog({ details, onClose }: { details: StoreDetails; onClose: () => void }) {
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
    <dialog className="modal modal--lg ld-area-dialog" ref={ref} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <header className="modal__header">
        <h3 id={titleId}>{details.title}</h3>
        <button type="button" className="modal__close" aria-label="关闭明细" onClick={onClose}>×</button>
      </header>
      <div className="modal__body">
        <p className="field-hint">{details.note}</p>
        {details.stores.length === 0 ? <p className="scope-snapshot__empty">{details.empty}</p> : (
          <div className="scope-snapshot__table-wrap">
            <table className="table table--compact">
              <thead><tr><th>门店名称</th><th>门店编码</th><th>门店 ID</th><th>门店策略</th></tr></thead>
              <tbody>
                {details.stores.map((store) => (
                  <tr key={store.id}>
                    <td>{store.name}</td><td>{store.code}</td><td>{store.id}</td>
                    <td>{DISCOUNT_STORE_POLICY_REASONS[store.id] ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <footer className="modal__footer">
        <button type="button" className="btn btn--default" onClick={onClose}>关闭</button>
      </footer>
    </dialog>
  )
}
