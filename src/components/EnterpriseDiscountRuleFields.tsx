import { useMemo, useState } from 'react'
import { ENTERPRISE_CUSTOMERS, createEnterpriseDiscountItem } from '../mockEnterpriseDiscountData'
import type { EnterpriseDiscountActivityForm, EnterpriseDiscountItem, ParticipationPeriod } from '../types'
import { getEnterprise } from '../utils/enterpriseDiscountActivity'

const PERIOD_OPTIONS: { value: ParticipationPeriod; label: string }[] = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
]

interface EnterpriseDiscountRuleFieldsProps {
  activity: EnterpriseDiscountActivityForm
  readOnly?: boolean
  onChange: (activity: EnterpriseDiscountActivityForm) => void
}

export function EnterpriseDiscountRuleFields({
  activity,
  readOnly,
  onChange,
}: EnterpriseDiscountRuleFieldsProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const updateItem = (enterpriseId: string, patch: Partial<EnterpriseDiscountItem>) => {
    onChange({
      ...activity,
      enterprises: activity.enterprises.map((item) => (
        item.enterpriseId === enterpriseId ? { ...item, ...patch } : item
      )),
    })
  }

  const removeItem = (enterpriseId: string) => {
    onChange({
      ...activity,
      enterprises: activity.enterprises.filter((item) => item.enterpriseId !== enterpriseId),
    })
  }

  return (
    <>
      <FormRow label="用户参与活动总次数（订单数）">
        <div>
          <CheckboxLimit
            disabled={readOnly}
            checked={activity.totalParticipationLimitType === 'limited'}
            onCheckedChange={(on) => onChange({
              ...activity,
              totalParticipationLimitType: on ? 'limited' : 'unlimited',
            })}
            label={
              <>
                限制该活动期间每个用户最多优惠
                <NumberStepper
                  disabled={readOnly || activity.totalParticipationLimitType !== 'limited'}
                  value={activity.totalParticipationLimit}
                  onChange={(value) => onChange({ ...activity, totalParticipationLimit: value })}
                />
                单
              </>
            }
          />
          <p className="field-hint">
            比如设置活动期间内每个用户最多优惠20单，则该用户在活动期间内享受20单之后不再享受企业员工折扣
          </p>
        </div>
      </FormRow>

      <FormRow label="用户参与活动频次（订单数）">
        <div>
          <CheckboxLimit
            disabled={readOnly}
            checked={activity.participationFrequencyType === 'limited'}
            onCheckedChange={(on) => onChange({
              ...activity,
              participationFrequencyType: on ? 'limited' : 'unlimited',
            })}
            label={
              <>
                <select
                  className="input input--period"
                  disabled={readOnly || activity.participationFrequencyType !== 'limited'}
                  value={activity.participationFrequencyPeriod}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => onChange({
                    ...activity,
                    participationFrequencyPeriod: event.target.value as ParticipationPeriod,
                  })}
                >
                  {PERIOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                最多优惠
                <NumberStepper
                  disabled={readOnly || activity.participationFrequencyType !== 'limited'}
                  value={activity.participationFrequencyLimit}
                  onChange={(value) => onChange({ ...activity, participationFrequencyLimit: value })}
                />
                单
              </>
            }
          />
          <p className="field-hint">
            若设置每天最多优惠2单，则用户当天内第3单不享受企业员工折扣
          </p>
        </div>
      </FormRow>

      <FormRow label="用户参与活动商品件数限制">
        <div>
          <div className="checkbox-limit-group">
            <CheckboxLimit
              disabled={readOnly}
              checked={activity.maxDiscountItemsTotalType === 'limited'}
              onCheckedChange={(on) => onChange({
                ...activity,
                maxDiscountItemsTotalType: on ? 'limited' : 'unlimited',
              })}
              label={
                <>
                  限制该活动期间每个用户最多优惠
                  <NumberStepper
                    disabled={readOnly || activity.maxDiscountItemsTotalType !== 'limited'}
                    value={activity.maxDiscountItemsTotal}
                    onChange={(value) => onChange({ ...activity, maxDiscountItemsTotal: value })}
                  />
                  件
                </>
              }
            />
            <CheckboxLimit
              disabled={readOnly}
              checked={activity.maxDiscountItemsPeriodType === 'limited'}
              onCheckedChange={(on) => onChange({
                ...activity,
                maxDiscountItemsPeriodType: on ? 'limited' : 'unlimited',
              })}
              label={
                <>
                  限制该活动期间每个用户
                  <select
                    className="input input--period"
                    disabled={readOnly || activity.maxDiscountItemsPeriodType !== 'limited'}
                    value={activity.maxDiscountItemsPeriod}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => onChange({
                      ...activity,
                      maxDiscountItemsPeriod: event.target.value as ParticipationPeriod,
                    })}
                  >
                    {PERIOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  最多优惠
                  <NumberStepper
                    disabled={readOnly || activity.maxDiscountItemsPeriodType !== 'limited'}
                    value={activity.maxDiscountItemsPeriodLimit}
                    onChange={(value) => onChange({ ...activity, maxDiscountItemsPeriodLimit: value })}
                  />
                  件
                </>
              }
            />
            <CheckboxLimit
              disabled={readOnly}
              checked={activity.maxDiscountItemsPerOrderType === 'limited'}
              onCheckedChange={(on) => onChange({
                ...activity,
                maxDiscountItemsPerOrderType: on ? 'limited' : 'unlimited',
              })}
              label={
                <>
                  限制该活动期间用户每单最多优惠
                  <NumberStepper
                    disabled={readOnly || activity.maxDiscountItemsPerOrderType !== 'limited'}
                    value={activity.maxDiscountItemsPerOrder}
                    onChange={(value) => onChange({ ...activity, maxDiscountItemsPerOrder: value })}
                  />
                  件
                </>
              }
            />
          </div>
          <p className="field-hint">
            限制每个用户每单最多可优惠件数，比如限制3件，用户一笔订单中加购5件企业折扣商品，则只有3件享受企业员工折扣。
          </p>
        </div>
      </FormRow>

      <FormRow label="优惠商品命中规则" required>
        <div>
          <div className="radio-group">
            <label className="radio">
              <input
                type="radio"
                disabled={readOnly}
                checked={activity.discountHitRule === 'high_to_low'}
                onChange={() => onChange({ ...activity, discountHitRule: 'high_to_low' })}
              />
              优惠售价高到低的商品
            </label>
            <label className="radio">
              <input
                type="radio"
                disabled={readOnly}
                checked={activity.discountHitRule === 'low_to_high'}
                onChange={() => onChange({ ...activity, discountHitRule: 'low_to_high' })}
              />
              优惠售价低到高的商品
            </label>
          </div>
          <p className="field-hint">件数达到上限时，按售价从高到低或从低到高决定哪些商品享受企业员工折扣。</p>
        </div>
      </FormRow>

      <FormRow label="选择企业" required>
        <div className="enterprise-discount-table">
          <table className="table">
            <thead>
              <tr>
                <th>公司名称</th>
                <th>上层集团企业名称</th>
                <th>折扣</th>
                <th>展示标签</th>
                {!readOnly && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {activity.enterprises.length === 0 && (
                <tr>
                  <td colSpan={readOnly ? 4 : 5} className="table-empty">请添加需要参与折扣的企业客户</td>
                </tr>
              )}
              {activity.enterprises.map((item) => {
                const enterprise = getEnterprise(item.enterpriseId)
                return (
                  <tr key={item.enterpriseId}>
                    <td>{enterprise?.name ?? item.enterpriseId}</td>
                    <td>{enterprise?.parentName ?? '-'}</td>
                    <td>
                      <span className="number-stepper">
                        <button
                          type="button"
                          className="number-stepper__btn"
                          disabled={readOnly || item.discount <= 0.1}
                          onClick={() => updateItem(item.enterpriseId, { discount: roundDiscount(item.discount - 0.1) })}
                        >
                          −
                        </button>
                        <input
                          className="number-stepper__input"
                          type="number"
                          min={0.1}
                          max={9.9}
                          step={0.1}
                          disabled={readOnly}
                          value={item.discount}
                          onChange={(event) => updateItem(item.enterpriseId, {
                            discount: clampDiscount(Number(event.target.value)),
                          })}
                        />
                        <button
                          type="button"
                          className="number-stepper__btn"
                          disabled={readOnly || item.discount >= 9.9}
                          onClick={() => updateItem(item.enterpriseId, { discount: roundDiscount(item.discount + 0.1) })}
                        >
                          +
                        </button>
                      </span>
                      <span className="field-hint" style={{ marginLeft: 6 }}>折</span>
                    </td>
                    <td>
                      <input
                        className="input"
                        disabled={readOnly}
                        maxLength={10}
                        value={item.displayTag}
                        placeholder="如：企业购"
                        onChange={(event) => updateItem(item.enterpriseId, { displayTag: event.target.value.slice(0, 10) })}
                      />
                    </td>
                    {!readOnly && (
                      <td>
                        <button type="button" className="link-btn" onClick={() => removeItem(item.enterpriseId)}>取消选择</button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!readOnly && (
            <button type="button" className="link-btn" style={{ marginTop: 8 }} onClick={() => setPickerOpen(true)}>
              + 添加企业
            </button>
          )}
          <p className="field-hint">同一活动可配置多家企业，每家企业单独设置折扣和展示标签。仅对应企业员工下单时可享受该折扣。</p>
        </div>
      </FormRow>

      <FormRow label="加料商品是否参与优惠" required>
        <ParticipateRadio
          disabled={readOnly}
          value={activity.toppingsDiscount}
          onChange={(value) => onChange({ ...activity, toppingsDiscount: value })}
        />
      </FormRow>
      <FormRow label="包装费是否参与优惠" required>
        <ParticipateRadio
          disabled={readOnly}
          value={activity.packagingFeeDiscount}
          onChange={(value) => onChange({ ...activity, packagingFeeDiscount: value })}
        />
      </FormRow>
      <FormRow label="套餐加价金额是否参与优惠" required>
        <ParticipateRadio
          disabled={readOnly}
          value={activity.comboSurchargeDiscount}
          onChange={(value) => onChange({ ...activity, comboSurchargeDiscount: value })}
        />
      </FormRow>
      <FormRow label="做法加价是否参与优惠" required>
        <ParticipateRadio
          disabled={readOnly}
          value={activity.preparationSurchargeDiscount}
          onChange={(value) => onChange({ ...activity, preparationSurchargeDiscount: value })}
        />
      </FormRow>

      {pickerOpen && (
        <EnterprisePicker
          selectedIds={activity.enterprises.map((item) => item.enterpriseId)}
          onClose={() => setPickerOpen(false)}
          onConfirm={(ids) => {
            const kept = activity.enterprises.filter((item) => ids.includes(item.enterpriseId))
            const added = ids
              .filter((id) => !kept.some((item) => item.enterpriseId === id))
              .map(createEnterpriseDiscountItem)
            onChange({ ...activity, enterprises: [...kept, ...added] })
            setPickerOpen(false)
          }}
        />
      )}
    </>
  )
}

function EnterprisePicker({
  selectedIds,
  onClose,
  onConfirm,
}: {
  selectedIds: string[]
  onClose: () => void
  onConfirm: (ids: string[]) => void
}) {
  const [keyword, setKeyword] = useState('')
  const [picked, setPicked] = useState<string[]>(selectedIds)
  const filtered = useMemo(() => {
    const text = keyword.trim()
    if (!text) return ENTERPRISE_CUSTOMERS
    return ENTERPRISE_CUSTOMERS.filter((item) => item.name.includes(text) || item.parentName.includes(text))
  }, [keyword])

  const toggle = (id: string) => {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--md" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h3>选择企业客户</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="modal__body">
          <input
            className="input input--wide"
            placeholder="搜索公司名称"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th style={{ width: 40 }} />
                <th>公司名称</th>
                <th>上层集团企业名称</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="table-row--clickable" onClick={() => toggle(item.id)}>
                  <td><input type="checkbox" checked={picked.includes(item.id)} readOnly /></td>
                  <td>{item.name}</td>
                  <td>{item.parentName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
          <button type="button" className="btn btn--primary" onClick={() => onConfirm(picked)}>确定</button>
        </div>
      </div>
    </div>
  )
}

function ParticipateRadio({
  value,
  disabled,
  onChange,
}: {
  value: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="radio-group">
      <label className="radio">
        <input type="radio" disabled={disabled} checked={!value} onChange={() => onChange(false)} />
        不参与
      </label>
      <label className="radio">
        <input type="radio" disabled={disabled} checked={value} onChange={() => onChange(true)} />
        参与
      </label>
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

function CheckboxLimit({
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  checked: boolean
  onCheckedChange: (on: boolean) => void
  label: React.ReactNode
  disabled?: boolean
}) {
  return (
    <label className="checkbox limit-checkbox">
      <input type="checkbox" disabled={disabled} checked={checked} onChange={(event) => onCheckedChange(event.target.checked)} />
      <span className="limit-checkbox__content">{label}</span>
    </label>
  )
}

function NumberStepper({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <span className="number-stepper" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className="number-stepper__btn"
        disabled={disabled || value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        −
      </button>
      <input
        className="number-stepper__input"
        type="number"
        min={1}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))}
      />
      <button
        type="button"
        className="number-stepper__btn"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </span>
  )
}

function clampDiscount(value: number) {
  if (!Number.isFinite(value)) return 9.9
  return roundDiscount(Math.min(9.9, Math.max(0.1, value)))
}

function roundDiscount(value: number) {
  return Math.round(value * 10) / 10
}
