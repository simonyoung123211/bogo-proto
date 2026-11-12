import { useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import type { PaidMemberPriceGeneralSettings } from '../types'
import { loadPaidMemberPriceGeneralSettings, savePaidMemberPriceGeneralSettings } from '../utils/storage'
import { ColorField, RadioOptions, SettingsRow, TagImageSideConfig } from './MemberPriceGeneralSettings'

interface Props {
  onBack: () => void
  onSaved: () => void
}

export function PaidMemberPriceGeneralSettingsPage({ onBack, onSaved }: Props) {
  const [settings, setSettings] = useState<PaidMemberPriceGeneralSettings>(loadPaidMemberPriceGeneralSettings)
  const [error, setError] = useState('')
  const [showExample, setShowExample] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const imageFields = useRef<Partial<Record<'marketing' | 'price', HTMLDivElement | null>>>({})

  const update = <K extends keyof PaidMemberPriceGeneralSettings>(key: K, value: PaidMemberPriceGeneralSettings[K]) => {
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
    if (settings.tagContentMode === 'custom' && !settings.customTagText.trim()) {
      setError('请输入自定义营销文案')
      requestAnimationFrame(() => tagInputRef.current?.focus())
      return
    }
    if (settings.styleMode === 'custom' && settings.backgroundStyle === 'image') {
      for (const { part, key, message } of [
        { part: 'marketing', key: 'leftBackgroundImage', message: '请上传营销文案背景图' },
        { part: 'price', key: 'rightBackgroundImage', message: '请上传付费会员价格背景图' },
      ] as const) {
        if (settings[key]) continue
        setError(message)
        requestAnimationFrame(() => imageFields.current[part]?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
        return
      }
    }
    savePaidMemberPriceGeneralSettings(settings)
    onSaved()
    onBack()
  }

  const tagText = settings.tagContentMode === 'member_level'
    ? '金卡会员'
    : settings.tagContentMode === 'custom'
      ? settings.customTagText.trim() || '自定义标签'
      : '付费会员卡名称'

  return (
    <div className="member-price-settings page-card">
      <header className="settings-page-header">
        <div>
          <h1 tabIndex={-1}>付费会员价通用设置</h1>
          <p>设置付费会员价商品标签的营销文案和样式。标签固定按营销文案、付费会员价格排列。</p>
        </div>
      </header>

      {error === '请上传图片格式的标签背景' && <div className="form-error" role="alert">{error}</div>}

      <section className="settings-section">
        <h2 className="settings-section__title">付费会员价商品标签</h2>
            <SettingsRow label="营销文案来源">
              <div>
                <RadioOptions
                  value={settings.tagContentMode}
                  options={[
                    { value: 'default', label: '默认文案（付费会员卡名称）' },
                    { value: 'member_level', label: '会员等级名称' },
                    { value: 'custom', label: '自定义文案' },
                  ]}
                  onChange={(value) => update('tagContentMode', value as PaidMemberPriceGeneralSettings['tagContentMode'])}
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
                      placeholder="如：付费会员专享"
                      onChange={(event) => update('customTagText', event.target.value)}
                    />
                    <span>{settings.customTagText.length}/10</span>
                  </div>
                )}
                {error === '请输入自定义营销文案' && <p className="settings-inline-error" role="alert">{error}</p>}
                <p className="field-hint">
                  活动未填写「商品卡片展示标签」时，默认使用付费会员卡名称；也可选当前会员等级名称或自定义文案。
                  <button type="button" className="link-btn link-btn--example" onClick={() => setShowExample(true)}>查看示例</button>
                </p>
              </div>
            </SettingsRow>

            <SettingsRow label="标签样式">
              <RadioOptions
                value={settings.styleMode}
                options={[{ value: 'default', label: '默认样式' }, { value: 'custom', label: '自定义样式' }]}
                onChange={(value) => update('styleMode', value as PaidMemberPriceGeneralSettings['styleMode'])}
              />
            </SettingsRow>

            {settings.styleMode === 'custom' && (
              <>
                <SettingsRow label="两部分的背景类型">
                  <RadioOptions
                    value={settings.backgroundStyle}
                    options={[{ value: 'solid', label: '纯色背景' }, { value: 'image', label: '图片背景' }]}
                    onChange={(value) => update('backgroundStyle', value as PaidMemberPriceGeneralSettings['backgroundStyle'])}
                  />
                </SettingsRow>
                {settings.backgroundStyle === 'solid' ? (
                  <>
                    <SettingsRow label="营销文案样式">
                      <div className="settings-color-pair">
                        <ColorField label="文字颜色" value={settings.leftTextColor} onChange={(value) => update('leftTextColor', value)} />
                        <ColorField label="背景色" value={settings.leftBackgroundColor} onChange={(value) => update('leftBackgroundColor', value)} />
                      </div>
                    </SettingsRow>
                    <SettingsRow label="付费会员价格样式">
                      <div className="settings-color-pair">
                        <ColorField label="文字颜色" value={settings.rightTextColor} onChange={(value) => update('rightTextColor', value)} />
                        <ColorField label="背景色" value={settings.rightBackgroundColor} onChange={(value) => update('rightBackgroundColor', value)} />
                      </div>
                    </SettingsRow>
                  </>
                ) : (
                  <>
                    <SettingsRow label="营销文案样式">
                      <div ref={(element) => { imageFields.current.marketing = element }}>
                        <TagImageSideConfig image={settings.leftBackgroundImage} sizeHint="建议尺寸：高 30px，宽度不超过 130px" textColorLabel="文字颜色" textColor={settings.leftTextColor} onUpload={handleImage('leftBackgroundImage')} onRemoveImage={() => update('leftBackgroundImage', '')} onTextColorChange={(value) => update('leftTextColor', value)} />
                        {error === '请上传营销文案背景图' && <p className="settings-inline-error" role="alert">{error}</p>}
                      </div>
                    </SettingsRow>
                    <SettingsRow label="付费会员价格样式">
                      <div ref={(element) => { imageFields.current.price = element }}>
                        <TagImageSideConfig image={settings.rightBackgroundImage} sizeHint="建议尺寸：高 30px，宽度不超过 116px" textColorLabel="文字颜色" textColor={settings.rightTextColor} onUpload={handleImage('rightBackgroundImage')} onRemoveImage={() => update('rightBackgroundImage', '')} onTextColorChange={(value) => update('rightTextColor', value)} />
                        {error === '请上传付费会员价格背景图' && <p className="settings-inline-error" role="alert">{error}</p>}
                      </div>
                    </SettingsRow>
                  </>
                )}
              </>
            )}
            <SettingsRow label="商品卡片预览">
              <div>
                <PaidMemberTagPreview settings={settings} tagText={tagText} />
                <p className="field-hint">示例展示付费会员价标签的文案和样式。</p>
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
              <p>示例展示固定的「营销文案 → 付费会员价格」顺序。活动内填写的「商品卡片展示标签」优先；未填则使用这里设置的营销文案。</p>
              <PaidMemberTagPreview settings={settings} tagText={tagText} />
            </div>
            <div className="modal__footer"><button type="button" className="btn btn--primary" onClick={() => setShowExample(false)}>知道了</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

function PaidMemberTagPreview({ settings, tagText }: { settings: PaidMemberPriceGeneralSettings; tagText: string }) {
  const isDefault = settings.styleMode === 'default'
  const isImageMode = !isDefault && settings.backgroundStyle === 'image'
  const style = {
    '--preview-label-bg': isDefault ? '#33302B' : settings.leftBackgroundColor,
    '--preview-label-text': isDefault ? '#F5D890' : settings.leftTextColor,
    '--preview-price-bg': isDefault ? '#F9EDC0' : settings.rightBackgroundColor,
    '--preview-price-text': isDefault ? '#6B5215' : settings.rightTextColor,
    '--preview-label-image': isImageMode && settings.leftBackgroundImage ? `url("${settings.leftBackgroundImage}")` : 'none',
    '--preview-price-image': isImageMode && settings.rightBackgroundImage ? `url("${settings.rightBackgroundImage}")` : 'none',
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
        <div className={`member-price-tag-preview ${isImageMode ? 'is-image' : ''}`} aria-label={`${tagText}，10.12元起`}>
          <span className="member-price-tag-preview__label">{tagText}</span>
          <span className="member-price-tag-preview__price"><small>¥</small>10.12起</span>
        </div>
        <div className="tag-preview-card__footer">
          <span className="tag-preview-card__sale">¥18</span>
          <span className="tag-preview-card__stepper" aria-hidden><i>−</i><b>1</b><i className="is-plus">+</i></span>
        </div>
      </div>
    </div>
  )
}
