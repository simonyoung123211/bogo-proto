import { useId, useState } from 'react'
import { PERIOD_OPTIONS } from '../mockLimitDiscountData'
import type { LimitDiscountQuotaRule } from '../types'
import { sceneLabel } from '../utils/limitDiscountActivity'
import {
  activeDiscountBusinessQuotas,
  commonDiscountQuota,
  discountQuotaConfig,
  discountQuotaPoolNotices,
  discountQuotaRelaxationError,
  unlimitedDiscountQuota,
  type LimitDiscountQuotaConfig,
} from '../utils/limitDiscountQuota'
import { LimitDiscountRuleDialog } from './LimitDiscountRuleDialog'

type QuotaField = keyof LimitDiscountQuotaRule

function updateLimit(item: LimitDiscountQuotaConfig, scene: string | undefined, field: QuotaField, values: LimitDiscountQuotaRule) {
  const common = commonDiscountQuota(item)
  const business = { ...item.quota?.byScene }
  const current = scene ? business[scene] ?? unlimitedDiscountQuota : common
  const next = { ...current, [field]: values[field] }
  if (!scene) return discountQuotaConfig(next, business)
  if (next.total == null && !next.periodic) delete business[scene]
  else business[scene] = next
  return discountQuotaConfig(common, business)
}

