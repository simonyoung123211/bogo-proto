import { useId, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react'
import type { MemberPriceGeneralSettings } from '../types'
import { sideOf, type TagPart } from '../utils/tagDisplay'
import {
  loadMemberPriceGeneralSettings,
  saveMemberPriceGeneralSettings,
} from '../utils/storage'

interface MemberPriceGeneralSettingsProps {
  onBack: () => void
  onSaved: () => void
}

const TAG_PARTS = [
  { part: 'price', title: '会员价格样式', imageError: '请上传会员价格背景图', maxWidth: 116 },
  { part: 'marketing', title: '营销文案样式', imageError: '请上传营销文案背景图', maxWidth: 130 },
] as const

export function MemberPriceGeneralSettingsPage({
  onBack,
  onSaved,
}: MemberPriceGeneralSettingsProps) {
  const [settings, setSettings] = useState<MemberPriceGeneralSettings>(loadMemberPriceGeneralSettings)
  const [error, setError] = useState('')
  const [showExample, setShowExample] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const rulesTriggerRef = useRef<HTMLButtonElement>(null)
  const imageFields = useRef<Partial<Record<TagPart, HTMLDivElement | null>>>({})

  const closeRules = () => {
    setShowRules(false)
    requestAnimationFrame(() => rulesTriggerRef.current?.focus())
  }

  const update = <K extends keyof MemberPriceGeneralSettings>(
    key: K,
    value: MemberPriceGeneralSettings[K],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }))
    setError('')
  }

  // 存量配置按左右位置保存。交换位置时，两部分的整套样式随内容一起移动。
  const changeOrder = (order: MemberPriceGeneralSettings['tagTextPosition']) => {
    setSettings((current) => order === current.tagTextPosition ? current : {
      ...current,
      tagTextPosition: order,
      leftBackgroundColor: current.rightBackgroundColor,
      rightBackgroundColor: current.leftBackgroundColor,
      leftTextColor: current.rightTextColor,
      rightTextColor: current.leftTextColor,
      leftBackgroundImage: current.rightBackgroundImage,
      rightBackgroundImage: current.leftBackgroundImage,
    })
    setError('')
  }

  const handleImage = (part: TagPart) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      if (!file.type.startsWith('image/')) {
        setError('请上传图片格式的标签背景')
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        setSettings((current) => ({
          ...current,
          [`${sideOf(part, current.tagTextPosition)}BackgroundImage`]: String(reader.result ?? ''),
        }))
        setError('')
      }
      reader.readAsDataURL(file)
    }

  const handleSave = () => {
    if (
      settings.tagContentMode === 'custom'
      && !settings.customTagText.trim()
    ) {
      setError('请输入自定义营销文案')
      requestAnimationFrame(() => tagInputRef.current?.focus())
      return
    }
    if (
      settings.styleMode === 'custom'
      && settings.backgroundStyle === 'image'
    ) {
      for (const { part, imageError } of TAG_PARTS) {
        if (!settings[`${sideOf(part, settings.tagTextPosition)}BackgroundImage`]) {
          setError(imageError)
          requestAnimationFrame(() => imageFields.current[part]?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
          return
        }
      }
    }
    saveMemberPriceGeneralSettings(settings)
    onSaved()
    onBack()
  }

  const tagText = settings.tagContentMode === 'member_level'
    ? '金卡会员'
    : settings.tagContentMode === 'custom'
      ? settings.customTagText.trim() || '自定义标签'
      : '会员价'

  return (
    <div className="member-price-settings page-card">
      <header className="settings-page-header">
        <div>
          <h1 tabIndex={-1}>会员价通用设置</h1>
          <p>点单页和商品详情页会根据顾客身份、商品规格和生效活动，决定是否展示标签，以及优惠价显示在哪里。</p>
        </div>
      </header>

      {error === '请上传图片格式的标签背景' && <div className="form-error" role="alert">{error}</div>}

      <section className="settings-section">
        <div className="member-price-settings__section-head">
          <h2 className="settings-section__title">会员价商品标签</h2>
          <button type="button" ref={rulesTriggerRef} className="link-btn member-price-rules-trigger" onClick={() => setShowRules(true)}>查看商品促销标签展示规则</button>
        </div>
        <SettingsRow label="营销文案来源">
          <div>
            <RadioOptions
              value={settings.tagContentMode}
              options={[
                { value: 'default', label: '默认文案（会员价）' },
                { value: 'member_level', label: '会员等级名称' },
                { value: 'custom', label: '自定义文案' },
              ]}
              onChange={(value) => update(
                'tagContentMode',
                value as MemberPriceGeneralSettings['tagContentMode'],
              )}
            />
            {settings.tagContentMode === 'custom' && (
              <div className="settings-inline-field">
                <input
                  ref={tagInputRef}
                  className="input"
                  value={settings.customTagText}
                  maxLength={10}
                  aria-label="自定义营销文案（最多 10 个字符）"
                  placeholder="如：金卡专享价"
                  aria-invalid={error === '请输入自定义营销文案'}
                  onChange={(event) => update('customTagText', event.target.value)}
                />
                <span>{settings.customTagText.length}/10</span>
              </div>
            )}
            {error === '请输入自定义营销文案' && <p className="settings-inline-error" role="alert">{error}</p>}
            <p className="field-hint">
              活动未填写「商品卡片展示标签」时，使用这里的营销文案。
              <button type="button" className="link-btn link-btn--example" onClick={() => setShowExample(true)}>查看示例</button>
            </p>
          </div>
        </SettingsRow>

        <SettingsRow label="标签排列（从左到右）">
          <div>
            <RadioOptions
              value={settings.tagTextPosition}
              options={[
                { value: 'price_left', label: '会员价格 → 营销文案' },
                { value: 'label_left', label: '营销文案 → 会员价格' },
              ]}
              onChange={(value) => changeOrder(value as MemberPriceGeneralSettings['tagTextPosition'])}
            />
            <p className="field-hint">交换顺序时，文字颜色和背景会随各自的内容一起移动。</p>
          </div>
        </SettingsRow>

        <SettingsRow label="标签样式">
          <RadioOptions
            value={settings.styleMode}
            options={[
              { value: 'default', label: '默认样式' },
              { value: 'custom', label: '自定义样式' },
            ]}
            onChange={(value) => update(
              'styleMode',
              value as MemberPriceGeneralSettings['styleMode'],
            )}
          />
        </SettingsRow>

        {settings.styleMode === 'custom' && (
          <>
            <SettingsRow label="两部分的背景类型">
              <RadioOptions
                value={settings.backgroundStyle}
                options={[
                  { value: 'solid', label: '纯色背景' },
                  { value: 'image', label: '图片背景' },
                ]}
                onChange={(value) => update(
                  'backgroundStyle',
                  value as MemberPriceGeneralSettings['backgroundStyle'],
                )}
              />
            </SettingsRow>

            {TAG_PARTS.map(({ part, title, imageError, maxWidth }) => {
              const side = sideOf(part, settings.tagTextPosition)
              const backgroundColor = `${side}BackgroundColor` as const
              const textColor = `${side}TextColor` as const
              const backgroundImage = `${side}BackgroundImage` as const
              return (
                <SettingsRow key={part} label={title}>
                  {settings.backgroundStyle === 'solid' ? (
                    <div className="settings-color-pair">
                      <ColorField label="文字颜色" value={settings[textColor]} onChange={(value) => update(textColor, value)} />
                      <ColorField label="背景色" value={settings[backgroundColor]} onChange={(value) => update(backgroundColor, value)} />
                    </div>
                  ) : (
                    <div ref={(element) => { imageFields.current[part] = element }}>
                      <TagImageSideConfig
                        image={settings[backgroundImage]}
                        sizeHint={`建议尺寸：高 30px，宽度不超过 ${maxWidth}px`}
                        textColorLabel="文字颜色"
                        textColor={settings[textColor]}
                        onUpload={handleImage(part)}
                        onRemoveImage={() => update(backgroundImage, '')}
                        onTextColorChange={(value) => update(textColor, value)}
                      />
                      {error === imageError && <p className="settings-inline-error" role="alert">{imageError}</p>}
                    </div>
                  )}
                </SettingsRow>
              )
            })}
          </>
        )}
        <SettingsRow label="商品卡片预览">
          <div>
            <MemberPriceTagPreview settings={settings} tagText={tagText} />
            <p className="field-hint">示例展示会员价标签的文案和样式。</p>
          </div>
        </SettingsRow>
      </section>

      <footer className="settings-page-footer">
        <button type="button" className="btn btn--default" onClick={onBack}>返回</button>
        <button type="button" className="btn btn--primary" onClick={handleSave}>保存</button>
      </footer>

      {showRules && (
        <div className="modal-overlay modal-overlay--nested" onClick={closeRules}>
          <div className="modal modal--rules" role="dialog" aria-modal="true" aria-labelledby="member-price-rules-title" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === 'Escape') closeRules() }}>
            <div className="modal__header">
              <h3 id="member-price-rules-title">商品促销标签展示规则</h3>
              <button type="button" className="modal__close" aria-label="关闭展示规则" onClick={closeRules}>×</button>
            </div>
            <div className="modal__body modal__body--scroll member-price-display-rules">
              <MemberPriceDisplayRules />
            </div>
            <div className="modal__footer"><button type="button" className="btn btn--primary" autoFocus onClick={closeRules}>知道了</button></div>
          </div>
        </div>
      )}

      {showExample && (
        <div className="modal-overlay modal-overlay--nested" onClick={() => setShowExample(false)}>
          <div className="modal modal--sm" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header"><h3>标签示例</h3></div>
            <div className="modal__body">
              <p>示例商品的会员价格为 ¥14.9。旁边的营销文案优先取活动中的「商品卡片展示标签」，未填写时使用这里选择的文案。</p>
              <MemberPriceTagPreview settings={settings} tagText={tagText} />
            </div>
            <div className="modal__footer"><button type="button" className="btn btn--primary" onClick={() => setShowExample(false)}>知道了</button></div>
          </div>
        </div>
      )}
    </div>
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

