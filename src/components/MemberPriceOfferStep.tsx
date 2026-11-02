import { useEffect, useState } from 'react'
import type {
  MemberPriceActivityForm,
  MemberPriceAudienceType,
  MemberPriceOfferGroup,
  MemberPricePaymentAmountLimit,
  MemberPriceProductCoreFields,
} from '../types'
import { createEmptyMemberPriceOfferGroup } from '../mockMemberPriceData'
import {
  DEFAULT_MEMBER_PRICE_PAYMENT,
  MEMBER_PRICE_AUDIENCE_OPTIONS,
  applyProductCoreToGroup,
  copyMemberPriceGroupProducts,
  getMemberPriceAudienceLabel,
  getMemberPriceGroupLabel,
  getMemberPriceGroupUnitLabel,
  getMemberPriceMaxGroups,
  getMemberPriceTargetFieldLabel,
  getMemberPriceTargetOptions,
  groupToProductCore,
  isMemberPriceGroupIncomplete,
  isMemberPricePhysicalCardAudience,
  memberPriceGroupHasProductConfig,
  supportsMemberPriceMultiGroup,
  syncMemberPriceActivityMirrors,
  syncMemberPriceGroupsWithTargets,
} from '../utils/memberPriceActivity'
import { MemberPriceProductConfig } from './MemberPriceProductConfig'

interface MemberPriceOfferStepProps {
  activity: MemberPriceActivityForm
  readOnly?: boolean
  activeGroupId?: string
  onActiveGroupChange?: (groupId: string) => void
  onChange: (activity: MemberPriceActivityForm) => void
  onToast?: (message: string) => void
}

