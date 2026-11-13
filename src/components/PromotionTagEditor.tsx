import { useId, useImperativeHandle, useRef, useState, type ChangeEvent, type ReactNode, type Ref } from 'react'
import type { MemberPriceGeneralSettings } from '../types'
import { sideOf, withTagOrder, type TagOrder, type TagPart } from '../utils/tagDisplay'
import { ColorField, MemberPriceTagPreview, RadioOptions, TagImageSideConfig, TagSample } from './PromotionTagPrimitives'

export type PromotionTagEditorSettings = Omit<MemberPriceGeneralSettings, 'customPromotionTagEnabled'>
export type PromotionTagChange = (current: PromotionTagEditorSettings) => PromotionTagEditorSettings
export interface PromotionTagEditorHandle { validate: () => boolean }
export interface PromotionTagEditorConfig {
  priceLabel: string
  defaultText: string
  defaultOrder: TagOrder
  memberLevelTitle?: string
  memberLevelOptionLabel?: string
  memberLevelExample?: string
  memberLevelText?: string
  sourceHint: string
  customPlaceholder: string
  allowReorder?: boolean
  partOrder?: TagPart[]
  price: string
  priceSuffix?: string
  priceCaption: string
  previewNote?: string
  helpTitle: string
  helpLinkText: string
  helpContent: ReactNode
}

