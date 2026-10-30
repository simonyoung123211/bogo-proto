import { useEffect, useState } from 'react'
import { LimitDiscountGoodsFields } from '../components/LimitDiscountGoodsFields'
import { SelectedProductPager, SelectedProductSearchBar } from '../components/SelectedProductTools'
import { LimitDiscountRuleFields } from '../components/LimitDiscountRuleFields'
import { StorePicker } from '../components/StorePicker'
import { LIMIT_DISCOUNT_CHANNELS, LIMIT_DISCOUNT_SCENES, LIMIT_DISCOUNT_STORE_TAGS } from '../mockLimitDiscountData'
import { products, STATUS_LABELS, stores } from '../mockData'
import type { LimitDiscountActivityForm, LimitDiscountProductItem, LimitDiscountStoreMode, Product, WizardMode } from '../types'
import {
  channelSummary,
  collectStepErrors,
  discountStrengthSummary,
  discountValueLabel,
  formatDiscountValue,
  goodsScopeLabel,
  sceneLabel,
  sceneOverrides,
  memberTagLabels,
  participantLabel,
  previewPrice,
  previewSceneHint,
  sceneSummary,
  storeCoverage,
  storeModeLabel,
  storeTagLabels,
} from '../utils/limitDiscountActivity'

interface LimitDiscountActivityWizardProps {
  activity: LimitDiscountActivityForm
  mode: WizardMode
  onChange: (activity: LimitDiscountActivityForm) => void
  onCancel: () => void
  onSaveDraft: () => void
  onSave: () => void
  onSwitchToEdit?: () => void
}

const STEPS = [
  { title: '基础信息与规则', sub: '渠道 · 时间 · 规则' },
  { title: '参与门店', sub: '未选门店' },
  { title: '商品与优惠', sub: '选商品 · 设优惠' },
  { title: '提交保存', sub: '审核材料并完成' },
]

