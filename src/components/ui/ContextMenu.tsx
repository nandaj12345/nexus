import React, { useEffect, useRef } from 'react'

export interface MenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
  separator?: boolean
  disabled?: boolean
}

interface ContextMenuProps {
  items: MenuItem[]
  position: { x: number; y: number }
  onClose: () => void
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ items, position, onClose }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [onClose])

  // Adjust position to stay in viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(position.y, window.innerHeight - 300),
    left: Math.min(position.x, window.innerWidth - 200),
    zIndex: 9999,
  }

  return (
    <div
      ref={ref}
      style={style}
      className="w-48 bg-bg-primary border border-bg-border rounded-xl shadow-popup py-1 animate-scale-in"
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {item.separator && i > 0 && (
            <div className="my-1 border-t border-bg-border" />
          )}
          <button
            onClick={() => { item.onClick(); onClose() }}
            disabled={item.disabled}
            className={`
              w-full flex items-center gap-2 px-3 py-2 text-sm text-left
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              ${item.danger
                ? 'text-dnd hover:bg-dnd/10'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }
            `}
          >
            {item.icon && <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>}
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  )
}

export default ContextMenu
