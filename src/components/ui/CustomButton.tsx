"use client"

import { type ButtonHTMLAttributes, type ReactNode } from "react"
import { Loader2 } from "lucide-react"

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "outline"
  | "danger"
  | "dangerSolid"
  | "ghost"
  | "amber"

type ButtonSize = "md" | "lg"

export interface CustomButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  icon?: ReactNode
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm",
  secondary:
    "bg-slate-800 text-white hover:bg-slate-900 focus:ring-slate-500 shadow-sm",
  success:
    "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm",
  outline:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-400",
  danger:
    "bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-400 border border-red-100",
  dangerSolid:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm",
  ghost:
    "bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400",
  amber:
    "border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 focus:ring-amber-400",
}

const sizeClass: Record<ButtonSize, string> = {
  md: "px-4 py-2 text-sm",
  lg: "px-4 py-2.5 text-sm sm:text-base",
}

export function CustomButton({
  variant = "primary",
  size = "lg",
  fullWidth = false,
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  type = "button",
  ...props
}: CustomButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-semibold
        transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1
        disabled:opacity-50 disabled:pointer-events-none
        ${variantClass[variant]}
        ${sizeClass[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 className='h-4 w-4 animate-spin shrink-0' aria-hidden />
      ) : (
        icon
      )}
      {children}
    </button>
  )
}
