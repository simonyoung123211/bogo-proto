import { useState } from 'react'
import type { LimitDiscountActivityForm } from '../types'
import { discountAreaRows, updateAreaSelection, type DiscountAreaRows } from '../utils/limitDiscountScope'
import { AreaBatchCheckbox, LimitDiscountAreaPicker } from './LimitDiscountAreaPicker'
import { PromoFormRow } from './promoWizardUi'

interface Props {
  activity: LimitDiscountActivityForm
  onChange: (value: LimitDiscountActivityForm) => void
}

export function LimitDiscountAreaFields({ activity, onChange }: Props) {
  const [picking, setPicking] = useState(false)
  const [marked, setMarked] = useState<LimitDiscountActivityForm['areaIdsByStore']>({})
  const selected = discountAreaRows(activity)
  const count = selected.reduce((total, row) => total + row.areas.length, 0)
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
    <PromoFormRow label="区域限制" required>
      <div className="radio-group">
        {(['all', 'specified'] as const).map((mode) => (
          <label className="radio" key={mode}>
            <input type="radio" name="discountAreaMode" checked={activity.areaMode === mode}
              onChange={() => { setMarked({}); onChange({ ...activity, areaMode: mode }) }} />
            {mode === 'all' ? '不限区域' : '指定区域'}
          </label>
        ))}
      </div>
      {activity.areaMode === 'specified' && (
        <>
          <div className="ld-area-picker__bar">
            <button type="button" className="btn btn--primary" aria-haspopup="dialog" onClick={() => setPicking(true)}>选择区域</button>
            {count > 0 && (
              <button type="button" className="btn btn--default ld-area-remove" disabled={!removeCount} onClick={removeMarked}>
                批量移除{removeCount > 0 && `（${removeCount}）`}
              </button>
            )}
            <span aria-live="polite">已选 {selected.length} 家门店 · {count} 个区域</span>
          </div>
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
          <p className="field-hint">仅从已选门店的指定区域进入点餐时可享受本活动。</p>
          {picking && (
            <LimitDiscountAreaPicker
              activity={activity}
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
