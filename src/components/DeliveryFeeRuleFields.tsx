import { useId, useState } from 'react'
import { CityRegionPicker } from './CityRegionPicker'
import { MEMBER_LEVELS } from '../mockData'
import {
  DISCOUNT_METHOD_LABELS,
  MAX_CITY_GROUPS,
  MAX_TIERS,
  THRESHOLD_TYPE_OPTIONS,
} from '../mockDeliveryFeeData'
import type {
  DeliveryFeeActivityForm,
  DeliveryFeeCityRuleGroup,
  DeliveryFeeDiscountMethod,
  DeliveryFeeOfferMode,
  DeliveryFeeOfferRule,
  DeliveryFeeThresholdType,
  DeliveryFeeTier,
  MemberLevelId,
  ParticipationPeriod,
} from '../types'
import {
  applyRuleModeChange,
  createDeliveryFeeCityRuleGroup,
  getCityNames,
  getCityRuleGroupLabel,
  getMemberLevelOffers,
  hasAmountThreshold,
  hasExpress,
  hasTakeaway,
  normalizeTiersForThresholdType,
} from '../utils/deliveryFeeActivity'

type OfferConfigurationMode = DeliveryFeeOfferMode | 'by_city'

const OFFER_MODE_OPTIONS: { value: OfferConfigurationMode; label: string }[] = [
  { value: 'unified', label: '统一配置' },
  { value: 'by_member_level', label: '按会员等级配置' },
  { value: 'by_city', label: '按城市组配置' },
]

const PERIOD_OPTIONS: { value: ParticipationPeriod; label: string }[] = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
]

interface DeliveryFeeRuleFieldsProps {
  activity: DeliveryFeeActivityForm
  readOnly?: boolean
  onChange: (activity: DeliveryFeeActivityForm) => void
  onConfirmChange: (activity: DeliveryFeeActivityForm, message: string) => void
}

