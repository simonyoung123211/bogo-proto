import { useCallback, useEffect, useState } from 'react'
import { Toast } from './components/Toast'
import { AdminLayout } from './layout/AdminLayout'
import { ActivityList } from './pages/ActivityList'
import { ActivityParticipationRecords } from './pages/ActivityParticipationRecords'
import { ActivityWizard } from './pages/ActivityWizard'
import { FullReductionActivityList } from './pages/FullReductionActivityList'
import { FullReductionActivityWizard } from './pages/FullReductionActivityWizard'
import { FullReductionParticipationRecords } from './pages/FullReductionParticipationRecords'
import { DeliveryFeeActivityList } from './pages/DeliveryFeeActivityList'
import { DeliveryFeeActivityWizard } from './pages/DeliveryFeeActivityWizard'
import { MemberPriceActivityList } from './pages/MemberPriceActivityList'
import { MemberPriceActivityWizard } from './pages/MemberPriceActivityWizard'
import { MemberPriceGeneralSettingsPage } from './pages/MemberPriceGeneralSettings'
import { MemberPriceParticipationRecords } from './pages/MemberPriceParticipationRecords'
import { MultiItemActivityList } from './pages/MultiItemActivityList'
import { MultiItemActivityWizard } from './pages/MultiItemActivityWizard'
import { MultiItemParticipationRecords } from './pages/MultiItemParticipationRecords'
import { PaidMemberCardList } from './pages/PaidMemberCardList'
import { PaidMemberPriceActivityList } from './pages/PaidMemberPriceActivityList'
import { PaidMemberPriceActivityWizard } from './pages/PaidMemberPriceActivityWizard'
import { StoredValuePayActivityList } from './pages/StoredValuePayActivityList'
import { StoredValuePayActivityWizard } from './pages/StoredValuePayActivityWizard'
import { StoredValuePayParticipationRecords } from './pages/StoredValuePayParticipationRecords'
import { EnterpriseDiscountActivityList } from './pages/EnterpriseDiscountActivityList'
import { EnterpriseDiscountActivityWizard } from './pages/EnterpriseDiscountActivityWizard'
import { EnterpriseDiscountParticipationRecords } from './pages/EnterpriseDiscountParticipationRecords'
import { OrderList } from './pages/OrderList'
import { OrderDetail } from './pages/OrderDetail'
import { createEmptyActivity, getCreatorProfile } from './mockData'
import { createEmptyFullReductionActivity } from './mockFullReductionData'
import { createEmptyDeliveryFeeActivity } from './mockDeliveryFeeData'
import { createEmptyMemberPriceActivity } from './mockMemberPriceData'
import { createEmptyMultiItemActivity } from './mockMultiItemData'
import { createEmptyPaidMemberPriceActivity } from './mockPaidMemberPriceData'
import { createEmptyStoredValuePayActivity } from './mockStoredValuePayData'
import { createEmptyEnterpriseDiscountActivity } from './mockEnterpriseDiscountData'
import type {
  ActivityForm,
  DeliveryFeeActivityForm,
  FullReductionActivityForm,
  MemberPriceActivityForm,
  MultiItemActivityForm,
  PageView,
  PaidMemberCardTemplate,
  PaidMemberPriceActivityForm,
  PaidMemberPriceBenefit,
  EnterpriseDiscountActivityForm,
  StoredValuePayActivityForm,
} from './types'
import { appendActivityLog, cloneActivity, computePublishStatus, formatActivityDateTime } from './utils/activity'
import {
  isPausedExpired,
  resolveResumeStatus,
  type PausableActivity,
} from './utils/activityPause'
import {
  appendActivityLog as appendFullReductionLog,
  cloneActivity as cloneFullReductionActivity,
  computePublishStatus as computeFullReductionPublishStatus,
} from './utils/fullReductionActivity'
import {
  appendActivityLog as appendDeliveryFeeLog,
  cloneActivity as cloneDeliveryFeeActivity,
  computePublishStatus as computeDeliveryFeePublishStatus,
  validateBeforeSave as validateDeliveryFeeBeforeSave,
} from './utils/deliveryFeeActivity'
import {
  appendActivityLog as appendMemberPriceLog,
  cloneActivity as cloneMemberPriceActivity,
  computePublishStatus as computeMemberPricePublishStatus,
} from './utils/memberPriceActivity'
import {
  appendActivityLog as appendMultiItemLog,
  cloneActivity as cloneMultiItemActivity,
  computePublishStatus as computeMultiItemPublishStatus,
} from './utils/multiItemActivity'
import {
  cloneActivity as clonePaidMemberPriceActivity,
  findPriceDisadvantages,
  formatDuration as formatPauseDuration,
  getPauseInfo,
  resolvePublishStatus,
  validateBeforeSave as validatePaidMemberPriceBeforeSave,
  validateDraftSave as validatePaidMemberPriceDraftSave,
} from './utils/paidMemberPriceActivity'
import {
  appendActivityLog as appendStoredValuePayLog,
  cloneActivity as cloneStoredValuePayActivity,
  computePublishStatus as computeStoredValuePayPublishStatus,
} from './utils/storedValuePayActivity'
import {
  appendActivityLog as appendEnterpriseDiscountLog,
  cloneActivity as cloneEnterpriseDiscountActivity,
  computePublishStatus as computeEnterpriseDiscountPublishStatus,
} from './utils/enterpriseDiscountActivity'
import {
  loadActivities,
  loadDeliveryFeeActivities,
  loadFullReductionActivities,
  loadMemberPriceActivities,
  loadMultiItemActivities,
  loadPaidMemberCards,
  loadPaidMemberPriceActivities,
  loadEnterpriseDiscountActivities,
  loadStoredValuePayActivities,
  saveActivities,
  saveDeliveryFeeActivities,
  saveFullReductionActivities,
  saveMemberPriceActivities,
  saveMultiItemActivities,
  savePaidMemberCards,
  savePaidMemberPriceActivities,
  saveEnterpriseDiscountActivities,
  saveStoredValuePayActivities,
} from './utils/storage'
import {
  getDemoBridgeSourceId,
  pushDemoBogoBridge,
  setDemoBridgeSourceId,
  syncLinkedBogoIfNeeded,
} from './utils/demoBogoBridge'
import { applyStoreClosedCleanup, resolveStoreConfigIssue } from './utils/storeClosure'
import {
  buildClosureInboxMessages,
  countUnreadInbox,
  loadInboxMessages,
  prependInboxMessages,
  saveInboxMessages,
  type InboxMessage,
} from './utils/inbox'
import { InboxDrawer } from './components/InboxDrawer'
import './styles.css'

