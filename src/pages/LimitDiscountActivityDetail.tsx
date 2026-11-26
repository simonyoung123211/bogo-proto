import { useEffect, useRef, useState } from 'react'
import { PauseConfirmModal, ResumeConfirmModal } from '../components/ActivityPauseControls'
import { DetailTable, LimitDiscountConfigReview, limitDiscountUserLimits } from '../components/LimitDiscountConfigReview'
import { SelectedProductSearchBar } from '../components/SelectedProductTools'
import { DISCOUNT_STORE_POLICY_REASONS } from '../mockLimitDiscountAreas'
import { STATUS_LABELS } from '../mockData'
import type { LimitDiscountActivityForm } from '../types'
import { maskPhone } from '../utils/activity'
import { canPause, canResume, isExpired } from '../utils/activityPause'
import { canEditLimitDiscount, canRelaxLimitDiscountQuota, channelSummary, discountAreaSceneSummary, discountStrengthSummary, isPublishedLimitDiscount } from '../utils/limitDiscountActivity'
import { discountAreaCoverage, resolveDiscountStoreScope } from '../utils/limitDiscountScope'

const TABS = [
  { id: 'overview', label: '概览' },
  { id: 'config', label: '完整配置' },
  { id: 'stores', label: '生效门店' },
  { id: 'logs', label: '操作记录' },
] as const

type Tab = typeof TABS[number]['id']
type Activity = LimitDiscountActivityForm

interface Props {
  activity: Activity
  perspectiveName: string
  canManage: boolean
  onBack: () => void
  onEdit: () => void
  onExtend: () => void
  onCopy: () => void
  onParticipation: () => void
  onPause: () => void
  onResume: () => void
  onVoid: () => void
}

