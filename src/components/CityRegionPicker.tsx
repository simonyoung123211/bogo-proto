import { useState } from 'react'
import { REGION_TREE } from '../mockDeliveryFeeData'

interface CityRegionPickerProps {
  selectedIds: string[]
  occupiedGroups: ReadonlyMap<string, string>
  onConfirm: (cityIds: string[]) => void
  onClose: () => void
}

export function CityRegionPicker({
  selectedIds,
  occupiedGroups,
  onConfirm,
  onClose,
}: CityRegionPickerProps) {
  const [draft, setDraft] = useState<string[]>([...selectedIds])
  const [notice, setNotice] = useState('')

  const toggleCity = (cityId: string) => {
    setNotice('')
    setDraft((prev) => (prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev, cityId]))
  }

  return (
    <div className="modal-overlay" role="dialog" aria-label="选择收货城市" aria-modal="true" onClick={onClose}>
      <div className="modal modal--md" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">选择收货城市</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="modal__body">
          <div className="city-picker-tree">
            {REGION_TREE.map((province) => {
              const availableIds = province.cities.filter(({ id }) => !occupiedGroups.has(id)).map(({ id }) => id)
              const selectedCount = availableIds.filter((id) => draft.includes(id)).length
              const allSelected = selectedCount > 0 && selectedCount === availableIds.length
              const occupiedCount = province.cities.length - availableIds.length
              return (
                <div key={province.id} className="city-picker-province">
                  <label className="checkbox city-picker-province__head">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      disabled={availableIds.length === 0}
                      ref={(el) => {
                        if (el) el.indeterminate = selectedCount > 0 && !allSelected
                      }}
                      onChange={() => {
                        setDraft((prev) => allSelected
                          ? prev.filter((id) => !availableIds.includes(id))
                          : [...new Set([...prev, ...availableIds])])
                        setNotice(!allSelected && occupiedCount > 0
                          ? `已跳过${province.name}内其他组占用的 ${occupiedCount} 个城市`
                          : '')
                      }}
                    />
                    <strong>{province.name}</strong>
                    <span className="text-secondary">（批选可用城市）</span>
                  </label>
                  <div className="city-picker-cities">
                    {province.cities.map((city) => {
                      const assignedGroup = occupiedGroups.get(city.id)
                      const chosen = draft.includes(city.id)
                      const blocked = Boolean(assignedGroup && !chosen)
                      return (
                        <label
                          key={city.id}
                          className={`checkbox ${blocked ? 'is-disabled' : ''}`}
                        >
                          <input
                            type="checkbox"
                            disabled={blocked}
                            checked={chosen}
                            onChange={() => toggleCity(city.id)}
                          />
                          {city.name}
                          {assignedGroup && <span className="text-secondary">（已在{assignedGroup}）</span>}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="text-secondary" style={{ marginTop: 12 }}>
            已选 {draft.length} 个城市
          </div>
          {notice && <p className="field-hint" role="status">{notice}</p>}
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              onConfirm(draft)
              onClose()
            }}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
