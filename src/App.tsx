import { useCallback, useState } from 'react'
import { Toast } from './components/Toast'
import { AdminLayout } from './layout/AdminLayout'
import { ActivityList } from './pages/ActivityList'
import { ActivityParticipationRecords } from './pages/ActivityParticipationRecords'
import { ActivityWizard } from './pages/ActivityWizard'
import { MultiItemActivityList } from './pages/MultiItemActivityList'
import { MultiItemActivityWizard } from './pages/MultiItemActivityWizard'
import { MultiItemParticipationRecords } from './pages/MultiItemParticipationRecords'
import { OrderList } from './pages/OrderList'
import { OrderDetail } from './pages/OrderDetail'
import { createEmptyActivity, getCreatorProfile } from './mockData'
import { createEmptyMultiItemActivity } from './mockMultiItemData'
import type { ActivityForm, MultiItemActivityForm, PageView } from './types'
import { appendActivityLog, cloneActivity, computePublishStatus } from './utils/activity'
import {
  appendActivityLog as appendMultiItemLog,
  cloneActivity as cloneMultiItemActivity,
  computePublishStatus as computeMultiItemPublishStatus,
} from './utils/multiItemActivity'
import { loadActivities, loadMultiItemActivities, saveActivities, saveMultiItemActivities } from './utils/storage'
import './styles.css'

function App() {
  const [activities, setActivities] = useState<ActivityForm[]>(loadActivities)
  const [multiItemActivities, setMultiItemActivities] = useState<MultiItemActivityForm[]>(loadMultiItemActivities)
  const [view, setView] = useState<PageView>({ type: 'list' })
  const [draft, setDraft] = useState<ActivityForm | null>(null)
  const [multiItemDraft, setMultiItemDraft] = useState<MultiItemActivityForm | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => setToast(msg), [])
  const currentOperator = getCreatorProfile('10086')

  const persist = (next: ActivityForm[]) => {
    setActivities(next)
    saveActivities(next)
  }

  const persistMultiItem = (next: MultiItemActivityForm[]) => {
    setMultiItemActivities(next)
    saveMultiItemActivities(next)
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

  const handleCreate = () => {
    setDraft(createEmptyActivity())
    setView({ type: 'wizard', mode: 'create' })
  }

  const handleMultiItemCreate = () => {
    setMultiItemDraft(createEmptyMultiItemActivity())
    setView({ type: 'multi-item-wizard', mode: 'create' })
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
    }
  }

  const handleMultiItemView = (id: string) => {
    const activity = multiItemActivities.find((a) => a.id === id)
    if (!activity) return
    setMultiItemDraft({ ...activity })
    setView({ type: 'multi-item-wizard', mode: 'view' })
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

  const handleMultiItemDelete = (id: string) => {
    persistMultiItem(multiItemActivities.filter((a) => a.id !== id))
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

  const handleNavigate = (key: string) => {
    setDraft(null)
    setMultiItemDraft(null)
    if (key === 'orders') {
      setView({ type: 'order-list' })
    } else if (key === 'bogo') {
      setView({ type: 'list' })
    } else if (key === 'half_item') {
      setView({ type: 'multi-item-list' })
    }
  }

  const isOrderModule = view.type === 'order-list' || view.type === 'order-detail'
  const isMultiItemModule = view.type === 'multi-item-list'
    || view.type === 'multi-item-wizard'
    || view.type === 'multi-item-participation'
    || (view.type === 'order-detail' && view.from === 'multi-item-participation')

  const isBogoParticipation = view.type === 'activity-participation'
    || (view.type === 'order-detail' && view.from === 'activity-participation')

  const activeKey = isOrderModule ? 'orders' : isMultiItemModule ? 'half_item' : 'bogo'

  const participationActivity = view.type === 'activity-participation'
    ? activities.find((a) => a.id === view.activityId)
    : undefined

  const multiItemParticipationActivity = view.type === 'multi-item-participation'
    ? multiItemActivities.find((a) => a.id === view.activityId)
    : view.type === 'order-detail' && view.from === 'multi-item-participation' && view.activityId
      ? multiItemActivities.find((a) => a.id === view.activityId)
      : undefined

  const breadcrumbs = isOrderModule
    ? view.type === 'order-list'
      ? ['营销管理', '订单管理', '订单查询']
      : ['营销管理', '订单管理', '订单查询', '订单详情']
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
      ) : view.type === 'list' ? (
        <ActivityList
          activities={activities}
          onCreate={handleCreate}
          onView={handleView}
          onViewParticipation={(id) => setView({ type: 'activity-participation', activityId: id })}
          onEdit={handleEdit}
          onCopy={handleCopy}
          onPublish={handlePublishFromList}
          onVoid={handleVoid}
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
      ) : null}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </AdminLayout>
  )
}

export default App
