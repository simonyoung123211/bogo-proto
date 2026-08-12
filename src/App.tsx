import { useCallback, useState } from 'react'
import { Toast } from './components/Toast'
import { AdminLayout } from './layout/AdminLayout'
import { ActivityList } from './pages/ActivityList'
import { ActivityParticipationRecords } from './pages/ActivityParticipationRecords'
import { ActivityWizard } from './pages/ActivityWizard'
import { FullReductionActivityList } from './pages/FullReductionActivityList'
import { FullReductionActivityWizard } from './pages/FullReductionActivityWizard'
import { FullReductionParticipationRecords } from './pages/FullReductionParticipationRecords'
import { MemberPriceActivityList } from './pages/MemberPriceActivityList'
import { MemberPriceActivityWizard } from './pages/MemberPriceActivityWizard'
import { MemberPriceGeneralSettingsPage } from './pages/MemberPriceGeneralSettings'
import { MemberPriceParticipationRecords } from './pages/MemberPriceParticipationRecords'
import { MultiItemActivityList } from './pages/MultiItemActivityList'
import { MultiItemActivityWizard } from './pages/MultiItemActivityWizard'
import { MultiItemParticipationRecords } from './pages/MultiItemParticipationRecords'
import { OrderList } from './pages/OrderList'
import { OrderDetail } from './pages/OrderDetail'
import { createEmptyActivity, getCreatorProfile } from './mockData'
import { createEmptyFullReductionActivity } from './mockFullReductionData'
import { createEmptyMemberPriceActivity } from './mockMemberPriceData'
import { createEmptyMultiItemActivity } from './mockMultiItemData'
import type { ActivityForm, FullReductionActivityForm, MemberPriceActivityForm, MultiItemActivityForm, PageView } from './types'
import { appendActivityLog, cloneActivity, computePublishStatus } from './utils/activity'
import {
  appendActivityLog as appendFullReductionLog,
  cloneActivity as cloneFullReductionActivity,
  computePublishStatus as computeFullReductionPublishStatus,
} from './utils/fullReductionActivity'
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
  loadActivities,
  loadFullReductionActivities,
  loadMemberPriceActivities,
  loadMultiItemActivities,
  saveActivities,
  saveFullReductionActivities,
  saveMemberPriceActivities,
  saveMultiItemActivities,
} from './utils/storage'
import {
  getDemoBridgeSourceId,
  pushDemoBogoBridge,
  setDemoBridgeSourceId,
  syncLinkedBogoIfNeeded,
} from './utils/demoBogoBridge'
import './styles.css'

