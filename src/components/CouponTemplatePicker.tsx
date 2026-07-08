import { couponTemplates } from '../mockData'
import type { CouponTemplate } from '../types'

interface CouponTemplatePickerProps {
  selected: CouponTemplate | null
  onSelect: (template: CouponTemplate) => void
  onClose: () => void
}

export function CouponTemplatePicker({ selected, onSelect, onClose }: CouponTemplatePickerProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>选择券模版</h3>
          <button type="button" className="modal__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body modal__body--flush">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }} />
                <th>优惠券模版ID</th>
                <th>优惠券名称</th>
                <th>优惠券类型</th>
                <th>优惠券有效期</th>
              </tr>
            </thead>
            <tbody>
              {couponTemplates.map((t) => (
                <tr
                  key={t.id}
                  className="table-row--clickable"
                  onClick={() => {
                    onSelect(t)
                    onClose()
                  }}
                >
                  <td>
                    <input type="radio" readOnly checked={selected?.id === t.id} />
                  </td>
                  <td className="mono">{t.id}</td>
                  <td>{t.name}</td>
                  <td>{t.type}</td>
                  <td>发放当日 {t.validityDaysMin}-{t.validityDaysMax}天</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  )
}
