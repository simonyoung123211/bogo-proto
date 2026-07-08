import type { StorageDisplayRule } from '../types'

export function formatStorageDisplayRule(rule: StorageDisplayRule): string {
  return rule === 'with_physical' ? '与实物赠品同时展示' : '仅实物赠品无库存时展示'
}
