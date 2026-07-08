import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  onClose: () => void
}

export function Toast({ message, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 200)
    }, 2800)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`toast ${visible ? 'toast--visible' : ''}`}>
      <span className="toast__icon">✓</span>
      {message}
    </div>
  )
}
