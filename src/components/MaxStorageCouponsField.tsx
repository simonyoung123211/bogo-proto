export const MAX_STORAGE_COUPONS_PER_ORDER = 50

interface MaxStorageCouponsFieldProps {
  value: number
  readOnly?: boolean
  variant?: 'coupon' | 'gift'
  onChange: (value: number) => void
}

export function MaxStorageCouponsField({
  value,
  readOnly,
  variant = 'coupon',
  onChange,
}: MaxStorageCouponsFieldProps) {
  const isGift = variant === 'gift'
  return (
    <div className="form-row">
      <label className="form-label">
        <span className="required">*</span>
        {isGift ? '每单最多可寄存' : '每单最多可发放寄存券'}
      </label>
      <div className="form-control">
        <div className="inline-inputs">
          {isGift ? '每单最多可寄存' : '每单最多可发放'}
          <span className="number-stepper">
            <button
              type="button"
              className="number-stepper__btn"
              disabled={readOnly || value <= 1}
              onClick={() => onChange(Math.max(1, value - 1))}
            >
              −
            </button>
            <input
              type="number"
              className="number-stepper__input"
              disabled={readOnly}
              min={1}
              max={MAX_STORAGE_COUPONS_PER_ORDER}
              value={value}
              onChange={(e) => onChange(
                Math.min(MAX_STORAGE_COUPONS_PER_ORDER, Math.max(1, Number(e.target.value) || 1)),
              )}
            />
            <button
              type="button"
              className="number-stepper__btn"
              disabled={readOnly || value >= MAX_STORAGE_COUPONS_PER_ORDER}
              onClick={() => onChange(Math.min(MAX_STORAGE_COUPONS_PER_ORDER, value + 1))}
            >
              +
            </button>
          </span>
          {isGift ? '件赠品' : '张寄存券'}
        </div>
        <p className="field-hint">
          {isGift
            ? `每单可寄存赠品件数上限不可超过 ${MAX_STORAGE_COUPONS_PER_ORDER} 件。`
            : `按活动维度限制，单笔订单最多可发放给用户的寄存券总数量，不可超过 ${MAX_STORAGE_COUPONS_PER_ORDER} 张。`}
        </p>
      </div>
    </div>
  )
}
