import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true, hmr: false, ws: false },
})

try {
  const { CITY_NAME_MAP, createEmptyDeliveryFeeActivity } = await server.ssrLoadModule('/src/mockDeliveryFeeData.ts')
  const { findDeliveryFeeConflicts, migrateDeliveryFeeActivity, validateBeforeSave, validateStep } =
    await server.ssrLoadModule('/src/utils/deliveryFeeActivity.ts')
  const thresholdType = 'amount'
  const tiers = [{ id: 'first', threshold: 39, discountMethod: 'amount_off', discountValue: 3 }]
  const group = (name, cityIds) => ({ id: name, name, cityIds, thresholdType, tiers })
  const existing = {
    ...createEmptyDeliveryFeeActivity(),
    id: 'existing',
    name: '原快递优惠',
    status: 'in_progress',
    startTime: '2026-11-21 00:00:00',
    endTime: '2026-11-24 23:59:59',
    ruleMode: 'by_city',
    storeScope: 'partial',
    storeIds: ['s1'],
    cityRuleGroups: [group('华东组', ['c-sh']), group('原华南组', ['c-gz'])],
  }
  const activity = {
    ...existing,
    id: 'target',
    name: '多组快递优惠',
    status: 'draft',
    cityRuleGroups: [group('新华东组', ['c-hz']), group('新华南组', ['c-gz'])],
  }
  const hits = (target, other = existing) => findDeliveryFeeConflicts(target, [other])

  assert.deepEqual(hits(activity)[0].cityOverlap, ['c-gz'])
  assert.match(validateBeforeSave(activity, [existing]), /广州市（本活动 「新华南组」 \/ 对方活动 「原华南组」）/)
  assert.deepEqual(hits({ ...activity, cityRuleGroups: [group('新华东组', ['c-hz']), group('新华南组', ['c-dg'])] }), [])
  assert.deepEqual(hits({ ...activity, storeIds: ['s2'] }), [])
  assert.deepEqual(hits({ ...activity, startTime: '2026-11-25 00:00:00', endTime: '2026-11-30 23:59:59' }), [])
  assert.deepEqual(hits({ ...activity, ruleMode: 'national', orderTypes: ['takeaway'] }), [])
  for (const status of ['draft', 'voided']) {
    assert.deepEqual(hits(activity, { ...existing, status }), [])
  }

  const nationwide = { ...activity, ruleMode: 'national', offerMode: 'by_member_level' }
  assert.deepEqual(hits(nationwide)[0].cityOverlap, ['c-sh', 'c-gz'])
  assert.deepEqual(hits(nationwide, { ...existing, ruleMode: 'national' })[0].regionReason, 'both_national')
  assert.match(validateStep({ ...activity, offerMode: 'by_member_level' }, 0), /不可同时使用/)
  assert.match(validateStep({ ...activity, cityRuleGroups: [group('空组', [])] }, 0), /空组/)
  assert.match(validateStep({
    ...activity,
    cityRuleGroups: [group('首组', ['c-gz']), group('次组', ['c-gz'])],
  }, 0), /广州市同时在「首组」和「次组」/)

  const elevenGroups = Object.keys(CITY_NAME_MAP).slice(0, 11).map((cityId) => group(cityId, [cityId]))
  assert.equal(validateBeforeSave({ ...activity, cityRuleGroups: elevenGroups.slice(0, 10) }, []), null)
  const overLimit = migrateDeliveryFeeActivity({ ...activity, cityRuleGroups: elevenGroups })
  assert.equal(overLimit.cityRuleGroups.length, 11)
  assert.match(validateStep(overLimit, 0), /城市组上限为 10 组/)
  assert.match(validateBeforeSave(overLimit, []), /城市组上限为 10 组/)

  const legacy = {
    ...existing,
    cityRuleGroups: undefined,
    cityIds: ['c-gz', 'c-sz2'],
    thresholdType,
    tiers,
  }
  const migrated = migrateDeliveryFeeActivity(legacy)
  assert.deepEqual(migrated.cityRuleGroups.map(({ cityIds, thresholdType, tiers }) => (
    { cityIds, thresholdType, tiers }
  )), [{ cityIds: legacy.cityIds, thresholdType, tiers }])
  assert.equal(validateStep(migrated, 0), null)
  const oldCombination = migrateDeliveryFeeActivity({
    ...legacy,
    offerMode: 'by_member_level',
    memberLevelRules: { silver: { thresholdType, tiers } },
  })
  assert.deepEqual(oldCombination.cityRuleGroups[0].cityIds, legacy.cityIds)
  assert.deepEqual(oldCombination.memberLevelRules.silver.tiers, tiers)
  assert.match(validateStep(oldCombination, 0), /不可同时使用/)
  assert.deepEqual(migrateDeliveryFeeActivity(existing).cityRuleGroups, existing.cityRuleGroups)
  assert.deepEqual(migrateDeliveryFeeActivity({ ...legacy, cityRuleGroups: [] }).cityRuleGroups, [])

  const waived = [{ id: 'free', threshold: 0, discountMethod: 'waive', discountValue: 0 }]
  const oldMulti = {
    ...legacy,
    cityRuleGroups: [group('旧首组', ['c-gz']), { ...group('旧次组', ['c-sh']), thresholdType: 'none', tiers: waived }],
  }
  assert.deepEqual(migrateDeliveryFeeActivity(oldMulti).cityRuleGroups[1].tiers, waived)
  console.log('Delivery fee city groups passed')
} finally {
  await server.close()
}
