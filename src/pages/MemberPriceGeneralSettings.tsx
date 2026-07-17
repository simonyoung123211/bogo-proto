import { useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react'
import type { MemberPriceGeneralSettings } from '../types'
import {
  loadMemberPriceGeneralSettings,
  saveMemberPriceGeneralSettings,
} from '../utils/storage'

interface MemberPriceGeneralSettingsProps {
  onBack: () => void
  onSaved: () => void
}

export function MemberPriceGeneralSettingsPage({
  onBack,
  onSaved,
}: MemberPriceGeneralSettingsProps) {
  const [settings, setSettings] = useState<MemberPriceGeneralSettings>(loadMemberPriceGeneralSettings)
  const [error, setError] = useState('')

  const update = <K extends keyof MemberPriceGeneralSettings>(
    key: K,
    value: MemberPriceGeneralSettings[K],
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
        setError('请上传左侧价格背景图')
        return
      }
      if (!settings.rightBackgroundImage) {
        setError('请上传右侧文案背景图')
        return
      }
    }
    saveMemberPriceGeneralSettings(settings)
    onSaved()
    onBack()
  }

  const tagText = settings.tagContentMode === 'member_level'
    ? '金卡会员价'
    : settings.tagContentMode === 'custom'
      ? settings.customTagText.trim() || '自定义标签'
      : '会员价'

  return (
    <div className="member-price-settings page-card">
      <header className="settings-page-header">
        <div>
          <h1>通用设置</h1>
          <p>统一配置会员价在用户端商品卡片中的标签内容和展示样式。</p>
        </div>
      </header>

      {error && <div className="form-error" role="alert">{error}</div>}

      <section className="settings-section">
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
                    { value: 'default', label: '系统默认“会员价”' },
                    { value: 'member_level', label: '取当前会员等级名称' },
                    { value: 'custom', label: '自定义' },
                  ]}
                  onChange={(value) => update(
                    'tagContentMode',
                    value as MemberPriceGeneralSettings['tagContentMode'],
                  )}
                />
                {settings.tagContentMode === 'custom' && (
                  <div className="settings-inline-field">
                    <input
                      className="input"
                      value={settings.customTagText}
                      maxLength={10}
                      placeholder="请输入标签文案"
                      onChange={(event) => update('customTagText', event.target.value)}
                    />
                    <span>{settings.customTagText.length}/10</span>
                  </div>
                )}
                <p className="field-hint">
                  自定义文案不超过 10 个字符；会员等级名称会随当前登录会员自动变化。
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
                  value as MemberPriceGeneralSettings['styleMode'],
                )}
              />
            </SettingsRow>

            <SettingsRow label="预览样式">
              <MemberPriceTagPreview settings={settings} tagText={tagText} />
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
                      value as MemberPriceGeneralSettings['backgroundStyle'],
                    )}
                  />
                </SettingsRow>

                {settings.backgroundStyle === 'solid' ? (
                  <>
                    <SettingsRow label="左侧价格">
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
                    <SettingsRow label="右侧文案">
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
                    <SettingsRow label="左侧价格">
                      <TagImageSideConfig
                        image={settings.leftBackgroundImage}
                        sizeHint="建议最大尺寸：高30px，宽度最大116px"
                        textColor={settings.leftTextColor}
                        onUpload={handleImage('leftBackgroundImage')}
                        onRemoveImage={() => update('leftBackgroundImage', '')}
                        onTextColorChange={(value) => update('leftTextColor', value)}
                      />
                    </SettingsRow>
                    <SettingsRow label="右侧文案">
                      <TagImageSideConfig
                        image={settings.rightBackgroundImage}
                        sizeHint="建议最大尺寸：高30px，宽度最大130px"
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
      </section>

      <section className="settings-section settings-section--secondary">
        <h2 className="settings-section__title">价格展示</h2>
        <SettingsRow label="标签位置">
          <div>
            <RadioOptions
              value={settings.tagPosition}
              options={[
                { value: 'default', label: '系统默认' },
                { value: 'inline', label: '与商品标签并列' },
              ]}
              onChange={(value) => update(
                'tagPosition',
                value as MemberPriceGeneralSettings['tagPosition'],
              )}
            />
            <p className="field-hint">控制会员价标签在用户端商品卡片中的展示位置。</p>
          </div>
        </SettingsRow>

        <SettingsRow label="开启划线价">
          <div>
            <RadioOptions
              value={settings.showOriginalPrice ? 'yes' : 'no'}
              options={[
                { value: 'no', label: '否' },
                { value: 'yes', label: '是' },
              ]}
              onChange={(value) => update('showOriginalPrice', value === 'yes')}
            />
            <p className="field-hint">
              开启后，将在会员价旁展示商品原价；若无有效原价则不展示。
            </p>
          </div>
        </SettingsRow>

        {settings.showOriginalPrice && (
          <>
            <SettingsRow label="活动价颜色">
              <div>
                <ColorField
                  value={settings.activityPriceColor}
                  onChange={(value) => update('activityPriceColor', value)}
                />
                <p className="field-hint">
                  商品活动价生效的是会员价活动，则展示该定制颜色；若生效其他活动，按系统默认展示。
                </p>
              </div>
            </SettingsRow>
            <SettingsRow label="预览样式">
              <ActivityPricePreview color={settings.activityPriceColor} />
            </SettingsRow>
          </>
        )}
      </section>

      <footer className="settings-page-footer">
        <button type="button" className="btn btn--default" onClick={onBack}>返回</button>
        <button type="button" className="btn btn--primary" onClick={handleSave}>保存</button>
      </footer>
    </div>
  )
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
          <p className="field-hint">
            {sizeHint}
            <button type="button" className="link-btn link-btn--example">查看示例</button>
          </p>
        </div>
      </div>
      <div className="settings-image-side__row">
        <span className="settings-image-side__label">文案颜色</span>
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

/** 活动价颜色独立预览：会员价活动生效时的活动价 + 灰色划线原价 */
function ActivityPricePreview({ color }: { color: string }) {
  return (
    <div className="activity-price-preview" aria-label="活动价18元，原价22元">
      <span className="activity-price-preview__current" style={{ color }}>
        <small>¥</small>18
      </span>
      <span className="activity-price-preview__original">¥22</span>
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

function MemberPriceTagPreview({
  settings,
  tagText,
}: {
  settings: MemberPriceGeneralSettings
  tagText: string
}) {
  const isDefault = settings.styleMode === 'default'
  const isImageMode = !isDefault && settings.backgroundStyle === 'image'
  const style = {
    '--preview-price-bg': isDefault ? DEFAULT_TAG_COLORS.priceBg : settings.leftBackgroundColor,
    '--preview-price-text': isDefault ? DEFAULT_TAG_COLORS.priceText : settings.leftTextColor,
    '--preview-label-bg': isDefault ? DEFAULT_TAG_COLORS.labelBg : settings.rightBackgroundColor,
    '--preview-label-text': isDefault ? DEFAULT_TAG_COLORS.labelText : settings.rightTextColor,
    '--preview-price-image': isImageMode && settings.leftBackgroundImage
      ? `url("${settings.leftBackgroundImage}")`
      : 'none',
    '--preview-label-image': isImageMode && settings.rightBackgroundImage
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
          aria-label={`14.9元，${tagText}`}
        >
          <span className="member-price-tag-preview__price"><small>¥</small>14.9</span>
          <span className="member-price-tag-preview__label">{tagText}</span>
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
