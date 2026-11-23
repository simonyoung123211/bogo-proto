import { useState } from 'react'
import type { LimitDiscountActivityForm } from '../types'
import { discountAreaSceneSummary } from '../utils/limitDiscountActivity'
import {
  updateAreaSelection,
  type DiscountAreaCoverage,
  type DiscountAreaRows,
} from '../utils/limitDiscountScope'
import { AreaBatchCheckbox, LimitDiscountAreaPicker } from './LimitDiscountAreaPicker'
import { PromoFormRow } from './promoWizardUi'

interface Props {
  activity: LimitDiscountActivityForm
  coverage: DiscountAreaCoverage
  scopeError?: string
  onChange: (value: LimitDiscountActivityForm) => void
}

export function LimitDiscountAreaFields({ activity, coverage, scopeError, onChange }: Props) {
  const [picking, setPicking] = useState(false)
  const [marked, setMarked] = useState<LimitDiscountActivityForm['areaIdsByStore']>({})
  const { specified, coversWholeStores, catalog, availableStoreCount, selected, selectedAreaCount: count } = coverage
  const areaScenes = discountAreaSceneSummary(activity)
  const hasInactiveSelection = !areaScenes && activity.areaMode === 'specified' && Object.keys(activity.areaIdsByStore).length > 0
  const scopeStoreIds = new Set(catalog.map(({ store }) => store.id))
  const outsideScope = specified && !scopeError
    ? Object.entries(activity.areaIdsByStore).filter(([storeId, ids]) => ids.length && !scopeStoreIds.has(storeId))
    : []
  const outsideAreaCount = outsideScope.reduce((total, [, ids]) => total + ids.length, 0)
  const scopeHint = scopeError ?? (catalog.length === 0
    ? '当前范围内没有可参与门店'
    : availableStoreCount === 0 ? '当前范围内没有可选点餐区' : `${availableStoreCount} 家门店可选点餐区`)

  const toRemove = selected.map(({ store, areas }) => ({
    store, areas: areas.filter((area) => marked[store.id]?.includes(area.id)),
  })).filter((row) => row.areas.length > 0)
  const removeCount = toRemove.reduce((total, row) => total + row.areas.length, 0)

  function mark(groups: DiscountAreaRows, checked: boolean) {
    setMarked((previous) => updateAreaSelection(previous, groups, checked))
  }

  function removeMarked() {
    onChange({ ...activity, areaIdsByStore: updateAreaSelection(activity.areaIdsByStore, toRemove, false) })
    setMarked({})
  }

  return (
    <PromoFormRow label="区域限制" required={Boolean(areaScenes)}>
      <div className="radio-group">
        {(['all', 'specified'] as const).map((mode) => (
          <label className="radio" key={mode}>
            <input type="radio" name="discountAreaMode" checked={mode === 'specified' ? specified : !specified}
              disabled={mode === 'specified' && !areaScenes} aria-describedby="ld-area-scene-hint"
              onChange={() => { setMarked({}); onChange({ ...activity, areaMode: mode }) }} />
            {mode === 'all' ? '不限区域' : '指定区域'}
          </label>
        ))}
      </div>
      <p className="field-hint" id="ld-area-scene-hint">
        {specified ? `${areaScenes}订单仅在已选点餐区域生效。` : '仅堂食和外带支持指定区域。'}
        {specified && coversWholeStores && '其余已选业务按参与门店范围生效。'}
        {hasInactiveSelection && '重新选择堂食或外带可恢复已选点位，保存当前配置将清除这些点位。'}
      </p>
      {specified && (
        <>
          <div className="ld-area-picker__bar">
            <button type="button" className="btn btn--primary" aria-haspopup="dialog"
              aria-describedby="ld-area-scope-hint" disabled={!availableStoreCount}
              onClick={() => setPicking(true)}>选择区域</button>
            {count > 0 && (
              <button type="button" className="btn btn--default ld-area-remove" disabled={!removeCount} onClick={removeMarked}>
                批量移除{removeCount > 0 && `（${removeCount}）`}
              </button>
            )}
            <span id="ld-area-scope-hint" role="status">{scopeHint}</span>
            {!scopeError && <span aria-live="polite">已选 {selected.length} 家门店 · {count} 个区域</span>}
          </div>
          {availableStoreCount > 0 && availableStoreCount < catalog.length && (
            <p className="field-hint">实际可参与的 {catalog.length} 家门店中，有 {catalog.length - availableStoreCount} 家暂无可选点餐区。</p>
          )}
          {outsideAreaCount > 0 && (
            <div className="alert-banner alert-banner--warning" role="status">
              <span className="alert-banner__icon" aria-hidden="true">!</span>
              <span>{outsideScope.length} 家门店的 {outsideAreaCount} 个已选区域已超出当前门店范围，保存时将移除。</span>
            </div>
          )}
          {count > 0 && (
            <div className="ld-selected-areas">
              <table className="table table--compact" aria-label="已选区域明细">
                <thead>
                  <tr>
                    <th scope="col" className="ld-selected-areas__store-col">
                      <label className="checkbox">
                        <AreaBatchCheckbox selected={removeCount} total={count} label="勾选全部区域以批量移除"
                          onChange={(checked) => mark(selected, checked)} />
                        所属门店
                      </label>
                    </th>
                    <th scope="col">已选点餐区域</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map(({ store, areas }) => (
                    <tr key={store.id}>
                      <td>
                        <label className="checkbox ld-selected-areas__store">
                          <AreaBatchCheckbox selected={areas.filter((area) => marked[store.id]?.includes(area.id)).length}
                            total={areas.length} label={`勾选${store.name}的全部已选区域`}
                            onChange={(checked) => mark([{ store, areas }], checked)} />
                          <span>{store.name}<small>{store.code}</small></span>
                        </label>
                      </td>
                      <td>
                        <div className="ld-selected-areas__options">
                          {areas.map((area) => (
                            <label className="checkbox" key={area.id}>
                              <input type="checkbox" checked={!!marked[store.id]?.includes(area.id)}
                                aria-label={`勾选${store.name}的${area.name}`}
                                onChange={(event) => mark([{ store, areas: [area] }], event.target.checked)} />
                              {area.name}
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {picking && availableStoreCount > 0 && (
            <LimitDiscountAreaPicker
              catalog={catalog}
              selectedAreas={activity.areaIdsByStore}
              onClose={() => setPicking(false)}
              onConfirm={(areaIdsByStore) => {
                onChange({ ...activity, areaIdsByStore })
                setMarked({})
                setPicking(false)
              }}
            />
          )}
        </>
      )}
    </PromoFormRow>
  )
}
