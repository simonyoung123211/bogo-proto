import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'warn' | 'error'

interface ToastProps {
  message: string
  type?: ToastType
  onClose: () => void
}

const TOAST_ICON: Record<ToastType, string> = {
  success: '✓',
  warn: '!',
  error: '!',
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 200)
    }, 2800)
    return () => clearTimeout(timer)
  }, [onClose, message, type])

  return (
    <div
      className={`toast toast--${type} ${visible ? 'toast--visible' : ''}`}
      role={type === 'success' ? 'status' : 'alert'}
    >
      <span className="toast__icon" aria-hidden>{TOAST_ICON[type]}</span>
      {message}
    </div>
  )
}

/** 按文案语义推断提示类型，避免防呆/失败仍显示成功绿勾 */
export function inferToastType(message: string): ToastType {
  if (/失败|错误|异常|无法保存|无法发布|无法恢复|同步失败/.test(message)) return 'error'
  if (/不可|请先|未找到|冲突|上限|不能|禁止|勿|已满|未通过|排除后没有/.test(message)) return 'warn'
  return 'success'
}
