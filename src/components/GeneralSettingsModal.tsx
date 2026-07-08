import { useEffect, useState } from 'react'
import type { GeneralSettings } from '../types'
import { MAX_GIFT_STORAGE_PER_ORDER_LIMIT } from '../utils/storage'

interface GeneralSettingsModalProps {
  settings: GeneralSettings
  onClose: () => void
  onSave: (settings: GeneralSettings) => void
}

export function GeneralSettingsModal({ settings, onClose, onSave }: GeneralSettingsModalProps) {
  const [draft, setDraft] = useState(settings)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  const clamp = (value: number) =>
    Math.min(MAX_GIFT_STORAGE_PER_ORDER_LIMIT, Math.max(1, value))

  const handleSave = () => {
    onSave({ maxGiftStoragePerOrder: clamp(draft.maxGiftStoragePerOrder) })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--md" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>通用设置</h3>
          <button type="button" className="modal__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          <div className="settings-section">
            <div className="settings-section__title">寄存券配置：</div>
            <div className="form-row form-row--top">
              <label className="form-label">每单寄存券发放上限</label>
              <div className="form-control">
                <span className="number-stepper">
                  <button
                    type="button"
                    className="number-stepper__btn"
                    disabled={draft.maxGiftStoragePerOrder <= 1}
                    onClick={() => setDraft((s) => ({
                      ...s,
                      maxGiftStoragePerOrder: clamp(s.maxGiftStoragePerOrder - 1),
                    }))}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    className="number-stepper__input"
                    min={1}
                    max={MAX_GIFT_STORAGE_PER_ORDER_LIMIT}
                    value={draft.maxGiftStoragePerOrder}
                    onChange={(e) => setDraft((s) => ({
                      ...s,
                      maxGiftStoragePerOrder: clamp(Number(e.target.value) || 1),
                    }))}
                  />
                  <button
                    type="button"
                    className="number-stepper__btn"
                    disabled={draft.maxGiftStoragePerOrder >= MAX_GIFT_STORAGE_PER_ORDER_LIMIT}
                    onClick={() => setDraft((s) => ({
                      ...s,
                      maxGiftStoragePerOrder: clamp(s.maxGiftStoragePerOrder + 1),
                    }))}
                  >
                    +
                  </button>
                </span>
                <p className="field-hint">
                  用于限制单笔订单可向用户发放的寄存券总张数，防止超出卡券系统发放上限导致发券失败。可设置范围为 1–{MAX_GIFT_STORAGE_PER_ORDER_LIMIT} 张。
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
          <button type="button" className="btn btn--primary" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  )
}