export function LimitDiscountActivityDetail({
  activity, perspectiveName, canManage, onBack, onEdit, onExtend, onCopy, onParticipation, onPause, onResume, onVoid,
}: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [confirm, setConfirm] = useState<'pause' | 'resume' | 'void' | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const detailRef = useRef<HTMLDivElement>(null)
  const { status } = activity
  const published = isPublishedLimitDiscount(status)
  const logs = [...(activity.operationLogs ?? [])].sort((left, right) => right.operatedAt.localeCompare(left.operatedAt))
  const scope = resolveDiscountStoreScope(activity)
  const coverage = discountAreaCoverage(activity, scope.eligibleStores)
  const areaScenes = discountAreaSceneSummary(activity)
  const expired = isExpired(activity, now)

  useEffect(() => {
    detailRef.current?.scrollIntoView({ block: 'start' })
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  function moveTab(event: React.KeyboardEvent, index: number) {
    const destinations = { ArrowLeft: (index - 1 + TABS.length) % TABS.length, ArrowRight: (index + 1) % TABS.length, Home: 0, End: TABS.length - 1 }
    const next = destinations[event.key as keyof typeof destinations]
    if (next === undefined) return
    event.preventDefault()
    setTab(TABS[next].id)
    document.getElementById(`ld-detail-tab-${TABS[next].id}`)?.focus()
  }

  return (
    <div className="ld-detail-page" ref={detailRef}>
      <header className="wizard-header ld-detail-header">
        <button type="button" className="link-btn" onClick={onBack}>← 返回列表</button>
        <div className="ld-detail-header__row">
          <div className="wizard-header__main">
            <h1 className="wizard-header__title">{activity.name || '未命名限时折扣'}</h1>
            <span className={`status-badge status-badge--${status}`}>{STATUS_LABELS[status]}</span>
          </div>
          <div className="ld-detail-actions">
            {canManage && published && !expired && <button type="button" className="btn btn--default" onClick={onExtend}>续期</button>}
            {canManage && canEditLimitDiscount(status) && <button type="button" className="btn btn--primary" onClick={onEdit}>编辑活动</button>}
            {status !== 'draft' && <button type="button" className="btn btn--default" onClick={onParticipation}>参与记录</button>}
            <button type="button" className="btn btn--default" onClick={onCopy}>复制</button>
            {status !== 'draft' && <button type="button" className="btn btn--default" onClick={() => {
              setTab('overview')
              requestAnimationFrame(() => document.getElementById('ld-detail-effects')?.scrollIntoView({ block: 'start' }))
            }}>活动效果</button>}
            {canManage && canPause(status) && !expired && <button type="button" className="btn btn--default" onClick={() => setConfirm('pause')}>暂停</button>}
            {canManage && canResume(status) && <button type="button" className="btn btn--default" onClick={() => setConfirm('resume')}>恢复</button>}
            {canManage && (published || status === 'pending') && <button type="button" className="btn btn--default" onClick={() => setConfirm('void')}>作废</button>}
          </div>
        </div>
        <div className="wizard-header__meta">
          <span>活动 ID {activity.id}</span><span>创建于 {activity.createdAt || '—'}</span>
          <span>最近修改 {activity.updatedAt || '—'}</span>
          <span>最近操作人 {logs[0] ? maskPhone(logs[0].operatorPhone) : '—'}</span>
          <span>当前操作视角 {perspectiveName}</span>
        </div>
      </header>
      <div className="ld-detail-tabs" role="tablist" aria-label="活动详情">
        {TABS.map(({ id, label }, index) => (
          <button key={id} type="button" role="tab" id={`ld-detail-tab-${id}`} aria-controls="ld-detail-panel"
            aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)}
            onKeyDown={(event) => moveTab(event, index)}>{label}</button>
        ))}
      </div>
      <div className="ld-detail-body" id="ld-detail-panel" role="tabpanel" aria-labelledby={`ld-detail-tab-${tab}`}>
        {tab === 'overview' && (
          <>
            <section className="promo-card ld-review-card">
              <div className="promo-card__head"><h3>活动进度</h3></div>
              <div className="promo-card__body">
                <p>{activity.startTime || '未设置'} 至 {activity.endTime || '未设置'}</p>
                {(published || status === 'ended') && <ActivityProgress activity={activity} now={now} />}
                <dl className="ld-review-card__rows">
                  <div><dt>投放渠道</dt><dd>{channelSummary(activity)}</dd></div>
                  <div><dt>配置覆盖</dt><dd><button type="button" className="link-btn" onClick={() => setTab('stores')}>{coverage.coveredStoreCount} 家门店</button></dd></div>
                </dl>
              </div>
            </section>
            <section className="promo-card ld-review-card">
              <div className="promo-card__head">
                <h3>配置摘要</h3>
                <button type="button" className="link-btn" onClick={() => setTab('config')}>查看完整配置</button>
              </div>
              <div className="promo-card__body">
                <dl className="ld-review-card__rows">
                  <div><dt>商品优惠</dt><dd>{discountStrengthSummary(activity)}</dd></div>
                  <div><dt>消费门槛</dt><dd>{activity.thresholdType === 'limited' ? `满 ${activity.thresholdAmount} 元` : '不限'}</dd></div>
                  <div><dt>用户限购</dt><dd>{limitDiscountUserLimits(activity)}</dd></div>
                  <div><dt>门店区域限制</dt><dd>{coverage.specified ? `${areaScenes} · 已选 ${coverage.selectedAreaCount} 个点位` : '全部区域'}</dd></div>
                </dl>
              </div>
            </section>
            {status !== 'draft' && <section className="promo-card ld-review-card" id="ld-detail-effects">
              <div className="promo-card__head"><h3>活动效果</h3></div>
              <div className="promo-card__body">
                <p className="field-hint">本地演示暂无实际效果数据。</p>
                <button type="button" className="link-btn" onClick={onParticipation}>查看参与记录</button>
              </div>
            </section>}
          </>
        )}
        {tab === 'config' && (
          <>
            {published && (
              <details className="alert-banner alert-banner--info ld-detail-locks">
                <summary>活动已发布，查看配置锁定规则</summary>
                <ul>
                  <li>可调整活动名称、标题、促销标签、周期、共享互斥、展示、活动说明及门店点位。结束时间只能延后。</li>
                  <li>已投放渠道只能新增。指定商品可以追加，已投放商品保留在活动中。</li>
                  <li>开始时间、业务场景、时段、门槛、参与资格、限购及已投放商品的优惠力度已锁定。</li>
                  <li>{canRelaxLimitDiscountQuota(activity, now) ? '活动进行中，可提高或取消已有的商品优惠限量。' : '已投放商品的优惠限量已锁定。'}</li>
                </ul>
              </details>
            )}
            <LimitDiscountConfigReview activity={activity} showTrial />
          </>
        )}
        {tab === 'stores' && <StoreCoverage activity={activity} scope={scope} coverage={coverage} />}
        {tab === 'logs' && (
          <section className="promo-card ld-review-card">
            <div className="promo-card__head"><h3>操作记录</h3></div>
            <div className="promo-card__body">
              {logs.length === 0 ? <p className="field-hint">暂无操作记录</p> : (
                <ol className="ld-detail-logs">{logs.map((log) => (
                  <li key={log.id}>
                    <div><strong>{log.action}</strong><time>{log.operatedAt}</time></div>
                    <p>{maskPhone(log.operatorPhone)} · {log.operatorOrg || '—'}</p>
                    {log.detail && <p>{log.detail}</p>}
                  </li>
                ))}</ol>
              )}
            </div>
          </section>
        )}
      </div>
      {confirm === 'pause' && <PauseConfirmModal impact="顾客暂时无法享受限时折扣" onCancel={() => setConfirm(null)}
        onConfirm={() => { setConfirm(null); onPause() }} />}
      {confirm === 'resume' && <ResumeConfirmModal effect="限时折扣立即重新生效" willEnd={expired}
        onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); onResume() }} />}
      {confirm === 'void' && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal modal--sm" role="dialog" aria-modal="true" aria-label="作废活动" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header"><h3>作废活动？</h3></div>
            <div className="modal__body">作废后活动将停止生效。</div>
            <div className="modal__footer">
              <button type="button" className="btn btn--default" onClick={() => setConfirm(null)}>取消</button>
              <button type="button" className="btn btn--danger" onClick={() => { setConfirm(null); onVoid() }}>确认作废</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActivityProgress({ activity, now }: { activity: Activity; now: number }) {
  const start = Date.parse(activity.startTime.replace(' ', 'T'))
  const end = Date.parse(activity.endTime.replace(' ', 'T'))
  if (!(end > start)) return null
  const percent = Math.round(Math.max(0, Math.min(100, (now - start) / (end - start) * 100)))
  return <div className="ld-detail-progress"><progress aria-label="活动进度" value={percent} max={100} /><span>{percent}%</span></div>
}

function StoreCoverage({ activity, scope, coverage }: {
  activity: Activity
  scope: ReturnType<typeof resolveDiscountStoreScope>
  coverage: ReturnType<typeof discountAreaCoverage>
}) {
  const [keyword, setKeyword] = useState('')
  const { specified, coversWholeStores } = coverage
  const pointsByStore = new Map(coverage.selected.map(({ store, areas }) => [store.id, areas.map(({ name }) => name).join('、')]))
  const stores = coversWholeStores ? scope.eligibleStores : coverage.selected.map(({ store }) => store)
  const members = stores.map((store) => ({ store, pointNames: specified ? pointsByStore.get(store.id) ?? '未选点位' : '全部区域' }))
  const term = keyword.trim().toLowerCase()
  const filtered = members.filter(({ store, pointNames }) =>
    [store.name, store.code, store.id, pointNames].some((value) => value.toLowerCase().includes(term)))

  return (
    <section className="promo-card ld-review-card">
      <div className="promo-card__head"><h3>生效门店核对</h3></div>
      <div className="promo-card__body">
        {scope.scopeError ? <p className="field-hint">{scope.scopeError}</p> : (
          <dl className="ld-review-card__rows">
            <div><dt>门店规则命中</dt><dd>{scope.matchedStores.length} 家</dd></div>
            <div><dt>策略扣除</dt><dd>{scope.policyExcludedStores.length} 家</dd></div>
            <div><dt>实际可参与</dt><dd>{scope.eligibleStores.length} 家</dd></div>
            <div><dt>配置覆盖</dt><dd>{members.length} 家{specified && ` · ${coverage.selectedAreaCount} 个点位`}</dd></div>
          </dl>
        )}
        {specified && coversWholeStores && <p className="field-hint">其余已选业务按参与门店范围生效。</p>}
        {activity.status !== 'in_progress' && <p className="field-hint">以上是按当前配置核对的范围。</p>}
        {scope.policyExcludedStores.length > 0 && (
          <details className="ld-entry-preview">
            <summary>查看策略扣除门店</summary>
            <ul className="ld-area-summary">{scope.policyExcludedStores.map(({ id, name }) => (
              <li key={id}>{name} · {DISCOUNT_STORE_POLICY_REASONS[id]}</li>
            ))}</ul>
          </details>
        )}
        {members.length === 0 ? <p className="field-hint">暂无可参与门店</p> : (
          <>
            <SelectedProductSearchBar keyword={keyword} onChange={setKeyword} filteredCount={filtered.length}
              totalCount={members.length} itemLabel="门店" placeholder="搜索门店名称、编码、ID 或点位" />
            <DetailTable key={term} rows={filtered} rowKey={({ store }) => store.id} filtering={Boolean(term)}
              emptyText="未找到匹配的门店或点位"
              columns={<>
                <th scope="col">可参与门店</th><th scope="col">门店编码</th><th scope="col">门店 ID</th>
                <th scope="col">{specified ? `${discountAreaSceneSummary(activity)}点餐区域` : '适用点餐区域'}</th>
              </>}
              renderRow={({ store, pointNames }) => <><td>{store.name}</td><td>{store.code}</td><td>{store.id}</td><td>{pointNames}</td></>} />
          </>
        )}
      </div>
    </section>
  )
}
