import { useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react'
import type { StoredValueBalanceThreshold, StoredValuePayGeneralSettings } from '../types'
import {
  loadStoredValuePayGeneralSettings,
  saveStoredValuePayGeneralSettings,
} from '../utils/storage'

const DEFAULT_TAG_TEXT = '储值享'
const PREVIEW_PRICE = '10.12'

interface StoredValuePayGeneralSettingsProps {
  onClose: () => void
  onSaved: () => void
}

export function StoredValuePayGeneralSettingsModal({
  onClose,
  onSaved,
}: StoredValuePayGeneralSettingsProps) {
  const [settings, setSettings] = useState<StoredValuePayGeneralSettings>(loadStoredValuePayGeneralSettings)
  const [error, setError] = useState('')
  const [showExample, setShowExample] = useState(false)

  const update = <K extends keyof StoredValuePayGeneralSettings>(
    key: K,
    value: StoredValuePayGeneralSettings[K],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }))
    setError('')
  }

  const handleImage = (key: 'leftBackgroundImage' | 'rightBackgroundImage') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      if (!file.type.startsWith('image/')) {
        setError('请上传图片格式的标签背景')
        return
      }
      const reader = new FileReader()
      reader.onload = () => update(key, String(reader.result ?? ''))
      reader.readAsDataURL(file)
    }

  const handleSave = () => {
    if (
      settings.customPromotionTagEnabled
      && settings.tagContentMode === 'custom'
      && !settings.customTagText.trim()
    ) {
      setError('请输入自定义商品促销标签')
      return
    }
    if (
      settings.customPromotionTagEnabled
      && settings.styleMode === 'custom'
      && settings.backgroundStyle === 'image'
    ) {
      if (!settings.leftBackgroundImage) {
        setError('请上传左侧文案背景图')
        return
      }
      if (!settings.rightBackgroundImage) {
        setError('请上传右侧价格背景图')
        return
      }
    }
    saveStoredValuePayGeneralSettings(settings)
    onSaved()
    onClose()
  }

  const tagText = resolveTagText(settings)

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal--settings" onClick={(event) => event.stopPropagation()}>
          <div className="modal__header">
            <div>
              <h3>通用设置</h3>
              <p className="modal__subtitle">配置商品促销标签与整单余额支付参与门槛</p>
            </div>
            <button type="button" className="modal__close" onClick={onClose} aria-label="关闭">×</button>
          </div>

          <div className="modal__body modal__body--scroll">
            {error && <div className="form-error" role="alert">{error}</div>}

            <section className="settings-section settings-section--modal">
              <h2 className="settings-section__title">商品促销标签</h2>
              <SettingsRow label="定制商品促销标签">
                <RadioOptions
                  value={settings.customPromotionTagEnabled ? 'custom' : 'default'}
                  options={[
                    { value: 'default', label: '系统默认' },
                    { value: 'custom', label: '定制促销标签内容和样式' },
                  ]}
                  onChange={(value) => update('customPromotionTagEnabled', value === 'custom')}
                />
              </SettingsRow>

              {settings.customPromotionTagEnabled && (
                <>
                  <SettingsRow label="商品促销标签">
                    <div>
                      <RadioOptions
                        value={settings.tagContentMode}
                        options={[
                          { value: 'default', label: `系统默认“${DEFAULT_TAG_TEXT}”` },
                          { value: 'member_level', label: '取当前会员等级名称' },
                          { value: 'custom', label: '自定义' },
                        ]}
                        onChange={(value) => update(
                          'tagContentMode',
                          value as StoredValuePayGeneralSettings['tagContentMode'],
                        )}
                      />
                      {settings.tagContentMode === 'custom' && (
                        <div className="settings-inline-field">
                          <input
                            className="input"
                            value={settings.customTagText}
                            maxLength={10}
                            placeholder="例如：储值享"
                            onChange={(event) => update('customTagText', event.target.value)}
                          />
                          <span>{settings.customTagText.length}/10</span>
                        </div>
                      )}
                      <p className="field-hint">
                        默认储值支付优惠活动的促销标签名称为“{DEFAULT_TAG_TEXT}”，支持自定义，自定义不可超过10个汉字或字母，标签文案取值按“活动设置的商品促销标签&gt;自定义标签&gt;系统默认”顺序获取
                        <button type="button" className="link-btn link-btn--example" onClick={() => setShowExample(true)}>
                          查看示例
                        </button>
                      </p>
                    </div>
                  </SettingsRow>

                  <SettingsRow label="定制样式">
                    <RadioOptions
                      value={settings.styleMode}
                      options={[
                        { value: 'default', label: '默认样式' },
                        { value: 'custom', label: '自定义样式' },
                      ]}
                      onChange={(value) => update(
                        'styleMode',
                        value as StoredValuePayGeneralSettings['styleMode'],
                      )}
                    />
                  </SettingsRow>

                  <SettingsRow label="预览样式">
                    <StoredValueTagPreview settings={settings} tagText={tagText} />
                  </SettingsRow>

                  {settings.styleMode === 'custom' && (
                    <>
                      <SettingsRow label="标签背景样式">
                        <RadioOptions
                          value={settings.backgroundStyle}
                          options={[
                            { value: 'solid', label: '纯色' },
                            { value: 'image', label: '图片' },
                          ]}
                          onChange={(value) => update(
                            'backgroundStyle',
                            value as StoredValuePayGeneralSettings['backgroundStyle'],
                          )}
                        />
                      </SettingsRow>

                      {settings.backgroundStyle === 'solid' ? (
                        <>
                          <SettingsRow label="左侧文案">
                            <div className="settings-color-pair">
                              <ColorField
                                label="背景色"
                                value={settings.leftBackgroundColor}
                                onChange={(value) => update('leftBackgroundColor', value)}
                              />
                              <ColorField
                                label="文案颜色"
                                value={settings.leftTextColor}
                                onChange={(value) => update('leftTextColor', value)}
                              />
                            </div>
                          </SettingsRow>
                          <SettingsRow label="右侧价格">
                            <div className="settings-color-pair">
                              <ColorField
                                label="背景色"
                                value={settings.rightBackgroundColor}
                                onChange={(value) => update('rightBackgroundColor', value)}
                              />
                              <ColorField
                                label="文案颜色"
                                value={settings.rightTextColor}
                                onChange={(value) => update('rightTextColor', value)}
                              />
                            </div>
                          </SettingsRow>
                        </>
                      ) : (
                        <>
                          <SettingsRow label="左侧文案">
                            <TagImageSideConfig
                              image={settings.leftBackgroundImage}
                              sizeHint="建议最大尺寸：高30px，宽度最大130px"
                              textColor={settings.leftTextColor}
                              onUpload={handleImage('leftBackgroundImage')}
                              onRemoveImage={() => update('leftBackgroundImage', '')}
                              onTextColorChange={(value) => update('leftTextColor', value)}
                            />
                          </SettingsRow>
                          <SettingsRow label="右侧价格">
                            <TagImageSideConfig
                              image={settings.rightBackgroundImage}
                              sizeHint="建议最大尺寸：高30px，宽度最大116px"
                              textColor={settings.rightTextColor}
                              onUpload={handleImage('rightBackgroundImage')}
                              onRemoveImage={() => update('rightBackgroundImage', '')}
                              onTextColorChange={(value) => update('rightTextColor', value)}
                            />
                          </SettingsRow>
                        </>
                      )}
                    </>
                  )}
                </>
              )}

              {!settings.customPromotionTagEnabled && (
                <SettingsRow label="预览样式">
                  <StoredValueTagPreview settings={settings} tagText={DEFAULT_TAG_TEXT} forceDefaultStyle />
                </SettingsRow>
              )}
            </section>

            <section className="settings-section settings-section--modal">
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
          </div>

          <div className="modal__footer">
            <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
            <button type="button" className="btn btn--primary" onClick={handleSave}>保存</button>
          </div>
        </div>
      </div>

      {showExample && (
        <div className="modal-overlay modal-overlay--nested" onClick={() => setShowExample(false)}>
          <div className="modal modal--sm" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header"><h3>标签示例</h3></div>
            <div className="modal__body">
              <p>点单页商品卡片上，储值支付优惠标签展示在价格旁：左侧为标签文案，右侧为活动价。</p>
              <p>取值优先级：活动内填写的商品促销标签优先；未填则用通用设置自定义文案；仍未填则用系统默认“{DEFAULT_TAG_TEXT}”。</p>
              <StoredValueTagPreview settings={settings} tagText={tagText} />
            </div>
            <div className="modal__footer">
              <button type="button" className="btn btn--primary" onClick={() => setShowExample(false)}>知道了</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function resolveTagText(settings: StoredValuePayGeneralSettings) {
  if (!settings.customPromotionTagEnabled || settings.tagContentMode === 'default') {
    return DEFAULT_TAG_TEXT
  }
  if (settings.tagContentMode === 'member_level') return '金卡'
  return settings.customTagText.trim() || DEFAULT_TAG_TEXT
}

function SettingsRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="settings-row">
      <div className="settings-row__label">{label}</div>
      <div className="settings-row__content">{children}</div>
    </div>
  )
}

