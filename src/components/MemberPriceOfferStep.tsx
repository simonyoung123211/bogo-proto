import { useEffect, useState } from 'react'
import type { MemberPriceActivityForm, MemberPriceAudienceType, MemberPriceOfferGroup, MemberPriceProductCoreFields } from '../types'
import { createEmptyMemberPriceOfferGroup } from '../mockMemberPriceData'
import {
  MAX_MEMBER_PRICE_GROUPS,
  MEMBER_PRICE_AUDIENCE_OPTIONS,
  applyProductCoreToGroup,
  formatMemberPriceGroupTabSummary,
  formatMemberPriceTargetIds,
  getMemberPriceAllAudienceHint,
  getMemberPriceOfferSchemeLabel,
  getMemberPriceTargetFieldLabel,
  getMemberPriceTargetOptions,
  getTakenMemberPriceTargetIds,
  groupToProductCore,
  isMemberPriceGroupIncomplete,
  needsMemberPriceTargets,
  supportsMemberPriceMultiGroup,
  syncMemberPriceActivityMirrors,
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
  const groups = activity.groups?.length
    ? activity.groups
    : [createEmptyMemberPriceOfferGroup({ targetIds: activity.memberLevels ?? [] })]
  const multi = supportsMemberPriceMultiGroup(audienceType)
  const [innerActiveId, setInnerActiveId] = useState(groups[0]?.id ?? '')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string; summary: string } | null>(null)
  const [audienceTarget, setAudienceTarget] = useState<MemberPriceAudienceType | null>(null)

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

  const applyAudienceChange = (nextType: MemberPriceAudienceType) => {
    const first = groups[0] ?? createEmptyMemberPriceOfferGroup()
    const resetGroup = createEmptyMemberPriceOfferGroup({
      id: first.id,
      priceMethod: first.priceMethod,
      allProductsValue: first.allProductsValue,
      targetIds: [],
    })
    commit({
      ...activity,
      audienceType: nextType,
      groups: [resetGroup],
    })
    setActiveGroupId(resetGroup.id)
    setAudienceTarget(null)
    onToast?.('已切换优惠会员类型，商品与方案已重置为 1 个，请重新配置')
  }

  const requestAudienceChange = (nextType: MemberPriceAudienceType) => {
    if (nextType === audienceType) return
    if (groups.length > 1 || groups.some((g) => g.targetIds.length > 0 || g.productIds.length > 0)) {
      setAudienceTarget(nextType)
      return
    }
    applyAudienceChange(nextType)
  }

  const updateGroups = (nextGroups: MemberPriceOfferGroup[]) => {
    commit({ ...activity, groups: nextGroups })
  }

  const updateGroup = (groupId: string, patch: Partial<MemberPriceOfferGroup>) => {
    updateGroups(groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)))
  }

  const updateGroupProducts = (groupId: string, core: MemberPriceProductCoreFields) => {
    updateGroups(groups.map((g) => (g.id === groupId ? applyProductCoreToGroup(g, core) : g)))
  }

  const toggleTarget = (groupId: string, targetId: string) => {
    const group = groups.find((g) => g.id === groupId)
    if (!group) return
    if (group.targetIds.includes(targetId)) {
      updateGroup(groupId, { targetIds: group.targetIds.filter((id) => id !== targetId) })
      return
    }
    const taken = getTakenMemberPriceTargetIds(groups, groupId)
    if (taken.has(targetId)) {
      onToast?.('该选项已在其他方案中使用，不可重复选择')
      return
    }
    const allOptions = getMemberPriceTargetOptions(audienceType)
    if (allOptions.length > 0 && group.targetIds.length + 1 >= allOptions.length) {
      onToast?.(`不可全选，如需覆盖全部请改选「${getMemberPriceAllAudienceHint(audienceType)}」`)
      return
    }
    updateGroup(groupId, { targetIds: [...group.targetIds, targetId] })
  }

  const addGroup = () => {
    if (!multi || groups.length >= MAX_MEMBER_PRICE_GROUPS) return
    const next = createEmptyMemberPriceOfferGroup()
    updateGroups([...groups, next])
    setActiveGroupId(next.id)
  }

  const removeGroup = (groupId: string) => {
    if (!multi || groups.length <= 1) return
    const next = groups.filter((g) => g.id !== groupId)
    updateGroups(next)
    if (activeGroupId === groupId) setActiveGroupId(next[0]?.id ?? '')
  }

  const confirmRemoveGroup = () => {
    if (!deleteTarget) return
    removeGroup(deleteTarget.id)
    setDeleteTarget(null)
  }

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0]
  const options = getMemberPriceTargetOptions(audienceType)
  const takenByOthers = activeGroup
    ? getTakenMemberPriceTargetIds(groups, activeGroup.id)
    : new Set<string>()
  const incompleteCount = groups.filter((g) =>
    isMemberPriceGroupIncomplete(audienceType, g, activity.orderTypes),
  ).length
  const audienceTargetLabel = audienceTarget
    ? MEMBER_PRICE_AUDIENCE_OPTIONS.find((o) => o.value === audienceTarget)?.label
    : ''

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
            任意已购买付费会员的用户即可享受本活动优惠，无需指定卡模版；与「付费会员价」活动无关。
          </p>
        )}
        {multi && (
          <p className="field-hint">
            当前类型最多 {MAX_MEMBER_PRICE_GROUPS} 个方案；各方案会员子集不可重复、不可全选；方案间商品可重复。同一顾客同时命中多套方案时，点单页按对顾客更优的价格生效（示意口径，非结算试算）。
          </p>
        )}
        {needsMemberPriceTargets(audienceType) && !multi && (
          <p className="field-hint">
            不可全选；如需覆盖全部请改选「{getMemberPriceAllAudienceHint(audienceType)}」。
          </p>
        )}
      </FormRow>

      {multi && (
        <>
          <div className="mp-scheme-overview">
            <span>共 {groups.length} 个方案</span>
            <span className={incompleteCount ? 'is-warn' : 'is-ok'}>
              {incompleteCount ? `${incompleteCount} 个待完善` : '方案已配齐'}
            </span>
            <span className="mp-scheme-overview__current">
              当前：{getMemberPriceOfferSchemeLabel(Math.max(0, groups.findIndex((g) => g.id === activeGroup?.id)))}
            </span>
          </div>
          <div className="mp-group-tabs">
            <div className="mp-group-tabs__list">
              {groups.map((g, index) => {
                const schemeLabel = getMemberPriceOfferSchemeLabel(index)
                const summary = formatMemberPriceGroupTabSummary(audienceType, g.targetIds)
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
                      title={formatMemberPriceTargetIds(audienceType, g.targetIds)}
                    >
                      <span className="mp-group-tabs__name">
                        {schemeLabel}
                        {incomplete && <em className="mp-group-tabs__badge">待完善</em>}
                      </span>
                      {summary ? <span className="mp-group-tabs__summary">{summary}</span> : null}
                    </button>
                    {!readOnly && groups.length > 1 && (
                      <button
                        type="button"
                        className="mp-group-tabs__remove"
                        aria-label={`删除${schemeLabel}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget({
                            id: g.id,
                            label: schemeLabel,
                            summary: formatMemberPriceTargetIds(audienceType, g.targetIds),
                          })
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {!readOnly && (
              <div className="mp-group-tabs__actions">
                <button
                  type="button"
                  className="btn btn--default btn--sm"
                  disabled={groups.length >= MAX_MEMBER_PRICE_GROUPS}
                  onClick={addGroup}
                >
                  添加方案{groups.length >= MAX_MEMBER_PRICE_GROUPS ? `（已满${MAX_MEMBER_PRICE_GROUPS}）` : ''}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {activeGroup && (
        <div className="mp-group-panel" key={activeGroup.id}>
          {multi && (
            <div className="mp-group-panel__title">
              {getMemberPriceOfferSchemeLabel(Math.max(0, groups.findIndex((g) => g.id === activeGroup.id)))}
              <span className="mp-group-panel__meta">
                {activeGroup.targetIds.length
                  ? formatMemberPriceTargetIds(audienceType, activeGroup.targetIds)
                  : '尚未选择会员子集'}
              </span>
            </div>
          )}

          {multi && isMemberPriceGroupIncomplete(audienceType, activeGroup, activity.orderTypes) && (
            <div className="mp-group-panel__empty" role="status">
              本方案尚未配齐必填项：请先选择会员范围，并完成商品与优惠设置。
            </div>
          )}

          {needsMemberPriceTargets(audienceType) && (
            <FormRow label={getMemberPriceTargetFieldLabel(audienceType)} required>
              <div className="member-level-group">
                <div className="checkbox-group checkbox-group--wrap">
                  {options.map((opt) => {
                    const taken = takenByOthers.has(opt.id)
                    const checked = activeGroup.targetIds.includes(opt.id)
                    return (
                      <label
                        key={opt.id}
                        className={`checkbox ${taken && !checked ? 'is-disabled' : ''}`}
                        title={taken && !checked ? '已在其他方案中使用' : undefined}
                      >
                        <input
                          type="checkbox"
                          disabled={readOnly || (taken && !checked)}
                          checked={checked}
                          onChange={() => toggleTarget(activeGroup.id, opt.id)}
                        />
                        {opt.label}
                        {taken && !checked ? <span className="mp-target-taken">（已占用）</span> : null}
                      </label>
                    )
                  })}
                </div>
              </div>
            </FormRow>
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

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h3>确认删除{deleteTarget.label}？</h3></div>
            <div className="modal__body">
              删除后该方案下的会员范围与商品优惠配置将一并清除，且不可恢复。
              {deleteTarget.summary !== '未选择' ? `（当前适用：${deleteTarget.summary}）` : ''}
            </div>
            <div className="modal__footer">
              <button type="button" className="btn btn--default" onClick={() => setDeleteTarget(null)}>取消</button>
              <button type="button" className="btn btn--danger" onClick={confirmRemoveGroup}>确认删除</button>
            </div>
          </div>
        </div>
      )}

      {audienceTarget && (
        <div className="modal-overlay" onClick={() => setAudienceTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h3>切换优惠会员类型？</h3></div>
            <div className="modal__body">
              切换为「{audienceTargetLabel}」将清空当前已配置的 {groups.length} 个方案（会员范围与商品优惠），并重置为 1 个空方案。此操作不可撤销。
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