export function PromotionTagEditor({ settings, onChange, config, ref }: {
  settings: PromotionTagEditorSettings
  onChange: (change: PromotionTagChange) => void
  config: PromotionTagEditorConfig
  ref?: Ref<PromotionTagEditorHandle>
}) {
  const id = useId()
  const [error, setError] = useState('')
  const [showRules, setShowRules] = useState(false)
  const [previewView, setPreviewView] = useState<'list' | 'detail'>('list')
  const [showPreviewContext, setShowPreviewContext] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const rulesTriggerRef = useRef<HTMLButtonElement>(null)
  const imageFields = useRef<Partial<Record<TagPart, HTMLDivElement | null>>>({})
  const parts = config.partOrder ?? ['price', 'marketing']
  const partTitle = (part: TagPart) => part === 'price' ? config.priceLabel : '营销文案'
  const tagText = settings.tagContentMode === 'member_level'
    ? config.memberLevelText ?? '金卡会员'
    : settings.tagContentMode === 'custom'
      ? settings.customTagText.trim() || '自定义标签'
      : config.defaultText
  const sampleProps = { tagText, price: config.price, priceSuffix: config.priceSuffix }

  const update = <K extends keyof PromotionTagEditorSettings>(key: K, value: PromotionTagEditorSettings[K]) => {
    onChange((current) => ({ ...current, [key]: value }))
    setError('')
  }
  const changeOrder = (order: TagOrder) => {
    onChange((current) => withTagOrder(current, order))
    setError('')
  }
  const handleImage = (part: TagPart, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('请上传图片格式的标签背景')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      onChange((current) => ({
        ...current,
        [sideOf(part, current.tagTextPosition) + 'BackgroundImage']: String(reader.result ?? ''),
      }))
      setError('')
    }
    reader.readAsDataURL(file)
  }
  useImperativeHandle(ref, () => ({
    validate: () => {
      if (settings.tagContentMode === 'custom' && !settings.customTagText.trim()) {
        setError('请输入自定义营销文案')
        requestAnimationFrame(() => tagInputRef.current?.focus())
        return false
      }
      if (settings.styleMode === 'custom' && settings.backgroundStyle === 'image') {
        for (const part of parts) {
          const key = (sideOf(part, settings.tagTextPosition) + 'BackgroundImage') as 'leftBackgroundImage' | 'rightBackgroundImage'
          if (settings[key]) continue
          setError('请上传' + partTitle(part) + '背景图')
          requestAnimationFrame(() => imageFields.current[part]?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
          return false
        }
      }
      setError('')
      return true
    },
  }))
  const closeRules = () => {
    setShowRules(false)
    requestAnimationFrame(() => rulesTriggerRef.current?.focus())
  }
  const orderOptions: TagOrder[] = [config.defaultOrder, config.defaultOrder === 'price_left' ? 'label_left' : 'price_left']

  return (
    <>
      <section className="member-label-module" aria-labelledby={id + '-title'}>
        <div className="member-label-module__heading">
          <h2 id={id + '-title'}>商品促销标签</h2>
          <span>由{config.priceLabel}和营销文案两部分组成</span>
        </div>
        <div className="member-label-editor">
          <div className="member-label-editor__form">
            <fieldset className="member-label-fieldset">
              <legend>营销文案</legend>
              <p className="member-label-description">选择标签上向顾客展示的文字。</p>
              <div className="member-label-source-options">
                {[
                  { value: 'default', title: '默认文案', example: config.defaultText, label: '默认文案（' + config.defaultText + '）' },
                  { value: 'member_level', title: config.memberLevelTitle ?? '会员等级名称', example: config.memberLevelExample ?? '如：金卡会员', label: config.memberLevelOptionLabel ?? config.memberLevelTitle ?? '会员等级名称' },
                  { value: 'custom', title: '自定义文案', example: '最多 10 个字符', label: '自定义文案' },
                ].map((option) => (
                  <label key={option.value} className={'member-label-choice ' + (settings.tagContentMode === option.value ? 'is-selected' : '')}>
                    <input type="radio" name={id + '-content'} aria-label={option.label} checked={settings.tagContentMode === option.value} onChange={() => {
                      update('tagContentMode', option.value as PromotionTagEditorSettings['tagContentMode'])
                      if (option.value === 'custom') requestAnimationFrame(() => tagInputRef.current?.focus())
                    }} />
                    <strong>{option.title}</strong><span>{option.example}</span>
                  </label>
                ))}
              </div>
              {settings.tagContentMode === 'custom' && (
                <div className="member-label-custom-input">
                  <input ref={tagInputRef} className="input" value={settings.customTagText} maxLength={10} aria-label="自定义营销文案（最多 10 个字符）" placeholder={config.customPlaceholder}
                    aria-invalid={error === '请输入自定义营销文案'} aria-describedby={error === '请输入自定义营销文案' ? id + '-text-error' : undefined}
                    onChange={(event) => update('customTagText', event.target.value)} />
                  <span>{settings.customTagText.length}/10</span>
                </div>
              )}
              {error === '请输入自定义营销文案' && <p id={id + '-text-error'} className="settings-inline-error" role="alert">{error}</p>}
              <p className="member-label-help">{config.sourceHint}</p>
            </fieldset>

            {config.allowReorder !== false && (
              <fieldset className="member-label-fieldset">
                <legend>标签排列</legend>
                <p className="member-label-description">选择价格和文案的左右顺序。</p>
                <div className="member-label-order-options">
                  {orderOptions.map((order) => {
                    const title = order === 'price_left' ? '价格在左，文案在右' : '文案在左，价格在右'
                    return (
                      <label key={order} className={'member-label-choice member-label-choice--order ' + (settings.tagTextPosition === order ? 'is-selected' : '')}>
                        <input type="radio" name={id + '-order'} aria-label={title} checked={settings.tagTextPosition === order} onChange={() => changeOrder(order)} />
                        <TagSample settings={withTagOrder(settings, order)} {...sampleProps} /><span>{title}</span>
                      </label>
                    )
                  })}
                </div>
                <p className="member-label-help">换序时，颜色和背景随各自的内容一起移动。</p>
              </fieldset>
            )}

            <fieldset className="member-label-fieldset member-label-fieldset--last">
              <legend>标签样式</legend>
              <div className="member-label-style-options">
                {[
                  { value: 'default', title: '默认样式', description: '使用系统配色' },
                  { value: 'custom', title: '自定义样式', description: '设置颜色或背景图' },
                ].map((option) => (
                  <label key={option.value} className={'member-label-choice member-label-choice--style ' + (settings.styleMode === option.value ? 'is-selected' : '')}>
                    <input type="radio" name={id + '-style'} aria-label={option.title} checked={settings.styleMode === option.value} onChange={() => update('styleMode', option.value as PromotionTagEditorSettings['styleMode'])} />
                    <strong>{option.title}</strong><span>{option.description}</span>
                  </label>
                ))}
              </div>
              {settings.styleMode === 'custom' && (
                <div className="member-label-custom-style">
                  <div className="member-label-background">
                    <span>背景方式</span>
                    <RadioOptions value={settings.backgroundStyle} options={[{ value: 'solid', label: '纯色背景' }, { value: 'image', label: '图片背景' }]} onChange={(value) => update('backgroundStyle', value as PromotionTagEditorSettings['backgroundStyle'])} />
                  </div>
                  {error === '请上传图片格式的标签背景' && <p className="settings-inline-error" role="alert">{error}</p>}
                  <div className="member-label-parts">
                    {parts.map((part) => {
                      const side = sideOf(part, settings.tagTextPosition)
                      const backgroundColor = (side + 'BackgroundColor') as 'leftBackgroundColor' | 'rightBackgroundColor'
                      const textColor = (side + 'TextColor') as 'leftTextColor' | 'rightTextColor'
                      const backgroundImage = (side + 'BackgroundImage') as 'leftBackgroundImage' | 'rightBackgroundImage'
                      const imageError = '请上传' + partTitle(part) + '背景图'
                      return (
                        <div key={part} className="member-label-part" role="group" aria-label={partTitle(part) + '样式'} ref={(element) => { imageFields.current[part] = element }}>
                          <div className="member-label-part__heading"><strong>{partTitle(part)}</strong><span>当前在{side === 'left' ? '左' : '右'}侧</span></div>
                          {settings.backgroundStyle === 'solid' ? (
                            <div className="member-label-part__colors">
                              <ColorField label="文字颜色" value={settings[textColor]} onChange={(value) => update(textColor, value)} />
                              <ColorField label="背景颜色" value={settings[backgroundColor]} onChange={(value) => update(backgroundColor, value)} />
                            </div>
                          ) : (
                            <TagImageSideConfig image={settings[backgroundImage]} sizeHint={'建议高 30px，宽不超过 ' + (part === 'price' ? 116 : 130) + 'px'}
                              textColorLabel="文字颜色" textColor={settings[textColor]} onUpload={(event) => handleImage(part, event)}
                              onRemoveImage={() => update(backgroundImage, '')} onTextColorChange={(value) => update(textColor, value)} />
                          )}
                          {error === imageError && <p className="settings-inline-error" role="alert">{error}</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </fieldset>
          </div>

          <aside className="member-label-preview" aria-label="商品标签实时预览">
            <div className="member-label-preview__heading">
              <strong><i aria-hidden="true" />实时预览</strong>
              <button type="button" ref={rulesTriggerRef} className="link-btn" onClick={() => setShowRules(true)}>{config.helpLinkText} <span aria-hidden="true">↗</span></button>
            </div>
            <div className="member-label-preview__canvas">
              <TagSample settings={settings} {...sampleProps} />
              <div className="member-label-preview__legend" aria-hidden="true">
                <span>{settings.tagTextPosition === 'price_left' ? config.priceLabel : '营销文案'}</span><span>＋</span><span>{settings.tagTextPosition === 'price_left' ? '营销文案' : config.priceLabel}</span>
              </div>
            </div>
            <p className="member-label-preview__caption">{config.priceCaption}</p>
            <button type="button" className="member-label-preview__expand" aria-expanded={showPreviewContext} aria-controls={id + '-context'} onClick={() => setShowPreviewContext((value) => !value)}>
              {showPreviewContext ? '收起商品场景预览' : '展开商品场景预览'}<span aria-hidden="true">{showPreviewContext ? '−' : '＋'}</span>
            </button>
            <div id={id + '-context'} className={'member-label-preview__context ' + (showPreviewContext ? 'is-expanded' : '')}>
              <div className="member-label-preview__context-heading">在商品中的效果</div>
              <div className="member-price-settings__preview-switch" role="group" aria-label="预览页面">
                <button type="button" className={previewView === 'list' ? 'is-active' : ''} aria-pressed={previewView === 'list'} onClick={() => setPreviewView('list')}>点单列表</button>
                <button type="button" className={previewView === 'detail' ? 'is-active' : ''} aria-pressed={previewView === 'detail'} onClick={() => setPreviewView('detail')}>商品详情</button>
              </div>
              <MemberPriceTagPreview settings={settings} {...sampleProps} view={previewView} />
              <p className="member-label-preview__note">{config.previewNote ?? '示例商品与价格仅供演示。实际展示由顾客身份、商品规格与生效活动决定。'}</p>
            </div>
          </aside>
        </div>
      </section>
      {showRules && (
        <div className="modal-overlay modal-overlay--nested" onClick={closeRules}>
          <div className="modal modal--rules" role="dialog" aria-modal="true" aria-labelledby={id + '-help-title'} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
            if (event.key === 'Escape') closeRules()
            if (event.key !== 'Tab') return
            const targets = [...event.currentTarget.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex="0"]')].filter((element) => element.getClientRects().length)
            const first = targets[0], last = targets[targets.length - 1]
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
          }}>
            <div className="modal__header"><h3 id={id + '-help-title'}>{config.helpTitle}</h3><button type="button" className="modal__close" aria-label="关闭标签说明" onClick={closeRules}>×</button></div>
            <div className="modal__body modal__body--scroll member-price-display-rules">{config.helpContent}</div>
            <div className="modal__footer"><button type="button" className="btn btn--primary" autoFocus onClick={closeRules}>知道了</button></div>
          </div>
        </div>
      )}
    </>
  )
}

export function PromotionSettingsLayout({ title, description, hasChanges, onBack, onSave, hasAdditionalSettings = false, children }: {
  title: string
  description: string
  hasChanges: boolean
  onBack: () => void
  onSave: () => void
  hasAdditionalSettings?: boolean
  children: ReactNode
}) {
  return (
    <div className={'member-price-settings member-price-general-settings page-card ' + (hasAdditionalSettings ? 'promotion-settings--additional' : '')}>
      <header className="settings-page-header"><div><h1 tabIndex={-1}>{title}</h1><p>{description}</p></div><span className="member-label-scope">点单列表 · 商品详情</span></header>
      {children}
      <footer className="settings-page-footer member-label-footer">
        <div className="member-label-footer__inner">
          <span className={'member-label-save-status ' + (hasChanges ? 'has-changes' : '')}><i aria-hidden="true" />{hasChanges ? '有未保存的修改' : '修改后点击保存生效'}</span>
          <div><button type="button" className="btn btn--default" onClick={onBack}>返回</button><button type="button" className="btn btn--primary" onClick={onSave}>保存设置</button></div>
        </div>
      </footer>
    </div>
  )
}