export function DeliveryFeeRuleFields({ activity, readOnly, onChange, onConfirmChange }: DeliveryFeeRuleFieldsProps) {
  const expressSelected = hasExpress(activity)
  const byCity = activity.ruleMode === 'by_city'
  const byLevel = activity.offerMode === 'by_member_level'
  const selectedMode = byCity && byLevel ? null : byCity ? 'by_city' : activity.offerMode
  const cityGroupCount = activity.cityRuleGroups.length
  const offerModeHintId = useId()
  const [pickerGroupId, setPickerGroupId] = useState<string | null>(null)
  const pickerGroup = activity.cityRuleGroups.find((group) => group.id === pickerGroupId)

  const update = (patch: Partial<DeliveryFeeActivityForm>) => onChange({ ...activity, ...patch })

  const setConfigurationMode = (mode: OfferConfigurationMode, label: string) => {
    if (readOnly || mode === selectedMode || (mode === 'by_city' && !expressSelected)) return
    const next = applyRuleModeChange(activity, mode === 'by_city' ? 'by_city' : 'national')
    next.offerMode = mode === 'by_member_level' ? 'by_member_level' : 'unified'
    const notices: string[] = []
    if (mode === 'by_city' && hasTakeaway(activity)) {
      notices.push('城市组优惠仅适用于门店快递。切换后会取消已勾选的外卖类业务。')
    }
    if (byCity && mode !== 'by_city' && activity.cityRuleGroups.some((group) => group.cityIds.length > 0)) {
      notices.push('已填写的城市组及优惠会保留，切回按城市组配置时可继续使用。')
    }
    if (byLevel && mode !== 'by_member_level' && getMemberLevelOffers(activity).length > 0) {
      notices.push('已填写的会员等级优惠会保留，切回按会员等级配置时可继续使用。')
    }
    if (notices.length > 0) {
      onConfirmChange(next, `将切换为「${label}」。${notices.join('')}`)
      return
    }
    onChange(next)
  }

  const updateCityGroup = (id: string, patch: Partial<DeliveryFeeCityRuleGroup>) => {
    update({ cityRuleGroups: activity.cityRuleGroups.map((group) => group.id === id ? { ...group, ...patch } : group) })
  }

  const removeCityGroup = (group: DeliveryFeeCityRuleGroup, label: string) => {
    const next = { ...activity, cityRuleGroups: activity.cityRuleGroups.filter((item) => item.id !== group.id) }
    onConfirmChange(next, `将移除「${label}」所选的城市及其整组优惠规则。`)
  }

  const setMemberLevelRule = (levelId: MemberLevelId, rule?: DeliveryFeeOfferRule) => {
    const memberLevelRules = { ...activity.memberLevelRules }
    if (rule) memberLevelRules[levelId] = rule
    else delete memberLevelRules[levelId]
    update({ memberLevelRules })
  }

  const thresholdPicker = (
    <ThresholdTypePicker rule={activity} readOnly={readOnly} onChange={update} />
  )
  const tierEditor = (
    <TierEditor
      tiers={activity.tiers}
      thresholdType={activity.thresholdType}
      readOnly={readOnly}
      onChange={(tiers) => update({ tiers })}
    />
  )

  return (
    <>
      <FormRow label="优惠配置方式" required>
        <div>
          <div className="choice-card-group df-offer-mode" role="group" aria-label="优惠配置方式" aria-describedby={offerModeHintId}>
            {OFFER_MODE_OPTIONS.map(({ value, label }) => (
              <button
                type="button"
                key={value}
                className={`choice-card${selectedMode === value ? ' is-active' : ''}`}
                aria-pressed={selectedMode === value}
                disabled={readOnly || (value === 'by_city' && !expressSelected)}
                onClick={() => setConfigurationMode(value, label)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="field-hint" id={offerModeHintId}>
            {selectedMode === null
              ? '已有配置同时包含指定城市和会员等级，请选择一种优惠配置方式。'
              : !expressSelected
                ? '勾选门店快递后可按城市组配置。'
                : byCity
                  ? '仅所选城市的门店快递订单可享受本活动。'
                  : '门店快递优惠覆盖全国收货城市。'}
          </p>
        </div>
      </FormRow>

      {!byCity && !byLevel && (
        <>
          <FormRow label="活动门槛" required>
            {thresholdPicker}
          </FormRow>

          <FormRow label="优惠阶梯" required>
            {tierEditor}
          </FormRow>
        </>
      )}

      {byCity && (
        <FormRow label="城市组优惠" required>
          <div className="df-rule-groups">
            <p className="field-hint df-rule-groups__hint">每组可设置不同的门槛和优惠。同一城市仅可归属一个组。</p>
            {activity.cityRuleGroups.map((group, index) => {
              const label = getCityRuleGroupLabel(group, index)
              return (
                <CityRuleGroupEditor
                  key={group.id}
                  group={group}
                  label={label}
                  readOnly={readOnly}
                  onChange={(patch) => updateCityGroup(group.id, patch)}
                  onPickCities={() => setPickerGroupId(group.id)}
                  onRemove={() => removeCityGroup(group, label)}
                />
              )
            })}
            {!readOnly && (
              <div className="inline-fields">
                <button
                  type="button"
                  className="btn btn--default btn--sm"
                  disabled={cityGroupCount >= MAX_CITY_GROUPS}
                  onClick={() => update({ cityRuleGroups: [...activity.cityRuleGroups, createDeliveryFeeCityRuleGroup(activity)] })}
                >
                  添加城市组
                </button>
                <span className="text-secondary" aria-live="polite">已添加 {cityGroupCount} / {MAX_CITY_GROUPS} 组</span>
              </div>
            )}
          </div>
        </FormRow>
      )}

      {byLevel && (
        <FormRow label="会员等级优惠" required>
          <div className="df-rule-groups">
            <div>
              <div className="checkbox-group checkbox-group--wrap" role="group" aria-label="适用会员等级">
                {MEMBER_LEVELS.map(({ id, label }) => (
                  <label className="checkbox" key={id}>
                    <input
                      type="checkbox"
                      checked={Boolean(activity.memberLevelRules[id])}
                      disabled={readOnly}
                      onChange={(event) => setMemberLevelRule(id, event.target.checked ? {
                        thresholdType: activity.thresholdType,
                        tiers: activity.tiers.map((tier) => ({ ...tier })),
                      } : undefined)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="field-hint">仅所选等级的会员可享受本活动。每个等级可单独设置门槛和优惠阶梯。</p>
            </div>
            {getMemberLevelOffers(activity).map(({ id, label, rule }) => (
              <section key={id} className="df-rule-card" aria-label={`${label}优惠规则`}>
                <strong>{label}</strong>
                <GroupedOfferFields rule={rule} readOnly={readOnly} onChange={(next) => setMemberLevelRule(id, next)} />
              </section>
            ))}
          </div>
        </FormRow>
      )}

      {hasAmountThreshold(activity) && (
        <>
          <FormRow label="门槛基础计算">
            <div className="radio-group">
              <label className="radio">
                <input
                  type="radio"
                  disabled={readOnly}
                  checked={activity.thresholdBase === 'sale_price'}
                  onChange={() => update({ thresholdBase: 'sale_price' })}
                />
                商品售价小计
              </label>
              <label className="radio">
                <input
                  type="radio"
                  disabled={readOnly}
                  checked={activity.thresholdBase === 'promo_price'}
                  onChange={() => update({ thresholdBase: 'promo_price' })}
                />
                活动价小计
              </label>
            </div>
          </FormRow>

          <FormRow label="门槛金额">
            <div className="checkbox-group checkbox-group--wrap">
              <label className="checkbox">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={activity.includeToppings}
                  onChange={(e) => update({ includeToppings: e.target.checked })}
                />
                包含加料商品价格
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={activity.includePackagingFee}
                  onChange={(e) => update({ includePackagingFee: e.target.checked })}
                />
                包含打包费/餐盒费
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={activity.includePreparationSurcharge}
                  onChange={(e) => update({ includePreparationSurcharge: e.target.checked })}
                />
                包含做法加价金额
              </label>
            </div>
          </FormRow>
        </>
      )}

      <FormRow label="用户参与活动总次数（订单数）">
        <div>
          <CheckboxLimit
            disabled={readOnly}
            checked={activity.totalParticipationLimitType === 'limited'}
            onCheckedChange={(on) => update({
              totalParticipationLimitType: on ? 'limited' : 'unlimited',
            })}
            label={
              <>
                限制该活动期间每个用户最多优惠
                <NumberStepper
                  disabled={readOnly || activity.totalParticipationLimitType !== 'limited'}
                  value={activity.totalParticipationLimit}
                  onChange={(v) => update({ totalParticipationLimit: v })}
                />
                单
              </>
            }
          />
          <p className="field-hint">
            {byCity ? '同一用户在不同城市组使用的优惠订单，均计入本活动的总次数。' : '例如每个用户在活动期间最多优惠 20 单，第 21 单不再享受本活动。'}
          </p>
        </div>
      </FormRow>

      <FormRow label="用户参与活动频次（订单数）">
        <div>
          <CheckboxLimit
            disabled={readOnly}
            checked={activity.participationFrequencyType === 'limited'}
            onCheckedChange={(on) => update({
              participationFrequencyType: on ? 'limited' : 'unlimited',
            })}
            label={
              <>
                <select
                  className="input input--period"
                  disabled={readOnly || activity.participationFrequencyType !== 'limited'}
                  value={activity.participationFrequencyPeriod}
                  onChange={(e) => update({
                    participationFrequencyPeriod: e.target.value as ParticipationPeriod,
                  })}
                >
                  {PERIOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                最多优惠
                <NumberStepper
                  disabled={readOnly || activity.participationFrequencyType !== 'limited'}
                  value={activity.participationFrequencyLimit}
                  onChange={(v) => update({ participationFrequencyLimit: v })}
                />
                单
              </>
            }
          />
          <p className="field-hint">
            {byCity ? '所有城市组共用每日、每周或每月的参与额度。' : '例如每天最多优惠 2 单，同一用户当天第 3 单不再享受本活动。'}
          </p>
        </div>
      </FormRow>

      {byCity && pickerGroup && (
        <CityRegionPicker
          selectedIds={pickerGroup.cityIds}
          occupiedGroups={new Map(activity.cityRuleGroups.flatMap((group, index) => group.id === pickerGroup.id
            ? []
            : group.cityIds.map((id) => [id, getCityRuleGroupLabel(group, index)] as const)))}
          onConfirm={(cityIds) => updateCityGroup(pickerGroup.id, { cityIds })}
          onClose={() => setPickerGroupId(null)}
        />
      )}
    </>
  )
}

function CityRuleGroupEditor({ group, label, readOnly, onChange, onPickCities, onRemove }: {
  group: DeliveryFeeCityRuleGroup
  label: string
  readOnly?: boolean
  onChange: (patch: Partial<DeliveryFeeCityRuleGroup>) => void
  onPickCities: () => void
  onRemove: () => void
}) {
  return (
    <section className="df-rule-card" aria-label={label}>
      <div className="df-rule-card__head">
        <label>
          <span className="df-rule-card__label">组名</span>
          <input
            className="input"
            value={group.name}
            placeholder={label}
            disabled={readOnly}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </label>
        {!readOnly && <button type="button" className="link-btn btn-link--danger" onClick={onRemove}>删除城市组</button>}
      </div>
      <div className="df-rule-card__block">
        <div className="df-rule-card__label"><span className="required">*</span>适用城市</div>
        <div className="df-city-tags">
          {group.cityIds.length === 0 && <span className="text-secondary">尚未选择城市</span>}
          {group.cityIds.map((id) => (
            <span key={id} className="df-city-tag">
              {getCityNames([id])}
              {!readOnly && (
                <button
                  type="button"
                  className="df-city-tag__remove"
                  aria-label={`移除${getCityNames([id])}`}
                  onClick={() => onChange({ cityIds: group.cityIds.filter((cityId) => cityId !== id) })}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        {!readOnly && (
          <div className="df-city-actions">
            <button type="button" className="btn btn--default btn--sm" onClick={onPickCities}>选择城市</button>
            {group.cityIds.length > 0 && <button type="button" className="link-btn" onClick={() => onChange({ cityIds: [] })}>清空</button>}
          </div>
        )}
      </div>
      <GroupedOfferFields rule={group} readOnly={readOnly} onChange={onChange} />
    </section>
  )
}

function GroupedOfferFields({ rule, readOnly, onChange }: {
  rule: DeliveryFeeOfferRule
  readOnly?: boolean
  onChange: (rule: DeliveryFeeOfferRule) => void
}) {
  return (
    <>
      <div className="df-rule-card__block">
        <div className="df-rule-card__label">活动门槛</div>
        <ThresholdTypePicker rule={rule} readOnly={readOnly} onChange={onChange} />
      </div>
      <div className="df-rule-card__block">
        <div className="df-rule-card__label">优惠阶梯</div>
        <TierEditor
          tiers={rule.tiers}
          thresholdType={rule.thresholdType}
          readOnly={readOnly}
          onChange={(tiers) => onChange({ thresholdType: rule.thresholdType, tiers })}
        />
      </div>
    </>
  )
}

function ThresholdTypePicker({ rule, readOnly, onChange }: {
  rule: DeliveryFeeOfferRule
  readOnly?: boolean
  onChange: (rule: DeliveryFeeOfferRule) => void
}) {
  const name = useId()
  return (
    <div>
      <div className="radio-group" role="group" aria-label="活动门槛">
        {THRESHOLD_TYPE_OPTIONS.map(({ value, label }) => (
          <label key={value} className="radio">
            <input
              type="radio"
              name={name}
              disabled={readOnly}
              checked={rule.thresholdType === value}
              onChange={() => onChange({ thresholdType: value, tiers: normalizeTiersForThresholdType(rule.tiers, value) })}
            />
            {label}
          </label>
        ))}
      </div>
      {rule.thresholdType === 'none' && (
        <p className="field-hint">无门槛时仅配置一条优惠规则，立减金额最高 999 元。</p>
      )}
    </div>
  )
}

/** 金额保留最多 2 位小数，避免浮点误差（如 10.01+10 → 20.009999…） */
function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100
}

function TierEditor({
  tiers,
  thresholdType,
  readOnly,
  onChange,
}: {
  tiers: DeliveryFeeTier[]
  thresholdType: DeliveryFeeThresholdType
  readOnly?: boolean
  onChange: (tiers: DeliveryFeeTier[]) => void
}) {
  const updateAt = (index: number, patch: Partial<DeliveryFeeTier>) => {
    onChange(tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)))
  }

  const changeMethod = (index: number, discountMethod: DeliveryFeeDiscountMethod) => {
    const patch: Partial<DeliveryFeeTier> = { discountMethod }
    if (discountMethod === 'percent_off') patch.discountValue = 9
    else if (discountMethod === 'waive') patch.discountValue = 0
    else if (tiers[index].discountMethod !== 'amount_off') patch.discountValue = 0.1
    updateAt(index, patch)
  }

  const setAmountThreshold = (index: number, raw: number) => {
    updateAt(index, { threshold: Math.max(0.01, roundMoney(raw)) })
  }

  const setDiscountAmount = (index: number, raw: number) => {
    updateAt(index, { discountValue: Math.min(999, Math.max(0.01, roundMoney(raw))) })
  }

  const canAddTier = thresholdType !== 'none' && tiers.length < MAX_TIERS
  const thrUnit = thresholdType === 'item_count' ? '件' : '元'
  const thrLabel = thresholdType === 'item_count' ? '订单件数满' : '订单金额满'
  const thrStep = thresholdType === 'item_count' ? 1 : 0.01
  const thrMin = thresholdType === 'item_count' ? 1 : 0.01

  return (
    <div className="fr-tier-table-wrap">
      <table className="table fr-tier-table">
        <thead>
          <tr>
            <th>门槛条件</th>
            <th>优惠方式</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier, index) => (
            <tr key={tier.id}>
              <td>
                {thresholdType === 'none' ? (
                  <span className="text-secondary">无门槛</span>
                ) : (
                  <span className="fr-tier-inline">
                    {thrLabel}
                    <input
                      className="input input--sm"
                      type="number"
                      aria-label={thrLabel}
                      min={thrMin}
                      step={thrStep}
                      disabled={readOnly}
                      value={thresholdType === 'amount' ? roundMoney(tier.threshold) : tier.threshold}
                      onChange={(e) => {
                        const raw = Number(e.target.value)
                        if (thresholdType === 'amount') setAmountThreshold(index, raw)
                        else updateAt(index, { threshold: Math.max(1, Math.round(raw || 1)) })
                      }}
                    />
                    {thrUnit}
                  </span>
                )}
              </td>
              <td>
                <span className="fr-tier-inline">
                  <select
                    className="input"
                    aria-label="优惠方式"
                    disabled={readOnly}
                    value={tier.discountMethod}
                    onChange={(e) => changeMethod(index, e.target.value as DeliveryFeeDiscountMethod)}
                  >
                    {(Object.keys(DISCOUNT_METHOD_LABELS) as DeliveryFeeDiscountMethod[]).map((k) => (
                      <option key={k} value={k}>{DISCOUNT_METHOD_LABELS[k]}</option>
                    ))}
                  </select>
                  {tier.discountMethod === 'amount_off' && (
                    <>
                      <input
                        className="input input--sm"
                        type="number"
                        aria-label="立减金额"
                        min={0.01}
                        max={999}
                        step={0.01}
                        disabled={readOnly}
                        value={roundMoney(tier.discountValue)}
                        onChange={(e) => setDiscountAmount(index, Number(e.target.value))}
                      />
                      元
                    </>
                  )}
                  {tier.discountMethod === 'percent_off' && (
                    <>
                      <input
                        className="input input--sm"
                        type="number"
                        aria-label="折扣折数"
                        min={0.1}
                        max={9.9}
                        step={0.1}
                        disabled={readOnly}
                        value={tier.discountValue}
                        onChange={(e) => updateAt(index, { discountValue: Number(e.target.value) })}
                      />
                      折
                    </>
                  )}
                  {tier.discountMethod === 'waive' && <span className="text-secondary">免除全部配送费</span>}
                </span>
              </td>
              <td>
                {index > 0 && !readOnly && thresholdType !== 'none' && (
                  <button type="button" className="link-btn" onClick={() => onChange(tiers.filter((_, i) => i !== index))}>
                    删除
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && canAddTier && (
        <div className="fr-tier-footer">
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              const last = tiers[tiers.length - 1]
              const nextThreshold = thresholdType === 'item_count'
                ? Math.max(1, Math.round((last?.threshold ?? thrMin) + 1))
                : roundMoney((last?.threshold ?? thrMin) + 10)
              const nextDiscount = last?.discountMethod === 'waive'
                ? 0.1
                : last?.discountMethod === 'amount_off'
                  ? roundMoney(last?.discountValue ?? 0.1)
                  : (last?.discountValue ?? 0.1)
              onChange([
                ...tiers,
                {
                  id: `tier-${Date.now()}`,
                  threshold: nextThreshold,
                  discountMethod: last?.discountMethod === 'waive' ? 'amount_off' : (last?.discountMethod ?? 'amount_off'),
                  discountValue: nextDiscount,
                },
              ])
            }}
          >
            + 添加优惠阶梯
          </button>
        </div>
      )}
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
      <input type="checkbox" disabled={disabled} checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} />
      <span className="limit-checkbox__content">{label}</span>
    </label>
  )
}

function NumberStepper({ value, onChange, disabled, min = 1 }: {
  value: number; onChange: (v: number) => void; disabled?: boolean; min?: number
}) {
  return (
    <input
      type="number"
      className="input input--num"
      disabled={disabled}
      min={min}
      value={value}
      onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
    />
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
