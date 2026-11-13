import { useId, useRef, useState } from 'react'
import type { StoredValueBalanceThreshold, StoredValuePayGeneralSettings } from '../types'
import { loadStoredValuePayGeneralSettings, saveStoredValuePayGeneralSettings } from '../utils/storage'
import { PromotionSettingsLayout, PromotionTagEditor, type PromotionTagEditorHandle } from '../components/PromotionTagEditor'

interface Props { onBack: () => void; onSaved: () => void }

export function StoredValuePayGeneralSettingsPage({ onBack, onSaved }: Props) {
  const [settings, setSettings] = useState<StoredValuePayGeneralSettings>(loadStoredValuePayGeneralSettings)
  const [savedSettings] = useState(settings)
  const editorRef = useRef<PromotionTagEditorHandle>(null)
  const thresholdId = useId()
  const handleSave = () => {
    if (!editorRef.current?.validate()) return
    saveStoredValuePayGeneralSettings({ ...settings, customPromotionTagEnabled: true })
    onSaved()
    onBack()
  }
  return (
    <PromotionSettingsLayout title="储值支付优惠通用设置" description="设置商品标签的默认文案、外观和整单余额支付门槛。" hasChanges={JSON.stringify(settings) !== JSON.stringify(savedSettings)} onBack={onBack} onSave={handleSave} hasAdditionalSettings>
      <PromotionTagEditor ref={editorRef} settings={{ ...settings, tagTextPosition: settings.tagPosition }} onChange={(change) => setSettings((current) => {
        const { tagTextPosition, ...next } = change({ ...current, tagTextPosition: current.tagPosition })
        return { ...current, ...next, tagPosition: tagTextPosition }
      })} config={{
        priceLabel: '优惠价格',
        defaultText: '储值享',
        defaultOrder: 'price_left',
        memberLevelText: '金卡',
        memberLevelExample: '如：金卡',
        sourceHint: '活动内填写的「商品卡片展示标签」优先；未填写时使用这里的文案。',
        customPlaceholder: '例如：储值专享价',
        price: '10.12',
        priceSuffix: '起',
        priceCaption: '优惠价格取储值支付优惠活动的生效价，此处仅配置外观。',
        previewNote: '示例商品与价格仅供演示，实际优惠及参与资格以活动、支付条件和订单计算结果为准。',
        helpTitle: '储值支付优惠标签说明',
        helpLinkText: '标签配置说明',
        helpContent: (
          <div className="promotion-label-help">
            <section><h3>营销文案从哪里来</h3><p>活动填写了「商品卡片展示标签」时优先使用活动文案。未填写时，使用本页选择的「储值享」、当前会员等级名称或自定义文案。</p></section>
            <section><h3>价格与文案可换序</h3><p>调整排列只交换两部分的左右位置，文字颜色和背景随各自内容移动。预览价格为示例，不修改活动的实际优惠价格。</p></section>
            <section><h3>余额门槛独立配置</h3><p>下方「整单余额支付活动参与条件」只作用于「整单仅限储值余额支付才可参与」的活动；「储值余额支付 ≥ 0.01 即可参与」不受此门槛约束。</p></section>
          </div>
        ),
      }} />
      <section className="promotion-settings-extra" aria-labelledby={thresholdId + '-title'}>
        <div className="promotion-settings-extra__heading">
          <h2 id={thresholdId + '-title'}>整单余额支付活动参与条件</h2>
          <p>仅作用于「整单仅限储值余额支付才可参与」的活动；「储值余额支付 ≥ 0.01 即可参与」不受此门槛约束。</p>
        </div>
        <fieldset className="promotion-balance-options">
          <legend>余额门槛口径</legend>
          <div className="member-label-source-options">
            {[
              { value: 'original_subtotal', title: '订单原价小计', description: '按购物车商品原价合计判断', amount: '20' },
              { value: 'payable_subtotal', title: '本活动优惠前应付', description: '扣除其他已生效优惠，不含本活动优惠', amount: '17' },
              { value: 'payable_after_activity', title: '本活动优惠后应付', description: '在优惠前应付基础上，再扣除本活动优惠', amount: '15' },
            ].map((option) => (
              <label key={option.value} className={'member-label-choice promotion-balance-choice ' + (settings.fullOrderBalanceThreshold === option.value ? 'is-selected' : '')}>
                <input type="radio" name={thresholdId} aria-label={'用户余额 ≥ ' + option.title} checked={settings.fullOrderBalanceThreshold === option.value}
                  onChange={() => setSettings((current) => ({ ...current, fullOrderBalanceThreshold: option.value as StoredValueBalanceThreshold }))} />
                <strong>{option.title}</strong><span>{option.description}</span><b>示例需余额 ≥ ¥{option.amount}</b>
              </label>
            ))}
          </div>
          <p className="member-label-help">示例：商品原价 ¥20，其他可共享优惠 ¥3，本活动再优惠 ¥2。以上金额仅用于解释门槛口径。</p>
        </fieldset>
      </section>
    </PromotionSettingsLayout>
  )
}
