import { useId, useState, type ReactNode } from 'react'
import { ActivityProductSearchFields } from './ActivityProductSearchFields'

type QuickField = 'keyword' | 'productName' | 'productId'

export interface ActivitySearchChip {
  key: string
  label: string
  clear: () => void
}

interface ActivityListSearchPanelProps {
  values: Record<QuickField, string>
  resultCount: number
  onChange: (field: QuickField, value: string) => void
  onReset: () => void
  advancedFields: ReactNode
  advancedFilters: ActivitySearchChip[]
  keywordLabel?: string
  keywordPlaceholder?: string
}

export function ActivityListSearchPanel({
  values,
  resultCount,
  onChange,
  onReset,
  advancedFields,
  advancedFilters,
  keywordLabel = '活动名称 / ID',
  keywordPlaceholder = '搜索活动名称或活动 ID',
}: ActivityListSearchPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const advancedId = useId()
  const keywordId = useId()
  const chips: ActivitySearchChip[] = []

  if (values.keyword.trim()) {
    chips.push({ key: 'keyword', label: `活动：${values.keyword.trim()}`, clear: () => onChange('keyword', '') })
  }
  if (values.productName.trim()) {
    chips.push({
      key: 'productName', label: `商品名称：${values.productName.trim()}`, clear: () => onChange('productName', ''),
    })
  }
  if (values.productId.trim()) {
    chips.push({
      key: 'productId', label: `商品 ID：${values.productId.trim()}`, clear: () => onChange('productId', ''),
    })
  }
  chips.push(...advancedFilters)

  const reset = () => {
    onReset()
    setExpanded(false)
  }

  return (
    <>
      <div className="activity-search-panel">
        <div className="activity-search-panel__quick">
          <div className="filter-item activity-search-panel__activity">
            <label htmlFor={keywordId}>{keywordLabel}</label>
            <input
              id={keywordId}
              className="input input--filter"
              value={values.keyword}
              onChange={(event) => onChange('keyword', event.target.value)}
              placeholder={keywordPlaceholder}
            />
          </div>
          <ActivityProductSearchFields values={values} onChange={onChange} />
          <div className="activity-search-panel__actions">
            <button
              type="button"
              className={`activity-search-panel__expand ${expanded ? 'is-expanded' : ''}`}
              onClick={() => setExpanded((open) => !open)}
              aria-expanded={expanded}
              aria-controls={advancedId}
            >
              <IconFilter />
              高级筛选
              {advancedFilters.length > 0 && <span className="activity-search-panel__count">{advancedFilters.length}</span>}
              <IconChevron />
            </button>
          </div>
        </div>
        {expanded && <div id={advancedId} className="activity-search-panel__advanced">{advancedFields}</div>}
      </div>

      {chips.length > 0 && (
        <div className="activity-search-active" role="group" aria-label="已生效筛选条件">
          <span className="activity-search-active__result">找到 {resultCount} 条活动</span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="activity-search-active__chip"
              onClick={chip.clear}
              aria-label={`移除筛选条件：${chip.label}`}
              title={`移除${chip.label}`}
            >
              <span>{chip.label}</span><span aria-hidden="true">×</span>
            </button>
          ))}
          <button type="button" className="activity-search-active__clear" onClick={reset}><IconReset />清空筛选</button>
        </div>
      )}
    </>
  )
}

function IconFilter() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M7 12h10m-7 6h4" /></svg>
}

function IconChevron() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m6 9 6 6 6-6" /></svg>
}

function IconReset() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7v5h5M20 17v-5h-5" /><path d="M5.8 10A7 7 0 0 1 18 7m.2 7A7 7 0 0 1 6 17" /></svg>
}
