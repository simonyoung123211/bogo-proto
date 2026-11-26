import { useEffect, useState } from 'react'
import type {
  MemberPriceActivityForm,
  MemberPriceAudienceType,
  MemberPriceOfferGroup,
  MemberPricePaymentAmountLimit,
  MemberPricePaymentLimitType,
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
  getMemberPricePaymentDefaultsForAudience,
  getMemberPricePaymentMethodOptionsForAudience,
  getMemberPriceTargetFieldLabel,
  getMemberPriceTargetOptions,
  groupToProductCore,
  isMemberPriceGroupIncomplete,
  isMemberPricePhysicalCardAudience,
  isMemberPriceStoredValueAudience,
  memberPriceGroupHasProductConfig,
  needsMemberPriceTargets,
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
  const needsTargets = needsMemberPriceTargets(audienceType)
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

  const isPhysicalCardAudience = isMemberPricePhysicalCardAudience(audienceType)
  const isStoredValueAudience = isMemberPriceStoredValueAudience(audienceType)
  const paymentLimitType: MemberPricePaymentLimitType = activity.paymentLimitType ?? 'unlimited'
  const paymentMethodIds = activity.paymentMethodIds ?? []
  const paymentAmountLimit: MemberPricePaymentAmountLimit = activity.paymentAmountLimit ?? 'any'
  const paymentLimited = paymentLimitType === 'limited'
  const paymentMethodOptions = getMemberPricePaymentMethodOptionsForAudience(audienceType)
  const allowedPaymentMethodIds = new Set(paymentMethodOptions.map((o) => o.id))

  /** 实体卡：支付方式固定「限制 · 实体卡」，不可改 */
  const withFixedPhysicalCardPayment = (
    next: MemberPriceActivityForm,
  ): MemberPriceActivityForm => ({
    ...next,
    paymentLimitType: DEFAULT_MEMBER_PRICE_PAYMENT.paymentLimitType,
    paymentMethodIds: [...DEFAULT_MEMBER_PRICE_PAYMENT.paymentMethodIds],
    paymentAmountLimit: next.paymentAmountLimit ?? DEFAULT_MEMBER_PRICE_PAYMENT.paymentAmountLimit,
  })

  useEffect(() => {
    if (readOnly) return
    if (isPhysicalCardAudience) {
      const limitOk = activity.paymentLimitType === DEFAULT_MEMBER_PRICE_PAYMENT.paymentLimitType
      const methodsOk =
        JSON.stringify(activity.paymentMethodIds ?? [])
        === JSON.stringify(DEFAULT_MEMBER_PRICE_PAYMENT.paymentMethodIds)
      if (limitOk && methodsOk) return
      commit(withFixedPhysicalCardPayment(activity))
      return
    }
    // 储值会员开启限制后：唯一枚举「储值余额」必须勾选
    if (isStoredValueAudience && paymentLimited) {
      const locked = ['stored_balance']
      if (JSON.stringify(activity.paymentMethodIds ?? []) === JSON.stringify(locked)) return
      commit({ ...activity, paymentMethodIds: locked })
      return
    }
    // 其他受众：剔除掉当前不允许的支付方式（如储值场景下的「实体卡」）
    const currentIds = activity.paymentMethodIds ?? []
    const nextIds = currentIds.filter((id) => allowedPaymentMethodIds.has(id))
    if (nextIds.length === currentIds.length) return
    commit({
      ...activity,
      paymentMethodIds: nextIds.length
        ? nextIds
        : (paymentLimited ? [paymentMethodOptions[0]?.id].filter(Boolean) as string[] : []),
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- sync payment methods with audience constraints
  }, [
    isPhysicalCardAudience,
    isStoredValueAudience,
    audienceType,
    activity.paymentLimitType,
    activity.paymentMethodIds?.join(','),
    readOnly,
  ])

  const applyAudienceChange = (nextType: MemberPriceAudienceType) => {
    const resetGroup = createEmptyMemberPriceOfferGroup()
    const nextMulti = supportsMemberPriceMultiGroup(nextType)
    const nextNeedsTargets = needsMemberPriceTargets(nextType)
    const paymentDefaults = getMemberPricePaymentDefaultsForAudience(nextType)
    commit({
      ...activity,
      audienceType: nextType,
      groups: nextMulti ? [] : [resetGroup],
      ...paymentDefaults,
    })
    setActiveGroupId(nextMulti ? '' : resetGroup.id)
    setAudienceTarget(null)
    const label = getMemberPriceAudienceLabel(nextType)
    const nextUnit = getMemberPriceGroupUnitLabel(nextType)
    onToast?.(
      nextMulti
        ? `已切换为「${label}」，请重新选择${nextUnit}`
        : nextNeedsTargets
          ? `已切换为「${label}」，请选择${nextUnit}后配置商品`
          : '已切换优惠会员类型，商品配置已重置，请重新配置',
    )
  }

  const setPaymentLimitType = (next: MemberPricePaymentLimitType) => {
    if (isPhysicalCardAudience) return
    if (next === 'unlimited') {
      commit({
        ...activity,
        paymentLimitType: 'unlimited',
        paymentMethodIds: [],
        paymentAmountLimit: 'any',
      })
      return
    }
    commit({
      ...activity,
      paymentLimitType: 'limited',
      // 储值会员仅一个枚举，开启限制后强制勾选
      paymentMethodIds: isStoredValueAudience
        ? ['stored_balance']
        : (paymentMethodIds.length ? paymentMethodIds : ['stored_balance']),
      paymentAmountLimit: activity.paymentAmountLimit ?? 'any',
    })
  }

  const togglePaymentMethod = (methodId: string) => {
    if (isPhysicalCardAudience) return
    // 储值会员限制态下唯一枚举不可取消
    if (isStoredValueAudience && paymentLimited) return
    const checked = paymentMethodIds.includes(methodId)
    const nextIds = checked
      ? paymentMethodIds.filter((id) => id !== methodId)
      : [...paymentMethodIds, methodId]
    commit({ ...activity, paymentMethodIds: nextIds })
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

  /** 指定实体卡：多选挂在同一组，不拆组 */
  const toggleSharedTargets = (targetId: string) => {
    const group = groups[0] ?? createEmptyMemberPriceOfferGroup()
    const checked = group.targetIds.includes(targetId)
    if (checked) {
      updateGroups([{ ...group, targetIds: group.targetIds.filter((id) => id !== targetId) }], group.id)
      return
    }
    if (group.targetIds.length >= maxGroups) {
      onToast?.(`最多选择 ${maxGroups} 个${unitLabel}`)
      return
    }
    updateGroups([{ ...group, targetIds: [...group.targetIds, targetId] }], group.id)
  }

  const toggleTarget = (targetId: string) => {
    if (readOnly) return
    if (!multi) {
      toggleSharedTargets(targetId)
      return
    }
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
      const result = copyMemberPriceGroupProducts(source, activeGroup)
      updateGroups(groups.map((g) => (g.id === activeGroup.id ? result.group : g)))
      setCopyOpen(false)
      onToast?.(
        result.modeMismatch
          ? '已同步商品，本组正选/反选与优惠方式不变'
          : `已复用「${getMemberPriceGroupLabel(audienceType, source)}」的商品，请确认优惠力度`,
      )
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
    let modeMismatch = false
    updateGroups(groups.map((g) => {
      if (!targetSet.has(g.id)) return g
      const result = copyMemberPriceGroupProducts(source, g)
      if (result.modeMismatch) modeMismatch = true
      return result.group
    }))
    setCopyOpen(false)
    onToast?.(
      modeMismatch
        ? `已同步到 ${copyTargets.length} 个${unitLabel}，各组正选/反选与优惠方式不变`
        : `已复用到 ${copyTargets.length} 个${unitLabel}，请到各组确认优惠力度`,
    )
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
        {needsTargets && !multi && (
          <p className="field-hint">
            可多选{unitLabel}，共用一套商品与优惠，不再按卡模版拆组。
          </p>
        )}
      </FormRow>

      {needsTargets && (
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
              {selectedTargetIds.length === 0
                ? `，请先选择后再配置商品优惠`
                : multi
                  ? ''
                  : '，所选共用下方同一套规则'}
            </p>
          </div>
        </FormRow>
      )}

      <FormRow label="支付限制" required>
        <div>
          {isPhysicalCardAudience ? (
            <>
              <div className="radio-group">
                <label className="radio">
                  <input type="radio" checked disabled readOnly />
                  限制
                </label>
              </div>
              <div className="checkbox-group checkbox-group--wrap" style={{ marginTop: 10 }}>
                <label className="checkbox">
                  <input type="checkbox" checked disabled readOnly />
                  实体卡
                </label>
              </div>
              <p className="field-hint">
                实体卡付款用户固定限制使用「实体卡」支付，不可改为不限或其他支付方式。
              </p>
            </>
          ) : (
            <>
              <div className="radio-group">
                <label className="radio">
                  <input
                    type="radio"
                    disabled={readOnly}
                    checked={!paymentLimited}
                    onChange={() => setPaymentLimitType('unlimited')}
                  />
                  不限
                </label>
                <label className="radio">
                  <input
                    type="radio"
                    disabled={readOnly}
                    checked={paymentLimited}
                    onChange={() => setPaymentLimitType('limited')}
                  />
                  限制
                </label>
              </div>
              {paymentLimited && (
                <div className="checkbox-group checkbox-group--wrap" style={{ marginTop: 10 }}>
                  {paymentMethodOptions.map((opt) => {
                    const lockedOnlyOption = isStoredValueAudience && paymentMethodOptions.length === 1
                    return (
                      <label key={opt.id} className="checkbox">
                        <input
                          type="checkbox"
                          disabled={readOnly || lockedOnlyOption}
                          checked={lockedOnlyOption || paymentMethodIds.includes(opt.id)}
                          onChange={() => togglePaymentMethod(opt.id)}
                        />
                        {opt.label}
                      </label>
                    )
                  })}
                </div>
              )}
              <p className="field-hint">
                {paymentLimited
                  ? isStoredValueAudience
                    ? '储值会员开启限制后固定使用「储值余额」，不可取消。小程序下单须使用储值余额支付，且需同时满足订单优惠后价格与储值可用余额条件（如充10送10规则）。'
                    : '限制后，小程序下单须使用勾选的支付方式之一才可参与。勾选储值余额时，还需同时满足订单优惠后价格与储值可用余额条件（如充10送10规则）。'
                  : '不限制支付方式，顾客使用任意支付方式均可享受会员价。'}
              </p>
            </>
          )}
        </div>
      </FormRow>

      {(isPhysicalCardAudience || paymentLimited) && (
        <FormRow label="支付金额限制" required>
          <div className="radio-group radio-group--vertical">
            <label className="radio">
              <input
                type="radio"
                disabled={readOnly}
                checked={paymentAmountLimit === 'any'}
                onChange={() => commit(
                  isPhysicalCardAudience
                    ? withFixedPhysicalCardPayment({ ...activity, paymentAmountLimit: 'any' })
                    : { ...activity, paymentAmountLimit: 'any' },
                )}
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
                onChange={() => commit(
                  isPhysicalCardAudience
                    ? withFixedPhysicalCardPayment({ ...activity, paymentAmountLimit: 'full_order' })
                    : { ...activity, paymentAmountLimit: 'full_order' },
                )}
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

      {activeGroup && (!needsTargets || selectedTargetIds.length > 0) && (
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
                只同步<strong>商品清单</strong>，不带入优惠方式与正选/反选；各组力度请自行确认。
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
