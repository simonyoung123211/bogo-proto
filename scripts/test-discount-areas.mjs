import assert from 'node:assert/strict'
import { createServer } from 'vite'

// Run from the project root with node scripts/test-discount-areas.mjs.
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false } })
try {
  const { createEmptyLimitDiscountActivity } = await server.ssrLoadModule('/src/mockLimitDiscountData.ts')
  const { findDiscountConflicts, planDiscountConflictRemoval } = await server.ssrLoadModule('/src/utils/limitDiscountConflicts.ts')
  const { discountAreaCoverage, eligibleDiscountStores, matchesDiscountEntry, resolveDiscountStoreScope, retainEligibleAreaIds } =
    await server.ssrLoadModule('/src/utils/limitDiscountScope.ts')
  const { migrateLimitDiscountActivity, collectStepErrors, previewPrice, publishedLimitDiscountEditError } =
    await server.ssrLoadModule('/src/utils/limitDiscountActivity.ts')
  const original = { ...createEmptyLimitDiscountActivity(), id: 'original', status: 'pending', orderTypes: ['pack'],
    startTime: '2026-11-01 00:00:00', endTime: '2026-12-01 00:00:00',
    storeMode: 'include', storeIds: ['s2', 's5', 's8'],
    areaMode: 'specified', areaIdsByStore: { s2: ['library'], s5: ['cafe'] } }
  const target = { ...original, id: 'target', areaIdsByStore: { s2: ['cafe'], s5: ['library'] } }
  const overlapping = { ...target, areaIdsByStore: { s2: ['library', 'cafe'], s5: ['library'] } }
  const hits = (candidate, other = original) => findDiscountConflicts(candidate, [other])
  assert.deepEqual(hits(target), [])
  assert.deepEqual(hits(overlapping)[0].stores.map(({ id, areas }) => [id, areas]), [['s2', ['图书馆']]])
  assert.equal(findDiscountConflicts(overlapping, [original, { ...original, id: 'other' }]).length, 2)
  const repair = planDiscountConflictRemoval(overlapping, hits(overlapping))
  assert.equal(repair.kind, 'ready')
  assert.deepEqual(repair.before, { stores: 2, areas: 3 })
  assert.deepEqual(repair.after, { stores: 2, areas: 2 })
  assert.deepEqual(repair.next.areaIdsByStore, { s2: ['cafe'], s5: ['library'] })
  assert.deepEqual(hits(repair.next), [])
  const onlyConflict = { ...overlapping, areaIdsByStore: { s2: ['library'] } }
  assert.equal(planDiscountConflictRemoval(onlyConflict, hits(onlyConflict)).after.stores, 0)
  const multiPeers = [
    { ...original, id: 'morning', timeSlotType: 'specific', timeSlots: [{ id: 'morning', start: '09:00', end: '10:00' }],
      areaIdsByStore: { s2: ['library'] } },
    { ...original, id: 'noon', timeSlotType: 'specific', timeSlots: [{ id: 'noon', start: '11:00', end: '12:00' }],
      areaIdsByStore: { s2: ['library'], s5: ['library'] } },
    { ...original, id: 'evening', timeSlotType: 'specific', timeSlots: [{ id: 'evening', start: '17:00', end: '18:00' }],
      areaIdsByStore: { s2: ['library'] } },
  ]
  const multiConflicts = findDiscountConflicts(overlapping, multiPeers)
  assert.equal(multiConflicts.length, 3)
  const firstBatch = planDiscountConflictRemoval(overlapping, [multiConflicts[0]])
  assert.deepEqual(firstBatch.after, { stores: 2, areas: 2 })
  assert.deepEqual(findDiscountConflicts(firstBatch.next, multiPeers).map(({ activity, stores }) =>
    [activity.id, stores.map(({ id, areaIds }) => [id, areaIds])]), [['noon', [['s5', ['library']]]]])
  const allBatches = planDiscountConflictRemoval(overlapping, multiConflicts)
  assert.deepEqual(allBatches.after, { stores: 1, areas: 1 })
  assert.deepEqual(allBatches.next.areaIdsByStore, { s2: ['cafe'] })
  assert.deepEqual(findDiscountConflicts(allBatches.next, multiPeers), [])
  const saturated = { ...overlapping, areaIdsByStore: { s2: ['library'], s5: ['library'] } }
  assert.equal(planDiscountConflictRemoval(saturated, findDiscountConflicts(saturated, multiPeers)).after.stores, 0)
  assert.equal(planDiscountConflictRemoval(saturated, hits(saturated, multiPeers[0])).after.stores, 1)
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
  const reverseScope = { storeMode: 'exclude', storeIds: ['s2'] }
  assert.deepEqual(hits({ ...target, ...reverseScope })[0].stores.map(({ id, areaIds }) => [id, areaIds]), [['s5', ['cafe']]])
  assert.deepEqual(hits(target, { ...original, ...reverseScope })[0].stores.map(({ id, areaIds }) => [id, areaIds]), [['s5', ['library']]])
  const wholeStorePeer = { ...original, ...reverseScope }
  assert.deepEqual(hits({ ...target, ...reverseScope }, wholeStorePeer)[0].scenes, ['pack'])
  assert.ok(hits({ ...target, ...reverseScope }, wholeStorePeer)[0].stores.every(({ areaIds, storeWideScenes }) =>
    areaIds === null && storeWideScenes.includes('pack')))
  const item = { productId: 'p1' }
  assert.deepEqual(hits({ ...overlapping, goodsScope: 'include', productItems: [item] }, { ...original, goodsScope: 'exclude', productItems: [item] }), [])
  assert.deepEqual(hits({ ...overlapping, cycleType: 'weekly', weekDays: [1] }, { ...original, cycleType: 'weekly', weekDays: [7] }), [])
  const monday = { ...overlapping, cycleType: 'weekly', weekDays: [1] }
  assert.deepEqual(hits(monday, { ...original, cycleType: 'monthly', monthDays: [1] }), [])
  assert.ok(hits(monday, { ...original, cycleType: 'monthly', monthDays: [2] })[0].time.startsWith('2026-11-02'))
  const slot = (start, end) => ({ id: 'slot', start, end })
  const detailed = hits({ ...overlapping, goodsScope: 'include', productItems: [item, { productId: 'p2' }],
    timeSlotType: 'specific', timeSlots: [slot('10:00', '12:00')], inactiveRanges: [slot('2026-11-03', '2026-11-03')] },
  { ...original, goodsScope: 'include', productItems: [item], startTime: '2026-11-02 14:00:00', endTime: '2026-11-04 13:00:00' })[0]
  assert.deepEqual(detailed.dateRange, { start: '2026-11-02 14:00:00', end: '2026-11-04 13:00:00' })
  assert.equal(detailed.time, '2026-11-04 10:00:00–12:00:00')
  assert.deepEqual(detailed.productIds, ['p1'])
  assert.deepEqual(hits({ ...overlapping, timeSlotType: 'specific', timeSlots: [slot('10:00', '12:00')] },
    { ...original, timeSlotType: 'specific', timeSlots: [slot('12:00', '13:00')] }), [])
  assert.deepEqual(hits({ ...overlapping, inactiveRanges: [slot('2026-11-01', '2026-11-30')] }), [])
  const holiday = { startTime: '2026-10-01 00:00:00', endTime: '2026-10-02 00:00:00' }
  assert.deepEqual(hits({ ...overlapping, ...holiday, holidayInactive: true }, { ...original, ...holiday }), [])
  assert.ok(hits({ ...overlapping, startTime: '2026-11-14 10:00:00', endTime: '2026-11-14 11:00:00', holidayInactive: true }).length)
  assert.deepEqual(collectStepErrors({ ...target, areaIdsByStore: {} }, 1), ['请至少选择一家参与门店的一个点餐区域'])
  assert.deepEqual(retainEligibleAreaIds({ ...target, storeMode: 'include', storeIds: ['s5'] }).areaIdsByStore, { s5: ['library'] })
  const storeIdsFor = (scope) => eligibleDiscountStores({ ...target, ...scope }).map((store) => store.id)
  const allStores = { ...target, storeMode: 'all' }
  const candidateStoreIds = storeIdsFor({ storeMode: 'all' })
  const selectedTags = ['flagship', 'mall']
  const tagIncluded = storeIdsFor({ storeMode: 'tag_include', storeTagIds: selectedTags })
  assert.ok(tagIncluded.includes('s5') && tagIncluded.includes('s9') && !tagIncluded.includes('s2'))
  assert.deepEqual(storeIdsFor({ storeMode: 'tag_exclude', storeTagIds: selectedTags }),
    candidateStoreIds.filter((id) => !tagIncluded.includes(id)))
  assert.deepEqual(storeIdsFor({ storeMode: 'exclude', storeIds: ['s2', 's5'] }),
    candidateStoreIds.filter((id) => id !== 's2' && id !== 's5'))
  for (const storeMode of ['exclude', 'tag_include', 'tag_exclude']) {
    const incomplete = { ...target, storeMode, storeIds: [], storeTagIds: [] }
    assert.deepEqual(eligibleDiscountStores(incomplete), [])
    assert.equal(collectStepErrors(incomplete, 1).length, 1)
    assert.deepEqual(retainEligibleAreaIds(incomplete).areaIdsByStore, {})
    assert.equal(matchesDiscountEntry(incomplete, 's2', 'cafe'), false)
  }
  assert.deepEqual(retainEligibleAreaIds({ ...target, storeIds: [] }).areaIdsByStore, target.areaIdsByStore)
  for (const activity of [
    allStores,
    { ...target, ...reverseScope },
    { ...target, storeMode: 'tag_include', storeTagIds: selectedTags },
    { ...target, storeMode: 'tag_exclude', storeTagIds: selectedTags },
  ]) {
    const stores = eligibleDiscountStores(activity)
    const coverage = discountAreaCoverage(activity, stores)
    assert.equal(coverage.specified, false)
    assert.equal(coverage.coveredStoreCount, stores.length)
    assert.equal(coverage.selectedAreaCount, 0)
    assert.deepEqual(collectStepErrors(activity, 1), [])
    assert.ok(matchesDiscountEntry(activity, stores[0].id, null))
    for (const normalized of [migrateLimitDiscountActivity(activity), retainEligibleAreaIds(activity)]) {
      assert.equal(normalized.areaMode, 'all')
      assert.deepEqual(normalized.areaIdsByStore, {})
    }
  }
  assert.deepEqual(collectStepErrors({ ...target, storeMode: 'include', storeIds: ['s20'] }, 1),
    ['当前范围内没有可选点餐区，请调整门店范围或选择全部区域'])
  const allScope = resolveDiscountStoreScope(allStores)
  assert.equal(allScope.matchedStores.length, allScope.eligibleStores.length + 1)
  assert.deepEqual(allScope.policyExcludedStores.map(({ id }) => id), ['s8'])
  const excludedPolicyStore = resolveDiscountStoreScope({ ...target, storeMode: 'exclude', storeIds: ['s8'] })
  assert.deepEqual(excludedPolicyStore.policyExcludedStores, [])
  assert.deepEqual(excludedPolicyStore.eligibleStores, allScope.eligibleStores)
  const multiTag = resolveDiscountStoreScope({ ...target, storeMode: 'tag_include', storeTagIds: selectedTags })
  assert.equal(multiTag.tagMatches.filter(({ id }) => id === 's7').length, 1)
  assert.deepEqual(multiTag.policyExcludedStores.map(({ id }) => id), ['s8'])
  const policyArea = { ...target, areaIdsByStore: { s2: ['cafe'], s8: ['spa'] } }
  const areaCoverage = discountAreaCoverage(policyArea, eligibleDiscountStores(policyArea))
  assert.deepEqual(areaCoverage.selected.map(({ store }) => store.id), ['s2'])
  assert.deepEqual(retainEligibleAreaIds(policyArea).areaIdsByStore, { s2: ['cafe'] })
  assert.equal(matchesDiscountEntry(policyArea, 's8', 'spa'), false)
  assert.equal(matchesDiscountEntry({ ...policyArea, areaMode: 'all' }, 's8', null), false)
  assert.deepEqual(hits({ ...policyArea, areaIdsByStore: { s8: ['spa'] } },
    { ...original, areaIdsByStore: { s8: ['spa'] } }), [])
  assert.deepEqual(collectStepErrors({ ...policyArea, areaMode: 'all', storeMode: 'include', storeIds: ['s8'] }, 1),
    ['当前范围内没有可参与门店，请调整门店范围'])
  assert.ok(matchesDiscountEntry(target, 's2', 'cafe'))
  assert.equal(matchesDiscountEntry(target, 's5', 'cafe'), false)
  assert.equal(matchesDiscountEntry(target, 's2', null), false)
  assert.ok(matchesDiscountEntry(old, 's2', null))

  const mixed = { ...target, orderTypes: ['delivery', 'pack', 'dine_in'], storeMode: 'include', storeIds: ['s2', 's5', 's20'] }
  const mixedCoverage = discountAreaCoverage(mixed, eligibleDiscountStores(mixed))
  assert.equal(mixedCoverage.coveredStoreCount, 3)
  assert.equal(mixedCoverage.selectedAreaCount, 2)
  for (const scene of ['pack', 'dine_in']) {
    assert.ok(matchesDiscountEntry(mixed, 's2', 'cafe', scene))
    assert.equal(matchesDiscountEntry(mixed, 's2', null, scene), false)
    assert.equal(matchesDiscountEntry(mixed, 's20', null, scene), false)
  }
  assert.ok(matchesDiscountEntry(mixed, 's20', null, 'delivery'))
  assert.equal(matchesDiscountEntry(mixed, 's3', null, 'delivery'), false)
  assert.equal(matchesDiscountEntry(mixed, 's2', 'cafe', 'group_pack'), false)
  const scenePrices = { ...mixed, discountValue: 8, sceneDiscountValues: { delivery: 7, pack: 9 } }
  assert.equal(previewPrice({ price: 20 }, scenePrices, undefined, 'pack'), 18)
  assert.equal(previewPrice({ price: 20 }, scenePrices, undefined, 'delivery'), 14)

  const nonAreaOnly = { ...mixed, orderTypes: ['delivery', 'delivery_pickup', 'group_dine_in', 'group_pack'] }
  assert.deepEqual(collectStepErrors({ ...nonAreaOnly, areaIdsByStore: {} }, 1), [])
  assert.equal(discountAreaCoverage(nonAreaOnly, eligibleDiscountStores(nonAreaOnly)).specified, false)
  assert.ok(matchesDiscountEntry(nonAreaOnly, 's20', null, 'group_dine_in'))
  for (const normalized of [migrateLimitDiscountActivity(nonAreaOnly), retainEligibleAreaIds(nonAreaOnly)]) {
    assert.equal(normalized.areaMode, 'all')
    assert.deepEqual(normalized.areaIdsByStore, {})
  }

  const mixedPeer = { ...original, orderTypes: ['pack', 'delivery'], storeMode: 'include', storeIds: mixed.storeIds }
  const storeOverlap = hits(mixed, mixedPeer)[0]
  assert.deepEqual(storeOverlap.scenes, ['delivery'])
  assert.deepEqual(storeOverlap.stores.map(({ id, areaIds, storeWideScenes }) => [id, areaIds, storeWideScenes]),
    [['s2', null, ['delivery']], ['s5', null, ['delivery']], ['s20', null, ['delivery']]])
  assert.equal(planDiscountConflictRemoval(mixed, [storeOverlap]).kind, 'unavailable')
  const bothScopes = hits({ ...mixed, areaIdsByStore: overlapping.areaIdsByStore }, mixedPeer)[0]
  assert.deepEqual(bothScopes.scenes, ['delivery', 'pack'])
  assert.deepEqual(bothScopes.stores[0].areaIds, ['library'])
  assert.deepEqual(bothScopes.stores[0].storeWideScenes, ['delivery'])
  const lastPoint = { ...mixed, areaIdsByStore: { s2: ['library'] } }
  const lastPointPlan = planDiscountConflictRemoval(lastPoint, hits(lastPoint))
  assert.equal(lastPointPlan.kind, 'ready')
  assert.deepEqual(lastPointPlan.after, { stores: 3, areas: 0 })
  assert.equal(lastPointPlan.canApply, false)

  const existingProduct = { productId: 'p1', discountValue: 8, sceneDiscountValues: { pack: 7 }, stock: 10 }
  const live = { ...target, status: 'in_progress', goodsScope: 'include', channels: ['wechat_mp'], productItems: [existingProduct] }
  const extend = { ...live, endTime: '2026-12-02 00:00:00', channels: [...live.channels, 'pos'],
    productItems: [...live.productItems, { productId: 'p2', discountValue: 8, sceneDiscountValues: {}, stock: null }] }
  assert.equal(publishedLimitDiscountEditError(live, extend), undefined)
  assert.ok(publishedLimitDiscountEditError(live, { ...extend, discountMethod: 'reduce' }))
  assert.ok(publishedLimitDiscountEditError(live, { ...extend, endTime: '2026-11-30 00:00:00' }))
  assert.ok(publishedLimitDiscountEditError(live, { ...extend, channels: ['pos'] }))
  assert.ok(publishedLimitDiscountEditError(live, { ...extend, productItems: [{ ...existingProduct, discountValue: 7 }] }))
  assert.ok(publishedLimitDiscountEditError(live, { ...extend, productItems: extend.productItems.slice(1) }))
  console.log('通过：业务与区域联动、区域范围、多场冲突与分批重算、发布后锁定、时段周期、门店策略、标签去重和点餐入口。')
} finally {
  await server.close()
}
