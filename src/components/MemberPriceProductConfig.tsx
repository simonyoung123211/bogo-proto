import { useEffect, useMemo, useState } from 'react'
import { MEMBER_LEVELS, products } from '../mockData'
import { MEMBER_PRICE_METHOD_LABELS } from '../mockMemberPriceData'
import type { MemberLevelId, MemberPriceMethod, MemberPriceProductCoreFields, MemberPriceProductItem } from '../types'
import {
  defaultValueForMethod,
  isMemberSameAsDefault,
  memberSceneOverrides,
  orderTypeLabel,
  pruneMemberSameAsDefault,
  setMemberSceneOverride,
  syncProductItems,
  uniformDiscountItem,
  writeUniformDiscount,
} from '../utils/memberPriceActivity'
import { filterProductsByKeyword } from '../utils/productSearch'
import { ProductPicker } from './ProductPicker'
import {
  BatchRemoveConfirmModal,
  SelectedProductPager,
  SelectedProductSearchBar,
} from './SelectedProductTools'
import { TableSelectHeader } from './TableSelectHeader'

const PAGE_SIZE = 20

interface MemberPriceProductConfigProps<T extends MemberPriceProductCoreFields> {
  activity: T
  readOnly?: boolean
  onChange: (activity: T) => void
  onToast?: (message: string) => void
  /**
   * 是否展示会员等级选择。付费会员价的资格来自权益卡，
   * 不需要选择等级，传 false 隐藏该区块。
   */
  showMemberLevels?: boolean
  /** 优惠方式字段标题；储值支付等复用场景可覆盖默认「会员折扣方式」 */
  priceMethodLabel?: string
  /** 切换优惠方式时的提示文案 */
  priceMethodHint?: string
  /** 批量移除时的附加说明 */
  batchRemoveExtraNote?: string
  /**
   * 传入活动已选业务类型后，开放分业务设置。
   * 不传则保持原来的统一力度，供储值支付等复用场景使用。
   */
  sceneOrderTypes?: string[]
}

