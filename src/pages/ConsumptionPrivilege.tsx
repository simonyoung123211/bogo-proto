import { useRef, useState, type ChangeEvent } from 'react'
import type { ConsumptionPrivilegeDisplaySettings } from '../types'
import { sideOf } from '../utils/tagDisplay'
import {
  loadConsumptionPrivilegeDisplaySettings,
  saveConsumptionPrivilegeDisplaySettings,
} from '../utils/storage'
import {
  ColorField,
  MemberPriceTagPreview,
  RadioOptions,
  SettingsRow,
  TagImageSideConfig,
} from './MemberPriceGeneralSettings'

interface ConsumptionPrivilegePageProps {
  onOpenSettings: () => void
}

export function ConsumptionPrivilegePage({ onOpenSettings }: ConsumptionPrivilegePageProps) {
  return (
    <div className="page-card consumption-privilege-page">
      <header className="settings-page-header">
        <div>
          <h1>消费特权</h1>
          <p>会员在当前等级时享受的消费权益。</p>
        </div>
      </header>
      <div className="consumption-privilege-page__body">
        <section className="consumption-privilege-card" aria-labelledby="consumption-privilege-title">
          <div className="consumption-privilege-card__icon" aria-hidden>¥</div>
          <div className="consumption-privilege-card__content">
            <h2 id="consumption-privilege-title">消费特权</h2>
            <p>会员在当前等级时享受的消费权益</p>
            <button type="button" className="btn btn--primary" onClick={onOpenSettings}>展示设置</button>
          </div>
        </section>
      </div>
    </div>
  )
}

interface ConsumptionPrivilegeDisplaySettingsProps {
  onBack: () => void
  onSaved: () => void
}

export function ConsumptionPrivilegeDisplaySettingsPage({ onBack, onSaved }: ConsumptionPrivilegeDisplaySettingsProps) {
  const [settings, setSettings] = useState<ConsumptionPrivilegeDisplaySettings>(loadConsumptionPrivilegeDisplaySettings)
  const [error, setError] = useState('')
  const [showExample, setShowExample] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const imageFields = useRef<Partial<Record<'marketing' | 'price', HTMLDivElement | null>>>({})

  const update = <K extends keyof ConsumptionPrivilegeDisplaySettings>(key: K, value: ConsumptionPrivilegeDisplaySettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
    setError('')
  }

  const changeOrder = (order: ConsumptionPrivilegeDisplaySettings['tagTextPosition']) => {
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

  const handleImage = (part: 'price' | 'marketing') =>
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
    if (settings.tagContentMode === 'custom' && !settings.customTagText.trim()) {
      setError('请输入自定义营销文案')
      requestAnimationFrame(() => tagInputRef.current?.focus())
      return
    }
    if (settings.styleMode === 'custom' && settings.backgroundStyle === 'image') {
      for (const { part, message } of [
        { part: 'marketing', message: '请上传营销文案背景图' },
        { part: 'price', message: '请上传特权价格背景图' },
      ] as const) {
        if (settings[`${sideOf(part, settings.tagTextPosition)}BackgroundImage`]) continue
        setError(message)
        requestAnimationFrame(() => imageFields.current[part]?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
        return
      }
    }
    saveConsumptionPrivilegeDisplaySettings(settings)
    onSaved()
    onBack()
  }

  const tagText = settings.tagContentMode === 'member_level'
    ? '金卡会员'
    : settings.tagContentMode === 'custom'
      ? settings.customTagText.trim() || '自定义标签'
      : '会员价'
  const preview = <MemberPriceTagPreview settings={settings} tagText={tagText} price="10.12" priceSuffix="起" />

  return (
    <div className="member-price-settings page-card">
      <header className="settings-page-header">
        <div>
          <h1 tabIndex={-1}>消费特权展示设置</h1>
          <p>设置消费特权商品标签的营销文案、左右排列和样式。</p>
        </div>
      </header>

      {error === '请上传图片格式的标签背景' && <div className="form-error" role="alert">{error}</div>}

      <section className="settings-section">
        <h2 className="settings-section__title">消费特权商品标签</h2>
        <SettingsRow label="营销文案来源">
          <div>
            <RadioOptions
              value={settings.tagContentMode}
              options={[
                { value: 'default', label: '默认文案（会员价）' },
                { value: 'member_level', label: '当前消费特权的会员等级名称' },
                { value: 'custom', label: '自定义文案' },
              ]}
              onChange={(value) => update('tagContentMode', value as ConsumptionPrivilegeDisplaySettings['tagContentMode'])}
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
                  placeholder="如：金卡特权价"
                  onChange={(event) => update('customTagText', event.target.value)}
                />
                <span>{settings.customTagText.length}/10</span>
              </div>
            )}
            {error === '请输入自定义营销文案' && <p className="settings-inline-error" role="alert">{error}</p>}
            <p className="field-hint">
              默认文案为“会员价”。选择会员等级名称时，标签随顾客享受消费特权的等级变化。
              <button type="button" className="link-btn link-btn--example" onClick={() => setShowExample(true)}>查看示例</button>
            </p>
          </div>
        </SettingsRow>

        <SettingsRow label="标签排列（从左到右）">
          <div>
            <RadioOptions
              value={settings.tagTextPosition}
              options={[
                { value: 'label_left', label: '营销文案 → 特权价格' },
                { value: 'price_left', label: '特权价格 → 营销文案' },
              ]}
              onChange={(value) => changeOrder(value as ConsumptionPrivilegeDisplaySettings['tagTextPosition'])}
            />
            <p className="field-hint">交换顺序时，文字颜色和背景会随各自的内容一起移动。</p>
          </div>
        </SettingsRow>

        <SettingsRow label="标签样式">
          <RadioOptions
            value={settings.styleMode}
            options={[{ value: 'default', label: '默认样式' }, { value: 'custom', label: '自定义样式' }]}
            onChange={(value) => update('styleMode', value as ConsumptionPrivilegeDisplaySettings['styleMode'])}
          />
        </SettingsRow>

        {settings.styleMode === 'custom' && (
          <>
            <SettingsRow label="两部分的背景类型">
              <RadioOptions
                value={settings.backgroundStyle}
                options={[{ value: 'solid', label: '纯色背景' }, { value: 'image', label: '图片背景' }]}
                onChange={(value) => update('backgroundStyle', value as ConsumptionPrivilegeDisplaySettings['backgroundStyle'])}
              />
            </SettingsRow>
            {(['marketing', 'price'] as const).map((part) => {
              const side = sideOf(part, settings.tagTextPosition)
              const backgroundColor = `${side}BackgroundColor` as const
              const textColor = `${side}TextColor` as const
              const backgroundImage = `${side}BackgroundImage` as const
              return (
                <SettingsRow key={part} label={part === 'price' ? '特权价格样式' : '营销文案样式'}>
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
                        onUpload={handleImage(part)}
                        onRemoveImage={() => update(backgroundImage, '')}
                        onTextColorChange={(value) => update(textColor, value)}
                      />
                      {error === (part === 'price' ? '请上传特权价格背景图' : '请上传营销文案背景图') && <p className="settings-inline-error" role="alert">{error}</p>}
                    </div>
                  )}
                </SettingsRow>
              )
            })}
          </>
        )}

        <SettingsRow label="商品卡片预览">
          <div>
            {preview}
            <p className="field-hint">示例展示消费特权标签的文案和样式。</p>
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
              <p>示例展示消费特权标签的两部分。左右顺序以当前设置为准。</p>
              {preview}
            </div>
            <div className="modal__footer"><button type="button" className="btn btn--primary" onClick={() => setShowExample(false)}>知道了</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
