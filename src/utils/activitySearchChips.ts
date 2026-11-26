import type { ActivitySearchChip } from '../components/ActivityListSearchPanel'

export interface AdvancedSearchField<T extends object> {
  key: keyof T
  label: string
  options?: Record<string, string>
}

/** 根据筛选值与默认值生成可单独移除的高级条件。 */
export function createAdvancedSearchChips<T extends object>(
  values: T,
  defaults: T,
  fields: AdvancedSearchField<T>[],
  onChange: (patch: Partial<T>) => void,
): ActivitySearchChip[] {
  return fields.flatMap(({ key, label, options }) => {
    const value = values[key]
    if (value === defaults[key]) return []
    const display = options?.[String(value)] ?? String(value)
    return [{
      key: String(key),
      label: `${label}：${display}`,
      clear: () => onChange({ [key]: defaults[key] } as Partial<T>),
    }]
  })
}
