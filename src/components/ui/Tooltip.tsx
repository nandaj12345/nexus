import React, { useState } from 'react'

interface TooltipProps {
  content: string
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  delay = 400,
}) => {
  const [visible, setVisible] = useState(false)
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    const t = setTimeout(() => setVisible(true), delay)
    setTimer(t)
  }

  const hide = () => {
    if (timer) clearTimeout(timer)
    setVisible(false)
  }

  const POSITION = {
    top:    '-top-9 left-1/2 -translate-x-1/2',
    bottom: '-bottom-9 left-1/2 -translate-x-1/2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          className={`
            absolute ${POSITION[side]} z-50 pointer-events-none
            px-2 py-1 text-xs font-medium text-white whitespace-nowrap
            bg-bg-primary border border-bg-border rounded-lg shadow-popup
            animate-fade-in
          `}
        >
          {content}
        </div>
      )}
    </div>
  )
}

export default Tooltip
