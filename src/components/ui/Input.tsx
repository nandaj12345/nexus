import React, { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  icon,
  iconRight,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-text-secondary uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full bg-bg-tertiary border border-bg-border rounded-xl
            px-4 py-2.5 text-sm text-text-primary placeholder-text-muted
            outline-none transition-all duration-150
            focus:border-brand-500 focus:bg-bg-elevated focus:ring-2 focus:ring-brand-500/20
            disabled:opacity-50 disabled:cursor-not-allowed
            ${icon ? 'pl-10' : ''}
            ${iconRight ? 'pr-10' : ''}
            ${error ? 'border-dnd focus:border-dnd focus:ring-dnd/20' : ''}
            ${className}
          `}
          {...props}
        />
        {iconRight && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
            {iconRight}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-dnd flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-text-muted">{hint}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-text-secondary uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={`
          w-full bg-bg-tertiary border border-bg-border rounded-xl
          px-4 py-2.5 text-sm text-text-primary placeholder-text-muted
          outline-none transition-all duration-150 resize-none
          focus:border-brand-500 focus:bg-bg-elevated focus:ring-2 focus:ring-brand-500/20
          ${error ? 'border-dnd' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-dnd">{error}</p>}
    </div>
  )
})

Textarea.displayName = 'Textarea'

export default Input