export function LimitDiscountActivityWizard({
  activity,
  mode,
  onChange,
  onCancel,
  onSaveDraft,
  onSave,
  onSwitchToEdit,
}: LimitDiscountActivityWizardProps) {
  const isView = mode === 'view'
  const readOnly = isView
  const [step, setStep] = useState(isView ? 3 : 0)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    if (isView) setStep(3)
  }, [isView])

  const update = <K extends keyof LimitDiscountActivityForm>(key: K, value: LimitDiscountActivityForm[K]) => {
    onChange({ ...activity, [key]: value })
  }

  const toggleList = (key: 'channels' | 'orderTypes' | 'storeTagIds', id: string) => {
    const list = activity[key]
    update(key, list.includes(id) ? list.filter((item) => item !== id) : [...list, id])
  }

  const goNext = () => {
    const nextErrors = collectStepErrors(activity, step)
    if (nextErrors.length) {
      setErrors(nextErrors)
      return
    }
    setErrors([])
    setStep((current) => Math.min(current + 1, 3))
  }

  const goPrev = () => {
    setErrors([])
    setStep((current) => Math.max(current - 1, 0))
  }

  const goTo = (target: number) => {
    if (isView || target === step) return
    if (target < step) {
      setErrors([])
      setStep(target)
      return
    }
    for (let i = step; i < target; i++) {
      const nextErrors = collectStepErrors(activity, i)
      if (nextErrors.length) {
        setStep(i)
        setErrors(nextErrors)
        return
      }
    }
    setErrors([])
    setStep(target)
  }

  const handleSave = () => {
    for (let i = 0; i < 3; i++) {
      const nextErrors = collectStepErrors(activity, i)
      if (nextErrors.length) {
        setStep(i)
        setErrors(nextErrors)
        return
      }
    }
    onSave()
  }

  const coverage = storeCoverage(activity)
  const previewProducts = (activity.goodsScope === 'all' ? products : activity.productItems.map((item) => products.find((p) => p.id === item.productId)).filter(Boolean)).slice(0, 3)
  const sceneHint = previewSceneHint(activity)

  return (
    <div className={`wizard ${isView ? 'wizard--view' : ''}`}>
      <div className="wizard-header">
        <div className="wizard-header__main">
          <h2 className="wizard-header__title">{activity.name || '新建限时折扣'}</h2>
          <span className={`status-badge status-badge--${activity.status}`}>{STATUS_LABELS[activity.status]}</span>
          {isView && <span className="wizard-header__badge">查看模式</span>}
        </div>
        <div className="wizard-header__meta">
          <span>活动ID：{activity.id}</span>
          <span>已选 {activity.channels.length} 个渠道 · {activity.orderTypes.length} 个场景</span>
        </div>
      </div>

      {!isView && (
        <div className="stepper">
          {STEPS.map((item, index) => (
            <button key={item.title} type="button" className={`stepper__item ${index < step ? 'is-done' : ''} ${index === step ? 'is-active' : ''}`} onClick={() => goTo(index)}>
              <div className="stepper__circle">{index < step ? '✓' : index + 1}</div>
              <div className="stepper__label">{item.title}</div>
              {index < STEPS.length - 1 && <div className="stepper__line" />}
            </button>
          ))}
        </div>
      )}

      <div className="ld-editor">
        <aside className="ld-phone" aria-label="点单页预览">
          <div className="ld-phone__bar"><span>10:46</span><span>5G</span></div>
          <div className="ld-phone__store">门店名称<span>距您 1.7km</span></div>
          <div className="ld-phone__tabs">
            <span className={activity.orderTypes.includes('delivery_pickup') || activity.orderTypes.includes('pack') ? 'is-on' : ''}>自取</span>
            <span className={activity.orderTypes.includes('delivery') ? 'is-on' : ''}>外卖</span>
          </div>
          {activity.titleDisplay === 'show' && (activity.title || activity.name) && (
            <div className="ld-phone__banner">{activity.title || activity.name || '限时优惠'}<em>点击查看</em></div>
          )}
          <div className="ld-phone__goods">
            {previewProducts.map((product) => product && (
              <div key={product.id} className="ld-phone__good">
                <div>
                  <strong>{product.name}</strong>
                  {activity.goodsLabelDisplay === 'show' && activity.goodsLabel && <em>{activity.goodsLabel}</em>}
                </div>
                <span>¥{previewPrice(product, activity, activity.productItems.find((item) => item.productId === product.id))}</span>
              </div>
            ))}
          </div>
          <p className="ld-phone__foot">
            {sceneHint ? `${sceneHint} · ` : ''}
            投放到 {channelSummary(activity)}
          </p>
        </aside>

        <div className="wizard-content">
          {errors.length > 0 && (
            <div className="form-error" role="alert">还有 {errors.length} 项必填没完成：{errors[0]}</div>
          )}

          {step === 0 && (
            <div className="wizard-step wizard-step--animate">
              <Section title="适用渠道">
                <FormRow label="参与渠道" required>
                  <div className="channel-group">
                    {LIMIT_DISCOUNT_CHANNELS.map((channel) => (
                      <button key={channel.id} type="button" disabled={readOnly} className={`channel-btn ${activity.channels.includes(channel.id) ? 'is-active' : ''}`} onClick={() => toggleList('channels', channel.id)}>
                        <span className="channel-btn__icon">{channel.icon}</span>{channel.label}
                      </button>
                    ))}
                  </div>
                </FormRow>
                <FormRow label="参与业务/场景" required>
                  <div className="checkbox-group">
                    {LIMIT_DISCOUNT_SCENES.map((scene) => (
                      <label key={scene.id} className="checkbox">
                        <input type="checkbox" disabled={readOnly} checked={activity.orderTypes.includes(scene.id)} onChange={() => toggleList('orderTypes', scene.id)} />
                        {scene.label}
                      </label>
                    ))}
                  </div>
                </FormRow>
              </Section>
              <Section title="基础信息">
                <LimitDiscountRuleFields activity={activity} readOnly={readOnly} onChange={onChange} />
              </Section>
            </div>
          )}

          {step === 1 && (
            <div className="wizard-step wizard-step--animate">
              <Section title="参与门店">
                <p className="field-hint">若“门店管理-门店策略”中设置了门店且不适用业务设置了此类型活动，则门店策略中的门店不可参与此活动。</p>
                <FormRow label="门店范围" required>
                  <div className="radio-group">
                    {([
                      ['all', '全部门店'],
                      ['include', '指定门店参与'],
                      ['exclude', '指定门店不参与'],
                      ['tag_include', '指定门店标签参与'],
                      ['tag_exclude', '指定门店标签不参与'],
                    ] as const).map(([value, label]) => (
                      <label key={value} className="radio">
                        <input type="radio" disabled={readOnly} checked={activity.storeMode === value} onChange={() => update('storeMode', value as LimitDiscountStoreMode)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </FormRow>
                {(activity.storeMode === 'include' || activity.storeMode === 'exclude') && (
                  <StorePicker
                    hideScopeRadios
                    readOnly={readOnly}
                    scope={activity.storeMode === 'exclude' ? 'partial_exclude' : 'partial_include'}
                    selectedIds={activity.storeIds}
                    onScopeChange={() => undefined}
                    onChange={(ids) => update('storeIds', ids)}
                  />
                )}
                {(activity.storeMode === 'tag_include' || activity.storeMode === 'tag_exclude') && (
                  <div className="checkbox-group">
                    {LIMIT_DISCOUNT_STORE_TAGS.map((tag) => (
                      <label key={tag.id} className="checkbox">
                        <input type="checkbox" disabled={readOnly} checked={activity.storeTagIds.includes(tag.id)} onChange={() => toggleList('storeTagIds', tag.id)} />
                        {tag.label}
                      </label>
                    ))}
                  </div>
                )}
                <div className="form-section" style={{ marginTop: 16 }}>
                  <div className="form-section__title">生效门店核对</div>
                  <div className="form-section__body">
                    <p>当前覆盖门店 {coverage.total} 家，其中策略门店 {coverage.strategy} 家，实际可参与门店 {coverage.actual} 家。</p>
                    <p className="field-hint">计算口径：按当前门店范围 {coverage.total} 家 − 策略门店 {coverage.strategy} 家 = 实际参与 {coverage.actual} 家。演示环境策略门店按 0 家计。</p>
                  </div>
                </div>
              </Section>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step wizard-step--animate">
              <Section title="参与商品及优惠">
                <LimitDiscountGoodsFields activity={activity} readOnly={readOnly} onChange={onChange} />
              </Section>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step wizard-step--animate">
              <Review title="适用渠道与时间" rows={[
                ['参与渠道', channelSummary(activity)],
                ['业务场景', sceneSummary(activity)],
                ['活动名称', activity.name || '--'],
                ['活动时间', `${activity.startTime.slice(0, 16)} ~ ${activity.endTime.slice(0, 16)}`],
                ['活动标题', activity.title || '未填写'],
                ['商品促销标签', activity.goodsLabel || '未填写'],
              ]} onEdit={!isView ? () => goTo(0) : undefined} />
              <Review title="活动规则" rows={[
                ['门槛限制', activity.thresholdType === 'limited' ? `消费金额满 ${activity.thresholdAmount} 元` : '不限制'],
                ['加料 / 套餐加价 / 做法加价', `${activity.toppingDiscount === 'yes' ? '参与' : '不参与'} / ${activity.comboSurchargeDiscount === 'yes' ? '参与' : '不参与'} / ${activity.practiceSurchargeDiscount === 'yes' ? '参与' : '不参与'}`],
                ['优惠命中', activity.hitRule === 'lowest_price' ? '优惠售价低到高的商品' : '优惠售价高到低的商品'],
                ['共享互斥', activity.shareMutexRelation === 'share_all' ? '全部活动/券 共享' : '全部活动/券 互斥'],
                ['参与用户', participantLabel(activity)],
                ['打标签', memberTagLabels(activity.memberTagIds)],
              ]} onEdit={!isView ? () => goTo(0) : undefined} />
              <Review title="门店与商品" rows={[
                ['参与门店', `${storeModeLabel(activity)}${activity.storeTagIds.length ? `（${storeTagLabels(activity.storeTagIds)}）` : ''}`],
                ['参与商品', goodsScopeLabel(activity)],
                ['优惠力度', discountStrengthSummary(activity)],
                ['活动库存', activity.goodsScope === 'include' ? '按商品分别设置' : (activity.activityStock == null ? '不限量' : `${activity.activityStock} 件`)],
              ]} onEdit={!isView ? () => goTo(1) : undefined}>
                <StoreDetail activity={activity} />
                <GoodsDetail activity={activity} />
              </Review>
              <p className="field-hint">保存后活动进入待发布。发布后到点自动开始，可在活动列表里暂停、作废或复制。</p>
            </div>
          )}
        </div>
      </div>

      <div className="wizard-footer">
        {isView ? (
          <>
            <button type="button" className="btn btn--default" onClick={onCancel}>返回列表</button>
            {onSwitchToEdit && <button type="button" className="btn btn--primary" onClick={onSwitchToEdit}>编辑活动</button>}
          </>
        ) : (
          <>
            <button type="button" className="btn btn--default" onClick={onCancel}>取消</button>
            {step > 0 && <button type="button" className="btn btn--default" onClick={goPrev}>上一步</button>}
            <button type="button" className="btn btn--default" onClick={onSaveDraft}>保存至草稿</button>
            {step < 3 ? (
              <button type="button" className="btn btn--primary" onClick={goNext}>下一步</button>
            ) : (
              <button type="button" className="btn btn--primary" onClick={handleSave}>保存</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="form-section"><div className="form-section__title">{title}</div><div className="form-section__body">{children}</div></div>
}

function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="form-row"><label className="form-label">{required && <span className="required">*</span>}{label}</label><div className="form-control">{children}</div></div>
}

const REVIEW_PAGE_SIZE = 10

function useDetailPage<T>(rows: T[]) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(rows.length / REVIEW_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = rows.slice((currentPage - 1) * REVIEW_PAGE_SIZE, currentPage * REVIEW_PAGE_SIZE)
  return { pageRows, currentPage, totalPages, setPage }
}

function StoreDetail({ activity }: { activity: LimitDiscountActivityForm }) {
  const [keyword, setKeyword] = useState('')
  if (activity.storeMode !== 'include' && activity.storeMode !== 'exclude') return null
  const picked = stores.filter((store) => activity.storeIds.includes(store.id))
  const kw = keyword.trim()
  const filtered = kw
    ? picked.filter((store) => store.name.includes(kw) || store.code.includes(kw) || store.regionName.includes(kw))
    : picked
  const title = activity.storeMode === 'include' ? '参与门店明细' : '不参与门店明细'
  return (
    <DetailBlock title={`${title}（${picked.length}家）`} empty={picked.length === 0} emptyText="未选择门店">
      <SelectedProductSearchBar
        keyword={keyword}
        onChange={(value) => setKeyword(value)}
        filteredCount={filtered.length}
        totalCount={picked.length}
        itemLabel="门店"
        placeholder="在已选门店中查找：名称 / 编码 / 区域"
      />
      <DetailTable
        key={kw}
        rows={filtered}
        filtering={kw.length > 0}
        rowKey={(store) => store.id}
        emptyText={`没有匹配「${kw}」的已选门店`}
        columns={<>
          <th>门店名称</th><th>门店编码</th><th>所属区域</th><th>营业状态</th>
        </>}
        renderRow={(store) => (
          <>
            <td>{store.name}</td>
            <td>{store.code}</td>
            <td>{store.regionName}</td>
            <td>
              <span className={`status-dot ${store.status === 'open' ? 'status-dot--green' : 'status-dot--gray'}`}>
                {store.status === 'open' ? '营业中' : '已停业'}
              </span>
            </td>
          </>
        )}
      />
    </DetailBlock>
  )
}

function GoodsDetail({ activity }: { activity: LimitDiscountActivityForm }) {
  const [keyword, setKeyword] = useState('')
  if (activity.goodsScope === 'all') return null
  const rows = activity.productItems
    .map((item) => ({ item, product: products.find((p) => p.id === item.productId) }))
    .filter((row): row is { item: LimitDiscountProductItem; product: Product } => Boolean(row.product))
  const kw = keyword.trim()
  const filtered = kw
    ? rows.filter(({ product }) => [product.name, product.spec, product.barcode, product.specCode, product.identifier].some((text) => text.includes(kw)))
    : rows
  const isInclude = activity.goodsScope === 'include'
  const method = activity.discountMethod
  const valueLabel = discountValueLabel(method)
  const title = isInclude ? '参与商品明细' : '不参与商品明细'
  return (
    <DetailBlock title={`${title}（${rows.length}个）`} empty={rows.length === 0} emptyText="未选择商品">
      <SelectedProductSearchBar
        keyword={keyword}
        onChange={setKeyword}
        filteredCount={filtered.length}
        totalCount={rows.length}
        itemLabel="商品"
        placeholder="在已选商品中查找：名称 / 规格 / 条码 / 规格码"
      />
      <DetailTable
        key={kw}
        rows={filtered}
        filtering={kw.length > 0}
        rowKey={(row) => row.item.productId}
        emptyText={`没有匹配「${kw}」的已选商品`}
        columns={<>
          <th>商品名称</th>
          <th>规格</th>
          <th>商品条码</th>
          <th>销售价</th>
          {isInclude && <th>默认{valueLabel}</th>}
          {isInclude && <th>业务单独设置</th>}
          {isInclude && <th>活动库存</th>}
        </>}
        renderRow={({ item, product }) => {
          const overrides = sceneOverrides(activity, item)
          return (
            <>
              <td>{product.name}</td>
              <td>{product.spec}</td>
              <td>{product.barcode}</td>
              <td>¥{product.price}</td>
              {isInclude && <td>{formatDiscountValue(method, item.discountValue)}</td>}
              {isInclude && (
                <td>
                  {overrides.length === 0 ? <span className="field-hint">无，全部按默认</span> : (
                    <div className="ld-review-overrides">
                      {overrides.map(({ sceneId, value }) => (
                        <span key={sceneId} className="ld-override-tag">
                          {sceneLabel(sceneId)}<strong>{formatDiscountValue(method, value)}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              )}
              {isInclude && <td>{item.stock == null ? '不限量' : `${item.stock} 件`}</td>}
            </>
          )
        }}
      />
    </DetailBlock>
  )
}

function DetailBlock({ title, empty, emptyText, children }: { title: string; empty: boolean; emptyText: string; children: React.ReactNode }) {
  return (
    <div className="ld-review-detail">
      <div className="ld-review-detail__title">{title}</div>
      {empty ? <p className="field-hint">{emptyText}</p> : children}
    </div>
  )
}

function DetailTable<T>({ rows, filtering, rowKey, emptyText, columns, renderRow }: {
  rows: T[]
  filtering: boolean
  rowKey: (row: T) => string
  emptyText: string
  columns: React.ReactNode
  renderRow: (row: T) => React.ReactNode
}) {
  const { pageRows, currentPage, totalPages, setPage } = useDetailPage(rows)
  return (
    <>
      <div className="ld-review-detail__scroll">
        <table className="table">
          <thead><tr>{columns}</tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="table-empty" colSpan={100}>{emptyText}</td></tr>
            ) : pageRows.map((row) => <tr key={rowKey(row)}>{renderRow(row)}</tr>)}
          </tbody>
        </table>
      </div>
      {rows.length > 0 && (
        <SelectedProductPager
          total={rows.length}
          pageSize={REVIEW_PAGE_SIZE}
          currentPage={currentPage}
          totalPages={totalPages}
          filtering={filtering}
          onChange={setPage}
        />
      )}
    </>
  )
}

function Review({ title, rows, onEdit, children }: { title: string; rows: [string, string][]; onEdit?: () => void; children?: React.ReactNode }) {
  return (
    <div className="form-section">
      <div className="form-section__title" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{title}</span>
        {onEdit && <button type="button" className="link-btn" onClick={onEdit}>修改</button>}
      </div>
      <div className="form-section__body">
        {rows.map(([label, value]) => (
          <div key={label} className="form-row">
            <label className="form-label">{label}</label>
            <div className="form-control">{value}</div>
          </div>
        ))}
        {children}
      </div>
    </div>
  )
}
