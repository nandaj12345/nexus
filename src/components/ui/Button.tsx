import React from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-brand-600 hover:bg-brand-500 text-white shadow-glow/30 hover:shadow-glow',
  secondary: 'bg-bg-elevated hover:bg-bg-hover text-text-primary border border-bg-border',
  ghost:     'bg-transparent hover:bg-bg-elevated text-text-secondary hover:text-text-primary',
  danger:    'bg-dnd/10 hover:bg-dnd/20 text-dnd border border-dnd/30',
  success:   'bg-online/10 hover:bg-online/20 text-online border border-online/30',
}

const SIZES: Record<Size, string> = {
  xs: 'px-2 py-1 text-xs rounded-lg gap-1',
  sm: 'px-3 py-1.5 text-sm rounded-xl gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-base rounded-2xl gap-2',
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-150 select-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANTS[variant]}
        ${SIZES[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className="flex-shrink-0 ml-auto">{iconRight}</span>
      )}
    </button>
  )
}

export default Button
