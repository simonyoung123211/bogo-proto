import { useEffect, useRef, useState } from 'react'
import { createEmptyGiftGroup, DEFAULT_PHYSICAL_GIFT_DISPLAY_TITLE, DEFAULT_STORAGE_COUPON_DISPLAY_TITLE, GIFT_DISPLAY_TITLE_MAX } from '../mockData'
import type { GiftGroup } from '../types'
import { MAX_GIFT_GROUPS } from '../types'
import { CouponGiftConfigPanel } from './CouponGiftConfigPanel'
import { GiftProductTable, GIFT_PRODUCT_MAX } from './GiftProductTable'

interface GiftGroupsEditorProps {
  groups: GiftGroup[]
  readOnly?: boolean
  onChange: (groups: GiftGroup[]) => void
  onPickPhysicalProducts: (groupIndex: number) => void
}

export function GiftGroupsEditor({
  groups,
  readOnly,
  onChange,
  onPickPhysicalProducts,
}: GiftGroupsEditorProps) {
  // 记录每组的折叠状态，默认全展开
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (groups.length === 0) {
      onChange([createEmptyGiftGroup()])
    }
  }, [groups.length, onChange])

  const updateGroup = (index: number, patch: Partial<GiftGroup>) => {
    onChange(groups.map((g, i) => (i === index ? { ...g, ...patch } : g)))
  }

  const addGroup = () => {
    if (groups.length >= MAX_GIFT_GROUPS) return
    const newGroup = createEmptyGiftGroup()
    onChange([...groups, newGroup])
    // 新增组默认展开
    setCollapsed((c) => ({ ...c, [newGroup.id]: false }))
  }

  const removeGroup = (index: number) => {
    if (index === 0 || groups.length <= 1) return
    onChange(groups.filter((_, i) => i !== index))
  }

  const toggleCollapse = (id: string) => {
    setCollapsed((c) => ({ ...c, [id]: !c[id] }))
  }

  if (groups.length === 0) return null

  const physicalCount = (g: GiftGroup) => g.physicalProductIds.length
  const couponEnabled = (g: GiftGroup) => g.couponGift.storageEnabled

  return (
    <div className="form-row form-row--top">
      <label className="form-label"><span className="required">*</span>赠品组</label>
      <div className="form-control gift-groups-v2">

        <div className="gift-groups-v2__list">
          {groups.map((g, i) => {
            const isCollapsed = !!collapsed[g.id]
            const summary = [
              physicalCount(g) > 0 ? `实物赠品 ${physicalCount(g)} 个SKU` : '实物赠品 未配置',
              couponEnabled(g) ? '寄存券 已开启' : '寄存券 未开启',
              g.image ? '说明图片 已上传' : '说明图片 未配置',
            ].join('　')

            return (
              <div key={g.id} className="gift-group-card">
                <div className="gift-group-card__header">
                  <div className="gift-group-card__header-left">
                    <span className="gift-group-card__index">{i + 1}</span>
                    <span className="gift-group-card__title">赠品组{i + 1}</span>
                    {isCollapsed && (
                      <span className="gift-group-card__summary">{summary}</span>
                    )}
                  </div>
                  <div className="gift-group-card__header-right">
                    {!readOnly && i > 0 && (
                      <button
                        type="button"
                        className="gift-group-card__remove"
                        onClick={() => removeGroup(i)}
                        title="删除此赠品组"
                      >
                        删除
                      </button>
                    )}
                    <button
                      type="button"
                      className="gift-group-card__toggle"
                      onClick={() => toggleCollapse(g.id)}
                      aria-expanded={!isCollapsed}
                    >
                      <span className={`collapse-arrow ${isCollapsed ? '' : 'is-expanded'}`}>›</span>
                      {isCollapsed ? '展开' : '收起'}
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="gift-group-card__body">
                    <div className="gift-group-card__section">
                      <div className="gift-group-card__section-title">
                        <span className="gift-group-card__section-dot" />
                        实物赠品
                      </div>
                      {i === 0 && (
                        <GiftDisplayTitleField
                          label="小程序展示标题"
                          hint="用于小程序赠品选择页「实物赠品」入口标题，如：当单立享"
                          value={g.physicalDisplayTitle}
                          defaultValue={DEFAULT_PHYSICAL_GIFT_DISPLAY_TITLE}
                          readOnly={readOnly}
                          onChange={(physicalDisplayTitle) => updateGroup(i, { physicalDisplayTitle })}
                        />
                      )}
                      <GiftProductTable
                        embedded
                        label="实物赠品"
                        productIds={g.physicalProductIds}
                        readOnly={readOnly}
                        onChange={(ids) => updateGroup(i, { physicalProductIds: ids })}
                        onAdd={() => onPickPhysicalProducts(i)}
                      />
                    </div>

                    <div className="gift-group-card__divider" />

                    <div className="gift-group-card__section">
                      <div className="gift-group-card__section-title">
                        <span className="gift-group-card__section-dot gift-group-card__section-dot--blue" />
                        寄存券赠品
                      </div>
                      <CouponGiftConfigPanel
                        giftGroupIndex={i}
                        config={g.couponGift}
                        readOnly={readOnly}
                        onChange={(couponGift) => updateGroup(i, { couponGift })}
                      />
                      {i === 0 && g.couponGift.storageEnabled && (
                        <GiftDisplayTitleField
                          label="小程序展示标题"
                          hint="用于小程序赠品选择页「寄存券赠品」入口标题，如：我要寄存，下次用"
                          value={g.couponGift.displayTitle}
                          defaultValue={DEFAULT_STORAGE_COUPON_DISPLAY_TITLE}
                          readOnly={readOnly}
                          onChange={(displayTitle) =>
                            updateGroup(i, { couponGift: { ...g.couponGift, displayTitle } })
                          }
                        />
                      )}
                    </div>

                    <div className="gift-group-card__divider" />

                    <div className="gift-group-card__section">
                      <div className="gift-group-card__section-title">
                        <span className="gift-group-card__section-dot gift-group-card__section-dot--orange" />
                        赠品组说明图片
                      </div>
                      <p className="gift-group-image-desc">
                        {i === 0
                          ? '用于小程序赠品选择页中本组赠品的标题说明区域。上传图片后将以图片形式展示组说明，便于商家个性化运营；未上传时使用上方配置的标题文案。'
                          : '用于小程序「加赠好礼」区域的组说明展示。上传图片后以图片形式个性化展示；未上传时使用系统默认文案。'}
                      </p>
                      <GiftGroupImagePicker
                        groupIndex={i}
                        value={g.image}
                        physicalTitle={g.physicalDisplayTitle}
                        readOnly={readOnly}
                        onChange={(image) => updateGroup(i, { image })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {!readOnly && groups.length < MAX_GIFT_GROUPS && (
          <button type="button" className="gift-groups-v2__add" onClick={addGroup}>
            <span className="gift-groups-v2__add-icon">+</span>
            添加赠品组
          </button>
        )}

        <div className="gift-groups-v2__hint">
          最多可配置 {MAX_GIFT_GROUPS} 组赠品，赠品组1不可删除
        </div>
      </div>
    </div>
  )
}

interface GiftDisplayTitleFieldProps {
  label: string
  hint: string
  value?: string
  defaultValue: string
  readOnly?: boolean
  onChange: (value: string) => void
}

export function GiftDisplayTitleField({
  label,
  hint,
  value,
  defaultValue,
  readOnly,
  onChange,
}: GiftDisplayTitleFieldProps) {
  const display = value ?? defaultValue

  if (readOnly) {
    return (
      <div className="gift-display-title gift-display-title--readonly">
        <span className="gift-display-title__label">{label}</span>
        <span className="gift-display-title__value">{display || '-'}</span>
      </div>
    )
  }

  return (
    <div className="gift-display-title">
      <label className="gift-display-title__label">{label}</label>
      <div className="char-input-wrap gift-display-title__input-wrap">
        <input
          className="input input--count"
          value={display}
          maxLength={GIFT_DISPLAY_TITLE_MAX}
          placeholder={defaultValue}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="char-count">{display.length}/{GIFT_DISPLAY_TITLE_MAX}</span>
      </div>
      <div className="field-hint field-hint--inline">{hint}</div>
    </div>
  )
}

interface GiftGroupImagePickerProps {
  groupIndex: number
  physicalTitle?: string
  value?: string
  readOnly?: boolean
  onChange: (url: string | undefined) => void
}

const GROUP_IMAGE_HINTS = [
  '展示于小程序「第2件商品」赠品区域顶部，如：二选一说明',
  '展示于小程序「加赠好礼」区域顶部，如：额外赠送说明',
]

export function GiftGroupImagePicker({ groupIndex, physicalTitle, value, readOnly, onChange }: GiftGroupImagePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [previewError, setPreviewError] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setPreviewError(false)
      onChange(dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleClear = () => {
    setPreviewError(false)
    onChange(undefined)
  }

  const displayUrl = value

  if (readOnly) {
    return displayUrl ? (
      <div className="gg-image-preview gg-image-preview--readonly">
        <img src={displayUrl} alt="赠品组说明图" onError={() => setPreviewError(true)} />
        {previewError && <span className="gg-image-error">图片加载失败</span>}
      </div>
    ) : (
      <span className="field-hint">未配置，小程序将使用标题文案展示</span>
    )
  }

  const sceneHint = GROUP_IMAGE_HINTS[groupIndex] ?? '展示于小程序对应赠品组区域顶部'

  return (
    <div className="gg-image-picker">
      <div className="gg-image-picker__layout">
        <div className="gg-image-picker__upload-col">
          <div className="gg-image-picker__row">
            <button
              type="button"
              className={`gg-image-upload-btn ${displayUrl && !previewError ? 'has-image' : ''}`}
              onClick={() => fileRef.current?.click()}
              title="点击上传赠品组说明图片"
            >
              {displayUrl && !previewError ? (
                <img
                  src={displayUrl}
                  alt="赠品组说明图预览"
                  className="gg-image-upload-btn__img"
                  onError={() => setPreviewError(true)}
                />
              ) : (
                <span className="gg-image-upload-btn__placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span>上传说明图</span>
                </span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="gg-image-file-input"
              onChange={handleFileChange}
            />

            <div className="gg-image-picker__actions">
              {displayUrl && !previewError && (
                <button type="button" className="link-btn" style={{ color: 'var(--danger)' }} onClick={handleClear}>
                  删除图片
                </button>
              )}
              {previewError && (
                <span className="gg-image-error">图片无法预览，请重新上传</span>
              )}
            </div>
          </div>

          <div className="field-hint">
            建议尺寸 750×280px（横幅），支持 JPG / PNG / WebP，小于 2MB。{sceneHint}
          </div>
        </div>

        <div className="gg-image-picker__mock" aria-label="小程序展示示意">
          <div className="gg-mock-phone">
            <div className="gg-mock-phone__bar" />
            <div className="gg-mock-phone__body">
              {displayUrl && !previewError ? (
                <img src={displayUrl} alt="" className="gg-mock-phone__banner" />
              ) : (
                <div className="gg-mock-phone__banner gg-mock-phone__banner--text">
                  <span className="gg-mock-phone__banner-title">
                    {groupIndex === 0 ? '第 2 件商品' : '加赠好礼'}
                  </span>
                  <span className="gg-mock-phone__banner-tag">
                    {groupIndex === 0 ? '二选一' : '额外赠送'}
                  </span>
                  {!displayUrl && (
                    <span className="gg-mock-phone__banner-sub">
                      {physicalTitle || (groupIndex === 0 ? '当单立享' : '额外赠送说明')}
                    </span>
                  )}
                </div>
              )}
              <div className="gg-mock-phone__cards">
                <div className="gg-mock-phone__card" />
                <div className="gg-mock-phone__card gg-mock-phone__card--dim" />
              </div>
            </div>
          </div>
          <div className="gg-image-picker__mock-label">小程序展示示意</div>
        </div>
      </div>
    </div>
  )
}

export { GIFT_PRODUCT_MAX }
