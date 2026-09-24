import type { StoreConfigIssue } from '../utils/storeClosure'
import { STORE_ISSUE_LABELS } from '../utils/storeClosure'

interface StoreConfigIssueBadgeProps {
  issue: StoreConfigIssue
  className?: string
}

export function StoreConfigIssueBadge({ issue, className = '' }: StoreConfigIssueBadgeProps) {
  return (
    <span className={`store-issue-badge store-issue-badge--${issue} ${className}`.trim()} title={STORE_ISSUE_LABELS[issue]}>
      {STORE_ISSUE_LABELS[issue]}
    </span>
  )
}
