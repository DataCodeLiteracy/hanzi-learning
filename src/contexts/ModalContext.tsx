"use client"

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"
import ConfirmModal from "@/components/ConfirmModal"
import type { ModalType } from "@/components/ConfirmModal"

const DEFAULT_TITLES: Record<ModalType, string> = {
  success: "성공",
  error: "오류",
  warning: "확인",
  info: "알림",
}

export interface AlertOptions {
  title?: string
  type?: ModalType
  confirmText?: string
}

export interface ConfirmDialogOptions {
  title?: string
  type?: ModalType
  confirmText?: string
  cancelText?: string
}

interface ModalContextValue {
  alert: (message: string, options?: AlertOptions) => void
  confirm: (message: string, options?: ConfirmDialogOptions) => Promise<boolean>
}

const ModalContext = createContext<ModalContextValue | null>(null)

interface ModalState {
  isOpen: boolean
  mode: "alert" | "confirm"
  title: string
  message: string
  type: ModalType
  confirmText: string
  cancelText: string
}

const initialState: ModalState = {
  isOpen: false,
  mode: "alert",
  title: "",
  message: "",
  type: "info",
  confirmText: "확인",
  cancelText: "취소",
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>(initialState)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
    resolveRef.current = null
  }, [])

  const alert = useCallback((message: string, options?: AlertOptions) => {
    const type = options?.type ?? "info"
    resolveRef.current = null
    setState({
      isOpen: true,
      mode: "alert",
      title: options?.title ?? DEFAULT_TITLES[type],
      message,
      type,
      confirmText: options?.confirmText ?? "확인",
      cancelText: "취소",
    })
  }, [])

  const confirm = useCallback(
    (message: string, options?: ConfirmDialogOptions) => {
      const type = options?.type ?? "warning"
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve
        setState({
          isOpen: true,
          mode: "confirm",
          title: options?.title ?? "확인",
          message,
          type,
          confirmText: options?.confirmText ?? "확인",
          cancelText: options?.cancelText ?? "취소",
        })
      })
    },
    []
  )

  const handleClose = useCallback(() => {
    if (state.mode === "confirm") {
      resolveRef.current?.(false)
    }
    close()
  }, [state.mode, close])

  const handleConfirm = useCallback(() => {
    if (state.mode === "confirm") {
      resolveRef.current?.(true)
    }
    close()
  }, [state.mode, close])

  return (
    <ModalContext.Provider value={{ alert, confirm }}>
      {children}
      <ConfirmModal
        isOpen={state.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={state.title}
        message={state.message}
        type={state.type}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        showCancel={state.mode === "confirm"}
      />
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider")
  }
  return context
}