export function MemberPriceOfferStep({
  activity,
  readOnly,
  activeGroupId: controlledActiveId,
  onActiveGroupChange,
  onChange,
  onToast,
}: MemberPriceOfferStepProps) {
  const audienceType = activity.audienceType ?? 'specified_level'
  const multi = supportsMemberPriceMultiGroup(audienceType)
  const groups = activity.groups?.length
    ? activity.groups
    : multi
      ? []
      : [createEmptyMemberPriceOfferGroup({ targetIds: activity.memberLevels ?? [] })]
  const options = getMemberPriceTargetOptions(audienceType)
  const selectedTargetIds = groups.flatMap((g) => g.targetIds)
  const unitLabel = getMemberPriceGroupUnitLabel(audienceType)
  const maxGroups = getMemberPriceMaxGroups(audienceType)

  const [innerActiveId, setInnerActiveId] = useState(groups[0]?.id ?? '')
  const [audienceTarget, setAudienceTarget] = useState<MemberPriceAudienceType | null>(null)
  const [pendingUncheck, setPendingUncheck] = useState<{ id: string; label: string } | null>(null)
  const [copyOpen, setCopyOpen] = useState(false)
  /** push=当前推到目标；pull=从来源覆盖当前 */
  const [copyMode, setCopyMode] = useState<'push' | 'pull'>('push')
  const [copySourceId, setCopySourceId] = useState('')
  const [copyTargets, setCopyTargets] = useState<string[]>([])

  const activeGroupId = controlledActiveId ?? innerActiveId
  const setActiveGroupId = (id: string) => {
    setInnerActiveId(id)
    onActiveGroupChange?.(id)
  }

  useEffect(() => {
    if (!groups.some((g) => g.id === activeGroupId) && groups[0]) {
      setActiveGroupId(groups[0].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync when groups/ids change
  }, [groups.map((g) => g.id).join(','), activeGroupId])

  const commit = (next: MemberPriceActivityForm) => {
    onChange(syncMemberPriceActivityMirrors(next))
  }

  /** 实体卡受众：支付方式固定为限制「礼品卡-储值实体卡」，界面不开放改 */
  const withFixedPhysicalCardPayment = (
    next: MemberPriceActivityForm,
  ): MemberPriceActivityForm => ({
    ...next,
    ...DEFAULT_MEMBER_PRICE_PAYMENT,
    paymentAmountLimit: next.paymentAmountLimit ?? DEFAULT_MEMBER_PRICE_PAYMENT.paymentAmountLimit,
  })

  const paymentAmountLimit: MemberPricePaymentAmountLimit =
    activity.paymentAmountLimit ?? DEFAULT_MEMBER_PRICE_PAYMENT.paymentAmountLimit
  const showPhysicalCardPayment = isMemberPricePhysicalCardAudience(audienceType)

  useEffect(() => {
    if (!showPhysicalCardPayment || readOnly) return
    const limitOk = activity.paymentLimitType === DEFAULT_MEMBER_PRICE_PAYMENT.paymentLimitType
    const methodsOk =
      JSON.stringify(activity.paymentMethodIds ?? [])
      === JSON.stringify(DEFAULT_MEMBER_PRICE_PAYMENT.paymentMethodIds)
    if (limitOk && methodsOk) return
    commit(withFixedPhysicalCardPayment(activity))
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only lock payment method when audience is physical card
  }, [showPhysicalCardPayment, activity.paymentLimitType, activity.paymentMethodIds?.join(','), readOnly])

  const applyAudienceChange = (nextType: MemberPriceAudienceType) => {
    const resetGroup = createEmptyMemberPriceOfferGroup()
    const nextActivity: MemberPriceActivityForm = {
      ...activity,
      audienceType: nextType,
      groups: supportsMemberPriceMultiGroup(nextType) ? [] : [resetGroup],
    }
    commit(
      isMemberPricePhysicalCardAudience(nextType)
        ? withFixedPhysicalCardPayment({
            ...nextActivity,
            paymentAmountLimit: DEFAULT_MEMBER_PRICE_PAYMENT.paymentAmountLimit,
          })
        : nextActivity,
    )
    setActiveGroupId(supportsMemberPriceMultiGroup(nextType) ? '' : resetGroup.id)
    setAudienceTarget(null)
    onToast?.(
      supportsMemberPriceMultiGroup(nextType)
        ? `已切换为「${getMemberPriceAudienceLabel(nextType)}」，请重新选择${getMemberPriceGroupUnitLabel(nextType)}`
        : '已切换优惠会员类型，商品配置已重置，请重新配置',
    )
  }

  const requestAudienceChange = (nextType: MemberPriceAudienceType) => {
    if (nextType === audienceType) return
    if (groups.length > 0 || groups.some((g) => g.targetIds.length > 0 || g.productIds.length > 0)) {
      setAudienceTarget(nextType)
      return
    }
    applyAudienceChange(nextType)
  }

  const updateGroups = (nextGroups: MemberPriceOfferGroup[], focusId?: string) => {
    commit({ ...activity, groups: nextGroups })
    if (focusId) setActiveGroupId(focusId)
    else if (nextGroups.length && !nextGroups.some((g) => g.id === activeGroupId)) {
      setActiveGroupId(nextGroups[0].id)
    }
  }

  const updateGroupProducts = (groupId: string, core: MemberPriceProductCoreFields) => {
    updateGroups(groups.map((g) => (g.id === groupId ? applyProductCoreToGroup(g, core) : g)))
  }

  const applySelectedTargets = (nextIds: string[], focusId?: string) => {
    const template = groups[0]
    const nextGroups = syncMemberPriceGroupsWithTargets(
      groups,
      nextIds,
      template
        ? { priceMethod: template.priceMethod, allProductsValue: template.allProductsValue }
        : undefined,
    )
    updateGroups(nextGroups, focusId)
  }

  const toggleTarget = (targetId: string) => {
    if (readOnly) return
    const option = options.find((o) => o.id === targetId)
    const checked = selectedTargetIds.includes(targetId)
    if (checked) {
      const group = groups.find((g) => g.targetIds[0] === targetId)
      if (group && memberPriceGroupHasProductConfig(group)) {
        setPendingUncheck({ id: targetId, label: option?.label ?? targetId })
        return
      }
      applySelectedTargets(selectedTargetIds.filter((id) => id !== targetId))
      return
    }
    if (selectedTargetIds.length >= maxGroups) {
      onToast?.(`最多选择 ${maxGroups} 个${unitLabel}`)
      return
    }
    const nextIds = [...selectedTargetIds, targetId]
    const created = syncMemberPriceGroupsWithTargets(groups, nextIds).find((g) => g.targetIds[0] === targetId)
    applySelectedTargets(nextIds, created?.id)
  }

  const confirmUncheck = () => {
    if (!pendingUncheck) return
    applySelectedTargets(selectedTargetIds.filter((id) => id !== pendingUncheck.id))
    setPendingUncheck(null)
  }

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0]
  const incompleteCount = groups.filter((g) =>
    isMemberPriceGroupIncomplete(audienceType, g, activity.orderTypes),
  ).length
  const audienceTargetLabel = audienceTarget
    ? MEMBER_PRICE_AUDIENCE_OPTIONS.find((o) => o.value === audienceTarget)?.label
    : ''
  const currentHasProducts = Boolean(activeGroup && memberPriceGroupHasProductConfig(activeGroup))
  const groupsWithProducts = groups.filter((g) => memberPriceGroupHasProductConfig(g))
  const otherGroupsWithProducts = groupsWithProducts.filter((g) => g.id !== activeGroup?.id)
  const emptyOtherGroups = groups.filter(
    (g) => g.id !== activeGroup?.id && !memberPriceGroupHasProductConfig(g),
  )
  const canCopyProducts = Boolean(
    activeGroup
      && groups.length > 1
      && !readOnly
      && (currentHasProducts || otherGroupsWithProducts.length > 0),
  )

  const openCopyDialog = () => {
    if (!activeGroup) return
    if (!canCopyProducts) {
      onToast?.(
        currentHasProducts
          ? `请先添加其他${unitLabel}组作为复用目标`
          : `请先在任一${unitLabel}组配置参与商品，再复用到当前组`,
      )
      return
    }
    if (currentHasProducts) {
      setCopyMode('push')
      setCopySourceId(activeGroup.id)
      setCopyTargets(emptyOtherGroups.map((g) => g.id))
    } else {
      setCopyMode('pull')
      setCopySourceId(otherGroupsWithProducts[0]?.id ?? '')
      setCopyTargets([activeGroup.id])
    }
    setCopyOpen(true)
  }

  const applyCopyProducts = () => {
    if (!activeGroup) return
    if (copyMode === 'pull') {
      const source = groups.find((g) => g.id === copySourceId)
      if (!source || !memberPriceGroupHasProductConfig(source)) {
        onToast?.(`请先选择要从哪个${unitLabel}复用`)
        return
      }
      updateGroups(groups.map((g) => (
        g.id === activeGroup.id ? copyMemberPriceGroupProducts(source, g) : g
      )))
      setCopyOpen(false)
      onToast?.(`已复用「${getMemberPriceGroupLabel(audienceType, source)}」的商品清单，请为本组填写优惠力度`)
      return
    }
    const source = groups.find((g) => g.id === copySourceId) ?? activeGroup
    if (!memberPriceGroupHasProductConfig(source)) {
      onToast?.('当前还没有商品，请先选商品，或改用「从其他等级复用过来」')
      return
    }
    if (copyTargets.length === 0) {
      onToast?.(`请至少勾选一个要复用到的${unitLabel}`)
      return
    }
    const targetSet = new Set(copyTargets)
    updateGroups(groups.map((g) => (
      targetSet.has(g.id) ? copyMemberPriceGroupProducts(source, g) : g
    )))
    setCopyOpen(false)
    onToast?.(`已复用到 ${copyTargets.length} 个${unitLabel}，请到各组分别填写优惠力度`)
  }

  return (
    <div className="mp-offer-step">
      <FormRow label="优惠会员" required>
        <div className="choice-card-group choice-card-group--wrap">
          {MEMBER_PRICE_AUDIENCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={readOnly}
              className={`choice-card ${audienceType === opt.value ? 'is-active' : ''}`}
              onClick={() => requestAudienceChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {audienceType === 'paid_member_card_user' && (
          <p className="field-hint">
            任意已购买付费会员的用户均可享受，无需指定卡模版。
          </p>
        )}
        {multi && (
          <p className="field-hint">
            先勾选{unitLabel}，系统按每个{unitLabel}自动拆成一组。商品清单可用「复用商品」快速对齐，优惠力度请在各组分别填写；同一顾客同时命中多组时，点单页按对顾客更优的价格生效（示意口径）。
          </p>
        )}
      </FormRow>

      {multi && (
        <FormRow label={getMemberPriceTargetFieldLabel(audienceType)} required>
          <div className="member-level-group">
            <div className="choices choices--targets" role="group" aria-label={getMemberPriceTargetFieldLabel(audienceType)}>
              {options.map((opt) => {
                const checked = selectedTargetIds.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`choice box ${checked ? 'selected' : ''}`}
                    disabled={Boolean(readOnly)}
                    aria-pressed={checked}
                    onClick={() => toggleTarget(opt.id)}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <p className="field-hint">
              已选 {selectedTargetIds.length}/{maxGroups} 个{unitLabel}
              {selectedTargetIds.length === 0 ? `，请先选择后再配置商品优惠` : ''}
            </p>
          </div>
        </FormRow>
      )}

      {showPhysicalCardPayment && (
        <FormRow label="支付金额限制" required>
          <div className="radio-group radio-group--vertical">
            <label className="radio">
              <input
                type="radio"
                disabled={readOnly}
                checked={paymentAmountLimit === 'any'}
                onChange={() => commit(withFixedPhysicalCardPayment({ ...activity, paymentAmountLimit: 'any' }))}
              />
              任意支付金额
            </label>
            <p className="field-hint" style={{ marginTop: 0, marginBottom: 8 }}>
              使用指定的支付方式，支付大于 0.01 元的金额，即可享受
            </p>
            <label className="radio">
              <input
                type="radio"
                disabled={readOnly}
                checked={paymentAmountLimit === 'full_order'}
                onChange={() => commit(withFixedPhysicalCardPayment({ ...activity, paymentAmountLimit: 'full_order' }))}
              />
              整单支付金额
            </label>
            <p className="field-hint" style={{ marginTop: 0 }}>
              使用指定的支付方式，支付整单参与当前活动的金额，即可享受
            </p>
          </div>
        </FormRow>
      )}

      {multi && groups.length > 0 && (
        <>
          <div className="mp-scheme-overview">
            <div className="mp-scheme-overview__meta">
              <span>共 {groups.length} 个{unitLabel}组</span>
              <span className={incompleteCount ? 'is-warn' : 'is-ok'}>
                {incompleteCount ? `${incompleteCount} 个待完善` : '各组已配齐'}
              </span>
              {activeGroup && (
                <span className="mp-scheme-overview__current">
                  当前：{getMemberPriceGroupLabel(audienceType, activeGroup)}
                </span>
              )}
            </div>
          </div>
          <div className="mp-group-tabs">
            <div className="mp-group-tabs__list">
              {groups.map((g, index) => {
                const label = getMemberPriceGroupLabel(audienceType, g, index)
                const incomplete = isMemberPriceGroupIncomplete(audienceType, g, activity.orderTypes)
                return (
                  <div
                    key={g.id}
                    className={`mp-group-tabs__item ${g.id === activeGroup?.id ? 'is-active' : ''} ${incomplete ? 'is-empty' : ''}`}
                  >
                    <button
                      type="button"
                      className="mp-group-tabs__label"
                      onClick={() => setActiveGroupId(g.id)}
                      title={label}
                    >
                      <span className="mp-group-tabs__name">
                        {label}
                        {incomplete && <em className="mp-group-tabs__badge">待完善</em>}
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {activeGroup && (!multi || groups.length > 0) && (
        <div className="mp-group-panel" key={activeGroup.id}>
          {multi && (
            <div className="mp-group-panel__title">
              <div className="mp-group-panel__title-main">
                <span>{getMemberPriceGroupLabel(audienceType, activeGroup)}</span>
                <span className="mp-group-panel__meta">仅配置本{unitLabel}的参与商品与优惠力度</span>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  className="btn btn--default btn--sm"
                  disabled={!canCopyProducts}
                  title={
                    canCopyProducts
                      ? currentHasProducts
                        ? '可将当前组商品复用到其他组，或从其他组复用到当前'
                        : '可从已配置商品的组复用到当前空组'
                      : `至少两个${unitLabel}组，且其中一组已配置参与商品`
                  }
                  onClick={openCopyDialog}
                >
                  复用商品
                </button>
              )}
            </div>
          )}

          {multi && isMemberPriceGroupIncomplete(audienceType, activeGroup, activity.orderTypes) && (
            <div className="mp-group-panel__empty" role="status">
              本组尚未配齐必填项：请完成商品与优惠设置。优惠力度需按{unitLabel}分别填写。
            </div>
          )}

          <MemberPriceProductConfig
            activity={groupToProductCore(activeGroup)}
            readOnly={readOnly}
            showMemberLevels={false}
            priceMethodLabel="会员价优惠方式"
            sceneOrderTypes={activity.orderTypes}
            onToast={onToast}
            onChange={(core) => updateGroupProducts(activeGroup.id, core)}
          />
        </div>
      )}

      {pendingUncheck && (
        <div className="modal-overlay" onClick={() => setPendingUncheck(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h3>取消「{pendingUncheck.label}」？</h3></div>
            <div className="modal__body">
              取消后将删除该{unitLabel}组下已配置的参与商品与优惠，且不可恢复。
            </div>
            <div className="modal__footer">
              <button type="button" className="btn btn--default" onClick={() => setPendingUncheck(null)}>取消</button>
              <button type="button" className="btn btn--danger" onClick={confirmUncheck}>确认取消勾选</button>
            </div>
          </div>
        </div>
      )}

      {copyOpen && activeGroup && (
        <div className="modal-overlay" onClick={() => setCopyOpen(false)}>
          <div className="modal modal--copy" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>复用参与商品</h3>
            </div>
            <div className="modal__body">
              <div className="mp-copy-tip" role="note">
                只复用<strong>参与商品清单</strong>，各组折扣 / 减价请自行填写，不会一并带过去。
              </div>

              {currentHasProducts && otherGroupsWithProducts.length > 0 && (
                <div className="mp-copy-mode" role="radiogroup" aria-label="复用方向">
                  <button
                    type="button"
                    className={`mp-copy-mode__card ${copyMode === 'push' ? 'is-active' : ''}`}
                    onClick={() => {
                      setCopyMode('push')
                      setCopySourceId(activeGroup.id)
                      setCopyTargets(emptyOtherGroups.map((g) => g.id))
                    }}
                  >
                    <strong>复用到其他{unitLabel}</strong>
                    <span>把「{getMemberPriceGroupLabel(audienceType, activeGroup)}」已选商品，复用到下方勾选的{unitLabel}</span>
                  </button>
                  <button
                    type="button"
                    className={`mp-copy-mode__card ${copyMode === 'pull' ? 'is-active' : ''}`}
                    onClick={() => {
                      setCopyMode('pull')
                      setCopySourceId(otherGroupsWithProducts[0]?.id ?? '')
                      setCopyTargets([activeGroup.id])
                    }}
                  >
                    <strong>从其他{unitLabel}复用过来</strong>
                    <span>用已配好商品的{unitLabel}，覆盖「{getMemberPriceGroupLabel(audienceType, activeGroup)}」清单</span>
                  </button>
                </div>
              )}

              {copyMode === 'pull' ? (
                <div className="mp-copy-section">
                  <div className="mp-copy-section__head">
                    <span>从哪个{unitLabel}复用？</span>
                  </div>
                  {otherGroupsWithProducts.length === 0 ? (
                    <p className="field-hint">还没有其他已配商品的{unitLabel}，请先在任一{unitLabel}选好商品。</p>
                  ) : (
                    <div className="mp-copy-options">
                      {otherGroupsWithProducts.map((g, index) => {
                        const label = getMemberPriceGroupLabel(audienceType, g, index)
                        const selected = copySourceId === g.id
                        return (
                          <button
                            key={g.id}
                            type="button"
                            className={`mp-copy-option ${selected ? 'is-selected' : ''}`}
                            onClick={() => setCopySourceId(g.id)}
                          >
                            <span className="mp-copy-option__name">{label}</span>
                            <span className="mp-copy-option__tag is-ready">已有商品</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mp-copy-section">
                  <div className="mp-copy-section__head">
                    <span>复用到哪些{unitLabel}？（可多选）</span>
                    {emptyOtherGroups.length > 0 && (
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => setCopyTargets(emptyOtherGroups.map((g) => g.id))}
                      >
                        一键勾选未配商品的
                      </button>
                    )}
                  </div>
                  <div className="mp-copy-options">
                    {groups.filter((g) => g.id !== activeGroup.id).map((g, index) => {
                      const label = getMemberPriceGroupLabel(audienceType, g, index)
                      const checked = copyTargets.includes(g.id)
                      const hasProducts = memberPriceGroupHasProductConfig(g)
                      return (
                        <button
                          key={g.id}
                          type="button"
                          className={`mp-copy-option ${checked ? 'is-selected' : ''}`}
                          onClick={() => {
                            setCopyTargets((prev) => (
                              checked ? prev.filter((id) => id !== g.id) : [...prev, g.id]
                            ))
                          }}
                        >
                          <span className="mp-copy-option__check" aria-hidden>{checked ? '✓' : ''}</span>
                          <span className="mp-copy-option__name">{label}</span>
                          <span className={`mp-copy-option__tag ${hasProducts ? 'is-warn' : 'is-empty'}`}>
                            {hasProducts ? '将覆盖已有商品' : '尚未选商品'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="modal__footer">
              <button type="button" className="btn btn--default" onClick={() => setCopyOpen(false)}>取消</button>
              <button type="button" className="btn btn--primary" onClick={applyCopyProducts}>
                {copyMode === 'pull' ? '复用到当前' : '确认复用'}
              </button>
            </div>
          </div>
        </div>
      )}

      {audienceTarget && (
        <div className="modal-overlay" onClick={() => setAudienceTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h3>切换优惠会员类型？</h3></div>
            <div className="modal__body">
              切换为「{audienceTargetLabel}」将清空当前已配置的 {groups.length || 1} 组会员与商品优惠。此操作不可撤销。
            </div>
            <div className="modal__footer">
              <button type="button" className="btn btn--default" onClick={() => setAudienceTarget(null)}>取消</button>
              <button type="button" className="btn btn--danger" onClick={() => applyAudienceChange(audienceTarget)}>确认切换</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="form-row">
      <label className="form-label">{required && <span className="required">*</span>}{label}</label>
      <div className="form-control">{children}</div>
    </div>
  )
}
