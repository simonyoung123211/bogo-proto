import { useRef, useState } from 'react'
import type { PaidMemberPriceGeneralSettings } from '../types'
import { loadPaidMemberPriceGeneralSettings, savePaidMemberPriceGeneralSettings } from '../utils/storage'
import { PromotionSettingsLayout, PromotionTagEditor, type PromotionTagEditorHandle } from '../components/PromotionTagEditor'

interface Props { onBack: () => void; onSaved: () => void }

export function PaidMemberPriceGeneralSettingsPage({ onBack, onSaved }: Props) {
  const [settings, setSettings] = useState<PaidMemberPriceGeneralSettings>(loadPaidMemberPriceGeneralSettings)
  const [savedSettings] = useState(settings)
  const editorRef = useRef<PromotionTagEditorHandle>(null)
  const handleSave = () => {
    if (!editorRef.current?.validate()) return
    savePaidMemberPriceGeneralSettings(settings)
    onSaved()
    onBack()
  }
  return (
    <PromotionSettingsLayout title="付费会员价通用设置" description="设置付费会员价商品标签的默认文案与外观。" hasChanges={JSON.stringify(settings) !== JSON.stringify(savedSettings)} onBack={onBack} onSave={handleSave}>
      <PromotionTagEditor ref={editorRef} settings={{ ...settings, tagTextPosition: 'label_left' }} onChange={(change) => setSettings((current) => {
        const { tagTextPosition, ...next } = change({ ...current, tagTextPosition: 'label_left' })
        // 付费会员价固定左文案、右价格，不写入可换序字段。
        return tagTextPosition === 'label_left' ? { ...current, ...next } : current
      })} config={{
        priceLabel: '付费会员价格',
        defaultText: '付费会员卡名称',
        defaultOrder: 'label_left',
        allowReorder: false,
        partOrder: ['marketing', 'price'],
        sourceHint: '活动内填写的「商品卡片展示标签」优先；未填写时使用这里的文案，默认取付费会员卡名称。',
        customPlaceholder: '例如：付费会员专享',
        price: '10.12',
        priceSuffix: '起',
        priceCaption: '固定文案在左、付费会员价格在右；价格取活动生效价。',
        previewNote: '示例商品与价格仅供演示。实际展示由顾客身份、商品规格及生效付费会员价活动决定。',
        helpTitle: '付费会员价标签说明',
        helpLinkText: '标签配置说明',
        helpContent: (
          <div className="promotion-label-help">
            <section><h3>营销文案从哪里来</h3><p>活动填写了「商品卡片展示标签」时优先使用活动文案。未填写时，使用本页选择的付费会员卡名称、当前会员等级名称或自定义文案。</p></section>
            <section><h3>标签顺序固定</h3><p>营销文案始终在左侧，付费会员价格始终在右侧。两部分可以分别设置文字颜色，以及纯色或图片背景。</p></section>
            <section><h3>预览与实际价格</h3><p>预览仅展示标签外观，示例价格为 ¥10.12 起。实际优惠价格、参与资格以生效的付费会员价活动为准，本页不配置优惠规则。</p></section>
          </div>
        ),
      }} />
    </PromotionSettingsLayout>
  )
}
