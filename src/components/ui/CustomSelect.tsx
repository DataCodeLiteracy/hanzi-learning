"use client"

import {
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
  useMemo,
  useId,
  useCallback,
} from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"
import { CustomInput } from "@/components/ui/CustomInput"

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
  /** 값이 비어 있을 때 목록을 이 옵션 위치로 스크롤 */
  initialScrollToValue?: string
}

type MenuPosition = {
  left: number
  width: number
  top?: number
  bottom?: number
  maxHeight: number
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
  initialScrollToValue,
}: CustomSelectProps) {
  const autoId = useId()
  const listboxId = idProp ?? `custom-select-${autoId}`
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const [query, setQuery] = useState("")
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query, searchable])

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? placeholder

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return
    const trig = triggerRef.current.getBoundingClientRect()
    const below = window.innerHeight - trig.bottom - 12
    const above = trig.top - 12
    const up = below < 140 && above > below
    const maxHeight = up
      ? Math.min(280, above - 8)
      : Math.min(280, below - 8)

    setMenuPosition({
      left: trig.left,
      width: trig.width,
      maxHeight,
      ...(up
        ? { bottom: window.innerHeight - trig.top + 4 }
        : { top: trig.bottom + 4 }),
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null)
      return
    }
    updateMenuPosition()
  }, [open, filtered.length, updateMenuPosition])

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
    const onReposition = () => updateMenuPosition()

    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    window.addEventListener("resize", onReposition)
    window.addEventListener("scroll", onReposition, true)

    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
      window.removeEventListener("resize", onReposition)
      window.removeEventListener("scroll", onReposition, true)
    }
  }, [open, updateMenuPosition])

  useLayoutEffect(() => {
    if (!open || !listRef.current) return
    const scrollTarget = value || initialScrollToValue
    if (!scrollTarget) return

    const scrollToTarget = () => {
      const target = listRef.current?.querySelector(
        `[data-option-value="${scrollTarget}"]`
      )
      target?.scrollIntoView({ block: "center", behavior: "instant" })
    }

    scrollToTarget()
    requestAnimationFrame(scrollToTarget)
  }, [open, value, initialScrollToValue, filtered.length])

  const menu =
    open && menuPosition && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role='listbox'
            aria-labelledby={listboxId}
            className='fixed z-[200] rounded-xl border border-slate-200 bg-white shadow-xl flex flex-col overflow-hidden'
            style={{
              left: menuPosition.left,
              width: menuPosition.width,
              top: menuPosition.top,
              bottom: menuPosition.bottom,
              maxHeight: menuPosition.maxHeight,
            }}
          >
            {searchable && (
              <div className='p-2 border-b border-slate-100 shrink-0'>
                <CustomInput
                  type='search'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            )}
            <ul ref={listRef} className='overflow-y-auto flex-1 py-1 min-h-0'>
              {filtered.length === 0 ? (
                <li className='px-3 py-2 text-sm text-gray-500 text-center'>
                  결과 없음
                </li>
              ) : (
                filtered.map((opt) => (
                  <li
                    key={opt.value}
                    role='option'
                    aria-selected={opt.value === value}
                    data-option-value={opt.value}
                  >
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
          </div>,
          document.body
        )
      : null

  return (
    <>
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
            w-full flex items-center justify-between gap-2 px-3.5 py-2.5 border border-slate-200 rounded-xl
            bg-white text-left text-sm font-medium text-gray-900 shadow-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed transition-shadow
            ${open ? "ring-2 ring-blue-500 border-blue-500" : ""}
            ${buttonClassName}
          `}
        >
          <span
            className={`truncate ${!value ? "text-gray-400 font-normal" : ""}`}
          >
            {selectedLabel}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>
      </div>
      {menu}
    </>
  )
}
