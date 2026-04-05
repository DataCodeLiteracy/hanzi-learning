"use client"

import {
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
  useMemo,
  useId,
} from "react"
import { ChevronDown } from "lucide-react"

export type CustomSelectOption = { value: string; label: string }

export interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: CustomSelectOption[]
  placeholder?: string
  className?: string
  buttonClassName?: string
  /** 옵션 라벨 안에서 부분 검색 */
  searchable?: boolean
  searchPlaceholder?: string
  disabled?: boolean
  id?: string
  "aria-label"?: string
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "선택",
  className = "",
  buttonClassName = "",
  searchable = false,
  searchPlaceholder = "검색…",
  disabled = false,
  id: idProp,
  "aria-label": ariaLabel,
}: CustomSelectProps) {
  const autoId = useId()
  const listboxId = idProp ?? `custom-select-${autoId}`
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const [menuMaxH, setMenuMaxH] = useState(240)
  const [query, setQuery] = useState("")
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query, searchable])

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? placeholder

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const trig = triggerRef.current.getBoundingClientRect()
    const below = window.innerHeight - trig.bottom - 12
    const above = trig.top - 12
    const up = below < 140 && above > below
    setOpenUp(up)
    setMenuMaxH(up ? Math.min(280, above - 8) : Math.min(280, below - 8))
  }, [open, filtered.length])

  useEffect(() => {
    if (!open) {
      setQuery("")
      return
    }
    const onDoc = (e: MouseEvent) => {
      const n = e.target as Node
      if (triggerRef.current?.contains(n) || menuRef.current?.contains(n))
        return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div className={`relative ${className}`}>
      <button
        type='button'
        id={listboxId}
        ref={triggerRef}
        disabled={disabled}
        aria-haspopup='listbox'
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-md
          bg-white text-left text-sm font-medium text-gray-900
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${buttonClassName}
        `}
      >
        <span className='truncate'>{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          role='listbox'
          aria-labelledby={listboxId}
          className={`
            absolute left-0 right-0 z-[200] rounded-md border border-gray-200 bg-white shadow-lg
            flex flex-col overflow-hidden
            ${openUp ? "bottom-full mb-1" : "top-full mt-1"}
          `}
          style={{ maxHeight: menuMaxH }}
        >
          {searchable && (
            <div className='p-2 border-b border-gray-100 shrink-0'>
              <input
                type='search'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className='w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          )}
          <ul className='overflow-y-auto flex-1 py-1 min-h-0'>
            {filtered.length === 0 ? (
              <li className='px-3 py-2 text-sm text-gray-500 text-center'>
                결과 없음
              </li>
            ) : (
              filtered.map((opt) => (
                <li key={opt.value} role='option' aria-selected={opt.value === value}>
                  <button
                    type='button'
                    className={`
                      w-full text-left px-3 py-2 text-sm transition-colors
                      ${
                        opt.value === value
                          ? "bg-blue-50 text-blue-900 font-medium"
                          : "text-gray-800 hover:bg-gray-50"
                      }
                    `}
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
