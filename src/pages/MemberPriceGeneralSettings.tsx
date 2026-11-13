import { useRef, useState } from 'react'
import type { MemberPriceGeneralSettings } from '../types'
import { loadMemberPriceGeneralSettings, saveMemberPriceGeneralSettings } from '../utils/storage'
import { PromotionSettingsLayout, PromotionTagEditor, type PromotionTagEditorHandle } from '../components/PromotionTagEditor'
export { ColorField, MemberPriceTagPreview, RadioOptions, SettingsRow, TagImageSideConfig } from '../components/PromotionTagPrimitives'

interface MemberPriceGeneralSettingsProps {
  onBack: () => void
  onSaved: () => void
}

export function MemberPriceGeneralSettingsPage({ onBack, onSaved }: MemberPriceGeneralSettingsProps) {
  const [settings, setSettings] = useState<MemberPriceGeneralSettings>(loadMemberPriceGeneralSettings)
  const [savedSettings] = useState(settings)
  const editorRef = useRef<PromotionTagEditorHandle>(null)
  const handleSave = () => {
    if (!editorRef.current?.validate()) return
    saveMemberPriceGeneralSettings(settings)
    onSaved()
    onBack()
  }
  return (
    <PromotionSettingsLayout title="会员价通用设置" description="设置会员价商品标签的默认文案与外观。" hasChanges={JSON.stringify(settings) !== JSON.stringify(savedSettings)} onBack={onBack} onSave={handleSave}>
      <PromotionTagEditor ref={editorRef} settings={settings} onChange={(change) => setSettings((current) => ({ ...current, ...change(current) }))} config={{
        priceLabel: '会员价格',
        defaultText: '会员价',
        defaultOrder: 'price_left',
        sourceHint: '活动内填写的「商品卡片展示标签」优先；未填写时使用这里的文案。',
        customPlaceholder: '例如：金卡专享价',
        price: '14.9',
        priceCaption: '会员价格取活动生效价，此处仅配置外观。',
        helpTitle: '商品促销标签展示规则',
        helpLinkText: '标签展示规则',
        helpContent: <MemberPriceDisplayRules />,
      }} />
    </PromotionSettingsLayout>
  )
}


function MemberPriceDisplayRules() {
  return (
    <div className="member-price-display-rules__body">
        <section>
          <h3>先判断顾客能否看到标签</h3>
          <p className="member-price-rule-intro">点单页商品列表和商品详情页使用相同的顾客身份规则。</p>
          <div className="member-price-rule-grid">
            <div className="member-price-rule-card">
              <strong>活动适用所有会员等级</strong>
              <div className="member-price-rule-path">
                <span>游客</span><span aria-hidden="true">→</span>
                <span className="member-price-rule-tag"><b>会员价</b><b>¥14.9</b></span>
              </div>
              <p>游客可看到营销文案和优惠价，商品售价不划线。</p>
            </div>
            <div className="member-price-rule-card">
              <strong>活动指定会员等级或付费会员</strong>
              <div className="member-price-rule-path">
                <span>游客</span><span aria-hidden="true">→</span><span className="member-price-rule-empty">不展示活动标签</span>
              </div>
              <p>顾客登录后，满足活动要求的等级或付费会员身份才展示标签。</p>
            </div>
          </div>
        </section>
        <section>
          <h3>点单页列表价取商品的最低价规格</h3>
          <p className="member-price-rule-intro">一个商品可有多个规格组合，每个规格的价格和参与活动可能不同。先看列表价对应的最低价规格是否参加会员价。</p>
          <div className="member-price-rule-grid">
            <div className="member-price-rule-card">
              <strong>最低价规格参加会员价</strong>
              <div className="member-price-rule-product">
                <span>洛神花茶 · 大杯（列表价规格）</span>
                <span className="member-price-rule-tag"><b>会员价</b></span>
                <span className="member-price-rule-price"><b className="member-price-rule-sale">¥14.9</b><del>¥18</del></span>
              </div>
              <p>列表价规格有会员价。商品价格区显示会员价和划线原价时，标签只显示文案。</p>
            </div>
            <div className="member-price-rule-card">
              <strong>最低价规格未参加，其他规格有会员价</strong>
              <div className="member-price-rule-product">
                <span>洛神花茶 · 中杯（列表价规格）</span>
                <span className="member-price-rule-tag"><b>会员价</b><b>¥14.9</b></span>
                <span className="member-price-rule-price"><b className="member-price-rule-sale">¥18</b></span>
              </div>
              <p>中杯按原价 ¥18 展示。标签中的 ¥14.9 是参加会员价活动的大杯价格。</p>
            </div>
          </div>
          <p className="member-price-rule-note">列表价规格参加会员价、但价格区没有展示划线原价时，标签显示营销文案和会员价。</p>
        </section>
        <section>
          <h3>商品详情页切换规格后，标签和价格随之更新</h3>
          <div className="member-price-rule-grid">
            <div className="member-price-rule-card">
              <strong>选择参与会员价活动的规格</strong>
              <div className="member-price-rule-detail">
                <span className="member-price-rule-detail__name">日式蜜瓜奶油蛋糕</span>
                <div className="member-price-rule-detail__tags">
                  <span className="member-price-rule-detail__common-tag">商品标签</span>
                  <span className="member-price-rule-tag"><b>会员价</b></span>
                </div>
                <span className="member-price-rule-detail__spec">规格/尺寸 <b>6寸 ✓</b> <span>8寸</span></span>
                <span className="member-price-rule-price"><b className="member-price-rule-sale">¥24</b><del>¥29</del></span>
              </div>
              <p>当前规格参与活动。示例中标签显示文案，价格区显示活动价和划线原价。</p>
            </div>
            <div className="member-price-rule-card">
              <strong>切换至未参与活动的规格</strong>
              <div className="member-price-rule-detail">
                <span className="member-price-rule-detail__name">日式蜜瓜奶油蛋糕</span>
                <div className="member-price-rule-detail__tags">
                  <span className="member-price-rule-detail__common-tag">商品标签</span>
                </div>
                <span className="member-price-rule-detail__spec">规格/尺寸 <span>6寸</span> <b>8寸 ✓</b></span>
                <span className="member-price-rule-price"><b className="member-price-rule-sale member-price-rule-sale--regular">¥29</b></span>
              </div>
              <p>当前规格未参与活动，会员价标签隐藏，价格区显示该规格的正常售价。</p>
            </div>
          </div>
        </section>
        <section>
          <h3>同一规格命中多个活动时只展示一个标签</h3>
          <div className="member-price-rule-choice">
            <span>会员价 · 8 折</span><span>限时折扣 · 7 折</span><span aria-hidden="true">→</span>
            <strong>展示「限时折扣」标签</strong>
          </div>
          <p className="member-price-rule-note">会员价、限时折扣、付费会员价、消费特权、企业员工折扣按最优优惠选择。优惠力度相同，按「优惠引擎 → 计算顺序」中优先级最高的活动展示。</p>
        </section>
    </div>
  )
}
