"use client"

import { type InputHTMLAttributes, useId } from "react"

const baseClass =
  "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-gray-900 text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow appearance-none"

export interface CustomInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  className?: string
  label?: string
  suffix?: string
}

export function CustomInput({
  className = "",
  label,
  suffix,
  id: idProp,
  type = "text",
  ...props
}: CustomInputProps) {
  const autoId = useId()
  const id = idProp ?? autoId

  const input = (
    <input
      id={id}
      type={type}
      className={`${baseClass} ${type === "number" ? "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" : ""} ${className}`}
      {...props}
    />
  )

  if (!label && !suffix) {
    return input
  }

  return (
    <div className='space-y-1.5'>
      {label && (
        <label htmlFor={id} className='block text-sm font-medium text-gray-700'>
          {label}
        </label>
      )}
      {suffix ? (
        <div className='flex items-center gap-2'>
          <div className='flex-1 min-w-0'>{input}</div>
          <span className='text-sm text-gray-500 shrink-0 font-medium'>
            {suffix}
          </span>
        </div>
      ) : (
        input
      )}
    </div>
  )
}