function App() {
  const [activities, setActivities] = useState<ActivityForm[]>(loadActivities)
  const [multiItemActivities, setMultiItemActivities] = useState<MultiItemActivityForm[]>(loadMultiItemActivities)
  const [memberPriceActivities, setMemberPriceActivities] = useState<MemberPriceActivityForm[]>(loadMemberPriceActivities)
  const [fullReductionActivities, setFullReductionActivities] = useState<FullReductionActivityForm[]>(loadFullReductionActivities)
  const [deliveryFeeActivities, setDeliveryFeeActivities] = useState<DeliveryFeeActivityForm[]>(loadDeliveryFeeActivities)
  const [paidMemberPriceActivities, setPaidMemberPriceActivities] = useState<PaidMemberPriceActivityForm[]>(loadPaidMemberPriceActivities)
  const [storedValuePayActivities, setStoredValuePayActivities] = useState<StoredValuePayActivityForm[]>(loadStoredValuePayActivities)
  const [enterpriseDiscountActivities, setEnterpriseDiscountActivities] = useState<EnterpriseDiscountActivityForm[]>(loadEnterpriseDiscountActivities)
  const [paidMemberCards, setPaidMemberCards] = useState<PaidMemberCardTemplate[]>(loadPaidMemberCards)
  const [view, setView] = useState<PageView>({ type: 'list' })
  /** 买1送N 参与记录的活动范围，空数组表示全部活动；提到这里是为了从订单详情返回时不丢失所选活动 */
  const [participationScope, setParticipationScope] = useState<string[]>([])
  const [draft, setDraft] = useState<ActivityForm | null>(null)
  const [multiItemDraft, setMultiItemDraft] = useState<MultiItemActivityForm | null>(null)
  const [memberPriceDraft, setMemberPriceDraft] = useState<MemberPriceActivityForm | null>(null)
  const [fullReductionDraft, setFullReductionDraft] = useState<FullReductionActivityForm | null>(null)
  const [deliveryFeeDraft, setDeliveryFeeDraft] = useState<DeliveryFeeActivityForm | null>(null)
  const [paidMemberPriceDraft, setPaidMemberPriceDraft] = useState<PaidMemberPriceActivityForm | null>(null)
  const [storedValuePayDraft, setStoredValuePayDraft] = useState<StoredValuePayActivityForm | null>(null)
  const [enterpriseDiscountDraft, setEnterpriseDiscountDraft] = useState<EnterpriseDiscountActivityForm | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [linkedConsumerActivityId, setLinkedConsumerActivityId] = useState<string | null>(() => getDemoBridgeSourceId())
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>(() => loadInboxMessages())
  const [inboxOpen, setInboxOpen] = useState(false)

  const showToast = useCallback((msg: string) => setToast(msg), [])
  const currentOperator = getCreatorProfile('10086')
  const inboxUnread = countUnreadInbox(inboxMessages, '10086')

  const persistInbox = (next: InboxMessage[]) => {
    setInboxMessages(next)
    saveInboxMessages(next)
  }

  const handleSimulateStoreClosure = (storeId: string) => {
    const result = applyStoreClosedCleanup(activities, storeId)
    if (!result) {
      showToast('未找到该门店')
      return
    }
    persist(result.activities)
    const inboxItems = result.newlyFailed
      .filter((a): a is typeof a & { enteredIssue: 'S1' | 'S2' } => a.enteredIssue === 'S1' || a.enteredIssue === 'S2')
      .map((a) => ({
        activityId: a.activityId,
        activityName: a.activityName,
        creator: a.creator,
        issue: a.enteredIssue,
      }))
    const msgs = buildClosureInboxMessages(result.store.name, inboxItems)
    if (msgs.length > 0) persistInbox(prependInboxMessages(inboxMessages, msgs))
    const failCount = result.newlyFailed.length
    showToast(
      `已将「${result.store.name}」标为已停业，清理 ${result.affected.length} 个活动`
      + (failCount ? `，${failCount} 个已自动暂停并已发站内信` : ''),
    )
  }

  const persist = (next: ActivityForm[]) => {
    setActivities(next)
    saveActivities(next)
    void syncLinkedBogoIfNeeded(next).catch((err) => {
      console.warn('[demo-bogo-bridge] sync failed', err)
    })
  }

  const handleLinkConsumerDemo = async (id: string) => {
    const activity = activities.find((a) => a.id === id)
    if (!activity || activity.ruleType !== 'buyA_getB') {
      showToast('仅买A送B活动可关联消费者端 Demo')
      return
    }
    try {
      await pushDemoBogoBridge(activity)
      setDemoBridgeSourceId(activity.id)
      setLinkedConsumerActivityId(activity.id)
      showToast(`已关联消费者端买A送B（${activity.id} → act-bogo-001），保存后实时同步`)
    } catch (err) {
      console.warn(err)
      showToast('同步失败：请确认商家端已启动且桥接 API 可用')
    }
  }

  const handleUnlinkConsumerDemo = () => {
    setDemoBridgeSourceId(null)
    setLinkedConsumerActivityId(null)
    showToast('已取消与消费者端 Demo 的关联')
  }

  const persistMultiItem = (next: MultiItemActivityForm[]) => {
    setMultiItemActivities(next)
    saveMultiItemActivities(next)
  }

  const persistMemberPrice = (next: MemberPriceActivityForm[]) => {
    setMemberPriceActivities(next)
    saveMemberPriceActivities(next)
  }

  const persistStoredValuePay = (next: StoredValuePayActivityForm[]) => {
    setStoredValuePayActivities(next)
    saveStoredValuePayActivities(next)
  }

  const persistEnterpriseDiscount = (next: EnterpriseDiscountActivityForm[]) => {
    setEnterpriseDiscountActivities(next)
    saveEnterpriseDiscountActivities(next)
  }

  const persistFullReduction = (next: FullReductionActivityForm[]) => {
    setFullReductionActivities(next)
    saveFullReductionActivities(next)
  }

  const persistDeliveryFee = (next: DeliveryFeeActivityForm[]) => {
    setDeliveryFeeActivities(next)
    saveDeliveryFeeActivities(next)
  }

  const persistPaidMemberPrice = (next: PaidMemberPriceActivityForm[]) => {
    setPaidMemberPriceActivities(next)
    savePaidMemberPriceActivities(next)
  }

  const persistPaidMemberCards = (next: PaidMemberCardTemplate[]) => {
    setPaidMemberCards(next)
    savePaidMemberCards(next)
  }

  const upsert = (activity: ActivityForm) => {
    const exists = activities.some((a) => a.id === activity.id)
    const next = exists
      ? activities.map((a) => (a.id === activity.id ? activity : a))
      : [activity, ...activities]
    persist(next)
  }

  const upsertMultiItem = (activity: MultiItemActivityForm) => {
    const exists = multiItemActivities.some((a) => a.id === activity.id)
    const next = exists
      ? multiItemActivities.map((a) => (a.id === activity.id ? activity : a))
      : [activity, ...multiItemActivities]
    persistMultiItem(next)
  }

  const upsertMemberPrice = (activity: MemberPriceActivityForm) => {
    const exists = memberPriceActivities.some((a) => a.id === activity.id)
    const next = exists
      ? memberPriceActivities.map((a) => (a.id === activity.id ? activity : a))
      : [activity, ...memberPriceActivities]
    persistMemberPrice(next)
  }

  const upsertStoredValuePay = (activity: StoredValuePayActivityForm) => {
    const exists = storedValuePayActivities.some((a) => a.id === activity.id)
    const next = exists
      ? storedValuePayActivities.map((a) => (a.id === activity.id ? activity : a))
      : [activity, ...storedValuePayActivities]
    persistStoredValuePay(next)
  }

  const upsertEnterpriseDiscount = (activity: EnterpriseDiscountActivityForm) => {
    const exists = enterpriseDiscountActivities.some((a) => a.id === activity.id)
    const next = exists
      ? enterpriseDiscountActivities.map((a) => (a.id === activity.id ? activity : a))
      : [activity, ...enterpriseDiscountActivities]
    persistEnterpriseDiscount(next)
  }

  const upsertPaidMemberPrice = (activity: PaidMemberPriceActivityForm) => {
    const exists = paidMemberPriceActivities.some((a) => a.id === activity.id)
    const next = exists
      ? paidMemberPriceActivities.map((a) => (a.id === activity.id ? activity : a))
      : [activity, ...paidMemberPriceActivities]
    persistPaidMemberPrice(next)
  }

  const upsertFullReduction = (activity: FullReductionActivityForm) => {
    const exists = fullReductionActivities.some((a) => a.id === activity.id)
    const next = exists
      ? fullReductionActivities.map((a) => (a.id === activity.id ? activity : a))
      : [activity, ...fullReductionActivities]
    persistFullReduction(next)
  }

  const upsertDeliveryFee = (activity: DeliveryFeeActivityForm) => {
    const exists = deliveryFeeActivities.some((a) => a.id === activity.id)
    const next = exists
      ? deliveryFeeActivities.map((a) => (a.id === activity.id ? activity : a))
      : [activity, ...deliveryFeeActivities]
    persistDeliveryFee(next)
  }

  const handleCreate = () => {
    setDraft(createEmptyActivity())
    setView({ type: 'wizard', mode: 'create' })
  }

  const handleMultiItemCreate = () => {
    setMultiItemDraft(createEmptyMultiItemActivity())
    setView({ type: 'multi-item-wizard', mode: 'create' })
  }

  const handleMemberPriceCreate = () => {
    setMemberPriceDraft(createEmptyMemberPriceActivity())
    setView({ type: 'member-price-wizard', mode: 'create' })
  }

  const handleStoredValuePayCreate = () => {
    setStoredValuePayDraft(createEmptyStoredValuePayActivity())
    setView({ type: 'stored-value-pay-wizard', mode: 'create' })
  }

  const handleEnterpriseDiscountCreate = () => {
    setEnterpriseDiscountDraft(createEmptyEnterpriseDiscountActivity())
    setView({ type: 'enterprise-discount-wizard', mode: 'create' })
  }

  const handleFullReductionCreate = () => {
    setFullReductionDraft(createEmptyFullReductionActivity())
    setView({ type: 'full-reduction-wizard', mode: 'create' })
  }

  const handleDeliveryFeeCreate = () => {
    setDeliveryFeeDraft(createEmptyDeliveryFeeActivity())
    setView({ type: 'delivery-fee-wizard', mode: 'create' })
  }

  const handleEdit = (id: string) => {
    const activity = activities.find((a) => a.id === id)
    if (!activity) return
    setDraft({ ...activity })
    setView({ type: 'wizard', mode: 'edit' })
  }

  const handleMultiItemEdit = (id: string) => {
    const activity = multiItemActivities.find((a) => a.id === id)
    if (!activity) return
    setMultiItemDraft({ ...activity })
    setView({ type: 'multi-item-wizard', mode: 'edit' })
  }

  const handleMemberPriceEdit = (id: string) => {
    const activity = memberPriceActivities.find((a) => a.id === id)
    if (!activity) return
    setMemberPriceDraft({ ...activity })
    setView({ type: 'member-price-wizard', mode: 'edit' })
  }

  const handleStoredValuePayEdit = (id: string) => {
    const activity = storedValuePayActivities.find((a) => a.id === id)
    if (!activity) return
    setStoredValuePayDraft({ ...activity })
    setView({ type: 'stored-value-pay-wizard', mode: 'edit' })
  }

  const handleEnterpriseDiscountEdit = (id: string) => {
    const activity = enterpriseDiscountActivities.find((a) => a.id === id)
    if (!activity) return
    setEnterpriseDiscountDraft({ ...activity })
    setView({ type: 'enterprise-discount-wizard', mode: 'edit' })
  }

  const handleFullReductionEdit = (id: string) => {
    const activity = fullReductionActivities.find((a) => a.id === id)
    if (!activity) return
    setFullReductionDraft({ ...activity })
    setView({ type: 'full-reduction-wizard', mode: 'edit' })
  }

  const handleDeliveryFeeEdit = (id: string) => {
    const activity = deliveryFeeActivities.find((a) => a.id === id)
    if (!activity) return
    setDeliveryFeeDraft({ ...activity })
    setView({ type: 'delivery-fee-wizard', mode: 'edit' })
  }

  const handleView = (id: string) => {
    const activity = activities.find((a) => a.id === id)
    if (activity) {
      setDraft({ ...activity })
      setView({ type: 'wizard', mode: 'view' })
      return
    }
    const multiItemActivity = multiItemActivities.find((a) => a.id === id)
    if (multiItemActivity) {
      setMultiItemDraft({ ...multiItemActivity })
      setView({ type: 'multi-item-wizard', mode: 'view' })
      return
    }
    const memberPriceActivity = memberPriceActivities.find((a) => a.id === id)
    if (memberPriceActivity) {
      setMemberPriceDraft({ ...memberPriceActivity })
      setView({ type: 'member-price-wizard', mode: 'view' })
      return
    }
    const fullReductionActivity = fullReductionActivities.find((a) => a.id === id)
    if (fullReductionActivity) {
      setFullReductionDraft({ ...fullReductionActivity })
      setView({ type: 'full-reduction-wizard', mode: 'view' })
    }
  }

  const handleMultiItemView = (id: string) => {
    const activity = multiItemActivities.find((a) => a.id === id)
    if (!activity) return
    setMultiItemDraft({ ...activity })
    setView({ type: 'multi-item-wizard', mode: 'view' })
  }

  const handleMemberPriceView = (id: string) => {
    const activity = memberPriceActivities.find((a) => a.id === id)
    if (!activity) return
    setMemberPriceDraft({ ...activity })
    setView({ type: 'member-price-wizard', mode: 'view' })
  }

  const handleStoredValuePayView = (id: string) => {
    const activity = storedValuePayActivities.find((a) => a.id === id)
    if (!activity) return
    setStoredValuePayDraft({ ...activity })
    setView({ type: 'stored-value-pay-wizard', mode: 'view' })
  }

  const handleEnterpriseDiscountView = (id: string) => {
    const activity = enterpriseDiscountActivities.find((a) => a.id === id)
    if (!activity) return
    setEnterpriseDiscountDraft({ ...activity })
    setView({ type: 'enterprise-discount-wizard', mode: 'view' })
  }

  const handleFullReductionView = (id: string) => {
    const activity = fullReductionActivities.find((a) => a.id === id)
    if (!activity) return
    setFullReductionDraft({ ...activity })
    setView({ type: 'full-reduction-wizard', mode: 'view' })
  }

  const handleDeliveryFeeView = (id: string) => {
    const activity = deliveryFeeActivities.find((a) => a.id === id)
    if (!activity) return
    setDeliveryFeeDraft({ ...activity })
    setView({ type: 'delivery-fee-wizard', mode: 'view' })
  }

  const handleCopy = (id: string) => {
    const activity = activities.find((a) => a.id === id)
    if (!activity) return
    const copy = cloneActivity(activity)
    persist([copy, ...activities])
    setDraft(copy)
    setView({ type: 'wizard', mode: 'copy' })
    showToast('已复制活动，请编辑后保存')
  }

  const handleMultiItemCopy = (id: string) => {
    const activity = multiItemActivities.find((a) => a.id === id)
    if (!activity) return
    const copy = cloneMultiItemActivity(activity)
    persistMultiItem([copy, ...multiItemActivities])
    setMultiItemDraft(copy)
    setView({ type: 'multi-item-wizard', mode: 'copy' })
    showToast('已复制活动，请编辑后保存')
  }

  const handleMemberPriceCopy = (id: string) => {
    const activity = memberPriceActivities.find((a) => a.id === id)
    if (!activity) return
    const copy = cloneMemberPriceActivity(activity)
    persistMemberPrice([copy, ...memberPriceActivities])
    setMemberPriceDraft(copy)
    setView({ type: 'member-price-wizard', mode: 'copy' })
    showToast('已复制活动，请编辑后保存')
  }

  const handleStoredValuePayCopy = (id: string) => {
    const activity = storedValuePayActivities.find((a) => a.id === id)
    if (!activity) return
    const copy = cloneStoredValuePayActivity(activity)
    persistStoredValuePay([copy, ...storedValuePayActivities])
    setStoredValuePayDraft(copy)
    setView({ type: 'stored-value-pay-wizard', mode: 'copy' })
    showToast('已复制活动，请编辑后保存')
  }

  const handleEnterpriseDiscountCopy = (id: string) => {
    const activity = enterpriseDiscountActivities.find((a) => a.id === id)
    if (!activity) return
    const copy = cloneEnterpriseDiscountActivity(activity)
    persistEnterpriseDiscount([copy, ...enterpriseDiscountActivities])
    setEnterpriseDiscountDraft(copy)
    setView({ type: 'enterprise-discount-wizard', mode: 'copy' })
    showToast('已复制活动，请编辑后保存')
  }

  const handleFullReductionCopy = (id: string) => {
    const activity = fullReductionActivities.find((a) => a.id === id)
    if (!activity) return
    const copy = cloneFullReductionActivity(activity)
    persistFullReduction([copy, ...fullReductionActivities])
    setFullReductionDraft(copy)
    setView({ type: 'full-reduction-wizard', mode: 'copy' })
    showToast('已复制活动，请编辑后保存')
  }

  const handleDeliveryFeeCopy = (id: string) => {
    const activity = deliveryFeeActivities.find((a) => a.id === id)
    if (!activity) return
    const copy = cloneDeliveryFeeActivity(activity)
    persistDeliveryFee([copy, ...deliveryFeeActivities])
    setDeliveryFeeDraft(copy)
    setView({ type: 'delivery-fee-wizard', mode: 'copy' })
    showToast('已复制活动，请编辑后保存')
  }

  const handlePublishFromList = (id: string) => {
    const activity = activities.find((a) => a.id === id)
    if (!activity) return
    upsert(appendActivityLog(
      { ...activity, status: computePublishStatus(activity) },
      '发布活动',
      `发布活动「${activity.name}」`,
      currentOperator,
    ))
    showToast('活动发布成功')
  }

  const handleMultiItemPublishFromList = (id: string) => {
    const activity = multiItemActivities.find((a) => a.id === id)
    if (!activity) return
    upsertMultiItem(appendMultiItemLog(
      { ...activity, status: computeMultiItemPublishStatus(activity) },
      '发布活动',
      `发布活动「${activity.name}」`,
      currentOperator,
    ))
    showToast('活动发布成功')
  }

  const handleMemberPricePublishFromList = (id: string) => {
    const activity = memberPriceActivities.find((a) => a.id === id)
    if (!activity) return
    upsertMemberPrice(appendMemberPriceLog(
      { ...activity, status: computeMemberPricePublishStatus(activity) },
      '发布活动',
      `发布活动「${activity.name}」`,
      currentOperator,
    ))
    showToast('活动发布成功')
  }

  const handleStoredValuePayPublishFromList = (id: string) => {
    const activity = storedValuePayActivities.find((a) => a.id === id)
    if (!activity) return
    upsertStoredValuePay(appendStoredValuePayLog(
      { ...activity, status: computeStoredValuePayPublishStatus(activity) },
      '发布活动',
      `发布活动「${activity.name}」`,
      currentOperator,
    ))
    showToast('活动发布成功')
  }

  const handleEnterpriseDiscountPublishFromList = (id: string) => {
    const activity = enterpriseDiscountActivities.find((a) => a.id === id)
    if (!activity) return
    upsertEnterpriseDiscount(appendEnterpriseDiscountLog(
      { ...activity, status: computeEnterpriseDiscountPublishStatus(activity) },
      '发布活动',
      `发布活动「${activity.name}」`,
      currentOperator,
    ))
    showToast('活动发布成功')
  }

  const handleFullReductionPublishFromList = (id: string) => {
    const activity = fullReductionActivities.find((a) => a.id === id)
    if (!activity) return
    upsertFullReduction(appendFullReductionLog(
      { ...activity, status: computeFullReductionPublishStatus(activity) },
      '发布活动',
      `发布活动「${activity.name}」`,
      currentOperator,
    ))
    showToast('活动发布成功')
  }

  const handleDeliveryFeePublishFromList = (id: string) => {
    const activity = deliveryFeeActivities.find((a) => a.id === id)
    if (!activity) return
    const err = validateDeliveryFeeBeforeSave(activity, deliveryFeeActivities)
    if (err) {
      showToast(err)
      return
    }
    upsertDeliveryFee(appendDeliveryFeeLog(
      { ...activity, status: computeDeliveryFeePublishStatus(activity) },
      '发布活动',
      `发布活动「${activity.name}」`,
      currentOperator,
    ))
    showToast('活动发布成功')
  }

  const handleVoid = (id: string) => {
    const activity = activities.find((a) => a.id === id)
    if (!activity) return
    upsert(appendActivityLog({ ...activity, status: 'voided' }, '作废活动', `作废活动「${activity.name}」`, currentOperator))
    showToast('活动已作废')
  }

  const handleMultiItemVoid = (id: string) => {
    const activity = multiItemActivities.find((a) => a.id === id)
    if (!activity) return
    upsertMultiItem(appendMultiItemLog({ ...activity, status: 'voided' }, '作废活动', `作废活动「${activity.name}」`, currentOperator))
    showToast('活动已作废')
  }

  const handleMemberPriceVoid = (id: string) => {
    const activity = memberPriceActivities.find((a) => a.id === id)
    if (!activity) return
    upsertMemberPrice(appendMemberPriceLog({ ...activity, status: 'voided' as const }, '作废活动', `作废活动「${activity.name}」`, currentOperator))
    showToast('活动已作废')
  }

  const handleStoredValuePayVoid = (id: string) => {
    const activity = storedValuePayActivities.find((a) => a.id === id)
    if (!activity) return
    upsertStoredValuePay(appendStoredValuePayLog({ ...activity, status: 'voided' as const }, '作废活动', `作废活动「${activity.name}」`, currentOperator))
    showToast('活动已作废')
  }

  const handleEnterpriseDiscountVoid = (id: string) => {
    const activity = enterpriseDiscountActivities.find((a) => a.id === id)
    if (!activity) return
    upsertEnterpriseDiscount(appendEnterpriseDiscountLog({ ...activity, status: 'voided' as const }, '作废活动', `作废活动「${activity.name}」`, currentOperator))
    showToast('活动已作废')
  }

  const handleFullReductionVoid = (id: string) => {
    const activity = fullReductionActivities.find((a) => a.id === id)
    if (!activity) return
    upsertFullReduction(appendFullReductionLog({ ...activity, status: 'voided' }, '作废活动', `作废活动「${activity.name}」`, currentOperator))
    showToast('活动已作废')
  }

  const handleDeliveryFeeVoid = (id: string) => {
    const activity = deliveryFeeActivities.find((a) => a.id === id)
    if (!activity) return
    upsertDeliveryFee(appendDeliveryFeeLog({ ...activity, status: 'voided' }, '作废活动', `作废活动「${activity.name}」`, currentOperator))
    showToast('活动已作废')
  }

  const handleDeliveryFeeDelete = (id: string) => {
    persistDeliveryFee(deliveryFeeActivities.filter((a) => a.id !== id))
    showToast('活动已删除')
  }

  /* ============ 暂停 / 恢复（四个活动类型同一套口径） ============ */

  /** 演示用：把暂停起始时间往前拨，便于现场查看超时分级的三档颜色 */
  const shiftedPausedAt = (minutes: number) =>
    formatActivityDateTime(new Date(Date.now() - minutes * 60_000))

  /**
   * 恢复时按当前时刻重新落状态：暂停不顺延活动时间，
   * 暂停期间已到期的活动直接结束（保留 pausedAt 供列表标注「暂停中到期结束」）。
   */
  const buildResumePlan = (activity: PausableActivity, effect: string) => {
    // 本次暂停持续多久要写进日志，便于事后追溯运营是否长时间挂着不恢复
    const pauseInfo = getPauseInfo(activity)
    const lasted = pauseInfo ? `，本次暂停持续 ${formatPauseDuration(pauseInfo.minutes)}` : ''
    const next = resolveResumeStatus(activity)
    if (next === 'ended') {
      return {
        status: 'ended' as const,
        keepPausedAt: true,
        action: '暂停中到期结束',
        detail: `在暂停期间到达结束时间，恢复时直接结束${lasted}`,
        toast: '该活动已过结束时间，已直接标记为已结束',
      }
    }
    return {
      status: next,
      keepPausedAt: false,
      action: '恢复活动',
      detail: `恢复活动${lasted}`,
      toast: next === 'not_started' ? '活动已恢复，将在开始时间到达后生效' : `活动已恢复，${effect}`,
    }
  }

  const BOGO_PAUSE_IMPACT = '顾客暂时无法参与本活动'

  const handlePause = (id: string) => {
    const activity = activities.find((a) => a.id === id)
    if (!activity) return
    upsert(appendActivityLog(
      { ...activity, status: 'paused', pausedAt: formatActivityDateTime() },
      '暂停活动',
      `暂停活动「${activity.name}」，${BOGO_PAUSE_IMPACT}`,
      currentOperator,
    ))
    showToast(`活动已暂停，${BOGO_PAUSE_IMPACT}`)
  }

  const handleResume = (id: string) => {
    const activity = activities.find((a) => a.id === id)
    if (!activity) return
    const storeIssue = resolveStoreConfigIssue(activity)
    if (storeIssue === 'S1' || storeIssue === 'S1_all_closed') {
      showToast('请先重新选择参与门店后再恢复活动')
      return
    }
    if (storeIssue === 'S2' || storeIssue === 'S3') {
      showToast('请先重新配置不参与门店后再恢复活动')
      return
    }
    const plan = buildResumePlan(activity, '顾客可立即重新参与')
    upsert(appendActivityLog(
      { ...activity, status: plan.status, pausedAt: plan.keepPausedAt ? activity.pausedAt : undefined },
      plan.action,
      `活动「${activity.name}」${plan.detail}`,
      currentOperator,
    ))
    showToast(plan.toast)
  }

  const handleDemoSetPausedMinutes = (id: string, minutes: number) => {
    const activity = activities.find((a) => a.id === id)
    if (!activity || activity.status !== 'paused') return
    upsert({ ...activity, pausedAt: shiftedPausedAt(minutes) })
    showToast(minutes === 0 ? '已重置为「刚暂停」' : `已模拟暂停 ${minutes} 分钟`)
  }

  const handleMultiItemPause = (id: string) => {
    const activity = multiItemActivities.find((a) => a.id === id)
    if (!activity) return
    upsertMultiItem(appendMultiItemLog(
      { ...activity, status: 'paused', pausedAt: formatActivityDateTime() },
      '暂停活动',
      `暂停活动「${activity.name}」，${BOGO_PAUSE_IMPACT}`,
      currentOperator,
    ))
    showToast(`活动已暂停，${BOGO_PAUSE_IMPACT}`)
  }

  const handleMultiItemResume = (id: string) => {
    const activity = multiItemActivities.find((a) => a.id === id)
    if (!activity) return
    const plan = buildResumePlan(activity, '顾客可立即重新参与')
    upsertMultiItem(appendMultiItemLog(
      { ...activity, status: plan.status, pausedAt: plan.keepPausedAt ? activity.pausedAt : undefined },
      plan.action,
      `活动「${activity.name}」${plan.detail}`,
      currentOperator,
    ))
    showToast(plan.toast)
  }

  const handleMultiItemDemoSetPausedMinutes = (id: string, minutes: number) => {
    const activity = multiItemActivities.find((a) => a.id === id)
    if (!activity || activity.status !== 'paused') return
    upsertMultiItem({ ...activity, pausedAt: shiftedPausedAt(minutes) })
    showToast(minutes === 0 ? '已重置为「刚暂停」' : `已模拟暂停 ${minutes} 分钟`)
  }

  const handleMemberPricePause = (id: string) => {
    const activity = memberPriceActivities.find((a) => a.id === id)
    if (!activity) return
    upsertMemberPrice(appendMemberPriceLog(
      { ...activity, status: 'paused' as const, pausedAt: formatActivityDateTime() },
      '暂停活动',
      `暂停活动「${activity.name}」，会员暂时无法享受专享价`,
      currentOperator,
    ))
    showToast('活动已暂停，会员暂时无法享受专享价')
  }

  const handleMemberPriceResume = (id: string) => {
    const activity = memberPriceActivities.find((a) => a.id === id)
    if (!activity) return
    const plan = buildResumePlan(activity, '会员专享价立即重新生效')
    upsertMemberPrice(appendMemberPriceLog(
      { ...activity, status: plan.status, pausedAt: plan.keepPausedAt ? activity.pausedAt : undefined },
      plan.action,
      `活动「${activity.name}」${plan.detail}`,
      currentOperator,
    ))
    showToast(plan.toast)
  }

  const handleMemberPriceDemoSetPausedMinutes = (id: string, minutes: number) => {
    const activity = memberPriceActivities.find((a) => a.id === id)
    if (!activity || activity.status !== 'paused') return
    upsertMemberPrice({ ...activity, pausedAt: shiftedPausedAt(minutes) })
    showToast(minutes === 0 ? '已重置为「刚暂停」' : `已模拟暂停 ${minutes} 分钟`)
  }

  const handleStoredValuePayPause = (id: string) => {
    const activity = storedValuePayActivities.find((a) => a.id === id)
    if (!activity) return
    upsertStoredValuePay(appendStoredValuePayLog(
      { ...activity, status: 'paused' as const, pausedAt: formatActivityDateTime() },
      '暂停活动',
      `暂停活动「${activity.name}」，顾客暂时无法享受储值支付优惠`,
      currentOperator,
    ))
    showToast('活动已暂停，顾客暂时无法享受储值支付优惠')
  }

  const handleStoredValuePayResume = (id: string) => {
    const activity = storedValuePayActivities.find((a) => a.id === id)
    if (!activity) return
    const plan = buildResumePlan(activity, '储值支付优惠立即重新生效')
    upsertStoredValuePay(appendStoredValuePayLog(
      { ...activity, status: plan.status, pausedAt: plan.keepPausedAt ? activity.pausedAt : undefined },
      plan.action,
      `活动「${activity.name}」${plan.detail}`,
      currentOperator,
    ))
    showToast(plan.toast)
  }

  const handleStoredValuePayDemoSetPausedMinutes = (id: string, minutes: number) => {
    const activity = storedValuePayActivities.find((a) => a.id === id)
    if (!activity || activity.status !== 'paused') return
    upsertStoredValuePay({ ...activity, pausedAt: shiftedPausedAt(minutes) })
    showToast(minutes === 0 ? '已重置为「刚暂停」' : `已模拟暂停 ${minutes} 分钟`)
  }

  const handleEnterpriseDiscountPause = (id: string) => {
    const activity = enterpriseDiscountActivities.find((a) => a.id === id)
    if (!activity) return
    upsertEnterpriseDiscount(appendEnterpriseDiscountLog(
      { ...activity, status: 'paused' as const, pausedAt: formatActivityDateTime() },
      '暂停活动',
      `暂停活动「${activity.name}」，企业员工暂时无法享受折扣`,
      currentOperator,
    ))
    showToast('活动已暂停，企业员工暂时无法享受折扣')
  }

  const handleEnterpriseDiscountResume = (id: string) => {
    const activity = enterpriseDiscountActivities.find((a) => a.id === id)
    if (!activity) return
    const plan = buildResumePlan(activity, '企业员工折扣立即重新生效')
    upsertEnterpriseDiscount(appendEnterpriseDiscountLog(
      { ...activity, status: plan.status, pausedAt: plan.keepPausedAt ? activity.pausedAt : undefined },
      plan.action,
      `活动「${activity.name}」${plan.detail}`,
      currentOperator,
    ))
    showToast(plan.toast)
  }

  const handleEnterpriseDiscountDemoSetPausedMinutes = (id: string, minutes: number) => {
    const activity = enterpriseDiscountActivities.find((a) => a.id === id)
    if (!activity || activity.status !== 'paused') return
    upsertEnterpriseDiscount({ ...activity, pausedAt: shiftedPausedAt(minutes) })
    showToast(minutes === 0 ? '已重置为「刚暂停」' : `已模拟暂停 ${minutes} 分钟`)
  }

  const handleFullReductionPause = (id: string) => {
    const activity = fullReductionActivities.find((a) => a.id === id)
    if (!activity) return
    upsertFullReduction(appendFullReductionLog(
      { ...activity, status: 'paused', pausedAt: formatActivityDateTime() },
      '暂停活动',
      `暂停活动「${activity.name}」，顾客暂时无法享受满减优惠`,
      currentOperator,
    ))
    showToast('活动已暂停，顾客暂时无法享受满减优惠')
  }

  const handleFullReductionResume = (id: string) => {
    const activity = fullReductionActivities.find((a) => a.id === id)
    if (!activity) return
    const plan = buildResumePlan(activity, '满减优惠立即重新生效')
    upsertFullReduction(appendFullReductionLog(
      { ...activity, status: plan.status, pausedAt: plan.keepPausedAt ? activity.pausedAt : undefined },
      plan.action,
      `活动「${activity.name}」${plan.detail}`,
      currentOperator,
    ))
    showToast(plan.toast)
  }

  const handleFullReductionDemoSetPausedMinutes = (id: string, minutes: number) => {
    const activity = fullReductionActivities.find((a) => a.id === id)
    if (!activity || activity.status !== 'paused') return
    upsertFullReduction({ ...activity, pausedAt: shiftedPausedAt(minutes) })
    showToast(minutes === 0 ? '已重置为「刚暂停」' : `已模拟暂停 ${minutes} 分钟`)
  }

  // 暂停不顺延活动时间：暂停期间到达结束时间的活动自动转「已结束」，保留暂停时刻用于列表标注
  useEffect(() => {
    const sweep = () => {
      const now = Date.now()
      const expiredDetail = (name: string) => `活动「${name}」在暂停期间到达结束时间，自动结束`
      if (activities.some((a) => isPausedExpired(a, now))) {
        persist(activities.map((a) => (isPausedExpired(a, now)
          ? appendActivityLog({ ...a, status: 'ended' }, '暂停中到期结束', expiredDetail(a.name), currentOperator)
          : a)))
      }
      if (multiItemActivities.some((a) => isPausedExpired(a, now))) {
        persistMultiItem(multiItemActivities.map((a) => (isPausedExpired(a, now)
          ? appendMultiItemLog({ ...a, status: 'ended' }, '暂停中到期结束', expiredDetail(a.name), currentOperator)
          : a)))
      }
      if (memberPriceActivities.some((a) => isPausedExpired(a, now))) {
        persistMemberPrice(memberPriceActivities.map((a) => (isPausedExpired(a, now)
          ? appendMemberPriceLog({ ...a, status: 'ended' as const }, '暂停中到期结束', expiredDetail(a.name), currentOperator)
          : a)))
      }
      if (storedValuePayActivities.some((a) => isPausedExpired(a, now))) {
        persistStoredValuePay(storedValuePayActivities.map((a) => (isPausedExpired(a, now)
          ? appendStoredValuePayLog({ ...a, status: 'ended' as const }, '暂停中到期结束', expiredDetail(a.name), currentOperator)
          : a)))
      }
      if (enterpriseDiscountActivities.some((a) => isPausedExpired(a, now))) {
        persistEnterpriseDiscount(enterpriseDiscountActivities.map((a) => (isPausedExpired(a, now)
          ? appendEnterpriseDiscountLog({ ...a, status: 'ended' as const }, '暂停中到期结束', expiredDetail(a.name), currentOperator)
          : a)))
      }
      if (fullReductionActivities.some((a) => isPausedExpired(a, now))) {
        persistFullReduction(fullReductionActivities.map((a) => (isPausedExpired(a, now)
          ? appendFullReductionLog({ ...a, status: 'ended' }, '暂停中到期结束', expiredDetail(a.name), currentOperator)
          : a)))
      }
    }
    sweep()
    const timer = window.setInterval(sweep, 30_000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, multiItemActivities, memberPriceActivities, storedValuePayActivities, enterpriseDiscountActivities, fullReductionActivities])

  const handleMultiItemDelete = (id: string) => {
    persistMultiItem(multiItemActivities.filter((a) => a.id !== id))
    showToast('活动已删除')
  }

  const handleMemberPriceDelete = (id: string) => {
    persistMemberPrice(memberPriceActivities.filter((a) => a.id !== id))
    showToast('活动已删除')
  }

  const handleStoredValuePayDelete = (id: string) => {
    persistStoredValuePay(storedValuePayActivities.filter((a) => a.id !== id))
    showToast('活动已删除')
  }

  const handleEnterpriseDiscountDelete = (id: string) => {
    persistEnterpriseDiscount(enterpriseDiscountActivities.filter((a) => a.id !== id))
    showToast('活动已删除')
  }

  const handleFullReductionDelete = (id: string) => {
    persistFullReduction(fullReductionActivities.filter((a) => a.id !== id))
    showToast('活动已删除')
  }

  const handleSaveDraft = () => {
    if (!draft) return
    const exists = activities.some((a) => a.id === draft.id)
    const saved = exists
      ? appendActivityLog({ ...draft, status: 'draft' }, '编辑活动', `保存草稿「${draft.name}」`, currentOperator)
      : { ...draft, status: 'draft' as const }
    upsert(saved)
    showToast('草稿保存成功')
    setView({ type: 'list' })
    setDraft(null)
  }

  const handleMultiItemSaveDraft = () => {
    if (!multiItemDraft) return
    const exists = multiItemActivities.some((a) => a.id === multiItemDraft.id)
    const saved = exists
      ? appendMultiItemLog({ ...multiItemDraft, status: 'draft' }, '编辑活动', `保存草稿「${multiItemDraft.name}」`, currentOperator)
      : { ...multiItemDraft, status: 'draft' as const }
    upsertMultiItem(saved)
    showToast('草稿保存成功')
    setView({ type: 'multi-item-list' })
    setMultiItemDraft(null)
  }

  const handleMemberPriceSaveDraft = () => {
    if (!memberPriceDraft) return
    const exists = memberPriceActivities.some((a) => a.id === memberPriceDraft.id)
    const saved = exists
      ? appendMemberPriceLog({ ...memberPriceDraft, status: 'draft' as const }, '编辑活动', `保存草稿「${memberPriceDraft.name}」`, currentOperator)
      : { ...memberPriceDraft, status: 'draft' as const }
    upsertMemberPrice(saved)
    showToast('草稿保存成功')
    setView({ type: 'member-price-list' })
    setMemberPriceDraft(null)
  }

  const handleStoredValuePaySaveDraft = () => {
    if (!storedValuePayDraft) return
    const exists = storedValuePayActivities.some((a) => a.id === storedValuePayDraft.id)
    const saved = exists
      ? appendStoredValuePayLog({ ...storedValuePayDraft, status: 'draft' as const }, '编辑活动', `保存草稿「${storedValuePayDraft.name}」`, currentOperator)
      : { ...storedValuePayDraft, status: 'draft' as const }
    upsertStoredValuePay(saved)
    showToast('草稿保存成功')
    setView({ type: 'stored-value-pay-list' })
    setStoredValuePayDraft(null)
  }

  const handleEnterpriseDiscountSaveDraft = () => {
    if (!enterpriseDiscountDraft) return
    const exists = enterpriseDiscountActivities.some((a) => a.id === enterpriseDiscountDraft.id)
    const saved = exists
      ? appendEnterpriseDiscountLog({ ...enterpriseDiscountDraft, status: 'draft' as const }, '编辑活动', `保存草稿「${enterpriseDiscountDraft.name}」`, currentOperator)
      : { ...enterpriseDiscountDraft, status: 'draft' as const }
    upsertEnterpriseDiscount(saved)
    showToast('草稿保存成功')
    setView({ type: 'enterprise-discount-list' })
    setEnterpriseDiscountDraft(null)
  }

  const handleFullReductionSaveDraft = () => {
    if (!fullReductionDraft) return
    const exists = fullReductionActivities.some((a) => a.id === fullReductionDraft.id)
    const saved = exists
      ? appendFullReductionLog({ ...fullReductionDraft, status: 'draft' }, '编辑活动', `保存草稿「${fullReductionDraft.name}」`, currentOperator)
      : { ...fullReductionDraft, status: 'draft' as const }
    upsertFullReduction(saved)
    showToast('草稿保存成功')
    setView({ type: 'full-reduction-list' })
    setFullReductionDraft(null)
  }

  const handleDeliveryFeeSaveDraft = () => {
    if (!deliveryFeeDraft) return
    const exists = deliveryFeeActivities.some((a) => a.id === deliveryFeeDraft.id)
    const saved = exists
      ? appendDeliveryFeeLog({ ...deliveryFeeDraft, status: 'draft' }, '编辑活动', `保存草稿「${deliveryFeeDraft.name}」`, currentOperator)
      : { ...deliveryFeeDraft, status: 'draft' as const }
    upsertDeliveryFee(saved)
    showToast('草稿保存成功')
    setView({ type: 'delivery-fee-list' })
    setDeliveryFeeDraft(null)
  }

  /**
   * 保存已存在活动时保持原状态，只有新建与草稿才落「待发布」。
   * 否则「暂停 → 改规则 → 恢复」会在保存那一步被打回待发布，暂停流程走不通。
   */
  const resolveSavedStatus = <T extends { id: string; status: ActivityForm['status'] }>(
    list: T[],
    draftActivity: { id: string },
  ) => {
    const existing = list.find((a) => a.id === draftActivity.id)
    const keep = existing && existing.status !== 'draft'
    return {
      status: keep ? existing.status : ('pending' as const),
      keep: Boolean(keep),
    }
  }

  const handleSave = () => {
    if (!draft) return
    const { status, keep } = resolveSavedStatus(activities, draft)
    upsert(appendActivityLog({ ...draft, status }, keep ? '编辑活动' : '保存活动', `保存活动「${draft.name}」`, currentOperator))
    showToast(keep ? '活动已保存' : '活动保存成功，请前往活动列表发布')
    setView({ type: 'list' })
    setDraft(null)
  }

  const handleMultiItemSave = () => {
    if (!multiItemDraft) return
    const { status, keep } = resolveSavedStatus(multiItemActivities, multiItemDraft)
    upsertMultiItem(appendMultiItemLog({ ...multiItemDraft, status }, keep ? '编辑活动' : '保存活动', `保存活动「${multiItemDraft.name}」`, currentOperator))
    showToast(keep ? '活动已保存' : '活动保存成功，请前往活动列表发布')
    setView({ type: 'multi-item-list' })
    setMultiItemDraft(null)
  }

  const handleMemberPriceSave = () => {
    if (!memberPriceDraft) return
    const { status, keep } = resolveSavedStatus(memberPriceActivities, memberPriceDraft)
    upsertMemberPrice(appendMemberPriceLog({ ...memberPriceDraft, status }, keep ? '编辑活动' : '保存活动', `保存活动「${memberPriceDraft.name}」`, currentOperator))
    showToast(keep ? '活动已保存' : '活动保存成功，请前往活动列表发布')
    setView({ type: 'member-price-list' })
    setMemberPriceDraft(null)
  }

  const handleStoredValuePaySave = () => {
    if (!storedValuePayDraft) return
    const { status, keep } = resolveSavedStatus(storedValuePayActivities, storedValuePayDraft)
    upsertStoredValuePay(appendStoredValuePayLog({ ...storedValuePayDraft, status }, keep ? '编辑活动' : '保存活动', `保存活动「${storedValuePayDraft.name}」`, currentOperator))
    showToast(keep ? '活动已保存' : '活动保存成功，请前往活动列表发布')
    setView({ type: 'stored-value-pay-list' })
    setStoredValuePayDraft(null)
  }

  const handleEnterpriseDiscountSave = () => {
    if (!enterpriseDiscountDraft) return
    const { status, keep } = resolveSavedStatus(enterpriseDiscountActivities, enterpriseDiscountDraft)
    upsertEnterpriseDiscount(appendEnterpriseDiscountLog({ ...enterpriseDiscountDraft, status }, keep ? '编辑活动' : '保存活动', `保存活动「${enterpriseDiscountDraft.name}」`, currentOperator))
    showToast(keep ? '活动已保存' : '活动保存成功，请前往活动列表发布')
    setView({ type: 'enterprise-discount-list' })
    setEnterpriseDiscountDraft(null)
  }

  const handleFullReductionSave = () => {
    if (!fullReductionDraft) return
    const { status, keep } = resolveSavedStatus(fullReductionActivities, fullReductionDraft)
    upsertFullReduction(appendFullReductionLog({ ...fullReductionDraft, status }, keep ? '编辑活动' : '保存活动', `保存活动「${fullReductionDraft.name}」`, currentOperator))
    showToast(keep ? '活动已保存' : '活动保存成功，请前往活动列表发布')
    setView({ type: 'full-reduction-list' })
    setFullReductionDraft(null)
  }

  const handleDeliveryFeeSave = () => {
    if (!deliveryFeeDraft) return
    const err = validateDeliveryFeeBeforeSave(deliveryFeeDraft, deliveryFeeActivities)
    if (err) {
      showToast(err)
      return
    }
    const { status, keep } = resolveSavedStatus(deliveryFeeActivities, deliveryFeeDraft)
    upsertDeliveryFee(appendDeliveryFeeLog({ ...deliveryFeeDraft, status }, keep ? '编辑活动' : '保存活动', `保存活动「${deliveryFeeDraft.name}」`, currentOperator))
    showToast(keep ? '活动已保存' : '活动保存成功，请前往活动列表发布')
    setView({ type: 'delivery-fee-list' })
    setDeliveryFeeDraft(null)
  }

  /* ============ 付费会员价 ============ */

  const handlePaidMemberPriceCreate = () => {
    setPaidMemberPriceDraft(createEmptyPaidMemberPriceActivity())
    setView({ type: 'paid-member-price-wizard', mode: 'create' })
  }

  /** 从付费权益卡的某条权益快捷建活动：绑定已预填，直接从第 2 步开始配规则 */
  const handlePaidMemberPriceCreateFromBenefit = (cardId: string, benefitId: string) => {
    const card = paidMemberCards.find((c) => c.id === cardId)
    const benefit = card?.benefits.find((b) => b.id === benefitId)
    if (!card || !benefit) return
    setPaidMemberPriceDraft({
      ...createEmptyPaidMemberPriceActivity(),
      name: `${card.name}${benefit.name}`,
      cardTemplateId: card.id,
      benefitId: benefit.id,
    })
    setView({ type: 'paid-member-price-wizard', mode: 'create', step: 1, from: 'card-list' })
    showToast(`已关联「${card.name} · ${benefit.name}」，继续配置活动规则即可`)
  }

  /** 关闭向导：从权益卡进来的回权益卡，其余回活动列表 */
  const closePaidMemberPriceWizard = () => {
    setView(
      view.type === 'paid-member-price-wizard' && view.from === 'card-list'
        ? { type: 'paid-member-card-list' }
        : { type: 'paid-member-price-list' },
    )
    setPaidMemberPriceDraft(null)
  }

  const handlePaidMemberPriceView = (id: string, from?: 'card-list') => {
    const activity = paidMemberPriceActivities.find((a) => a.id === id)
    if (!activity) return
    setPaidMemberPriceDraft({ ...activity })
    setView({ type: 'paid-member-price-wizard', mode: 'view', from })
  }

  const handlePaidMemberPriceEdit = (id: string) => {
    const activity = paidMemberPriceActivities.find((a) => a.id === id)
    if (!activity) return
    setPaidMemberPriceDraft({ ...activity })
    setView({ type: 'paid-member-price-wizard', mode: 'edit' })
  }

  const handlePaidMemberPriceCopy = (id: string) => {
    const activity = paidMemberPriceActivities.find((a) => a.id === id)
    if (!activity) return
    const copy = clonePaidMemberPriceActivity(activity)
    setPaidMemberPriceDraft(copy)
    setView({ type: 'paid-member-price-wizard', mode: 'copy' })
    showToast('已创建草稿副本，请重新关联付费会员卡与权益')
  }

  const handlePaidMemberPricePause = (id: string) => {
    const activity = paidMemberPriceActivities.find((a) => a.id === id)
    if (!activity) return
    upsertPaidMemberPrice(appendMemberPriceLog(
      { ...activity, status: 'paused' as const, pausedAt: formatActivityDateTime() },
      '暂停活动',
      `暂停活动「${activity.name}」，付费会员价立即失效`,
      currentOperator,
    ))
    showToast('活动已暂停，持卡顾客暂时无法享受专属价')
  }

  const handlePaidMemberPriceResume = (id: string) => {
    const activity = paidMemberPriceActivities.find((a) => a.id === id)
    if (!activity) return
    // 本次暂停持续多久要写进日志，便于事后追溯运营是否长时间挂着不恢复
    const pauseInfo = getPauseInfo(activity)
    const lasted = pauseInfo ? `，本次暂停持续 ${formatPauseDuration(pauseInfo.minutes)}` : ''
    upsertPaidMemberPrice(appendMemberPriceLog(
      { ...activity, status: 'in_progress' as const, pausedAt: undefined },
      '恢复活动',
      `恢复活动「${activity.name}」，付费会员价立即生效${lasted}`,
      currentOperator,
    ))
    showToast('活动已恢复，付费会员价立即生效')
  }

  const handlePaidMemberPriceVoid = (id: string) => {
    const activity = paidMemberPriceActivities.find((a) => a.id === id)
    if (!activity) return
    upsertPaidMemberPrice(appendMemberPriceLog(
      { ...activity, status: 'voided' as const, pausedAt: undefined },
      '作废活动',
      `作废活动「${activity.name}」`,
      currentOperator,
    ))
    showToast('活动已作废')
  }

  const handlePaidMemberPriceDelete = (id: string) => {
    const activity = paidMemberPriceActivities.find((a) => a.id === id)
    if (!activity || activity.status !== 'draft') return
    persistPaidMemberPrice(paidMemberPriceActivities.filter((a) => a.id !== id))
    showToast('草稿已删除')
  }

  /** 演示用：把暂停起始时间往前拨，便于现场查看超时分级的三档颜色 */
  const handlePaidMemberPriceDemoSetPausedMinutes = (id: string, minutes: number) => {
    const activity = paidMemberPriceActivities.find((a) => a.id === id)
    if (!activity || activity.status !== 'paused') return
    const pausedAt = formatActivityDateTime(new Date(Date.now() - minutes * 60_000))
    upsertPaidMemberPrice({ ...activity, pausedAt })
    showToast(minutes === 0 ? '已重置为「刚暂停」' : `已模拟暂停 ${minutes} 分钟`)
  }

  const handlePaidMemberPriceSaveDraft = () => {
    if (!paidMemberPriceDraft) return
    const err = validatePaidMemberPriceDraftSave(paidMemberPriceDraft)
    if (err) {
      showToast(err)
      return
    }
    const exists = paidMemberPriceActivities.some((a) => a.id === paidMemberPriceDraft.id)
    upsertPaidMemberPrice(appendMemberPriceLog(
      { ...paidMemberPriceDraft, status: 'draft' as const, pausedAt: undefined },
      exists ? '保存草稿' : '创建草稿',
      `保存草稿「${paidMemberPriceDraft.name}」`,
      currentOperator,
    ))
    showToast('草稿已保存')
    closePaidMemberPriceWizard()
  }

  /** 发布草稿，或保存已发布活动的编辑 */
  const handlePaidMemberPriceSave = () => {
    if (!paidMemberPriceDraft) return
    const exists = paidMemberPriceActivities.some((a) => a.id === paidMemberPriceDraft.id)
    const isDraftOrCreate = !exists || paidMemberPriceDraft.status === 'draft'

    if (isDraftOrCreate) {
      const err = validatePaidMemberPriceBeforeSave(
        paidMemberPriceDraft,
        paidMemberCards,
        paidMemberPriceActivities,
      )
      if (err) {
        showToast(err)
        return
      }
      const status = resolvePublishStatus(paidMemberPriceDraft, paidMemberCards)
      const card = paidMemberCards.find((c) => c.id === paidMemberPriceDraft.cardTemplateId)
      upsertPaidMemberPrice(appendMemberPriceLog(
        { ...paidMemberPriceDraft, status, pausedAt: undefined },
        '发布活动',
        `发布活动「${paidMemberPriceDraft.name}」，关联卡${card?.status === 'on_sale' ? '在售，活动直接生效' : '未上架，等待卡上架后生效'}`,
        currentOperator,
      ))
      const disadvantages = findPriceDisadvantages(paidMemberPriceDraft, memberPriceActivities)
      const baseMsg = card?.status === 'on_sale'
        ? '活动已发布并生效'
        : '活动已发布，关联卡上架后将自动生效'
      showToast(
        disadvantages.length > 0
          ? `${baseMsg}；注意有 ${disadvantages.length} 个商品的付费会员价高于普通会员价，建议核对优惠力度`
          : baseMsg,
      )
    } else {
      const err = validatePaidMemberPriceBeforeSave(
        paidMemberPriceDraft,
        paidMemberCards,
        paidMemberPriceActivities,
      )
      if (err) {
        showToast(err)
        return
      }
      upsertPaidMemberPrice(appendMemberPriceLog(
        { ...paidMemberPriceDraft },
        '编辑活动',
        `编辑活动「${paidMemberPriceDraft.name}」`,
        currentOperator,
      ))
      const disadvantages = findPriceDisadvantages(paidMemberPriceDraft, memberPriceActivities)
      showToast(
        disadvantages.length > 0
          ? `活动已保存；注意有 ${disadvantages.length} 个商品的付费会员价高于普通会员价，建议核对优惠力度`
          : '活动已保存',
      )
    }
    closePaidMemberPriceWizard()
  }

  const handlePaidMemberPricePublishFromList = (id: string) => {
    const activity = paidMemberPriceActivities.find((a) => a.id === id)
    if (!activity || activity.status !== 'draft') return
    const err = validatePaidMemberPriceBeforeSave(activity, paidMemberCards, paidMemberPriceActivities)
    if (err) {
      showToast(err)
      return
    }
    const status = resolvePublishStatus(activity, paidMemberCards)
    const card = paidMemberCards.find((c) => c.id === activity.cardTemplateId)
    upsertPaidMemberPrice(appendMemberPriceLog(
      { ...activity, status, pausedAt: undefined },
      '发布活动',
      `发布活动「${activity.name}」，关联卡${card?.status === 'on_sale' ? '在售，活动直接生效' : '未上架，等待卡上架后生效'}`,
      currentOperator,
    ))
    showToast(
      card?.status === 'on_sale'
        ? '活动已发布并生效'
        : '活动已发布，关联卡上架后将自动生效',
    )
  }

  /** 卡上架 / 下架，并联动关联活动的状态 */
  const handleToggleCardStatus = (cardId: string, next: 'on_sale' | 'off_shelf') => {
    const card = paidMemberCards.find((c) => c.id === cardId)
    if (!card) return
    persistPaidMemberCards(
      paidMemberCards.map((c) =>
        c.id === cardId ? { ...c, status: next, updatedAt: formatActivityDateTime() } : c,
      ),
    )

    if (next === 'on_sale') {
      // 卡上架：该卡下「待发布」的活动自动生效
      const affected = paidMemberPriceActivities.filter(
        (a) => a.cardTemplateId === cardId && a.status === 'pending',
      )
      if (affected.length > 0) {
        const affectedIds = new Set(affected.map((a) => a.id))
        persistPaidMemberPrice(
          paidMemberPriceActivities.map((a) =>
            affectedIds.has(a.id)
              ? appendMemberPriceLog(
                  { ...a, status: 'in_progress' as const },
                  '卡上架生效',
                  `关联付费会员卡「${card.name}」上架，活动自动生效`,
                  currentOperator,
                )
              : a,
          ),
        )
        showToast(`「${card.name}」已上架，${affected.length} 个关联活动已自动生效`)
      } else {
        showToast(`「${card.name}」已上架`)
      }
      return
    }

    // 卡下架：仅停止新售，活动状态不变，已购卡用户在有效期内继续享用
    const running = paidMemberPriceActivities.filter(
      (a) => a.cardTemplateId === cardId && (a.status === 'in_progress' || a.status === 'paused'),
    )
    showToast(
      running.length > 0
        ? `「${card.name}」已下架，停止新售；${running.length} 个关联活动保持原状态，已购卡用户在有效期内继续享用`
        : `「${card.name}」已下架，停止新售`,
    )
  }

  const handleSaveBenefit = (cardId: string, benefit: PaidMemberPriceBenefit) => {
    const card = paidMemberCards.find((c) => c.id === cardId)
    if (!card) return
    const isNew = !benefit.id
    const saved: PaidMemberPriceBenefit = isNew
      ? { ...benefit, id: `BF${Date.now()}`, createdAt: formatActivityDateTime() }
      : benefit
    persistPaidMemberCards(
      paidMemberCards.map((c) =>
        c.id !== cardId
          ? c
          : {
              ...c,
              updatedAt: formatActivityDateTime(),
              benefits: isNew
                ? [...c.benefits, saved]
                : c.benefits.map((b) => (b.id === saved.id ? saved : b)),
            },
      ),
    )
    showToast(
      isNew
        ? `已新增权益「${saved.name}」，请到付费会员价活动中配置门店、商品与优惠力度`
        : `已保存权益「${saved.name}」`,
    )
  }

  const handleDeleteBenefit = (cardId: string, benefitId: string) => {
    persistPaidMemberCards(
      paidMemberCards.map((c) =>
        c.id !== cardId
          ? c
          : {
              ...c,
              updatedAt: formatActivityDateTime(),
              benefits: c.benefits.filter((b) => b.id !== benefitId),
            },
      ),
    )
    showToast('权益已删除')
  }

  const handleNavigate = (key: string) => {
    setDraft(null)
    setMultiItemDraft(null)
    setMemberPriceDraft(null)
    setStoredValuePayDraft(null)
    setEnterpriseDiscountDraft(null)
    setFullReductionDraft(null)
    setDeliveryFeeDraft(null)
    setPaidMemberPriceDraft(null)
    if (key === 'orders') {
      setView({ type: 'order-list' })
    } else if (key === 'bogo') {
      setView({ type: 'list' })
    } else if (key === 'half_item') {
      setView({ type: 'multi-item-list' })
    } else if (key === 'full_reduction') {
      setView({ type: 'full-reduction-list' })
    } else if (key === 'delivery_fee') {
      setView({ type: 'delivery-fee-list' })
    } else if (key === 'member_price') {
      setView({ type: 'member-price-list' })
    } else if (key === 'stored_value_pay') {
      setView({ type: 'stored-value-pay-list' })
    } else if (key === 'enterprise_discount') {
      setView({ type: 'enterprise-discount-list' })
    } else if (key === 'paid_member_price') {
      setView({ type: 'paid-member-price-list' })
    } else if (key === 'paid_member_card') {
      setView({ type: 'paid-member-card-list' })
    }
  }

  const isOrderModule = view.type === 'order-list' || view.type === 'order-detail'
  const isMultiItemModule = view.type === 'multi-item-list'
    || view.type === 'multi-item-wizard'
    || view.type === 'multi-item-participation'
    || (view.type === 'order-detail' && view.from === 'multi-item-participation')
  const isMemberPriceModule = view.type === 'member-price-list'
    || view.type === 'member-price-settings'
    || view.type === 'member-price-wizard'
    || view.type === 'member-price-participation'
    || (view.type === 'order-detail' && view.from === 'member-price-participation')
  const isStoredValuePayModule = view.type === 'stored-value-pay-list'
    || view.type === 'stored-value-pay-wizard'
    || view.type === 'stored-value-pay-participation'
    || (view.type === 'order-detail' && view.from === 'stored-value-pay-participation')
  const isEnterpriseDiscountModule = view.type === 'enterprise-discount-list'
    || view.type === 'enterprise-discount-wizard'
    || view.type === 'enterprise-discount-participation'
    || (view.type === 'order-detail' && view.from === 'enterprise-discount-participation')
  const isFullReductionModule = view.type === 'full-reduction-list'
    || view.type === 'full-reduction-wizard'
    || view.type === 'full-reduction-participation'
    || (view.type === 'order-detail' && view.from === 'full-reduction-participation')
  const isDeliveryFeeModule = view.type === 'delivery-fee-list'
    || view.type === 'delivery-fee-wizard'
  const isPaidMemberPriceModule = view.type === 'paid-member-price-list'
    || view.type === 'paid-member-price-wizard'
    || view.type === 'paid-member-price-participation'
    || (view.type === 'order-detail' && view.from === 'paid-member-price-participation')
  const isPaidMemberCardModule = view.type === 'paid-member-card-list'

  const isBogoParticipation = view.type === 'activity-participation'
    || (view.type === 'order-detail' && view.from === 'activity-participation')

  const activeKey = isOrderModule
    ? 'orders'
    : isMultiItemModule
      ? 'half_item'
      : isFullReductionModule
        ? 'full_reduction'
        : isDeliveryFeeModule
          ? 'delivery_fee'
          : isMemberPriceModule
            ? 'member_price'
            : isStoredValuePayModule
              ? 'stored_value_pay'
              : isEnterpriseDiscountModule
                ? 'enterprise_discount'
                : isPaidMemberPriceModule
                  ? 'paid_member_price'
                  : isPaidMemberCardModule
                    ? 'paid_member_card'
                    : 'bogo'

  const multiItemParticipationActivity = view.type === 'multi-item-participation'
    ? multiItemActivities.find((a) => a.id === view.activityId)
    : view.type === 'order-detail' && view.from === 'multi-item-participation' && view.activityId
      ? multiItemActivities.find((a) => a.id === view.activityId)
      : undefined

  const memberPriceParticipationActivity = view.type === 'member-price-participation'
    ? memberPriceActivities.find((a) => a.id === view.activityId)
    : view.type === 'order-detail' && view.from === 'member-price-participation' && view.activityId
      ? memberPriceActivities.find((a) => a.id === view.activityId)
      : undefined

  const storedValuePayParticipationActivity = view.type === 'stored-value-pay-participation'
    ? storedValuePayActivities.find((a) => a.id === view.activityId)
    : view.type === 'order-detail' && view.from === 'stored-value-pay-participation' && view.activityId
      ? storedValuePayActivities.find((a) => a.id === view.activityId)
      : undefined

  const enterpriseDiscountParticipationActivity = view.type === 'enterprise-discount-participation'
    ? enterpriseDiscountActivities.find((a) => a.id === view.activityId)
    : view.type === 'order-detail' && view.from === 'enterprise-discount-participation' && view.activityId
      ? enterpriseDiscountActivities.find((a) => a.id === view.activityId)
      : undefined

  const paidMemberPriceParticipationActivity = view.type === 'paid-member-price-participation'
    ? paidMemberPriceActivities.find((a) => a.id === view.activityId)
    : view.type === 'order-detail' && view.from === 'paid-member-price-participation' && view.activityId
      ? paidMemberPriceActivities.find((a) => a.id === view.activityId)
      : undefined

  const fullReductionParticipationActivity = view.type === 'full-reduction-participation'
    ? fullReductionActivities.find((a) => a.id === view.activityId)
    : view.type === 'order-detail' && view.from === 'full-reduction-participation' && view.activityId
      ? fullReductionActivities.find((a) => a.id === view.activityId)
      : undefined

  const breadcrumbs = isOrderModule
    ? view.type === 'order-list'
      ? ['营销管理', '订单管理', '订单查询']
      : ['营销管理', '订单管理', '订单查询', '订单详情']
    : isPaidMemberCardModule
      ? ['会员管理', '运营体系', '付费权益卡']
    : isPaidMemberPriceModule
      ? view.type === 'paid-member-price-list'
        ? ['营销管理', '促销活动', '付费会员价']
        : view.type === 'paid-member-price-participation' && paidMemberPriceParticipationActivity
          ? ['营销管理', '促销活动', '付费会员价', '参与记录']
          : view.type === 'paid-member-price-wizard'
            ? ['营销管理', '促销活动', '付费会员价', view.mode === 'create' ? '新建活动' : view.mode === 'view' ? '查看活动' : '编辑活动']
            : ['营销管理', '促销活动', '付费会员价']
    : isMemberPriceModule
      ? view.type === 'member-price-list'
        ? ['营销管理', '促销活动', '会员价']
        : view.type === 'member-price-settings'
          ? ['营销管理', '促销活动', '会员价', '通用设置']
        : view.type === 'member-price-participation' && memberPriceParticipationActivity
          ? ['营销管理', '促销活动', '会员价', '参与记录']
          : view.type === 'member-price-wizard'
            ? ['营销管理', '促销活动', '会员价', view.mode === 'create' ? '新建活动' : view.mode === 'view' ? '查看活动' : '编辑活动']
            : ['营销管理', '促销活动', '会员价']
    : isStoredValuePayModule
      ? view.type === 'stored-value-pay-list'
        ? ['营销管理', '促销活动', '储值支付优惠']
        : view.type === 'stored-value-pay-participation' && storedValuePayParticipationActivity
          ? ['营销管理', '促销活动', '储值支付优惠', '参与记录']
          : view.type === 'stored-value-pay-wizard'
            ? ['营销管理', '促销活动', '储值支付优惠', view.mode === 'create' ? '新建活动' : view.mode === 'view' ? '查看活动' : '编辑活动']
            : ['营销管理', '促销活动', '储值支付优惠']
      : isEnterpriseDiscountModule
        ? view.type === 'enterprise-discount-list'
          ? ['营销管理', '促销活动', '企业员工折扣']
          : view.type === 'enterprise-discount-participation' && enterpriseDiscountParticipationActivity
            ? ['营销管理', '促销活动', '企业员工折扣', '参与记录']
            : view.type === 'enterprise-discount-wizard'
              ? ['营销管理', '促销活动', '企业员工折扣', view.mode === 'create' ? '新建活动' : view.mode === 'view' ? '查看活动' : '编辑活动']
              : ['营销管理', '促销活动', '企业员工折扣']
      : isFullReductionModule
        ? view.type === 'full-reduction-list'
          ? ['营销管理', '促销活动', '满减/折']
          : view.type === 'full-reduction-participation' && fullReductionParticipationActivity
            ? ['营销管理', '促销活动', '满减/折', '参与记录']
            : view.type === 'full-reduction-wizard'
              ? ['营销管理', '促销活动', '满减/折', view.mode === 'create' ? '新建活动' : view.mode === 'view' ? '查看活动' : '编辑活动']
              : ['营销管理', '促销活动', '满减/折']
      : isDeliveryFeeModule
        ? view.type === 'delivery-fee-list'
          ? ['营销管理', '促销活动', '减配送费']
          : view.type === 'delivery-fee-wizard'
            ? ['营销管理', '促销活动', '减配送费', view.mode === 'create' ? '新建活动' : view.mode === 'view' ? '查看活动' : '编辑活动']
            : ['营销管理', '促销活动', '减配送费']
      : isMultiItemModule
        ? view.type === 'multi-item-list'
          ? ['营销管理', '促销活动', '第N件优惠']
          : view.type === 'multi-item-participation' && multiItemParticipationActivity
            ? ['营销管理', '促销活动', '第N件优惠', '参与记录']
            : view.type === 'multi-item-wizard'
              ? ['营销管理', '促销活动', '第N件优惠', view.mode === 'create' ? '新建活动' : view.mode === 'view' ? '查看活动' : '编辑活动']
              : ['营销管理', '促销活动', '第N件优惠']
        : isBogoParticipation
          ? ['营销管理', '促销活动', '买1送1', '参与记录']
          : view.type === 'list'
            ? ['营销管理', '促销活动', '买1送1']
            : view.type === 'wizard'
              ? ['营销管理', '促销活动', '买1送1', view.mode === 'create' ? '新建活动' : view.mode === 'view' ? '查看活动' : '编辑活动']
              : ['营销管理', '促销活动', '买1送1']

  return (
    <AdminLayout
      breadcrumbs={breadcrumbs}
      activeKey={activeKey}
      onNavigate={handleNavigate}
      inboxUnread={inboxUnread}
      onOpenInbox={() => setInboxOpen(true)}
    >
      <InboxDrawer
        open={inboxOpen}
        messages={inboxMessages}
        currentCreatorId="10086"
        onClose={() => setInboxOpen(false)}
        onOpenActivity={(activityId) => {
          setInboxOpen(false)
          handleView(activityId)
        }}
        onMarkRead={(id) => {
          persistInbox(inboxMessages.map((m) => (m.id === id ? { ...m, read: true } : m)))
        }}
        onMarkAllRead={() => {
          persistInbox(inboxMessages.map((m) => (
            m.recipientCreatorId === '10086' ? { ...m, read: true } : m
          )))
        }}
      />
      {view.type === 'order-list' ? (
        <OrderList
          activities={activities}
          multiItemActivities={multiItemActivities}
          onView={(orderId) => setView({ type: 'order-detail', orderId, from: 'order-list' })}
          onExport={() => showToast('导出任务已创建，请稍后在下载中心查看')}
        />
      ) : view.type === 'order-detail' ? (
        <OrderDetail
          orderId={view.orderId}
          backLabel={view.from === 'activity-participation' || view.from === 'multi-item-participation' ? '← 返回参与记录' : '← 返回订单列表'}
          onBack={() => {
            if (view.from === 'activity-participation') {
              // 活动范围保存在 participationScope 里，返回后仍是原来的查询结果
              setView({ type: 'activity-participation' })
              return
            }
            if (view.from === 'multi-item-participation' && view.activityId) {
              setView({ type: 'multi-item-participation', activityId: view.activityId })
              return
            }
            setView({ type: 'order-list' })
          }}
          onViewActivity={handleView}
        />
      ) : view.type === 'activity-participation' ? (
        <ActivityParticipationRecords
          activities={activities}
          activityIds={participationScope}
          onScopeChange={setParticipationScope}
          onBack={() => setView({ type: 'list' })}
          onViewOriginalOrder={(orderId) => setView({ type: 'order-detail', orderId, from: 'activity-participation' })}
          onExport={(records, count) => showToast(
            `导出任务已创建（${count} 个活动 / ${records} 条记录），请稍后在下载中心查看`,
          )}
        />
      ) : view.type === 'multi-item-participation' && multiItemParticipationActivity ? (
        <MultiItemParticipationRecords
          activity={multiItemParticipationActivity}
          onBack={() => setView({ type: 'multi-item-list' })}
          onExport={() => showToast('导出任务已创建，请稍后在下载中心查看')}
        />
      ) : view.type === 'multi-item-participation' ? (
        <div className="page-card">
          <div className="table-empty">未找到活动</div>
          <button type="button" className="btn btn--default" onClick={() => setView({ type: 'multi-item-list' })}>返回列表</button>
        </div>
      ) : view.type === 'member-price-participation' && memberPriceParticipationActivity ? (
        <MemberPriceParticipationRecords
          activity={memberPriceParticipationActivity}
          onBack={() => setView({ type: 'member-price-list' })}
          onExport={() => showToast('导出任务已创建，请稍后在下载中心查看')}
        />
      ) : view.type === 'member-price-participation' ? (
        <div className="page-card">
          <div className="table-empty">未找到活动</div>
          <button type="button" className="btn btn--default" onClick={() => setView({ type: 'member-price-list' })}>返回列表</button>
        </div>
      ) : view.type === 'stored-value-pay-participation' && storedValuePayParticipationActivity ? (
        <StoredValuePayParticipationRecords
          activity={storedValuePayParticipationActivity}
          onBack={() => setView({ type: 'stored-value-pay-list' })}
          onExport={() => showToast('导出任务已创建，请稍后在下载中心查看')}
        />
      ) : view.type === 'stored-value-pay-participation' ? (
        <div className="page-card">
          <div className="table-empty">未找到活动</div>
          <button type="button" className="btn btn--default" onClick={() => setView({ type: 'stored-value-pay-list' })}>返回列表</button>
        </div>
      ) : view.type === 'enterprise-discount-participation' && enterpriseDiscountParticipationActivity ? (
        <EnterpriseDiscountParticipationRecords
          activity={enterpriseDiscountParticipationActivity}
          onBack={() => setView({ type: 'enterprise-discount-list' })}
        />
      ) : view.type === 'enterprise-discount-participation' ? (
        <div className="page-card">
          <div className="table-empty">未找到活动</div>
          <button type="button" className="btn btn--default" onClick={() => setView({ type: 'enterprise-discount-list' })}>返回列表</button>
        </div>
      ) : view.type === 'paid-member-price-participation' && paidMemberPriceParticipationActivity ? (
        <MemberPriceParticipationRecords
          activity={paidMemberPriceParticipationActivity}
          onBack={() => setView({ type: 'paid-member-price-list' })}
          onExport={() => showToast('导出任务已创建，请稍后在下载中心查看')}
        />
      ) : view.type === 'paid-member-price-participation' ? (
        <div className="page-card">
          <div className="table-empty">未找到活动</div>
          <button type="button" className="btn btn--default" onClick={() => setView({ type: 'paid-member-price-list' })}>返回列表</button>
        </div>
      ) : view.type === 'paid-member-card-list' ? (
        <PaidMemberCardList
          cards={paidMemberCards}
          activities={paidMemberPriceActivities}
          onToggleCardStatus={handleToggleCardStatus}
          onSaveBenefit={handleSaveBenefit}
          onDeleteBenefit={handleDeleteBenefit}
          onViewActivity={(id) => handlePaidMemberPriceView(id, 'card-list')}
          onCreateActivityFromBenefit={handlePaidMemberPriceCreateFromBenefit}
          onGoToActivities={() => setView({ type: 'paid-member-price-list' })}
          onToast={showToast}
        />
      ) : view.type === 'paid-member-price-list' ? (
        <PaidMemberPriceActivityList
          activities={paidMemberPriceActivities}
          cards={paidMemberCards}
          onCreate={handlePaidMemberPriceCreate}
          onView={handlePaidMemberPriceView}
          onViewParticipation={(id) => setView({ type: 'paid-member-price-participation', activityId: id })}
          onEdit={handlePaidMemberPriceEdit}
          onCopy={handlePaidMemberPriceCopy}
          onPublish={handlePaidMemberPricePublishFromList}
          onPause={handlePaidMemberPricePause}
          onResume={handlePaidMemberPriceResume}
          onVoid={handlePaidMemberPriceVoid}
          onDelete={handlePaidMemberPriceDelete}
          onDemoSetPausedMinutes={handlePaidMemberPriceDemoSetPausedMinutes}
          onGoToCards={() => setView({ type: 'paid-member-card-list' })}
          onToast={showToast}
        />
      ) : view.type === 'paid-member-price-wizard' && paidMemberPriceDraft ? (
        <PaidMemberPriceActivityWizard
          activity={paidMemberPriceDraft}
          cards={paidMemberCards}
          memberPriceActivities={memberPriceActivities}
          mode={view.mode}
          initialStep={view.step}
          onChange={setPaidMemberPriceDraft}
          onCancel={closePaidMemberPriceWizard}
          onSaveDraft={handlePaidMemberPriceSaveDraft}
          onSave={handlePaidMemberPriceSave}
          onSwitchToEdit={() => setView({ type: 'paid-member-price-wizard', mode: 'edit', from: view.from })}
          onGoToCards={() => setView({ type: 'paid-member-card-list' })}
          onToast={showToast}
        />
      ) : view.type === 'full-reduction-participation' && fullReductionParticipationActivity ? (
        <FullReductionParticipationRecords
          activity={fullReductionParticipationActivity}
          onBack={() => setView({ type: 'full-reduction-list' })}
          onExport={() => showToast('导出任务已创建，请稍后在下载中心查看')}
        />
      ) : view.type === 'full-reduction-participation' ? (
        <div className="page-card">
          <div className="table-empty">未找到活动</div>
          <button type="button" className="btn btn--default" onClick={() => setView({ type: 'full-reduction-list' })}>返回列表</button>
        </div>
      ) : view.type === 'list' ? (
        <ActivityList
          activities={activities}
          linkedConsumerActivityId={linkedConsumerActivityId}
          onCreate={handleCreate}
          onView={handleView}
          onViewParticipation={(id) => {
            setParticipationScope([id])
            setView({ type: 'activity-participation', activityId: id })
          }}
          onViewAllParticipation={() => {
            setParticipationScope([])
            setView({ type: 'activity-participation' })
          }}
          onEdit={handleEdit}
          onCopy={handleCopy}
          onPublish={handlePublishFromList}
          onPause={handlePause}
          onResume={handleResume}
          onDemoSetPausedMinutes={handleDemoSetPausedMinutes}
          onVoid={handleVoid}
          onLinkConsumerDemo={handleLinkConsumerDemo}
          onUnlinkConsumerDemo={handleUnlinkConsumerDemo}
          onSimulateStoreClosure={handleSimulateStoreClosure}
          onToast={showToast}
        />
      ) : view.type === 'multi-item-list' ? (
        <MultiItemActivityList
          activities={multiItemActivities}
          onCreate={handleMultiItemCreate}
          onView={handleMultiItemView}
          onViewParticipation={(id) => setView({ type: 'multi-item-participation', activityId: id })}
          onEdit={handleMultiItemEdit}
          onCopy={handleMultiItemCopy}
          onPublish={handleMultiItemPublishFromList}
          onPause={handleMultiItemPause}
          onResume={handleMultiItemResume}
          onDemoSetPausedMinutes={handleMultiItemDemoSetPausedMinutes}
          onVoid={handleMultiItemVoid}
          onDelete={handleMultiItemDelete}
          onToast={showToast}
        />
      ) : view.type === 'member-price-list' ? (
        <MemberPriceActivityList
          activities={memberPriceActivities}
          onCreate={handleMemberPriceCreate}
          onOpenSettings={() => setView({ type: 'member-price-settings' })}
          onView={handleMemberPriceView}
          onViewParticipation={(id) => setView({ type: 'member-price-participation', activityId: id })}
          onEdit={handleMemberPriceEdit}
          onCopy={handleMemberPriceCopy}
          onPublish={handleMemberPricePublishFromList}
          onPause={handleMemberPricePause}
          onResume={handleMemberPriceResume}
          onDemoSetPausedMinutes={handleMemberPriceDemoSetPausedMinutes}
          onVoid={handleMemberPriceVoid}
          onDelete={handleMemberPriceDelete}
          onToast={showToast}
        />
      ) : view.type === 'member-price-settings' ? (
        <MemberPriceGeneralSettingsPage
          onBack={() => setView({ type: 'member-price-list' })}
          onSaved={() => showToast('会员价通用设置已保存')}
        />
      ) : view.type === 'stored-value-pay-list' ? (
        <StoredValuePayActivityList
          activities={storedValuePayActivities}
          onCreate={handleStoredValuePayCreate}
          onView={handleStoredValuePayView}
          onViewParticipation={(id) => setView({ type: 'stored-value-pay-participation', activityId: id })}
          onEdit={handleStoredValuePayEdit}
          onCopy={handleStoredValuePayCopy}
          onPublish={handleStoredValuePayPublishFromList}
          onPause={handleStoredValuePayPause}
          onResume={handleStoredValuePayResume}
          onDemoSetPausedMinutes={handleStoredValuePayDemoSetPausedMinutes}
          onVoid={handleStoredValuePayVoid}
          onDelete={handleStoredValuePayDelete}
          onToast={showToast}
        />
      ) : view.type === 'enterprise-discount-list' ? (
        <EnterpriseDiscountActivityList
          activities={enterpriseDiscountActivities}
          onCreate={handleEnterpriseDiscountCreate}
          onView={handleEnterpriseDiscountView}
          onViewParticipation={(id) => setView({ type: 'enterprise-discount-participation', activityId: id })}
          onEdit={handleEnterpriseDiscountEdit}
          onCopy={handleEnterpriseDiscountCopy}
          onPublish={handleEnterpriseDiscountPublishFromList}
          onPause={handleEnterpriseDiscountPause}
          onResume={handleEnterpriseDiscountResume}
          onDemoSetPausedMinutes={handleEnterpriseDiscountDemoSetPausedMinutes}
          onVoid={handleEnterpriseDiscountVoid}
          onDelete={handleEnterpriseDiscountDelete}
          onToast={showToast}
        />
      ) : view.type === 'full-reduction-list' ? (
        <FullReductionActivityList
          activities={fullReductionActivities}
          onCreate={handleFullReductionCreate}
          onView={handleFullReductionView}
          onViewParticipation={(id) => setView({ type: 'full-reduction-participation', activityId: id })}
          onEdit={handleFullReductionEdit}
          onCopy={handleFullReductionCopy}
          onPublish={handleFullReductionPublishFromList}
          onPause={handleFullReductionPause}
          onResume={handleFullReductionResume}
          onDemoSetPausedMinutes={handleFullReductionDemoSetPausedMinutes}
          onVoid={handleFullReductionVoid}
          onDelete={handleFullReductionDelete}
          onToast={showToast}
        />
      ) : view.type === 'delivery-fee-list' ? (
        <DeliveryFeeActivityList
          activities={deliveryFeeActivities}
          onCreate={handleDeliveryFeeCreate}
          onView={handleDeliveryFeeView}
          onEdit={handleDeliveryFeeEdit}
          onCopy={handleDeliveryFeeCopy}
          onPublish={handleDeliveryFeePublishFromList}
          onVoid={handleDeliveryFeeVoid}
          onDelete={handleDeliveryFeeDelete}
          onToast={showToast}
        />
      ) : draft ? (
        <ActivityWizard
          activity={draft}
          mode={view.type === 'wizard' ? view.mode : 'create'}
          onChange={setDraft}
          onCancel={() => { setView({ type: 'list' }); setDraft(null) }}
          onSaveDraft={handleSaveDraft}
          onSave={handleSave}
          onSwitchToEdit={view.type === 'wizard' && view.mode === 'view' ? () => setView({ type: 'wizard', mode: 'edit' }) : undefined}
          onToast={showToast}
        />
      ) : multiItemDraft ? (
        <MultiItemActivityWizard
          activity={multiItemDraft}
          mode={view.type === 'multi-item-wizard' ? view.mode : 'create'}
          onChange={setMultiItemDraft}
          onCancel={() => { setView({ type: 'multi-item-list' }); setMultiItemDraft(null) }}
          onSaveDraft={handleMultiItemSaveDraft}
          onSave={handleMultiItemSave}
          onSwitchToEdit={view.type === 'multi-item-wizard' && view.mode === 'view' ? () => setView({ type: 'multi-item-wizard', mode: 'edit' }) : undefined}
          onToast={showToast}
        />
      ) : memberPriceDraft ? (
        <MemberPriceActivityWizard
          activity={memberPriceDraft}
          mode={view.type === 'member-price-wizard' ? view.mode : 'create'}
          onChange={setMemberPriceDraft}
          onCancel={() => { setView({ type: 'member-price-list' }); setMemberPriceDraft(null) }}
          onSaveDraft={handleMemberPriceSaveDraft}
          onSave={handleMemberPriceSave}
          onSwitchToEdit={view.type === 'member-price-wizard' && view.mode === 'view' ? () => setView({ type: 'member-price-wizard', mode: 'edit' }) : undefined}
          onToast={showToast}
        />
      ) : storedValuePayDraft ? (
        <StoredValuePayActivityWizard
          activity={storedValuePayDraft}
          mode={view.type === 'stored-value-pay-wizard' ? view.mode : 'create'}
          onChange={setStoredValuePayDraft}
          onCancel={() => { setView({ type: 'stored-value-pay-list' }); setStoredValuePayDraft(null) }}
          onSaveDraft={handleStoredValuePaySaveDraft}
          onSave={handleStoredValuePaySave}
          onSwitchToEdit={view.type === 'stored-value-pay-wizard' && view.mode === 'view' ? () => setView({ type: 'stored-value-pay-wizard', mode: 'edit' }) : undefined}
          onToast={showToast}
        />
      ) : enterpriseDiscountDraft ? (
        <EnterpriseDiscountActivityWizard
          activity={enterpriseDiscountDraft}
          mode={view.type === 'enterprise-discount-wizard' ? view.mode : 'create'}
          onChange={setEnterpriseDiscountDraft}
          onCancel={() => { setView({ type: 'enterprise-discount-list' }); setEnterpriseDiscountDraft(null) }}
          onSaveDraft={handleEnterpriseDiscountSaveDraft}
          onSave={handleEnterpriseDiscountSave}
          onSwitchToEdit={view.type === 'enterprise-discount-wizard' && view.mode === 'view' ? () => setView({ type: 'enterprise-discount-wizard', mode: 'edit' }) : undefined}
          onToast={showToast}
        />
      ) : fullReductionDraft ? (
        <FullReductionActivityWizard
          activity={fullReductionDraft}
          mode={view.type === 'full-reduction-wizard' ? view.mode : 'create'}
          onChange={setFullReductionDraft}
          onCancel={() => { setView({ type: 'full-reduction-list' }); setFullReductionDraft(null) }}
          onSaveDraft={handleFullReductionSaveDraft}
          onSave={handleFullReductionSave}
          onSwitchToEdit={view.type === 'full-reduction-wizard' && view.mode === 'view' ? () => setView({ type: 'full-reduction-wizard', mode: 'edit' }) : undefined}
          onToast={showToast}
        />
      ) : deliveryFeeDraft ? (
        <DeliveryFeeActivityWizard
          activity={deliveryFeeDraft}
          mode={view.type === 'delivery-fee-wizard' ? view.mode : 'create'}
          onChange={setDeliveryFeeDraft}
          onCancel={() => { setView({ type: 'delivery-fee-list' }); setDeliveryFeeDraft(null) }}
          onSaveDraft={handleDeliveryFeeSaveDraft}
          onSave={handleDeliveryFeeSave}
          onSwitchToEdit={view.type === 'delivery-fee-wizard' && view.mode === 'view' ? () => setView({ type: 'delivery-fee-wizard', mode: 'edit' }) : undefined}
          onToast={showToast}
        />
      ) : null}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </AdminLayout>
  )
}

export default App