export function SettingsRow({ label, children }: { label: string; children: ReactNode }) {
  const labelId = useId()
  return (
    <div className="settings-row">
      <div className="settings-row__label" id={labelId}>{label}</div>
      <div className="settings-row__content" role="group" aria-labelledby={labelId}>{children}</div>
    </div>
  )
}

export function RadioOptions({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const groupName = useId()
  return (
    <div className="radio-group">
      {options.map((option) => (
        <label key={option.value} className="radio">
          <input
            type="radio"
            name={groupName}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}

export function TagImageSideConfig({
  image,
  sizeHint,
  textColor,
  textColorLabel = '文案颜色',
  onUpload,
  onRemoveImage,
  onTextColorChange,
}: {
  image: string
  sizeHint: string
  textColor: string
  textColorLabel?: string
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: () => void
  onTextColorChange: (value: string) => void
}) {
  return (
    <div className="settings-image-side">
      <div className="settings-image-side__row">
        <span className="settings-image-side__label">背景图</span>
        <div>
          <div className="settings-upload-group">
            <label className={`settings-upload-box ${image ? 'has-image' : ''}`}>
              {image ? (
                <img src={image} alt="标签背景图" />
              ) : (
                <>
                  <span className="settings-upload-box__plus" aria-hidden>+</span>
                  <span className="settings-upload-box__text">上传图片</span>
                </>
              )}
              <input type="file" accept="image/*" aria-label="上传标签背景图" onChange={onUpload} />
            </label>
            {image && (
              <button type="button" className="link-btn" onClick={onRemoveImage}>删除</button>
            )}
          </div>
          <p className="field-hint">
            {sizeHint}
          </p>
        </div>
      </div>
      <div className="settings-image-side__row">
        <span className="settings-image-side__label">{textColorLabel}</span>
        <ColorField value={textColor} onChange={onTextColorChange} />
      </div>
    </div>
  )
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label?: string
  value: string
  onChange: (value: string) => void
}) {
  const [draft, setDraft] = useState(value.toUpperCase())
  const [editing, setEditing] = useState(false)
  const isHexColor = (input: string) => /^#[\da-fA-F]{6}$/.test(input)
  return (
    <div className="settings-color-field">
      {label && <span>{label}</span>}
      <span className="settings-color-field__control">
        <input
          type="color"
          aria-label={label ? `${label}色板` : '选择颜色'}
          value={isHexColor(value) ? value : '#000000'}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          className="settings-color-field__hex-input"
          type="text"
          aria-label={label ? `${label}色值` : '颜色色值'}
          value={editing ? draft : value.toUpperCase()}
          maxLength={7}
          spellCheck={false}
          placeholder="#RRGGBB"
          title="请输入 #RRGGBB 格式的色值"
          onFocus={() => { setDraft(value.toUpperCase()); setEditing(true) }}
          onChange={(event) => {
            const next = event.target.value.toUpperCase()
            setDraft(next)
            if (isHexColor(next)) onChange(next)
          }}
          onBlur={() => {
            if (isHexColor(draft)) onChange(draft)
            setEditing(false)
          }}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
        />
      </span>
    </div>
  )
}

/** 默认样式配色，取自小程序点单页会员价标签（浅金价格 + 黑底金字文案） */
const DEFAULT_TAG_COLORS = {
  priceBg: '#F9EDC0',
  priceText: '#6B5215',
  labelBg: '#33302B',
  labelText: '#F5D890',
}

export function MemberPriceTagPreview({
  settings,
  tagText,
  price = '14.9',
  priceSuffix = '',
}: {
  settings: Pick<MemberPriceGeneralSettings,
    'styleMode' | 'backgroundStyle' | 'tagTextPosition' |
    'leftBackgroundColor' | 'leftTextColor' | 'rightBackgroundColor' | 'rightTextColor' |
    'leftBackgroundImage' | 'rightBackgroundImage'>
  tagText: string
  price?: string
  priceSuffix?: string
}) {
  const isDefault = settings.styleMode === 'default'
  const isImageMode = !isDefault && settings.backgroundStyle === 'image'
  const labelOnLeft = settings.tagTextPosition === 'label_left'
  const style = {
    '--preview-price-bg': isDefault ? DEFAULT_TAG_COLORS.priceBg : labelOnLeft ? settings.rightBackgroundColor : settings.leftBackgroundColor,
    '--preview-price-text': isDefault ? DEFAULT_TAG_COLORS.priceText : labelOnLeft ? settings.rightTextColor : settings.leftTextColor,
    '--preview-label-bg': isDefault ? DEFAULT_TAG_COLORS.labelBg : labelOnLeft ? settings.leftBackgroundColor : settings.rightBackgroundColor,
    '--preview-label-text': isDefault ? DEFAULT_TAG_COLORS.labelText : labelOnLeft ? settings.leftTextColor : settings.rightTextColor,
    '--preview-price-image': isImageMode && (labelOnLeft ? settings.rightBackgroundImage : settings.leftBackgroundImage)
      ? `url("${labelOnLeft ? settings.rightBackgroundImage : settings.leftBackgroundImage}")`
      : 'none',
    '--preview-label-image': isImageMode && (labelOnLeft ? settings.leftBackgroundImage : settings.rightBackgroundImage)
      ? `url("${labelOnLeft ? settings.leftBackgroundImage : settings.rightBackgroundImage}")`
      : 'none',
  } as CSSProperties

  return (
    <div className="tag-preview-card" style={style}>
      <div className="tag-preview-card__img" aria-hidden>
        <svg viewBox="0 0 48 48" fill="none" aria-hidden>
          <rect x="14" y="12" width="20" height="26" rx="3" fill="#C9A97C" />
          <rect x="14" y="12" width="20" height="8" rx="3" fill="#8B6844" />
          <rect x="12" y="9" width="24" height="4" rx="2" fill="#6D4F32" />
          <rect x="22" y="4" width="3" height="8" rx="1.5" fill="#6D4F32" />
        </svg>
      </div>
      <div className="tag-preview-card__body">
        <div className="tag-preview-card__name">洛神花茶</div>
        <span className="tag-preview-card__badge">含坚果</span>
        <div className="tag-preview-card__desc">鸭屎香乌龙茶X青柑柚子</div>
        <div
          className={`member-price-tag-preview ${isImageMode ? 'is-image' : ''}`}
          aria-label={labelOnLeft ? `${tagText}，${price}元${priceSuffix}` : `${price}元${priceSuffix}，${tagText}`}
        >
          {labelOnLeft ? (
            <><span className="member-price-tag-preview__label">{tagText}</span><span className="member-price-tag-preview__price"><small>¥</small>{price}{priceSuffix}</span></>
          ) : (
            <><span className="member-price-tag-preview__price"><small>¥</small>{price}{priceSuffix}</span><span className="member-price-tag-preview__label">{tagText}</span></>
          )}
        </div>
        <div className="tag-preview-card__footer">
          <span className="tag-preview-card__sale">¥18</span>
          <span className="tag-preview-card__stepper" aria-hidden>
            <i>−</i><b>1</b><i className="is-plus">+</i>
          </span>
        </div>
      </div>
    </div>
  )
}
