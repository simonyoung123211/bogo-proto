import { useRef, useState } from 'react'
import type { ConsumptionPrivilegeDisplaySettings } from '../types'
import { loadConsumptionPrivilegeDisplaySettings, saveConsumptionPrivilegeDisplaySettings } from '../utils/storage'
import { PromotionSettingsLayout, PromotionTagEditor, type PromotionTagEditorHandle } from '../components/PromotionTagEditor'

interface ConsumptionPrivilegePageProps { onOpenSettings: () => void }

export function ConsumptionPrivilegePage({ onOpenSettings }: ConsumptionPrivilegePageProps) {
  return (
    <div className="page-card consumption-privilege-page">
      <header className="settings-page-header">
        <div><h1>消费特权</h1><p>会员在当前等级时享受的消费权益。</p></div>
      </header>
      <div className="consumption-privilege-page__body">
        <section className="consumption-privilege-card" aria-labelledby="consumption-privilege-title">
          <div className="consumption-privilege-card__icon" aria-hidden>¥</div>
          <div className="consumption-privilege-card__content">
            <h2 id="consumption-privilege-title">消费特权</h2><p>会员在当前等级时享受的消费权益</p>
            <button type="button" className="btn btn--primary" onClick={onOpenSettings}>展示设置</button>
          </div>
        </section>
      </div>
    </div>
  )
}

interface DisplaySettingsProps { onBack: () => void; onSaved: () => void }

export function ConsumptionPrivilegeDisplaySettingsPage({ onBack, onSaved }: DisplaySettingsProps) {
  const [settings, setSettings] = useState<ConsumptionPrivilegeDisplaySettings>(loadConsumptionPrivilegeDisplaySettings)
  const [savedSettings] = useState(settings)
  const editorRef = useRef<PromotionTagEditorHandle>(null)
  const handleSave = () => {
    if (!editorRef.current?.validate()) return
    saveConsumptionPrivilegeDisplaySettings(settings)
    onSaved()
    onBack()
  }
  return (
    <PromotionSettingsLayout title="消费特权展示设置" description="设置消费特权商品标签的默认文案、排列与外观。" hasChanges={JSON.stringify(settings) !== JSON.stringify(savedSettings)} onBack={onBack} onSave={handleSave}>
      <PromotionTagEditor ref={editorRef} settings={settings} onChange={(change) => setSettings((current) => ({ ...current, ...change(current) }))} config={{
        priceLabel: '特权价格',
        defaultText: '会员价',
        defaultOrder: 'label_left',
        partOrder: ['marketing', 'price'],
        memberLevelTitle: '消费特权等级名称',
        memberLevelOptionLabel: '当前消费特权的会员等级名称',
        sourceHint: '选择等级名称时，使用顾客当前享受该消费特权的会员等级名称。',
        customPlaceholder: '例如：金卡特权价',
        price: '10.12',
        priceSuffix: '起',
        priceCaption: '特权价格取顾客享受的消费特权生效价，此处仅配置外观。',
        previewNote: '示例商品与价格仅供演示，实际标签和价格以顾客享受的消费特权为准。',
        helpTitle: '消费特权标签说明',
        helpLinkText: '标签配置说明',
        helpContent: (
          <div className="promotion-label-help">
            <section><h3>营销文案从哪里来</h3><p>默认展示「会员价」。也可使用当前消费特权的会员等级名称，或输入最多 10 个字符的自定义文案。</p></section>
            <section><h3>等级名称对应消费特权</h3><p>选择等级名称后，文案随顾客享受该消费特权的会员等级变化，不使用付费会员卡名称。</p></section>
            <section><h3>只调整展示外观</h3><p>营销文案与特权价格可以换序，两部分各自的颜色和背景跟随内容移动。本页不配置消费特权的权益内容，预览中的商品与 ¥10.12 起均为示例。</p></section>
          </div>
        ),
      }} />
    </PromotionSettingsLayout>
  )
}
