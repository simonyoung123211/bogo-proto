import { useState } from 'react'
import type { CouponGiftConfig } from '../types'
import { CouponTemplatePicker } from './CouponTemplatePicker'
import { MaxStorageCouponsField } from './MaxStorageCouponsField'
import { StorageCouponDescriptionField } from './StorageCouponDescriptionField'

interface CouponGiftConfigPanelProps {
  config: CouponGiftConfig
  mode?: 'buyA' | 'buyB'
  /** 买A送B 赠品组序号，从 0 起；仅第 2 组（index=1）支持寄存券展示规则 */
  giftGroupIndex?: number
  maxStoragePerOrder?: number
  storageDescription?: string
  readOnly?: boolean
  onChange: (config: CouponGiftConfig) => void
  onMaxStorageChange?: (value: number) => void
  onDescriptionChange?: (value: string) => void
}

export function CouponGiftConfigPanel({
  config,
  mode = 'buyB',
  giftGroupIndex = 0,
  maxStoragePerOrder = 50,
  storageDescription = '',
  readOnly,
  onChange,
  onMaxStorageChange,
  onDescriptionChange,
}: CouponGiftConfigPanelProps) {
  const [showPicker, setShowPicker] = useState(false)
  const isBuyA = mode === 'buyA'
  const showStorageDisplayRule = isBuyA ? false : giftGroupIndex === 1

  const storageTips = isBuyA
    ? {
        intro:
          '开启赠品转寄存券后，用户可选择当单不领取赠品，改为领取 1 张【商品券】，下次消费时核销使用。',
        template:
          '买A送A 场景下，仅支持选择「动态适用门店 + 动态适用商品」类型的【商品券】模版；适用门店以用户下单门店为准，适用商品以用户选择寄存的同款商品为准。',
        member:
          '游客用户不可参与寄存，须授权手机号注册为会员后方可领取，优惠券仅发放给会员。',
      }
    : {
        intro:
          '开启赠品转寄存券后，用户可选择当单不要实物赠品，改为领取 1 张【商品券】，下次消费时核销使用。',
        template:
          '买A送B 场景下，仅支持选择非「动态适用商品」的【商品券】模版；券模版中配置的商品须包含当前赠品组内的实物赠品。适用门店支持「指定门店」或「动态门店」：动态门店以下单门店为准，指定门店以券模版配置的门店为准。',
        member:
          '游客用户不可参与寄存，须授权手机号注册为会员后方可领取，优惠券仅发放给会员。',
      }

  const update = <K extends keyof CouponGiftConfig>(key: K, value: CouponGiftConfig[K]) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="coupon-gift-panel">
      <div className="form-row">
        <label className="form-label"><span className="required">*</span>赠品寄存</label>
        <div className="form-control">
          <div className="radio-group">
            <label className="radio">
              <input
                type="radio"
                disabled={readOnly}
                checked={!config.storageEnabled}
                onChange={() => update('storageEnabled', false)}
              />
              关闭
            </label>
            <label className="radio">
              <input
                type="radio"
                disabled={readOnly}
                checked={config.storageEnabled}
                onChange={() => update('storageEnabled', true)}
              />
              开启
            </label>
          </div>
        </div>
      </div>

      {config.storageEnabled && (
        <>
          <div className="coupon-gift-tips">
            <p>{storageTips.intro}</p>
            <p>{storageTips.template}</p>
            <p className="coupon-gift-tips--warn">{storageTips.member}</p>
          </div>

          {isBuyA ? (
            <>
              <div className="form-row form-row--top">
                <label className="form-label">寄存券模版</label>
                <div className="form-control">
                  {!readOnly && (
                    <button type="button" className="link-btn link-btn--add" onClick={() => setShowPicker(true)}>
                      + 选择券模版
                    </button>
                  )}
                  {config.couponTemplate ? (
                    <table className="table table--gift" style={{ marginTop: 8 }}>
                      <thead>
                        <tr>
                          <th>优惠券模版ID</th>
                          <th>优惠券名称</th>
                          <th>优惠券类型</th>
                          <th>优惠券有效期</th>
                          {!readOnly && <th>操作</th>}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="mono">{config.couponTemplate.id}</td>
                          <td>{config.couponTemplate.name}</td>
                          <td>{config.couponTemplate.type}</td>
                          <td>
                            <span className="validity-tag">发放当日</span>
                            <input
                              type="text"
                              className="input input--validity"
                              disabled={readOnly}
                              value={`${config.couponTemplate.validityDaysMin}-${config.couponTemplate.validityDaysMax}`}
                              readOnly
                            />
                          </td>
                          {!readOnly && (
                            <td>
                              <button
                                type="button"
                                className="link-btn"
                                onClick={() => update('couponTemplate', null)}
                              >
                                移除
                              </button>
                            </td>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <p className="field-hint">请选择1个优惠券模版</p>
                  )}
                </div>
              </div>
              <StorageCouponDescriptionField
                value={storageDescription}
                readOnly={readOnly}
                onChange={(v) => onDescriptionChange?.(v)}
              />
              <MaxStorageCouponsField
                value={maxStoragePerOrder}
                readOnly={readOnly}
                onChange={(v) => onMaxStorageChange?.(v)}
              />
            </>
          ) : (
            <>
              <div className="form-row form-row--top">
                <label className="form-label">寄存券模版</label>
                <div className="form-control">
                  {!readOnly && (
                    <button type="button" className="link-btn link-btn--add" onClick={() => setShowPicker(true)}>
                      + 选择券模版
                    </button>
                  )}
                  {config.couponTemplate ? (
                    <table className="table table--gift" style={{ marginTop: 8 }}>
                      <thead>
                        <tr>
                          <th>优惠券模版ID</th>
                          <th>优惠券名称</th>
                          <th>优惠券类型</th>
                          <th>优惠券有效期</th>
                          {!readOnly && <th>操作</th>}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="mono">{config.couponTemplate.id}</td>
                          <td>{config.couponTemplate.name}</td>
                          <td>{config.couponTemplate.type}</td>
                          <td>
                            <span className="validity-tag">发放当日</span>
                            <input
                              type="text"
                              className="input input--validity"
                              disabled={readOnly}
                              value={`${config.couponTemplate.validityDaysMin}-${config.couponTemplate.validityDaysMax}`}
                              readOnly
                            />
                          </td>
                          {!readOnly && (
                            <td>
                              <button
                                type="button"
                                className="link-btn"
                                onClick={() => update('couponTemplate', null)}
                              >
                                移除
                              </button>
                            </td>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <p className="field-hint">请选择1个优惠券模版</p>
                  )}
                </div>
              </div>

              {showStorageDisplayRule && (
                <div className="form-row form-row--top">
                  <label className="form-label"><span className="required">*</span>寄存券展示规则</label>
                  <div className="form-control">
                    <div className="radio-group radio-group--vertical">
                      <label className="radio">
                        <input
                          type="radio"
                          disabled={readOnly}
                          checked={config.storageDisplayRule === 'with_physical'}
                          onChange={() => update('storageDisplayRule', 'with_physical')}
                        />
                        与实物赠品同时展示
                      </label>
                      <label className="radio">
                        <input
                          type="radio"
                          disabled={readOnly}
                          checked={config.storageDisplayRule === 'when_physical_no_stock'}
                          onChange={() => update('storageDisplayRule', 'when_physical_no_stock')}
                        />
                        仅实物赠品无库存时展示
                      </label>
                    </div>
                    <p className="field-hint">
                      {config.storageDisplayRule === 'with_physical'
                        ? '小程序端将同时展示实物赠品与寄存券赠品，用户可自由选择领取方式。'
                        : '小程序端默认展示实物赠品；仅当实物赠品库存不足时，才展示寄存券赠品供用户选择。'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {showPicker && (
        <CouponTemplatePicker
          selected={config.couponTemplate}
          onSelect={(t) => update('couponTemplate', t)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
