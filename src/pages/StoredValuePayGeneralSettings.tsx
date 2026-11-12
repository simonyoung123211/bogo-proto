import { useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { ColorField, RadioOptions, SettingsRow, TagImageSideConfig } from './MemberPriceGeneralSettings'
import { sideOf } from '../utils/tagDisplay'
import type { StoredValueBalanceThreshold, StoredValuePayGeneralSettings } from '../types'
import {
  loadStoredValuePayGeneralSettings,
  saveStoredValuePayGeneralSettings,
} from '../utils/storage'

const DEFAULT_TAG_TEXT = '储值享'
const PREVIEW_PRICE = '10.12'

interface StoredValuePayGeneralSettingsProps {
  onBack: () => void
  onSaved: () => void
}

export function StoredValuePayGeneralSettingsPage({
  onBack,
  onSaved,
}: StoredValuePayGeneralSettingsProps) {
  const [settings, setSettings] = useState<StoredValuePayGeneralSettings>(loadStoredValuePayGeneralSettings)
  const [error, setError] = useState('')
  const errorRef = useRef<HTMLDivElement>(null)
  const [showExample, setShowExample] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const imageFields = useRef<Partial<Record<'price' | 'marketing', HTMLDivElement | null>>>({})

  const showError = (message: string) => {
    setError(message)
    requestAnimationFrame(() => errorRef.current?.focus())
  }

  const update = <K extends keyof StoredValuePayGeneralSettings>(
    key: K,
    value: StoredValuePayGeneralSettings[K],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }))
    setError('')
  }

  const changeOrder = (order: StoredValuePayGeneralSettings['tagPosition']) => {
    setSettings((current) => order === current.tagPosition ? current : {
      ...current,
      tagPosition: order,
      leftBackgroundColor: current.rightBackgroundColor,
      rightBackgroundColor: current.leftBackgroundColor,
      leftTextColor: current.rightTextColor,
      rightTextColor: current.leftTextColor,
      leftBackgroundImage: current.rightBackgroundImage,
      rightBackgroundImage: current.leftBackgroundImage,
    })
    setError('')
  }

  const handleImage = (part: 'price' | 'marketing', event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showError('请上传图片格式的标签背景')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setSettings((current) => ({
        ...current,
        [`${sideOf(part, current.tagPosition)}BackgroundImage`]: String(reader.result ?? ''),
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
      if (!settings.leftBackgroundImage) {
        const part = settings.tagPosition === 'price_left' ? 'price' : 'marketing'
        setError(part === 'price' ? '请上传优惠价格背景图' : '请上传营销文案背景图')
        requestAnimationFrame(() => imageFields.current[part]?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
        return
      }
      if (!settings.rightBackgroundImage) {
        const part = settings.tagPosition === 'price_left' ? 'marketing' : 'price'
        setError(part === 'price' ? '请上传优惠价格背景图' : '请上传营销文案背景图')
        requestAnimationFrame(() => imageFields.current[part]?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
        return
      }
    }
    saveStoredValuePayGeneralSettings({ ...settings, customPromotionTagEnabled: true })
    onSaved()
    onBack()
  }

  const tagText = resolveTagText(settings)

  return (
    <div className="member-price-settings page-card">
      <header className="settings-page-header">
        <div>
          <h1 tabIndex={-1}>储值支付优惠通用设置</h1>
          <p>设置储值支付优惠的标签文案、样式和整单余额支付门槛。</p>
        </div>
      </header>

      {error === '请上传图片格式的标签背景' && <div className="form-error" ref={errorRef} tabIndex={-1} role="alert">{error}</div>}

      <section className="settings-section">
        <h2 className="settings-section__title">储值支付优惠商品标签</h2>
        <SettingsRow label="营销文案来源">
          <div>
            <RadioOptions
              value={settings.tagContentMode}
              options={[
                { value: 'default', label: '默认文案（储值享）' },
                { value: 'member_level', label: '会员等级名称' },
                { value: 'custom', label: '自定义文案' },
              ]}
              onChange={(value) => update('tagContentMode', value as StoredValuePayGeneralSettings['tagContentMode'])}
            />
            {settings.tagContentMode === 'custom' && (
              <div className="settings-inline-field">
                <input
                  ref={tagInputRef}
                  className="input"
                  value={settings.customTagText}
                  maxLength={10}
                  aria-label="自定义营销文案（最多 10 个字符）"
                  aria-invalid={error === '请输入自定义营销文案'}
                  placeholder="如：储值享"
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
              value={settings.tagPosition}
              options={[
                { value: 'price_left', label: '优惠价格 → 营销文案' },
                { value: 'label_left', label: '营销文案 → 优惠价格' },
              ]}
              onChange={(value) => changeOrder(value as StoredValuePayGeneralSettings['tagPosition'])}
            />
            <p className="field-hint">交换顺序时，各自的文字颜色和背景会一起移动。</p>
          </div>
        </SettingsRow>

        <SettingsRow label="标签样式">
          <RadioOptions
            value={settings.styleMode}
            options={[{ value: 'default', label: '默认样式' }, { value: 'custom', label: '自定义样式' }]}
            onChange={(value) => update('styleMode', value as StoredValuePayGeneralSettings['styleMode'])}
          />
        </SettingsRow>

        {settings.styleMode === 'custom' && (
          <>
            <SettingsRow label="两部分的背景类型">
              <RadioOptions
                value={settings.backgroundStyle}
                options={[{ value: 'solid', label: '纯色背景' }, { value: 'image', label: '图片背景' }]}
                onChange={(value) => update('backgroundStyle', value as StoredValuePayGeneralSettings['backgroundStyle'])}
              />
            </SettingsRow>
            {(['price', 'marketing'] as const).map((part) => {
              const side = sideOf(part, settings.tagPosition)
              const backgroundColor = `${side}BackgroundColor` as const
              const textColor = `${side}TextColor` as const
              const backgroundImage = `${side}BackgroundImage` as const
              return (
                <SettingsRow key={part} label={part === 'price' ? '优惠价格样式' : '营销文案样式'}>
                  {settings.backgroundStyle === 'solid' ? (
                    <div className="settings-color-pair">
                      <ColorField label="文字颜色" value={settings[textColor]} onChange={(value) => update(textColor, value)} />
                      <ColorField label="背景色" value={settings[backgroundColor]} onChange={(value) => update(backgroundColor, value)} />
                    </div>
                  ) : (
                    <div ref={(element) => { imageFields.current[part] = element }}>
                      <TagImageSideConfig
                        image={settings[backgroundImage]}
                        sizeHint={`建议尺寸：高 30px，宽度不超过 ${part === 'price' ? 116 : 130}px`}
                        textColorLabel="文字颜色"
                        textColor={settings[textColor]}
                        onUpload={(event) => handleImage(part, event)}
                        onRemoveImage={() => update(backgroundImage, '')}
                        onTextColorChange={(value) => update(textColor, value)}
                      />
                      {error === (part === 'price' ? '请上传优惠价格背景图' : '请上传营销文案背景图') && <p className="settings-inline-error" role="alert">{error}</p>}
                    </div>
                  )}
                </SettingsRow>
              )
            })}
          </>
        )}

        <SettingsRow label="商品卡片预览">
          <StoredValueTagPreview settings={settings} tagText={tagText} />
        </SettingsRow>
      </section>

      <section className="settings-section settings-section--secondary">
        <h2 className="settings-section__title">整单余额支付活动参与条件</h2>
        <SettingsRow label="余额门槛口径">
          <div>
            <RadioOptions
              value={settings.fullOrderBalanceThreshold}
              options={[
                { value: 'original_subtotal', label: '用户余额 ≥ 订单原价小计' },
                { value: 'payable_subtotal', label: '用户余额 ≥ 本活动优惠前应付' },
                { value: 'payable_after_activity', label: '用户余额 ≥ 本活动优惠后应付' },
              ]}
              onChange={(value) => update(
                'fullOrderBalanceThreshold',
                value as StoredValueBalanceThreshold,
              )}
            />
            <div className="field-hint" style={{ marginTop: 8 }}>
              <p style={{ margin: '0 0 6px' }}>
                仅当活动规则为「整单仅限储值余额支付才可参与」时生效；规则为「储值余额支付 ≥ 0.01 即可参与」的活动不受此配置约束。
              </p>
              <p style={{ margin: '0 0 6px' }}>
                门槛从高到低：原价小计 &gt; 优惠前应付 &gt; 优惠后应付。推荐选用「优惠后应付」，余额只需覆盖本单优惠后的应付金额即可参与。
              </p>
              <p style={{ margin: '0 0 6px' }}>
                <strong>订单原价小计</strong>：购物车商品原价合计。
              </p>
              <p style={{ margin: '0 0 6px' }}>
                <strong>本活动优惠前应付</strong>：扣除本活动之前已生效优惠后的应付小计，不含本活动优惠。
                示例：原价 20 元，限时折扣已减 3 元且与本活动共享，则余额须 ≥ 17 元。
              </p>
              <p style={{ margin: 0 }}>
                <strong>本活动优惠后应付</strong>：再扣除本活动优惠后的应付金额。
                示例：原价 20 元，限时折扣已减 3 元，本活动再减 2 元，则余额须 ≥ 15 元即可参与。
              </p>
            </div>
          </div>
        </SettingsRow>
      </section>

      <footer className="settings-page-footer">
        <button type="button" className="btn btn--default" onClick={onBack}>返回</button>
        <button type="button" className="btn btn--primary" onClick={handleSave}>保存</button>
      </footer>

      {showExample && (
        <div className="modal-overlay modal-overlay--nested" onClick={() => setShowExample(false)}>
          <div className="modal modal--sm" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header"><h3>标签示例</h3></div>
            <div className="modal__body">
              <p>示例展示储值支付优惠标签。优惠价格与营销文案的顺序以当前设置为准。</p>
              <p>活动内填写的「商品卡片展示标签」优先；未填时使用这里选择的营销文案，默认文案为“{DEFAULT_TAG_TEXT}”。</p>
              <StoredValueTagPreview settings={settings} tagText={tagText} />
            </div>
            <div className="modal__footer">
              <button type="button" className="btn btn--primary" onClick={() => setShowExample(false)}>知道了</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function resolveTagText(settings: StoredValuePayGeneralSettings) {
  if (settings.tagContentMode === 'default') {
    return DEFAULT_TAG_TEXT
  }
  if (settings.tagContentMode === 'member_level') return '金卡'
  return settings.customTagText.trim() || DEFAULT_TAG_TEXT
}


/** 默认样式：浅金价格 + 深色文案；位置由配置决定。 */
const DEFAULT_TAG_COLORS = {
  labelBg: '#33302B',
  labelText: '#F5D890',
  priceBg: '#F9EDC0',
  priceText: '#6B5215',
}

function StoredValueTagPreview({
  settings,
  tagText,
}: {
  settings: StoredValuePayGeneralSettings
  tagText: string
}) {
  const isDefault = settings.styleMode === 'default'
  const isImageMode = !isDefault && settings.backgroundStyle === 'image'
  const labelOnLeft = settings.tagPosition === 'label_left'
  const style = {
    '--preview-label-bg': isDefault ? DEFAULT_TAG_COLORS.labelBg : labelOnLeft ? settings.leftBackgroundColor : settings.rightBackgroundColor,
    '--preview-label-text': isDefault ? DEFAULT_TAG_COLORS.labelText : labelOnLeft ? settings.leftTextColor : settings.rightTextColor,
    '--preview-price-bg': isDefault ? DEFAULT_TAG_COLORS.priceBg : labelOnLeft ? settings.rightBackgroundColor : settings.leftBackgroundColor,
    '--preview-price-text': isDefault ? DEFAULT_TAG_COLORS.priceText : labelOnLeft ? settings.rightTextColor : settings.leftTextColor,
    '--preview-label-image': isImageMode && (labelOnLeft ? settings.leftBackgroundImage : settings.rightBackgroundImage)
      ? `url("${labelOnLeft ? settings.leftBackgroundImage : settings.rightBackgroundImage}")`
      : 'none',
    '--preview-price-image': isImageMode && (labelOnLeft ? settings.rightBackgroundImage : settings.leftBackgroundImage)
      ? `url("${labelOnLeft ? settings.rightBackgroundImage : settings.leftBackgroundImage}")`
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
          aria-label={labelOnLeft ? `${tagText}，${PREVIEW_PRICE}元起` : `${PREVIEW_PRICE}元起，${tagText}`}
        >
          {labelOnLeft ? (
            <>
              <span className="member-price-tag-preview__label">{tagText}</span>
              <span className="member-price-tag-preview__price"><small>¥</small>{PREVIEW_PRICE}起</span>
            </>
          ) : (
            <>
              <span className="member-price-tag-preview__price"><small>¥</small>{PREVIEW_PRICE}起</span>
              <span className="member-price-tag-preview__label">{tagText}</span>
            </>
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