export function LimitDiscountQuotaAdjustment({ item, saved, description, scenes, onApply, onClose }: {
  item: LimitDiscountQuotaConfig
  saved: LimitDiscountQuotaConfig
  description: string
  scenes: string[]
  onApply: (config: LimitDiscountQuotaConfig) => void
  onClose: () => void
}) {
  const fieldId = useId()
  const [targetId, setTargetId] = useState('')
  const [action, setAction] = useState<'increase' | 'remove'>('increase')
  const [amount, setAmount] = useState('')
  const [submitError, setSubmitError] = useState<string>()
  const scopes = [
    { scene: undefined, rule: commonDiscountQuota(saved) },
    ...activeDiscountBusinessQuotas(saved, scenes),
  ]
  const limits = scopes.flatMap(({ scene, rule }) => {
    const scope = scene ? sceneLabel(scene) : '共用'
    const fields: { field: QuotaField; label: string; value: number | null }[] = []
    if (rule.total != null) fields.push({ field: 'total', label: '整场限量', value: rule.total })
    if (rule.periodic) {
      const period = PERIOD_OPTIONS.find(({ value }) => value === rule.periodic?.period)?.label
      fields.push({ field: 'periodic', label: `${period ?? '周期'}限量`, value: rule.periodic.limit })
    }
    return fields.map((entry) => ({
      ...entry, id: `${scene ?? 'common'}-${entry.field}`, label: `${scope} · ${entry.label}`, scene, rule,
    }))
  })
  const selected = limits.find(({ id }) => id === targetId) ?? limits[0]
  if (!selected) return null

  const { field, scene, rule, value } = selected
  const periodic = field === 'periodic' ? rule.periodic : null
  const original = value == null ? '待修正' : `${value.toLocaleString('zh-CN')} 件`
  const nextLimit = /^\d+$/.test(amount.trim()) ? Number(amount.trim()) : null
  const canIncrease = nextLimit != null && Number.isSafeInteger(nextLimit) && nextLimit > Math.max(0, value ?? 0)
  const removing = action === 'remove'
  const adjusted = updateLimit(item, scene, field, removing
    ? unlimitedDiscountQuota
    : {
        total: nextLimit,
        periodic: periodic && nextLimit != null ? { period: periodic.period, limit: nextLimit } : null,
      })
  const reverted = updateLimit(item, scene, field, rule)
  const ruleAfter = scene ? item.quota?.byScene[scene] ?? unlimitedDiscountQuota : commonDiscountQuota(item)
  const canRevert = JSON.stringify(ruleAfter[field]) !== JSON.stringify(rule[field])
  const valid = removing || canIncrease
  const error = valid ? discountQuotaRelaxationError(saved, adjusted, scenes) : undefined
  const inputError = !removing && amount !== '' && !canIncrease ? `请输入大于 ${value ?? 0} 的正整数` : undefined
  const notices = valid && !error ? discountQuotaPoolNotices(adjusted, scenes) : []

  function apply(config: LimitDiscountQuotaConfig) {
    const detail = discountQuotaRelaxationError(saved, config, scenes)
    if (detail) setSubmitError(detail)
    else onApply(config)
  }

  return (
    <LimitDiscountRuleDialog title="调整优惠限量" description={description}
      onClose={onClose} onApply={() => { if (valid && !error) apply(adjusted) }}
      footer={<>
        <div className="ld-rule-dialog__feedback">
          {(submitError || error) && <span className="ld-quota-save-error" role="status">{submitError || error}</span>}
          {canRevert && <button type="button" className="link-btn" onClick={() => apply(reverted)}>撤销这项未保存调整</button>}
        </div>
        <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
        <button type="submit" className="btn btn--primary" disabled={!valid || Boolean(error)}>应用调整</button>
      </>}>
      <div className="ld-quota-adjustment">
        <div className="ld-quota-adjustment__help">
          <p>活动进行中，需要补充优惠件数或放开某项上限时，可在这里调整。</p>
          <p>每次可提高或取消一项已设限量。进行中不能调低、新增限量或更换周期类型。</p>
          <details className="ld-quota-help">
            <summary>使用说明</summary>
            <dl>
              <div><dt>调整范围</dt><dd>共用限量覆盖该规格的参与门店、渠道和业务。分业务限量只影响所选业务。顶部显示受影响的规格范围，各规格分别计数。</dd></div>
              <div><dt>提高上限</dt><dd>整场上限提高后适用于本场后续订单。周期上限从保存起，本期及后续周期均按新上限执行。分业务加量仍须通过共用限量校验。</dd></div>
              <div><dt>取消限量</dt><dd>仅移除所选上限，其他上限继续生效。取消周期限量适用于本期及后续周期。</dd></div>
              <div><dt>保存生效</dt><dd>点击「应用调整」回填编辑页，保存活动后影响新订单。已用件数和待支付占用保留，已提交订单按原记录处理。</dd></div>
            </dl>
          </details>
        </div>
        <div className="ld-quota-adjustment__field">
          <label htmlFor={`${fieldId}-target`}>调整哪项限量</label>
          <select className="input select" id={`${fieldId}-target`} value={selected.id} onChange={(event) => {
            setTargetId(event.currentTarget.value)
            setAction('increase')
            setAmount('')
            setSubmitError(undefined)
          }}>
            {limits.map((limit) => <option key={limit.id} value={limit.id}>
              {limit.label} · {limit.value == null ? '待修正' : `${limit.value.toLocaleString('zh-CN')} 件`}
            </option>)}
          </select>
        </div>
        <fieldset className="ld-quota-adjustment__modes">
          <legend>调整方式</legend>
          <label className="radio">
            <input type="radio" name="ld-quota-adjustment-mode" checked={!removing}
              onChange={() => { setAction('increase'); setSubmitError(undefined) }} />
            提高上限
          </label>
          <label className="radio">
            <input type="radio" name="ld-quota-adjustment-mode" checked={removing}
              onChange={() => { setAction('remove'); setSubmitError(undefined) }} />
            取消这项限量
          </label>
        </fieldset>
        {!removing && (
          <div className="ld-quota-adjustment__field ld-quota-adjustment__amount">
            <label htmlFor={`${fieldId}-amount`}>{periodic ? '周期新上限（件）' : '整场新上限（件）'}</label>
            <input className="input" id={`${fieldId}-amount`} type="text" inputMode="numeric" value={amount}
              placeholder={`当前 ${original}`} aria-invalid={Boolean(inputError || error)}
              aria-describedby={inputError ? `${fieldId}-amount-error` : undefined}
              onChange={(event) => { setAmount(event.currentTarget.value); setSubmitError(undefined) }} />
            {inputError && <span className="ld-quota-error" id={`${fieldId}-amount-error`} role="status">{inputError}</span>}
          </div>
        )}
        <div className="ld-quota-adjustment__preview">
          <div>
            <span>{selected.label}</span>
            <strong>{original} → {removing ? '不限量' : canIncrease && nextLimit != null ? `${nextLimit.toLocaleString('zh-CN')} 件` : '待填写'}</strong>
          </div>
          <p>{periodic
            ? removing ? '保存活动后，本期和后续周期均取消这项上限。' : '保存活动后，本期及后续周期均按新上限执行。'
            : '保存活动后生效，适用于本场后续订单。'}</p>
          {!removing && <p>已用件数和待支付占用继续计入当前上限。</p>}
          {removing && <p className="ld-quota-adjustment__notice">保存后，活动进行中无法重新设置这项限量。其他适用上限继续生效。</p>}
        </div>
        {notices.length > 0 && <div className="ld-quota-notices" role="status">{notices.map((notice) => <p key={notice}>{notice}</p>)}</div>}
      </div>
    </LimitDiscountRuleDialog>
  )
}
