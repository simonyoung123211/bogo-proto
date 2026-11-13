import assert from 'node:assert/strict'
import { createServer } from 'vite'

// Run from the project root with node scripts/test-discount-areas.mjs.
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false } })
try {
  const { createEmptyLimitDiscountActivity } = await server.ssrLoadModule('/src/mockLimitDiscountData.ts')
  const { findDiscountConflicts } = await server.ssrLoadModule('/src/utils/limitDiscountConflicts.ts')
  const { matchesDiscountEntry, retainEligibleAreaIds } = await server.ssrLoadModule('/src/utils/limitDiscountScope.ts')
  const { migrateLimitDiscountActivity, collectStepErrors } = await server.ssrLoadModule('/src/utils/limitDiscountActivity.ts')
  const original = { ...createEmptyLimitDiscountActivity(), id: 'original', status: 'pending', orderTypes: ['pack'],
    startTime: '2026-11-01 00:00:00', endTime: '2026-12-01 00:00:00',
    areaMode: 'specified', areaIdsByStore: { s2: ['library'], s5: ['cafe'] } }
  const target = { ...original, id: 'target', areaIdsByStore: { s2: ['cafe'], s5: ['library'] } }
  const overlapping = { ...target, areaIdsByStore: { s2: ['library', 'cafe'], s5: ['library'] } }
  const hits = (candidate, other = original) => findDiscountConflicts(candidate, [other])
  assert.deepEqual(hits(target), [])
  assert.deepEqual(hits(overlapping)[0].stores.map(({ id, areas }) => [id, areas]), [['s2', ['图书馆']]])
  assert.equal(findDiscountConflicts(overlapping, [original, { ...original, id: 'other' }]).length, 2)
  const legacy = { ...original }
  delete legacy.areaMode
  delete legacy.areaIdsByStore
  const old = migrateLimitDiscountActivity(legacy)
  assert.equal(old.areaMode, 'all')
  assert.equal(hits(target, old)[0].stores.length, 2)
  assert.equal(hits({ ...target, areaMode: 'all' }, old)[0].stores[0].areas, null)
  assert.deepEqual(hits(overlapping, { ...original, id: target.id }), [])
  for (const status of ['draft', 'ended', 'voided']) assert.deepEqual(hits(overlapping, { ...original, status }), [])
  assert.deepEqual(hits({ ...overlapping, channels: ['pos'] }), [])
  assert.deepEqual(hits({ ...overlapping, orderTypes: ['delivery'] }), [])
  assert.deepEqual(hits({ ...overlapping, storeMode: 'exclude', storeIds: ['s2'] }), [])
  assert.deepEqual(hits({ ...overlapping, storeMode: 'tag_include', storeTagIds: ['flagship'] }), [])
  const item = { productId: 'p1' }
  assert.deepEqual(hits({ ...overlapping, goodsScope: 'include', productItems: [item] }, { ...original, goodsScope: 'exclude', productItems: [item] }), [])
  assert.deepEqual(hits({ ...overlapping, cycleType: 'weekly', weekDays: [1] }, { ...original, cycleType: 'weekly', weekDays: [7] }), [])
  const monday = { ...overlapping, cycleType: 'weekly', weekDays: [1] }
  assert.deepEqual(hits(monday, { ...original, cycleType: 'monthly', monthDays: [1] }), [])
  assert.ok(hits(monday, { ...original, cycleType: 'monthly', monthDays: [2] })[0].time.startsWith('2026-11-02'))
  const slot = (start, end) => ({ id: 'slot', start, end })
  assert.deepEqual(hits({ ...overlapping, timeSlotType: 'specific', timeSlots: [slot('10:00', '12:00')] },
    { ...original, timeSlotType: 'specific', timeSlots: [slot('12:00', '13:00')] }), [])
  assert.deepEqual(hits({ ...overlapping, inactiveRanges: [slot('2026-11-01', '2026-11-30')] }), [])
  const holiday = { startTime: '2026-10-01 00:00:00', endTime: '2026-10-02 00:00:00' }
  assert.deepEqual(hits({ ...overlapping, ...holiday, holidayInactive: true }, { ...original, ...holiday }), [])
  assert.ok(hits({ ...overlapping, startTime: '2026-11-14 10:00:00', endTime: '2026-11-14 11:00:00', holidayInactive: true }).length)
  assert.deepEqual(collectStepErrors({ ...target, areaIdsByStore: {} }, 1), ['请至少选择一家参与门店的一个点餐区域'])
  assert.deepEqual(retainEligibleAreaIds({ ...target, storeMode: 'include', storeIds: ['s5'] }).areaIdsByStore, { s5: ['library'] })
  assert.ok(matchesDiscountEntry(target, 's2', 'cafe'))
  assert.equal(matchesDiscountEntry(target, 's5', 'cafe'), false)
  assert.equal(matchesDiscountEntry(target, 's2', null), false)
  assert.ok(matchesDiscountEntry(old, 's2', null))
  console.log('通过：逐店交叉、存量迁移、状态、商品、时段周期、节假日、门店标签和点餐入口。')
} finally {
  await server.close()
}
