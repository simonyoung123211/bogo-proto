import { useId, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react'
import type { MemberPriceGeneralSettings } from '../types'
import { sideOf, type TagPart } from '../utils/tagDisplay'

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

export type TagPreviewSettings = Pick<MemberPriceGeneralSettings,
  'styleMode' | 'backgroundStyle' | 'tagTextPosition' |
  'leftBackgroundColor' | 'leftTextColor' | 'rightBackgroundColor' | 'rightTextColor' |
  'leftBackgroundImage' | 'rightBackgroundImage'>

function tagPreviewStyle(settings: TagPreviewSettings): CSSProperties {
  const isDefault = settings.styleMode === 'default'
  const labelOnLeft = settings.tagTextPosition === 'label_left'
  const imageFor = (part: TagPart) => {
    const image = settings[(sideOf(part, settings.tagTextPosition) + 'BackgroundImage') as 'leftBackgroundImage' | 'rightBackgroundImage']
    return !isDefault && settings.backgroundStyle === 'image' && image ? 'url("' + image + '")' : 'none'
  }
  return {
    '--preview-price-bg': isDefault ? DEFAULT_TAG_COLORS.priceBg : labelOnLeft ? settings.rightBackgroundColor : settings.leftBackgroundColor,
    '--preview-price-text': isDefault ? DEFAULT_TAG_COLORS.priceText : labelOnLeft ? settings.rightTextColor : settings.leftTextColor,
    '--preview-label-bg': isDefault ? DEFAULT_TAG_COLORS.labelBg : labelOnLeft ? settings.leftBackgroundColor : settings.rightBackgroundColor,
    '--preview-label-text': isDefault ? DEFAULT_TAG_COLORS.labelText : labelOnLeft ? settings.leftTextColor : settings.rightTextColor,
    '--preview-price-image': imageFor('price'),
    '--preview-label-image': imageFor('marketing'),
  } as CSSProperties
}

export function TagSample({ settings, tagText, price = '14.9', priceSuffix = '' }: {
  settings: TagPreviewSettings
  tagText: string
  price?: string
  priceSuffix?: string
}) {
  const labelOnLeft = settings.tagTextPosition === 'label_left'
  const pricePart = <span className="member-price-tag-preview__price"><small>¥</small>{price}{priceSuffix}</span>
  const labelPart = <span className="member-price-tag-preview__label">{tagText}</span>
  return (
    <div
      className={'member-price-tag-preview ' + (settings.styleMode === 'custom' && settings.backgroundStyle === 'image' ? 'is-image' : '')}
      style={tagPreviewStyle(settings)}
      aria-label={labelOnLeft ? tagText + '，' + price + '元' + priceSuffix : price + '元' + priceSuffix + '，' + tagText}
    >
      {labelOnLeft ? <>{labelPart}{pricePart}</> : <>{pricePart}{labelPart}</>}
    </div>
  )
}

export function MemberPriceTagPreview({
  settings,
  tagText,
  price = '14.9',
  priceSuffix = '',
  view = 'list',
}: {
  settings: Pick<MemberPriceGeneralSettings,
    'styleMode' | 'backgroundStyle' | 'tagTextPosition' |
    'leftBackgroundColor' | 'leftTextColor' | 'rightBackgroundColor' | 'rightTextColor' |
    'leftBackgroundImage' | 'rightBackgroundImage'>
  tagText: string
  price?: string
  priceSuffix?: string
  view?: 'list' | 'detail'
}) {
  const style = tagPreviewStyle(settings)
  const previewTag = <TagSample settings={settings} tagText={tagText} price={price} priceSuffix={priceSuffix} />

  if (view === 'detail') {
    return (
      <div className="tag-preview-detail" style={style}>
        <div className="tag-preview-detail__hero" aria-hidden>
          <svg viewBox="0 0 48 48" fill="none" aria-hidden>
            <rect x="14" y="12" width="20" height="26" rx="3" fill="#C9A97C" />
            <rect x="14" y="12" width="20" height="8" rx="3" fill="#8B6844" />
            <rect x="12" y="9" width="24" height="4" rx="2" fill="#6D4F32" />
            <rect x="22" y="4" width="3" height="8" rx="1.5" fill="#6D4F32" />
          </svg>
        </div>
        <div className="tag-preview-detail__body">
          <strong>洛神花茶</strong>
          <div className="tag-preview-detail__tags">
            <span className="tag-preview-detail__common-tag">商品标签</span>
            {previewTag}
          </div>
          <div className="tag-preview-detail__spec">
            <span>杯型</span><span className="is-selected">大杯</span><span>中杯</span>
          </div>
        </div>
      </div>
    )
  }

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
        {previewTag}
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