function RadioOptions({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="radio-group">
      {options.map((option) => (
        <label key={option.value} className="radio">
          <input
            type="radio"
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}

function TagImageSideConfig({
  image,
  sizeHint,
  textColor,
  onUpload,
  onRemoveImage,
  onTextColorChange,
}: {
  image: string
  sizeHint: string
  textColor: string
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
              <input type="file" accept="image/*" onChange={onUpload} />
            </label>
            {image && (
              <button type="button" className="link-btn" onClick={onRemoveImage}>删除</button>
            )}
          </div>
          <p className="field-hint">{sizeHint}</p>
        </div>
      </div>
      <div className="settings-image-side__row">
        <span className="settings-image-side__label">文字颜色</span>
        <ColorField value={textColor} onChange={onTextColorChange} />
      </div>
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="settings-color-field">
      {label && <span>{label}</span>}
      <span className="settings-color-field__control">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        <span className="settings-color-field__hex">{value.toUpperCase()}</span>
      </span>
    </label>
  )
}

/** 默认样式：左侧深色文案 + 右侧浅金价格 */
const DEFAULT_TAG_COLORS = {
  labelBg: '#33302B',
  labelText: '#F5D890',
  priceBg: '#F9EDC0',
  priceText: '#6B5215',
}

function StoredValueTagPreview({
  settings,
  tagText,
  forceDefaultStyle,
}: {
  settings: StoredValuePayGeneralSettings
  tagText: string
  forceDefaultStyle?: boolean
}) {
  const isDefault = forceDefaultStyle || settings.styleMode === 'default'
  const isImageMode = !isDefault && settings.backgroundStyle === 'image'
  const style = {
    '--preview-label-bg': isDefault ? DEFAULT_TAG_COLORS.labelBg : settings.leftBackgroundColor,
    '--preview-label-text': isDefault ? DEFAULT_TAG_COLORS.labelText : settings.leftTextColor,
    '--preview-price-bg': isDefault ? DEFAULT_TAG_COLORS.priceBg : settings.rightBackgroundColor,
    '--preview-price-text': isDefault ? DEFAULT_TAG_COLORS.priceText : settings.rightTextColor,
    '--preview-label-image': isImageMode && settings.leftBackgroundImage
      ? `url("${settings.leftBackgroundImage}")`
      : 'none',
    '--preview-price-image': isImageMode && settings.rightBackgroundImage
      ? `url("${settings.rightBackgroundImage}")`
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
          aria-label={`${tagText}，${PREVIEW_PRICE}元起`}
        >
          <span className="member-price-tag-preview__label">{tagText}</span>
          <span className="member-price-tag-preview__price"><small>¥</small>{PREVIEW_PRICE}起</span>
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