function App() {
  const [activities, setActivities] = useState<ActivityForm[]>(loadActivities)
  const [multiItemActivities, setMultiItemActivities] = useState<MultiItemActivityForm[]>(loadMultiItemActivities)
  const [memberPriceActivities, setMemberPriceActivities] = useState<MemberPriceActivityForm[]>(loadMemberPriceActivities)
  const [fullReductionActivities, setFullReductionActivities] = useState<FullReductionActivityForm[]>(loadFullReductionActivities)
  const [view, setView] = useState<PageView>({ type: 'list' })
  const [draft, setDraft] = useState<ActivityForm | null>(null)
  const [multiItemDraft, setMultiItemDraft] = useState<MultiItemActivityForm | null>(null)
  const [memberPriceDraft, setMemberPriceDraft] = useState<MemberPriceActivityForm | null>(null)
  const [fullReductionDraft, setFullReductionDraft] = useState<FullReductionActivityForm | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [linkedConsumerActivityId, setLinkedConsumerActivityId] = useState<string | null>(() => getDemoBridgeSourceId())

  const showToast = useCallback((msg: string) => setToast(msg), [])
  const currentOperator = getCreatorProfile('10086')

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

  const persistFullReduction = (next: FullReductionActivityForm[]) => {
    setFullReductionActivities(next)
    saveFullReductionActivities(next)
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

  const upsertFullReduction = (activity: FullReductionActivityForm) => {
    const exists = fullReductionActivities.some((a) => a.id === activity.id)
    const next = exists
      ? fullReductionActivities.map((a) => (a.id === activity.id ? activity : a))
      : [activity, ...fullReductionActivities]
    persistFullReduction(next)
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

  const handleFullReductionCreate = () => {
    setFullReductionDraft(createEmptyFullReductionActivity())
    setView({ type: 'full-reduction-wizard', mode: 'create' })
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

  const handleFullReductionEdit = (id: string) => {
    const activity = fullReductionActivities.find((a) => a.id === id)
    if (!activity) return
    setFullReductionDraft({ ...activity })
    setView({ type: 'full-reduction-wizard', mode: 'edit' })
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

  const handleFullReductionView = (id: string) => {
    const activity = fullReductionActivities.find((a) => a.id === id)
    if (!activity) return
    setFullReductionDraft({ ...activity })
    setView({ type: 'full-reduction-wizard', mode: 'view' })
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

  const handleFullReductionCopy = (id: string) => {
    const activity = fullReductionActivities.find((a) => a.id === id)
    if (!activity) return
    const copy = cloneFullReductionActivity(activity)
    persistFullReduction([copy, ...fullReductionActivities])
    setFullReductionDraft(copy)
    setView({ type: 'full-reduction-wizard', mode: 'copy' })
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
    upsertMemberPrice(appendMemberPriceLog({ ...activity, status: 'voided' }, '作废活动', `作废活动「${activity.name}」`, currentOperator))
    showToast('活动已作废')
  }

  const handleFullReductionVoid = (id: string) => {
    const activity = fullReductionActivities.find((a) => a.id === id)
    if (!activity) return
    upsertFullReduction(appendFullReductionLog({ ...activity, status: 'voided' }, '作废活动', `作废活动「${activity.name}」`, currentOperator))
    showToast('活动已作废')
  }

  const handleMultiItemDelete = (id: string) => {
    persistMultiItem(multiItemActivities.filter((a) => a.id !== id))
    showToast('活动已删除')
  }

  const handleMemberPriceDelete = (id: string) => {
    persistMemberPrice(memberPriceActivities.filter((a) => a.id !== id))
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
      ? appendMemberPriceLog({ ...memberPriceDraft, status: 'draft' }, '编辑活动', `保存草稿「${memberPriceDraft.name}」`, currentOperator)
      : { ...memberPriceDraft, status: 'draft' as const }
    upsertMemberPrice(saved)
    showToast('草稿保存成功')
    setView({ type: 'member-price-list' })
    setMemberPriceDraft(null)
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

  const handleSave = () => {
    if (!draft) return
    upsert(appendActivityLog({ ...draft, status: 'pending' }, '保存活动', `保存活动「${draft.name}」`, currentOperator))
    showToast('活动保存成功，请前往活动列表发布')
    setView({ type: 'list' })
    setDraft(null)
  }

  const handleMultiItemSave = () => {
    if (!multiItemDraft) return
    upsertMultiItem(appendMultiItemLog({ ...multiItemDraft, status: 'pending' }, '保存活动', `保存活动「${multiItemDraft.name}」`, currentOperator))
    showToast('活动保存成功，请前往活动列表发布')
    setView({ type: 'multi-item-list' })
    setMultiItemDraft(null)
  }

  const handleMemberPriceSave = () => {
    if (!memberPriceDraft) return
    upsertMemberPrice(appendMemberPriceLog({ ...memberPriceDraft, status: 'pending' }, '保存活动', `保存活动「${memberPriceDraft.name}」`, currentOperator))
    showToast('活动保存成功，请前往活动列表发布')
    setView({ type: 'member-price-list' })
    setMemberPriceDraft(null)
  }

  const handleFullReductionSave = () => {
    if (!fullReductionDraft) return
    upsertFullReduction(appendFullReductionLog({ ...fullReductionDraft, status: 'pending' }, '保存活动', `保存活动「${fullReductionDraft.name}」`, currentOperator))
    showToast('活动保存成功，请前往活动列表发布')
    setView({ type: 'full-reduction-list' })
    setFullReductionDraft(null)
  }

  const handleNavigate = (key: string) => {
    setDraft(null)
    setMultiItemDraft(null)
    setMemberPriceDraft(null)
    setFullReductionDraft(null)
    if (key === 'orders') {
      setView({ type: 'order-list' })
    } else if (key === 'bogo') {
      setView({ type: 'list' })
    } else if (key === 'half_item') {
      setView({ type: 'multi-item-list' })
    } else if (key === 'full_reduction') {
      setView({ type: 'full-reduction-list' })
    } else if (key === 'member_price') {
      setView({ type: 'member-price-list' })
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
  const isFullReductionModule = view.type === 'full-reduction-list'
    || view.type === 'full-reduction-wizard'
    || view.type === 'full-reduction-participation'
    || (view.type === 'order-detail' && view.from === 'full-reduction-participation')

  const isBogoParticipation = view.type === 'activity-participation'
    || (view.type === 'order-detail' && view.from === 'activity-participation')

  const activeKey = isOrderModule
    ? 'orders'
    : isMultiItemModule
      ? 'half_item'
      : isFullReductionModule
        ? 'full_reduction'
        : isMemberPriceModule
          ? 'member_price'
          : 'bogo'

  const participationActivity = view.type === 'activity-participation'
    ? activities.find((a) => a.id === view.activityId)
    : undefined

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

  const fullReductionParticipationActivity = view.type === 'full-reduction-participation'
    ? fullReductionActivities.find((a) => a.id === view.activityId)
    : view.type === 'order-detail' && view.from === 'full-reduction-participation' && view.activityId
      ? fullReductionActivities.find((a) => a.id === view.activityId)
      : undefined

  const breadcrumbs = isOrderModule
    ? view.type === 'order-list'
      ? ['营销管理', '订单管理', '订单查询']
      : ['营销管理', '订单管理', '订单查询', '订单详情']
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
      : isFullReductionModule
        ? view.type === 'full-reduction-list'
          ? ['营销管理', '促销活动', '满减/折']
          : view.type === 'full-reduction-participation' && fullReductionParticipationActivity
            ? ['营销管理', '促销活动', '满减/折', '参与记录']
            : view.type === 'full-reduction-wizard'
              ? ['营销管理', '促销活动', '满减/折', view.mode === 'create' ? '新建活动' : view.mode === 'view' ? '查看活动' : '编辑活动']
              : ['营销管理', '促销活动', '满减/折']
      : isMultiItemModule
        ? view.type === 'multi-item-list'
          ? ['营销管理', '促销活动', '第N件优惠']
          : view.type === 'multi-item-participation' && multiItemParticipationActivity
            ? ['营销管理', '促销活动', '第N件优惠', '参与记录']
            : view.type === 'multi-item-wizard'
              ? ['营销管理', '促销活动', '第N件优惠', view.mode === 'create' ? '新建活动' : view.mode === 'view' ? '查看活动' : '编辑活动']
              : ['营销管理', '促销活动', '第N件优惠']
        : isBogoParticipation && participationActivity
          ? ['营销管理', '促销活动', '买1送N', '参与记录']
          : view.type === 'list'
            ? ['营销管理', '促销活动', '买1送N']
            : view.type === 'wizard'
              ? ['营销管理', '促销活动', '买1送N', view.mode === 'create' ? '新建活动' : view.mode === 'view' ? '查看活动' : '编辑活动']
              : ['营销管理', '促销活动', '买1送N']

  return (
    <AdminLayout breadcrumbs={breadcrumbs} activeKey={activeKey} onNavigate={handleNavigate}>
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
            if (view.from === 'activity-participation' && view.activityId) {
              setView({ type: 'activity-participation', activityId: view.activityId })
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
      ) : view.type === 'activity-participation' && participationActivity ? (
        <ActivityParticipationRecords
          activity={participationActivity}
          onBack={() => setView({ type: 'list' })}
          onViewOriginalOrder={(orderId) => setView({ type: 'order-detail', orderId, from: 'activity-participation', activityId: participationActivity.id })}
          onExport={() => showToast('导出任务已创建，请稍后在下载中心查看')}
        />
      ) : view.type === 'activity-participation' ? (
        <div className="page-card">
          <div className="table-empty">未找到活动</div>
          <button type="button" className="btn btn--default" onClick={() => setView({ type: 'list' })}>返回列表</button>
        </div>
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
          onViewParticipation={(id) => setView({ type: 'activity-participation', activityId: id })}
          onEdit={handleEdit}
          onCopy={handleCopy}
          onPublish={handlePublishFromList}
          onVoid={handleVoid}
          onLinkConsumerDemo={handleLinkConsumerDemo}
          onUnlinkConsumerDemo={handleUnlinkConsumerDemo}
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
          onVoid={handleMemberPriceVoid}
          onDelete={handleMemberPriceDelete}
          onToast={showToast}
        />
      ) : view.type === 'member-price-settings' ? (
        <MemberPriceGeneralSettingsPage
          onBack={() => setView({ type: 'member-price-list' })}
          onSaved={() => showToast('会员价通用设置已保存')}
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
          onVoid={handleFullReductionVoid}
          onDelete={handleFullReductionDelete}
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
      ) : fullReductionDraft ? (
        <FullReductionActivityWizard
          activity={fullReductionDraft}
          mode={view.type === 'full-reduction-wizard' ? view.mode : 'create'}
          onChange={setFullReductionDraft}
          onCancel={() => { setView({ type: 'full-reduction-list' }); setFullReductionDraft(null) }}
          onSaveDraft={handleFullReductionSaveDraft}
          onSave={handleFullReductionSave}
          onSwitchToEdit={view.type === 'full-reduction-wizard' && view.mode === 'view' ? () => setView({ type: 'full-reduction-wizard', mode: 'edit' }) : undefined}
        />
      ) : null}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </AdminLayout>
  )
}

export default App
