export const STORAGE_COUPON_DESC_MAX = 1000

interface StorageCouponDescriptionFieldProps {
  value: string
  readOnly?: boolean
  onChange: (value: string) => void
}

export function StorageCouponDescriptionField({
  value,
  readOnly,
  onChange,
}: StorageCouponDescriptionFieldProps) {
  return (
    <div className="form-row form-row--top">
      <label className="form-label">寄存券说明</label>
      <div className="form-control">
        <div className="rich-editor">
          {!readOnly && (
            <div className="rich-editor__toolbar">
              {['B', 'A', 'I', 'U', 'S', '≡', '•', '1.', '❝', '🔗', '🖼', '—', '↩', '↪', '⛶'].map((icon) => (
                <button key={icon} type="button" className="rich-editor__tool" disabled>{icon}</button>
              ))}
            </div>
          )}
          <textarea
            className="rich-editor__area"
            disabled={readOnly}
            placeholder="请输入正文"
            maxLength={STORAGE_COUPON_DESC_MAX}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={6}
          />
          <div className="rich-editor__counter">
            {value.length} / {STORAGE_COUPON_DESC_MAX}
          </div>
        </div>
        <p className="field-hint">活动维度说明，任一赠品组开启寄存后展示；用于小程序端向用户说明寄存券使用规则。</p>
      </div>
    </div>
  )
}
