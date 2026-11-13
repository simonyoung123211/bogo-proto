import { useState } from 'react'
import { MEMBER_TAG_OPTIONS } from '../mockData'
import {
  LIMIT_DISCOUNT_PARTICIPANTS,
  PERIOD_OPTIONS,
  WEEKDAY_OPTIONS,
  createTimeRange,
} from '../mockLimitDiscountData'
import type { LimitDiscountActivityForm, LimitType } from '../types'
import { ProductPicker } from './ProductPicker'

interface LimitDiscountRuleFieldsProps {
  activity: LimitDiscountActivityForm
  readOnly?: boolean
  onChange: (activity: LimitDiscountActivityForm) => void
}

export function LimitDiscountRuleFields({ activity, readOnly, onChange }: LimitDiscountRuleFieldsProps) {
  const [moreOpen, setMoreOpen] = useState(activity.holidayInactive || activity.inactiveRanges.length > 0)
  const [advancedOpen, setAdvancedOpen] = useState(true)
  const [example, setExample] = useState<string | null>(null)
  const [pickingThreshold, setPickingThreshold] = useState(false)

  const update = <K extends keyof LimitDiscountActivityForm>(key: K, value: LimitDiscountActivityForm[K]) => {
    onChange({ ...activity, [key]: value })
  }

  const toggleNumber = (list: number[], value: number) => (
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value].sort((a, b) => a - b)
  )

  return (
    <>
      <FormRow label="活动名称" required>
        <CharInput disabled={readOnly} value={activity.name} max={30} placeholder="请输入活动名称" onChange={(v) => update('name', v)} />
        <p className="field-hint">最多支持30个文字或字母</p>
      </FormRow>
      <FormRow label="活动标题">
        <CharInput disabled={readOnly} value={activity.title} max={20} placeholder="请输入活动标题" onChange={(v) => update('title', v)} />
        <p className="field-hint">
          在门店列表展示该标题
          <button type="button" className="link-btn" onClick={() => setExample('门店列表里，活动卡片会展示这个标题，方便顾客点进活动详情。')}>查看示例</button>
        </p>
      </FormRow>
      <FormRow label="商品促销标签">
        <CharInput disabled={readOnly} value={activity.goodsLabel} max={20} placeholder="请输入商品促销标签" onChange={(v) => update('goodsLabel', v)} />
      </FormRow>
      <FormRow label="起止时间" required>
        <div className="date-range">
          <input type="datetime-local" className="input input--time" disabled={readOnly} value={toLocal(activity.startTime)} onChange={(e) => update('startTime', fromLocal(e.target.value))} />
          <span className="date-range__sep">至</span>
          <input type="datetime-local" className="input input--time" disabled={readOnly} value={toLocal(activity.endTime)} onChange={(e) => update('endTime', fromLocal(e.target.value))} />
        </div>
      </FormRow>
      <FormRow label="活动周期" required>
        <RadioGroup
          disabled={readOnly}
          value={activity.cycleType}
          options={[{ value: 'daily', label: '每天' }, { value: 'weekly', label: '每周' }, { value: 'monthly', label: '每月' }]}
          onChange={(v) => update('cycleType', v as LimitDiscountActivityForm['cycleType'])}
        />
        {activity.cycleType === 'weekly' && (
          <div className="checkbox-group" style={{ marginTop: 8 }}>
            {WEEKDAY_OPTIONS.map((day) => (
              <label key={day.value} className="checkbox">
                <input type="checkbox" disabled={readOnly} checked={activity.weekDays.includes(day.value)} onChange={() => update('weekDays', toggleNumber(activity.weekDays, day.value))} />
                {day.label}
              </label>
            ))}
          </div>
        )}
        {activity.cycleType === 'monthly' && (
          <div className="checkbox-group" style={{ marginTop: 8 }}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <label key={day} className="checkbox">
                <input type="checkbox" disabled={readOnly} checked={activity.monthDays.includes(day)} onChange={() => update('monthDays', toggleNumber(activity.monthDays, day))} />
                {day}日
              </label>
            ))}
          </div>
        )}
      </FormRow>
      <FormRow label="活动时段">
        <RadioGroup
          disabled={readOnly}
          value={activity.timeSlotType}
          options={[{ value: 'all_day', label: '全天' }, { value: 'specific', label: '指定时间段' }]}
          onChange={(v) => update('timeSlotType', v as LimitDiscountActivityForm['timeSlotType'])}
        />
        {activity.timeSlotType === 'specific' && (
          <div style={{ marginTop: 8 }}>
            {activity.timeSlots.map((slot) => (
              <div key={slot.id} className="date-range" style={{ marginBottom: 8 }}>
                <input type="time" step={1} className="input" disabled={readOnly} value={slot.start} onChange={(e) => update('timeSlots', activity.timeSlots.map((item) => item.id === slot.id ? { ...item, start: e.target.value } : item))} />
                <span>至</span>
                <input type="time" step={1} className="input" disabled={readOnly} value={slot.end} onChange={(e) => update('timeSlots', activity.timeSlots.map((item) => item.id === slot.id ? { ...item, end: e.target.value } : item))} />
                {!readOnly && activity.timeSlots.length > 1 && (
                  <button type="button" className="link-btn" onClick={() => update('timeSlots', activity.timeSlots.filter((item) => item.id !== slot.id))}>移除时间</button>
                )}
              </div>
            ))}
            {!readOnly && activity.timeSlots.length < 3 && (
              <button type="button" className="link-btn" onClick={() => update('timeSlots', [...activity.timeSlots, createTimeRange('00:00:00', '23:59:59')])}>添加时间段</button>
            )}
            <p className="field-hint">最多 3 个</p>
          </div>
        )}
      </FormRow>
      <button type="button" className="link-btn" onClick={() => setMoreOpen((v) => !v)}>{moreOpen ? '收起基础信息设置' : '更多基础信息设置'}</button>
      {moreOpen && (
        <FormRow label="不生效日期">
          <label className="checkbox">
            <input type="checkbox" disabled={readOnly} checked={activity.holidayInactive} onChange={(e) => update('holidayInactive', e.target.checked)} />
            法定节假日不生效
          </label>
          <p className="field-hint">勾选后法定节假日活动不生效，不含周六日</p>
          {activity.inactiveRanges.map((range) => (
            <div key={range.id} className="date-range" style={{ marginTop: 8 }}>
              <input type="date" className="input" disabled={readOnly} value={range.start} onChange={(e) => update('inactiveRanges', activity.inactiveRanges.map((item) => item.id === range.id ? { ...item, start: e.target.value } : item))} />
              <span>至</span>
              <input type="date" className="input" disabled={readOnly} value={range.end} onChange={(e) => update('inactiveRanges', activity.inactiveRanges.map((item) => item.id === range.id ? { ...item, end: e.target.value } : item))} />
              {!readOnly && <button type="button" className="link-btn" onClick={() => update('inactiveRanges', activity.inactiveRanges.filter((item) => item.id !== range.id))}>移除</button>}
            </div>
          ))}
          {!readOnly && activity.inactiveRanges.length < 10 && (
            <button type="button" className="link-btn" style={{ marginTop: 8 }} onClick={() => update('inactiveRanges', [...activity.inactiveRanges, createTimeRange()])}>添加不生效时间段</button>
          )}
          <p className="field-hint">最多 10 个。与活动可用周期冲突时，以不生效为准</p>
        </FormRow>
      )}

      <div className="form-section__title" style={{ marginTop: 20 }}>活动规则</div>
      <FormRow label="门槛限制" required>
        <YesNo value={activity.thresholdType} disabled={readOnly} unlimitedLabel="不限" limitedLabel="限制" onChange={(v) => update('thresholdType', v)} />
        {activity.thresholdType === 'limited' && (
          <div style={{ marginTop: 8 }}>
            <div className="rule-sentence">
              <span>消费金额满</span>
              <input className="input" style={{ width: 100 }} type="number" min={0.01} step={0.01} disabled={readOnly} value={activity.thresholdAmount} onChange={(e) => update('thresholdAmount', Number(e.target.value))} />
              <span>元</span>
            </div>
            <p className="field-hint">按购买指定门槛商品原价计算门槛金额</p>
            <div style={{ marginTop: 8 }}>
              <span className="field-hint">商品范围：</span>
              <RadioGroup
                disabled={readOnly}
                value={activity.thresholdGoodsScope}
                options={[{ value: 'all', label: '全部商品' }, { value: 'exclude', label: '排除商品' }, { value: 'include', label: '指定商品' }]}
                onChange={(v) => update('thresholdGoodsScope', v as LimitDiscountActivityForm['thresholdGoodsScope'])}
              />
            </div>
            {activity.thresholdGoodsScope !== 'all' && (
              <p className="field-hint">
                已{activity.thresholdGoodsScope === 'exclude' ? '排除' : '指定'} {activity.thresholdProductIds.length} 件商品
                {!readOnly && <button type="button" className="link-btn" onClick={() => setPickingThreshold(true)}>选择商品</button>}
              </p>
            )}
            <div className="checkbox-group" style={{ marginTop: 8 }}>
              <span className="field-hint">消费金额包含：</span>
              <label className="checkbox"><input type="checkbox" disabled={readOnly} checked={activity.thresholdIncludeTopping} onChange={(e) => update('thresholdIncludeTopping', e.target.checked)} />加料商品金额</label>
              <label className="checkbox"><input type="checkbox" disabled={readOnly} checked={activity.thresholdIncludeCombo} onChange={(e) => update('thresholdIncludeCombo', e.target.checked)} />套餐加价子商品</label>
              <label className="checkbox"><input type="checkbox" disabled={readOnly} checked={activity.thresholdIncludePractice} onChange={(e) => update('thresholdIncludePractice', e.target.checked)} />做法加价金额</label>
            </div>
          </div>
        )}
      </FormRow>
      <FormRow label="加料商品是否参与优惠" required>
        <RadioGroup disabled={readOnly} value={activity.toppingDiscount} options={[{ value: 'no', label: '不参与' }, { value: 'yes', label: '参与' }]} onChange={(v) => update('toppingDiscount', v as 'no' | 'yes')} />
        <p className="field-hint">选择参与，则商品中加料商品的价格参与优惠计算，例如A商品5元，加料商品2元，则参与优惠计算的金额为5+2=7元</p>
      </FormRow>
      <FormRow label="套餐加价金额是否参与优惠" required>
        <RadioGroup disabled={readOnly} value={activity.comboSurchargeDiscount} options={[{ value: 'no', label: '不参与' }, { value: 'yes', label: '参与' }]} onChange={(v) => update('comboSurchargeDiscount', v as 'no' | 'yes')} />
        <p className="field-hint">选择参与，则套餐商品中随心配的商品另外加价的金额参与优惠计算，如A套餐10元，随心配子商品B为5元，则参与优惠计算的金额为10+5=15元</p>
      </FormRow>
      <FormRow label="做法加价是否参与优惠" required>
        <RadioGroup disabled={readOnly} value={activity.practiceSurchargeDiscount} options={[{ value: 'no', label: '不参与' }, { value: 'yes', label: '参与' }]} onChange={(v) => update('practiceSurchargeDiscount', v as 'no' | 'yes')} />
      </FormRow>
      <FormRow label="用户参与活动总次数（订单数）">
        <YesNo value={activity.totalTimesType} disabled={readOnly} onChange={(v) => update('totalTimesType', v)} />
        {activity.totalTimesType === 'limited' && (
          <div className="rule-sentence" style={{ marginTop: 8 }}>
            <span>该活动期间内每个用户最多优惠</span>
            <input className="input" style={{ width: 80 }} type="number" min={1} disabled={readOnly} value={activity.totalTimes} onChange={(e) => update('totalTimes', Number(e.target.value))} />
            <span>单</span>
          </div>
        )}
      </FormRow>
      <FormRow label="用户参与活动频次（订单数）">
        <YesNo value={activity.frequencyType} disabled={readOnly} onChange={(v) => update('frequencyType', v)} />
        {activity.frequencyType === 'limited' && (
          <div className="rule-sentence" style={{ marginTop: 8 }}>
            <span>每个用户</span>
            <select className="input" disabled={readOnly} value={activity.frequencyPeriod} onChange={(e) => update('frequencyPeriod', e.target.value as LimitDiscountActivityForm['frequencyPeriod'])}>
              {PERIOD_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <span>最多优惠</span>
            <input className="input" style={{ width: 80 }} type="number" min={1} disabled={readOnly} value={activity.frequencyTimes} onChange={(e) => update('frequencyTimes', Number(e.target.value))} />
            <span>单</span>
          </div>
        )}
      </FormRow>
      <FormRow label="用户参与活动商品件数限制">
        <label className="checkbox">
          <input type="checkbox" disabled={readOnly} checked={activity.limitTotalPieces} onChange={(e) => update('limitTotalPieces', e.target.checked)} />
          限制该活动期间内每个用户最多优惠
          <input className="input" style={{ width: 72, margin: '0 6px' }} type="number" min={1} disabled={readOnly || !activity.limitTotalPieces} value={activity.totalPieces} onChange={(e) => update('totalPieces', Number(e.target.value))} />
          件
        </label>
        <label className="checkbox" style={{ marginTop: 8 }}>
          <input type="checkbox" disabled={readOnly} checked={activity.limitPeriodPieces} onChange={(e) => update('limitPeriodPieces', e.target.checked)} />
          限制每个用户
          <select className="input" style={{ margin: '0 6px' }} disabled={readOnly || !activity.limitPeriodPieces} value={activity.periodPiecesPeriod} onChange={(e) => update('periodPiecesPeriod', e.target.value as LimitDiscountActivityForm['periodPiecesPeriod'])}>
            {PERIOD_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          最多优惠
          <input className="input" style={{ width: 72, margin: '0 6px' }} type="number" min={1} disabled={readOnly || !activity.limitPeriodPieces} value={activity.periodPieces} onChange={(e) => update('periodPieces', Number(e.target.value))} />
          件
        </label>
        <label className="checkbox" style={{ marginTop: 8 }}>
          <input type="checkbox" disabled={readOnly} checked={activity.limitOrderPieces} onChange={(e) => update('limitOrderPieces', e.target.checked)} />
          限制用户每单最多优惠
          <input className="input" style={{ width: 72, margin: '0 6px' }} type="number" min={1} disabled={readOnly || !activity.limitOrderPieces} value={activity.orderPieces} onChange={(e) => update('orderPieces', Number(e.target.value))} />
          件
        </label>
        <p className="field-hint">限制每个用户每单最多可优惠件数，比如限制3件，用户一笔订单中加购5件限时折扣商品，则只有3件享受限时折扣优惠。</p>
      </FormRow>
      <FormRow label="优惠商品命中规则" required>
        <RadioGroup
          disabled={readOnly}
          value={activity.hitRule}
          options={[{ value: 'highest_price', label: '优惠商品价格从高到低' }, { value: 'lowest_price', label: '优惠商品价格从低到高' }]}
          onChange={(v) => update('hitRule', v as LimitDiscountActivityForm['hitRule'])}
        />
        <p className="field-hint">开启限制优惠商品件数时，默认优惠每单中选购价格高的商品。可设置为优惠价格低的商品。举例，A商品有大中小三种规格，每种规格价格不等为3元、2元、1元，下单时选购大中小各1件，则优惠价格从高到低或者从低到高进行优惠。</p>
      </FormRow>

      <button type="button" className="link-btn" onClick={() => setAdvancedOpen((v) => !v)}>{advancedOpen ? '收起高级选项' : '高级选项'}</button>
      {advancedOpen && (
        <>
          <FormRow label="活动编码">
            <CharInput disabled={readOnly} value={activity.activityCode} max={30} placeholder="请输入活动编码" onChange={(v) => update('activityCode', v)} />
            <p className="field-hint">用于第三方ERP对接，可不填</p>
          </FormRow>
          <FormRow label="共享互斥关系">
            <RadioGroup
              disabled={readOnly}
              value={activity.shareMutexRelation}
              options={[{ value: 'share_all', label: '全部活动/券 共享' }, { value: 'mutex_all', label: '全部活动/券 互斥' }]}
              onChange={(v) => update('shareMutexRelation', v as LimitDiscountActivityForm['shareMutexRelation'])}
            />
            <p className="field-hint">全部活动/券共享：和所有促销活动和优惠券共享，设置共享后在【共享关系】菜单中将无法进行选择；全部活动/券互斥：若设置指定共享关系需设置【全部互斥】，创建完成后前往【共享关系】进行配置。</p>
          </FormRow>
          <FormRow label="参与用户" required>
            <div className="radio-group radio-group--vertical">
              {LIMIT_DISCOUNT_PARTICIPANTS.map((item) => (
                <label key={item.value} className="radio">
                  <input type="radio" disabled={readOnly} checked={activity.participantUser === item.value} onChange={() => update('participantUser', item.value)} />
                  <span>{item.label}<span className="field-hint" style={{ marginLeft: 8 }}>{item.hint}</span></span>
                </label>
              ))}
            </div>
          </FormRow>
          <FormRow label="活动标题展示">
            <RadioGroup disabled={readOnly} value={activity.titleDisplay} options={[{ value: 'show', label: '展示' }, { value: 'hide', label: '不展示' }]} onChange={(v) => update('titleDisplay', v as LimitDiscountActivityForm['titleDisplay'])} />
            <p className="field-hint">若设置为不展示，则该活动不会在小程序参与门店的点单页展示该活动的标签</p>
          </FormRow>
          <FormRow label="商品促销标签展示">
            <RadioGroup disabled={readOnly} value={activity.goodsLabelDisplay} options={[{ value: 'show', label: '展示' }, { value: 'hide', label: '不展示' }]} onChange={(v) => update('goodsLabelDisplay', v as LimitDiscountActivityForm['goodsLabelDisplay'])} />
            <p className="field-hint">门店商品展示该促销标签</p>
          </FormRow>
          <FormRow label="打标签">
            <div className="checkbox-group">
              {MEMBER_TAG_OPTIONS.filter((item) => item.value).map((item) => (
                <label key={item.value} className="checkbox">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={activity.memberTagIds.includes(item.value)}
                    onChange={() => update('memberTagIds', activity.memberTagIds.includes(item.value) ? activity.memberTagIds.filter((id) => id !== item.value) : [...activity.memberTagIds, item.value])}
                  />
                  {item.label}
                </label>
              ))}
            </div>
            <p className="field-hint">设置后，参与该活动的会员将会打上此标签，方便后期数据统计，会员分层管理以及精细化运营</p>
          </FormRow>
          <FormRow label="快捷检索名称">
            <CharInput disabled={readOnly} value={activity.searchKeyword} max={20} placeholder="请输入快捷检索名称" onChange={(v) => update('searchKeyword', v)} />
          </FormRow>
          <FormRow label="活动说明">
            <div className="char-textarea-wrap">
              <textarea className="textarea textarea--count" disabled={readOnly} rows={4} value={activity.description} placeholder="请输入内容" onChange={(e) => update('description', e.target.value.slice(0, 500))} />
              <span className="char-count">{activity.description.length}/500</span>
            </div>
            <p className="field-hint">门店列表点击活动详情展示</p>
          </FormRow>
        </>
      )}

      {example && (
        <div className="modal-overlay" onClick={() => setExample(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h3>查看示例</h3></div>
            <div className="modal__body">{example}</div>
            <div className="modal__footer"><button type="button" className="btn btn--primary" onClick={() => setExample(null)}>知道了</button></div>
          </div>
        </div>
      )}
      {pickingThreshold && (
        <ProductPicker
          selectedIds={activity.thresholdProductIds}
          onChange={(ids) => update('thresholdProductIds', ids)}
          onClose={() => setPickingThreshold(false)}
        />
      )}
    </>
  )
}

function YesNo({ value, disabled, onChange, unlimitedLabel = '不限', limitedLabel = '限制' }: {
  value: LimitType
  disabled?: boolean
  unlimitedLabel?: string
  limitedLabel?: string
  onChange: (value: LimitType) => void
}) {
  return (
    <RadioGroup
      disabled={disabled}
      value={value}
      options={[{ value: 'unlimited', label: unlimitedLabel }, { value: 'limited', label: limitedLabel }]}
      onChange={(v) => onChange(v as LimitType)}
    />
  )
}

function toLocal(value: string): string {
  return value ? value.slice(0, 16).replace(' ', 'T') : ''
}

function fromLocal(value: string): string {
  if (!value) return ''
  return `${value.replace('T', ' ')}:00`.slice(0, 19)
}

function CharInput({ value, max, placeholder, disabled, onChange }: { value: string; max: number; placeholder?: string; disabled?: boolean; onChange: (v: string) => void }) {
  return (
    <div className="char-input-wrap">
      <input className="input input--wide input--count" disabled={disabled} value={value} placeholder={placeholder} maxLength={max} onChange={(e) => onChange(e.target.value.slice(0, max))} />
      <span className="char-count">{value.length}/{max}</span>
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

function RadioGroup({ value, options, onChange, disabled }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="radio-group">
      {options.map((opt) => (
        <label key={opt.value} className="radio">
          <input type="radio" disabled={disabled} checked={value === opt.value} onChange={() => onChange(opt.value)} />
          {opt.label}
        </label>
      ))}
    </div>
  )
}