export function MemberPriceProductConfig<T extends MemberPriceProductCoreFields>({
  activity,
  readOnly,
  onChange,
  onToast,
  showMemberLevels = true,
  priceMethodLabel = '会员折扣方式',
  priceMethodHint = '切换优惠方式后，已填写的会员价数值将按默认值重置。',
  batchRemoveExtraNote,
  sceneOrderTypes,
}: MemberPriceProductConfigProps<T>) {
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [batchValue, setBatchValue] = useState('')
  const [page, setPage] = useState(1)
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  /** 勾选了当前筛选结果的全部条目（含未展示的其他页） */
  const [selectAllVisible, setSelectAllVisible] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [showBatchRemove, setShowBatchRemove] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editingUniform, setEditingUniform] = useState(false)
  const [batchScenes, setBatchScenes] = useState(false)
  const sceneEnabled = sceneOrderTypes != null
  const scenes = sceneOrderTypes ?? []
  const uniformItem = uniformDiscountItem(activity)

  const update = <K extends keyof T>(key: K, value: T[K]) => {
    onChange({ ...activity, [key]: value })
  }

  const memberLevels = activity.memberLevels ?? []

  const toggleLevel = (id: MemberLevelId) => {
    const next = memberLevels.includes(id)
      ? memberLevels.filter((x) => x !== id)
      : [...memberLevels, id]
    onChange({ ...activity, memberLevels: next })
  }

  const toggleAllLevels = () => {
    const next = memberLevels.length === MEMBER_LEVELS.length ? [] : MEMBER_LEVELS.map((l) => l.id)
    onChange({ ...activity, memberLevels: next })
  }

  const changePriceMethod = (method: MemberPriceMethod) => {
    const next = syncProductItems(
      {
        ...activity,
        priceMethod: method,
        allProductsValue: defaultValueForMethod(method),
        valueMode: 'unified',
        sceneValues: {},
      },
      activity.productIds,
      true,
    )
    onChange(next)
  }

  const changeSelectionMode = (mode: MemberPriceProductCoreFields['productSelectionMode']) => {
    if (mode === activity.productSelectionMode) return
    resetListState()
    onChange({
      ...activity,
      productSelectionMode: mode,
      productScope: mode === 'exclude' ? 'partial' : activity.productScope,
      productIds: [],
      productItems: [],
    })
  }

  const changeProductScope = (scope: MemberPriceProductCoreFields['productScope']) => {
    resetListState()
    if (scope === 'all') {
      onChange({ ...activity, productScope: 'all', productIds: [], productItems: [] })
    } else {
      onChange({ ...activity, productScope: 'partial' })
    }
  }

  /** 清空列表内的检索、分页与勾选状态 */
  const resetListState = () => {
    setKeyword('')
    setPage(1)
    setCheckedIds([])
    setSelectAllVisible(false)
  }

  const applyProductIds = (ids: string[]) => {
    if (isExclude) {
      onChange({ ...activity, productIds: ids, productItems: [] })
    } else {
      onChange(syncProductItems(activity, ids))
    }
  }

  /** 从「选择商品」弹窗返回：清掉检索条件，否则新加的商品可能被关键词挡住 */
  const setProductIds = (ids: string[]) => {
    resetListState()
    applyProductIds(ids)
  }

  const changeKeyword = (next: string) => {
    setKeyword(next)
    setPage(1)
    // 筛选范围变了，勾选一并清空，避免批量操作误伤筛选外的商品
    setCheckedIds([])
    setSelectAllVisible(false)
  }

  const updateItem = (productId: string, next: MemberPriceProductItem) => {
    update(
      'productItems',
      activity.productItems.map((item) => (item.productId === productId ? next : item)),
    )
  }

  const updateItemValue = (productId: string, value: number) => {
    const current = activity.productItems.find((item) => item.productId === productId)
    if (!current) return
    updateItem(productId, pruneMemberSameAsDefault({ ...current, value }))
  }

  /** 单条移除：保留当前检索条件与页码，方便连续处理同一批商品 */
  const removeProduct = (productId: string) => {
    setCheckedIds((prev) => prev.filter((id) => id !== productId))
    setSelectAllVisible(false)
    applyProductIds(activity.productIds.filter((id) => id !== productId))
  }

  const unitLabel = activity.priceMethod === 'discount' ? '折' : '元'
  const isExclude = activity.productSelectionMode === 'exclude'
  const itemLabel = isExclude ? '不参与商品' : '商品'
  const showUniformValue = activity.productScope === 'all' || (activity.productScope === 'partial' && isExclude)
  const selectedProducts = useMemo(
    () => products.filter((p) => activity.productIds.includes(p.id)),
    [activity.productIds],
  )
  const itemMap = new Map(activity.productItems.map((item) => [item.productId, item]))

  const filtering = keyword.trim().length > 0
  /** 关键词命中的已选商品，分页、勾选与批量操作都以这一批为作用域 */
  const visibleProducts = useMemo(
    () => filterProductsByKeyword(selectedProducts, keyword),
    [selectedProducts, keyword],
  )

  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = visibleProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const pageIds = pageRows.map((p) => p.id)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const allPageChecked = pageIds.length > 0 && pageIds.every((id) => checkedIds.includes(id) || selectAllVisible)
  const somePageChecked = pageIds.some((id) => checkedIds.includes(id) || selectAllVisible)
  const pageCheckState: 'none' | 'some' | 'all' = selectAllVisible || allPageChecked
    ? 'all'
    : somePageChecked
      ? 'some'
      : 'none'
  const hasSelection = selectAllVisible || checkedIds.length > 0
  const selectedCount = selectAllVisible ? visibleProducts.length : checkedIds.length
  const hasMultiplePages = visibleProducts.length > PAGE_SIZE

  const selectCurrentPage = () => {
    setSelectAllVisible(false)
    setCheckedIds((prev) => [...new Set([...prev.filter((id) => !pageIds.includes(id)), ...pageIds])])
  }

  const selectAllAcrossPages = () => {
    setSelectAllVisible(true)
    setCheckedIds(visibleProducts.map((p) => p.id))
  }

  const clearSelection = () => {
    setSelectAllVisible(false)
    setCheckedIds([])
  }

  const keepCurrentPageOnly = () => {
    setSelectAllVisible(false)
    setCheckedIds([...pageIds])
  }

  const togglePageCheck = () => {
    if (selectAllVisible || allPageChecked) {
      setSelectAllVisible(false)
      setCheckedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
      return
    }
    selectCurrentPage()
  }

  const toggleOneCheck = (id: string) => {
    setSelectAllVisible(false)
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const checkedTargets = () => (selectAllVisible ? visibleProducts.map((p) => p.id) : checkedIds)

  const removeChecked = () => {
    const targets = checkedTargets()
    if (targets.length === 0) return
    const targetSet = new Set(targets)
    applyProductIds(activity.productIds.filter((id) => !targetSet.has(id)))
    setCheckedIds([])
    setSelectAllVisible(false)
    setShowBatchRemove(false)
    onToast?.(`已移除 ${targets.length} 个${itemLabel}`)
  }

  const applyBatchDefault = () => {
    const num = Number(batchValue)
    if (!Number.isFinite(num) || batchValue.trim() === '') {
      onToast?.('请输入有效的默认力度')
      return
    }
    if (activity.priceMethod === 'discount' && (num < 0 || num > 9.9)) {
      onToast?.('折扣须在 0～9.9 折之间')
      return
    }
    if (activity.priceMethod !== 'discount' && num < 0) {
      onToast?.('金额不能为负数')
      return
    }
    const targets = checkedTargets()
    if (targets.length === 0) {
      onToast?.('请先勾选要批量设置的商品')
      return
    }
    const targetSet = new Set(targets)
    update(
      'productItems',
      activity.productItems.map((item) => (
        targetSet.has(item.productId) ? pruneMemberSameAsDefault({ ...item, value: num }) : item
      )),
    )
    setBatchValue('')
    onToast?.(`已为 ${targets.length} 个商品设置默认力度`)
  }

  // 勾选列 + 商品/规格/价格 + 折扣价（正选）+ 操作
  const colSpan = (isExclude ? 3 : 4) + (readOnly ? 0 : 2)

  return (
    <>
      {showMemberLevels && (
        <FormRow label="选择会员卡" required>
          <div className="member-level-group">
            <label className="checkbox member-level-group__all">
              <input
                type="checkbox"
                disabled={readOnly}
                checked={memberLevels.length === MEMBER_LEVELS.length}
                onChange={toggleAllLevels}
              />
              全选
            </label>
            <div className="checkbox-group checkbox-group--wrap">
              {MEMBER_LEVELS.map((level) => (
                <label key={level.id} className="checkbox">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={memberLevels.includes(level.id)}
                    onChange={() => toggleLevel(level.id)}
                  />
                  {level.label}
                </label>
              ))}
            </div>
            <p className="field-hint">至少选择一个会员等级；选中的等级会员购买参与商品时可享受会员价。</p>
          </div>
        </FormRow>
      )}

      <FormRow label={priceMethodLabel} required>
        <div>
          <RadioGroup
            disabled={readOnly}
            value={activity.priceMethod}
            options={[
              { value: 'discount', label: '折扣' },
              { value: 'fixed_reduction', label: '减价' },
              { value: 'special_price', label: '固定价格' },
            ]}
            onChange={(v) => changePriceMethod(v as MemberPriceMethod)}
          />
          <p className="field-hint">{priceMethodHint}</p>
        </div>
      </FormRow>

      <FormRow label="商品加入方式">
        <RadioGroup
          disabled={readOnly}
          value={activity.productSelectionMode}
          options={[
            { value: 'include', label: '参与商品(正选)' },
            { value: 'exclude', label: '不参与商品(反选)' },
          ]}
          onChange={(v) => changeSelectionMode(v as MemberPriceProductCoreFields['productSelectionMode'])}
        />
      </FormRow>

      <FormRow label="商品范围" required>
        <RadioGroup
          disabled={readOnly || isExclude}
          value={activity.productScope}
          options={[
            { value: 'all', label: '全部商品' },
            { value: 'partial', label: '部分商品' },
          ]}
          onChange={(v) => changeProductScope(v as MemberPriceProductCoreFields['productScope'])}
        />
      </FormRow>

      {showUniformValue && sceneEnabled ? (
        <FormRow label="优惠设置" required>
          <div>
            <p className="field-hint">
              {isExclude
                ? '余下商品共用一个默认力度，所有业务都按它执行。个别业务需要不同力度时，点「分业务设置」单独填写，没填的业务仍按默认力度。'
                : '全部商品共用一个默认力度，所有业务都按它执行。个别业务需要不同力度时，点「分业务设置」单独填写，没填的业务仍按默认力度。'}
            </p>
            {scenes.length === 0 && <p className="field-hint">分业务设置前，请先在基础信息里选择参与业务/场景。</p>}
            <div className="ld-item-mode">
              <div className="ld-item-mode__main">
                <input
                  type="number"
                  className="input input--num"
                  style={{ width: 88 }}
                  disabled={readOnly}
                  aria-label="默认优惠"
                  value={activity.allProductsValue}
                  step={activity.priceMethod === 'discount' ? 0.1 : 0.01}
                  min={0}
                  max={activity.priceMethod === 'discount' ? 9.9 : undefined}
                  onChange={(e) => onChange(writeUniformDiscount(activity, {
                    value: e.target.value === '' ? activity.allProductsValue : Number(e.target.value),
                  }))}
                />
                <span className="field-hint">{unitLabel}</span>
                {(!readOnly || memberSceneOverrides(scenes, uniformItem).length > 0) && (
                  <button
                    type="button"
                    className="link-btn"
                    disabled={scenes.length === 0}
                    title={scenes.length === 0 ? '请先选择参与业务/场景' : undefined}
                    onClick={() => setEditingUniform(true)}
                  >
                    {readOnly ? '查看分业务' : '分业务设置'}
                  </button>
                )}
              </div>
              {memberSceneOverrides(scenes, uniformItem).length > 0 && (
                <OverrideTagsButton
                  overrides={memberSceneOverrides(scenes, uniformItem)}
                  unitLabel={unitLabel}
                  onOpen={() => setEditingUniform(true)}
                />
              )}
            </div>
          </div>
        </FormRow>
      ) : showUniformValue ? (
        <FormRow label="优惠设置" required>
          <div>
            <div className="member-price-input">
              <span>{MEMBER_PRICE_METHOD_LABELS[activity.priceMethod]}</span>
              <input
                type="number"
                className="input input--num"
                disabled={readOnly}
                value={activity.allProductsValue}
                step={activity.priceMethod === 'discount' ? 0.1 : 0.01}
                min={0}
                max={activity.priceMethod === 'discount' ? 9.9 : undefined}
                onChange={(e) => update('allProductsValue', Number(e.target.value))}
              />
              <span>{unitLabel}</span>
            </div>
            <p className="field-hint">
              {isExclude
                ? '除下方所选不参与商品外，其余商品统一按该优惠值结算。'
                : '全部商品将统一按该优惠值结算；列表页不逐商品配置单价。'}
            </p>
          </div>
        </FormRow>
      ) : null}

      {activity.productScope === 'partial' && (
        <>
          {!readOnly && (
            <div className="section-toolbar member-price-toolbar">
              <button type="button" className="btn btn--primary" onClick={() => setShowProductPicker(true)}>
                {isExclude ? '选择不参与商品' : '选择商品'}
              </button>
            </div>
          )}

          {selectedProducts.length > 0 && (
            <SelectedProductSearchBar
              keyword={keyword}
              onChange={changeKeyword}
              filteredCount={visibleProducts.length}
              totalCount={selectedProducts.length}
              itemLabel={itemLabel}
              scopeHint={
                readOnly
                  ? undefined
                  : isExclude
                    ? '筛选期间的勾选与移除仅对筛选结果生效。'
                    : '筛选期间的勾选、批量设置与移除仅对筛选结果生效，不会影响筛选外的商品。'
              }
            />
          )}

          {!readOnly && hasSelection && (
            <div className="table-selection-bar">
              <div className="table-selection-bar__meta">
                {selectAllVisible ? (
                  <span>
                    已选{filtering ? '筛选结果全部' : '全部'} <strong>{selectedCount}</strong> 条
                  </span>
                ) : (
                  <span>
                    已选 <strong>{selectedCount}</strong> 条
                    {allPageChecked && checkedIds.length === pageIds.length ? '（当前页）' : ''}
                  </span>
                )}
                {hasMultiplePages && !selectAllVisible && (
                  <button type="button" className="link-btn" onClick={selectAllAcrossPages}>
                    {filtering ? '全选筛选结果' : '全选全部'} {visibleProducts.length} 条
                  </button>
                )}
                {selectAllVisible && (
                  <button type="button" className="link-btn" onClick={keepCurrentPageOnly}>
                    仅保留当前页
                  </button>
                )}
                <button type="button" className="link-btn" onClick={clearSelection}>清空</button>
                <button
                  type="button"
                  className="link-btn link-btn--danger"
                  onClick={() => setShowBatchRemove(true)}
                >
                  批量移除
                </button>
              </div>
              {!isExclude && activity.productItems.length > 0 && (
                <div className="member-price-batch ld-batch-bar">
                  <input
                    type="number"
                    className="input input--num"
                    style={{ width: 88 }}
                    value={batchValue}
                    placeholder="默认力度"
                    aria-label="批量默认力度"
                    onChange={(e) => setBatchValue(e.target.value)}
                    step={activity.priceMethod === 'discount' ? 0.1 : 0.01}
                    min={0}
                    max={activity.priceMethod === 'discount' ? 9.9 : undefined}
                  />
                  <span>{unitLabel}</span>
                  <button type="button" className="btn btn--default btn--sm" onClick={applyBatchDefault}>设置默认力度</button>
                  {sceneEnabled && (
                    <button
                      type="button"
                      className="link-btn"
                      disabled={scenes.length === 0}
                      title={scenes.length === 0 ? '请先选择参与业务/场景' : '为已选商品单独设置个别业务的力度'}
                      onClick={() => setBatchScenes(true)}
                    >
                      分业务设置
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {sceneEnabled && !isExclude && (
            <p className="field-hint" style={{ marginBottom: 8 }}>
              每个商品填一个默认力度，所有业务都按它执行。个别业务需要不同力度时，点「分业务设置」单独填写，没填的业务仍按默认力度。
              {scenes.length === 0 && ' 分业务设置前，请先在基础信息里选择参与业务/场景。'}
            </p>
          )}

          <table className="table member-price-table">
            <thead>
              <tr>
                {!readOnly && (
                  <th style={{ width: 88 }}>
                    <TableSelectHeader
                      checkState={pageCheckState}
                      disabled={pageIds.length === 0}
                      pageCount={pageIds.length}
                      totalCount={visibleProducts.length}
                      hasMultiplePages={hasMultiplePages}
                      onTogglePage={togglePageCheck}
                      onSelectPage={selectCurrentPage}
                      onSelectAll={selectAllAcrossPages}
                      allOptionLabel={filtering ? '全选筛选结果' : '全选全部'}
                    />
                  </th>
                )}
                <th>商品</th>
                <th>规格</th>
                <th>价格</th>
                {!isExclude && <th>折扣/价</th>}
                {!readOnly && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {visibleProducts.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="table-empty">
                    {filtering ? (
                      <>
                        没有匹配「{keyword.trim()}」的已选{itemLabel}
                        <button type="button" className="link-btn" onClick={() => changeKeyword('')}>
                          清除筛选
                        </button>
                      </>
                    ) : isExclude ? (
                      '暂无不参与商品，请点击「选择不参与商品」添加'
                    ) : (
                      '暂无商品，请点击「选择商品」添加'
                    )}
                  </td>
                </tr>
              ) : (
                pageRows.map((p) => (
                  <tr key={p.id}>
                    {!readOnly && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectAllVisible || checkedIds.includes(p.id)}
                          onChange={() => toggleOneCheck(p.id)}
                        />
                      </td>
                    )}
                    <td>
                      <div className="order-product">
                        <div className="order-product__img order-product__img--sm" aria-hidden>
                          {p.image
                            ? <img src={p.image} alt="" />
                            : <span className="order-product__placeholder">QM</span>}
                        </div>
                        <div className="order-product__meta">
                          <div>{p.name}</div>
                          <div className="text-secondary mono">{p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.spec}</td>
                    <td>¥{p.price}</td>
                    {!isExclude && (
                      <td>
                        <ProductStrengthCell
                          productName={p.name}
                          item={itemMap.get(p.id)}
                          unitLabel={unitLabel}
                          priceMethod={activity.priceMethod}
                          readOnly={readOnly}
                          sceneEnabled={sceneEnabled}
                          scenes={scenes}
                          onValueChange={(value) => updateItemValue(p.id, value)}
                          onOpenScenes={() => setEditingProductId(p.id)}
                        />
                      </td>
                    )}
                    {!readOnly && (
                      <td>
                        <button type="button" className="link-btn" onClick={() => removeProduct(p.id)}>
                          删除
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {visibleProducts.length > 0 && (
            <SelectedProductPager
              total={visibleProducts.length}
              pageSize={PAGE_SIZE}
              currentPage={currentPage}
              totalPages={totalPages}
              filtering={filtering}
              onChange={setPage}
            />
          )}
        </>
      )}

      {showBatchRemove && (
        <BatchRemoveConfirmModal
          count={selectedCount}
          filtering={filtering}
          itemLabel={itemLabel}
          extraNote={
            isExclude
              ? undefined
              : (batchRemoveExtraNote ?? '已填写的会员价优惠值会一并清除。')
          }
          onCancel={() => setShowBatchRemove(false)}
          onConfirm={removeChecked}
        />
      )}

      {editingProductId && (
        <MemberSceneDialog
          activity={activity}
          productId={editingProductId}
          scenes={scenes}
          readOnly={readOnly}
          onChangeItem={(next) => updateItem(next.productId, next)}
          onClose={() => setEditingProductId(null)}
        />
      )}
      {editingUniform && (
        <MemberSceneDialog
          activity={activity}
          uniform
          scenes={scenes}
          readOnly={readOnly}
          onChangeItem={() => undefined}
          onActivity={(next) => onChange(next)}
          onClose={() => setEditingUniform(false)}
        />
      )}
      {batchScenes && (
        <MemberBatchSceneDialog
          activity={activity}
          productIds={checkedTargets()}
          scenes={scenes}
          onApply={(items) => { update('productItems', items); setBatchScenes(false) }}
          onClose={() => setBatchScenes(false)}
        />
      )}

      {showProductPicker && (
        <ProductPicker
          selectedIds={activity.productIds}
          onChange={setProductIds}
          onClose={() => setShowProductPicker(false)}
          title={isExclude ? '选择不参与商品' : '选择商品'}
        />
      )}
    </>
  )
}

function MemberBatchSceneDialog<T extends MemberPriceProductCoreFields>({
  activity,
  productIds,
  scenes,
  onApply,
  onClose,
}: {
  activity: T
  productIds: string[]
  scenes: string[]
  onApply: (items: MemberPriceProductItem[]) => void
  onClose: () => void
}) {
  const [defaultValue, setDefaultValue] = useState('')
  const [sceneValues, setSceneValues] = useState<Record<string, string>>({})
  const [cleared, setCleared] = useState<Record<string, boolean>>({})
  const unitLabel = activity.priceMethod === 'discount' ? '折' : '元'
  const inputRange = {
    min: 0,
    max: activity.priceMethod === 'discount' ? 9.9 : undefined,
    step: activity.priceMethod === 'discount' ? 0.1 : 0.01,
  }
  const defaultNumber = defaultValue.trim() === '' ? null : Number(defaultValue)
  const apply = () => {
    const ids = new Set(productIds)
    onApply(activity.productItems.map((item) => {
      if (!ids.has(item.productId)) return item
      let next = item
      if (defaultNumber != null && !Number.isNaN(defaultNumber)) next = { ...next, value: defaultNumber }
      scenes.forEach((sceneId) => {
        if (cleared[sceneId]) next = setMemberSceneOverride(next, sceneId, null)
        else if (sceneValues[sceneId]?.trim()) {
          const value = Number(sceneValues[sceneId])
          if (!Number.isNaN(value)) next = setMemberSceneOverride(next, sceneId, value)
        }
      })
      return pruneMemberSameAsDefault(next)
    }))
  }
  const filledCount = scenes.filter((sceneId) => sceneValues[sceneId]?.trim() || cleared[sceneId]).length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--scene" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h3>已选 {productIds.length} 个商品 · 分业务设置</h3>
            <p className="modal__subtitle">只填写要改的项，留空的保持各商品原样。与该商品默认力度相同的，按默认处理。</p>
          </div>
          <button type="button" className="modal__close" aria-label="关闭" onClick={onClose}>×</button>
        </div>
        <div className="modal__body modal__body--scroll">
          <div className="ld-scene-default">
            <span className="ld-scene-default__label">默认{MEMBER_PRICE_METHOD_LABELS[activity.priceMethod]}</span>
            <input
              className="input"
              style={{ width: 88 }}
              type="number"
              {...inputRange}
              placeholder="不修改"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
            />
            <span className="field-hint">{unitLabel}</span>
            <span className="field-hint">填写后覆盖已选商品的默认力度</span>
          </div>
          {scenes.length === 0 ? (
            <p className="field-hint">请先在基础信息里选择参与业务/场景。</p>
          ) : (
            <>
              <div className="ld-scene-grid__head">
                <span>需要不同力度的业务填写即可，本次将调整 {filledCount}/{scenes.length} 个</span>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setSceneValues({})
                    setCleared(Object.fromEntries(scenes.map((sceneId) => [sceneId, true])))
                  }}
                >
                  全部恢复默认
                </button>
              </div>
              <div className="ld-scene-grid">
                {scenes.map((sceneId) => {
                  const raw = sceneValues[sceneId] ?? ''
                  const value = raw.trim() === '' ? null : Number(raw)
                  const isSame = value != null && defaultNumber != null && value === defaultNumber
                  const isCleared = Boolean(cleared[sceneId]) && raw.trim() === ''
                  return (
                    <div key={sceneId} className={`ld-scene-grid__item ${isSame ? 'is-same' : value != null ? 'is-set' : ''}`}>
                      <label className="ld-scene-grid__name" htmlFor={`mp-batch-scene-${sceneId}`}>{orderTypeLabel(sceneId)}</label>
                      <input
                        id={`mp-batch-scene-${sceneId}`}
                        className="input"
                        style={{ width: 120 }}
                        type="number"
                        {...inputRange}
                        placeholder={isCleared ? '恢复默认' : '不修改'}
                        value={raw}
                        onChange={(e) => {
                          setSceneValues((prev) => ({ ...prev, [sceneId]: e.target.value }))
                          setCleared((prev) => ({ ...prev, [sceneId]: false }))
                        }}
                      />
                      {value != null && !isSame && <span className="field-hint">{unitLabel}</span>}
                      {!isCleared && (
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => {
                            setSceneValues((prev) => ({ ...prev, [sceneId]: '' }))
                            setCleared((prev) => ({ ...prev, [sceneId]: true }))
                          }}
                        >
                          恢复默认
                        </button>
                      )}
                      {isSame && <span className="ld-scene-grid__warn">与默认相同，无需单独设置</span>}
                      {isCleared && <span className="field-hint">已选商品的该业务将按默认力度</span>}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
          <button type="button" className="btn btn--primary" onClick={apply}>完成</button>
        </div>
      </div>
    </div>
  )
}

function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="form-row">
      <label className="form-label">{required && <span className="required">*</span>}{label}</label>
      <div className="form-control">{children}</div>
    </div>
  )
}

function RadioGroup({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="radio-group">
      {options.map((opt) => (
        <label key={opt.value} className="radio">
          <input type="radio" disabled={disabled} checked={value === opt.value} onChange={() => onChange(opt.value)} />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

/** 单元格内默认露出的分业务标签数；超出用「查看更多」入口 */
const OVERRIDE_TAG_LIMIT = 4

function OverrideTagsButton({
  overrides,
  unitLabel,
  onOpen,
}: {
  overrides: { sceneId: string; value: number }[]
  unitLabel: string
  onOpen: () => void
}) {
  const shown = overrides.slice(0, OVERRIDE_TAG_LIMIT)
  const rest = overrides.length - shown.length
  const fullText = overrides
    .map(({ sceneId, value }) => `${orderTypeLabel(sceneId)} ${value}${unitLabel}`)
    .join('；')
  return (
    <div className="ld-override-tags">
      {shown.map(({ sceneId, value }) => (
        <button
          key={sceneId}
          type="button"
          className="ld-override-tag"
          title={`单独设置：${fullText}`}
          onClick={onOpen}
        >
          {orderTypeLabel(sceneId)}<strong>{value}</strong>{unitLabel}
        </button>
      ))}
      {rest > 0 && (
        <button
          type="button"
          className="ld-override-more"
          title={`还有 ${rest} 项：${overrides.slice(OVERRIDE_TAG_LIMIT).map(({ sceneId, value }) => `${orderTypeLabel(sceneId)} ${value}${unitLabel}`).join('；')}`}
          onClick={onOpen}
        >
          查看更多<span className="ld-override-more__count">+{rest}</span>
        </button>
      )}
    </div>
  )
}

function ProductStrengthCell({
  productName,
  item,
  unitLabel,
  priceMethod,
  readOnly,
  sceneEnabled,
  scenes,
  onValueChange,
  onOpenScenes,
}: {
  productName: string
  item: MemberPriceProductItem | undefined
  unitLabel: string
  priceMethod: MemberPriceMethod
  readOnly?: boolean
  sceneEnabled: boolean
  scenes: string[]
  onValueChange: (value: number) => void
  onOpenScenes: () => void
}) {
  const overrides = item ? memberSceneOverrides(scenes, item) : []
  return (
    <div className="ld-item-mode">
      <div className="ld-item-mode__main">
        <input
          type="number"
          className="input input--num"
          style={{ width: 88 }}
          aria-label={`${productName}默认优惠`}
          disabled={readOnly}
          value={item?.value ?? ''}
          step={priceMethod === 'discount' ? 0.1 : 0.01}
          min={0}
          max={priceMethod === 'discount' ? 9.9 : undefined}
          onChange={(e) => onValueChange(Number(e.target.value))}
        />
        <span>{unitLabel}</span>
        {sceneEnabled && (!readOnly || overrides.length > 0) && (
          <button
            type="button"
            className="link-btn"
            disabled={scenes.length === 0}
            title={scenes.length === 0 ? '请先选择参与业务/场景' : undefined}
            onClick={onOpenScenes}
          >
            {readOnly ? '查看分业务' : '分业务设置'}
          </button>
        )}
      </div>
      {overrides.length > 0 && (
        <OverrideTagsButton overrides={overrides} unitLabel={unitLabel} onOpen={onOpenScenes} />
      )}
    </div>
  )
}

function MemberSceneDialog<T extends MemberPriceProductCoreFields>({
  activity,
  productId,
  uniform,
  scenes,
  readOnly,
  onChangeItem,
  onActivity,
  onClose,
}: {
  activity: T
  productId?: string
  uniform?: boolean
  scenes: string[]
  readOnly?: boolean
  onChangeItem: (item: MemberPriceProductItem) => void
  onActivity?: (activity: T) => void
  onClose: () => void
}) {
  const item = uniform ? uniformDiscountItem(activity) : activity.productItems.find((row) => row.productId === productId)
  const product = uniform ? undefined : products.find((row) => row.id === productId)
  if (!item || (!uniform && !product)) return null
  const commit = (next: MemberPriceProductItem, prune = false) => {
    const saved = prune ? pruneMemberSameAsDefault(next) : next
    if (uniform) onActivity?.(writeUniformDiscount(activity, { value: saved.value, sceneValues: saved.sceneValues }))
    else onChangeItem(saved)
  }
  const unitLabel = activity.priceMethod === 'discount' ? '折' : '元'
  const inputRange = {
    min: 0,
    max: activity.priceMethod === 'discount' ? 9.9 : undefined,
    step: activity.priceMethod === 'discount' ? 0.1 : 0.01,
  }
  const setOverride = (sceneId: string, value: number | null) => {
    commit(setMemberSceneOverride(item, sceneId, value))
  }
  const close = () => {
    if (!readOnly) commit(item, true)
    onClose()
  }
  const overrideCount = memberSceneOverrides(scenes, item).length

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal modal--scene" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h3>{uniform ? (activity.productSelectionMode === 'exclude' ? '余下商品 · 分业务设置' : '全部商品 · 分业务设置') : `${product?.name} · 分业务设置`}</h3>
            {product && <p className="modal__subtitle">销售价 ¥{product.price}</p>}
          </div>
          <button type="button" className="modal__close" aria-label="关闭" onClick={close}>×</button>
        </div>
        <div className="modal__body modal__body--scroll">
          <div className="ld-scene-default">
            <span className="ld-scene-default__label">默认{MEMBER_PRICE_METHOD_LABELS[activity.priceMethod]}</span>
            <input
              className="input"
              style={{ width: 88 }}
              type="number"
              {...inputRange}
              disabled={readOnly}
              value={item.value}
              onChange={(e) => commit(pruneMemberSameAsDefault({ ...item, value: Number(e.target.value) }))}
            />
            <span className="field-hint">{unitLabel}</span>
            <span className="field-hint">未单独设置的业务按默认力度执行</span>
          </div>
          {scenes.length === 0 ? (
            <p className="field-hint">请先在基础信息里选择参与业务/场景。</p>
          ) : (
            <>
              <div className="ld-scene-grid__head">
                <span>需要不同力度的业务填写即可，已单独设置 {overrideCount}/{scenes.length} 个</span>
                {!readOnly && overrideCount > 0 && (
                  <button type="button" className="link-btn" onClick={() => commit({ ...item, sceneValues: {} })}>全部恢复默认</button>
                )}
              </div>
              <div className="ld-scene-grid">
                {scenes.map((sceneId) => {
                  const override = item.sceneValues?.[sceneId]
                  const isSet = override != null && !Number.isNaN(override)
                  const isSame = isMemberSameAsDefault(item, sceneId)
                  return (
                    <div key={sceneId} className={`ld-scene-grid__item ${isSame ? 'is-same' : isSet ? 'is-set' : ''}`}>
                      <label className="ld-scene-grid__name" htmlFor={`mp-scene-${sceneId}`}>{orderTypeLabel(sceneId)}</label>
                      <input
                        id={`mp-scene-${sceneId}`}
                        className="input"
                        style={{ width: 120 }}
                        type="number"
                        {...inputRange}
                        disabled={readOnly}
                        placeholder={`默认 ${item.value}`}
                        value={isSet ? override : ''}
                        onChange={(e) => setOverride(sceneId, e.target.value === '' ? null : Number(e.target.value))}
                      />
                      {isSet && !isSame && <span className="field-hint">{unitLabel}</span>}
                      {isSet && !isSame && !readOnly && (
                        <button type="button" className="link-btn" onClick={() => setOverride(sceneId, null)}>恢复默认</button>
                      )}
                      {isSame && !readOnly && <span className="ld-scene-grid__warn">与默认相同，无需单独设置</span>}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--primary" onClick={close}>{readOnly ? '知道了' : '完成'}</button>
        </div>
      </div>
    </div>
  )
}
