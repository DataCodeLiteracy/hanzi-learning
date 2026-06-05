"use client"

import { X, AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react"
import { CustomButton, type ButtonVariant } from "@/components/ui/CustomButton"

export type ModalType = "warning" | "info" | "success" | "error"

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: ModalType
  showCancel?: boolean
  showCloseButton?: boolean
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "확인",
  cancelText = "취소",
  type = "warning",
  showCancel = true,
  showCloseButton = true,
}: ConfirmModalProps) {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case "warning":
        return <AlertTriangle className='h-6 w-6 text-red-600' />
      case "info":
        return <Info className='h-6 w-6 text-blue-600' />
      case "success":
        return <CheckCircle className='h-6 w-6 text-green-600' />
      case "error":
        return <XCircle className='h-6 w-6 text-red-600' />
      default:
        return <AlertTriangle className='h-6 w-6 text-red-600' />
    }
  }

  const getConfirmVariant = (): ButtonVariant => {
    switch (type) {
      case "warning":
      case "error":
        return "dangerSolid"
      case "success":
        return "success"
      default:
        return "primary"
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* 배경 오버레이 */}
      <div
        className='absolute inset-0 bg-black/70'
        onClick={onClose}
      />

      {/* 모달 */}
      <div className='relative bg-white rounded-2xl shadow-xl w-full mx-4 p-6 border border-slate-100' style={{ maxWidth: '500px' }}>
        {/* 헤더 */}
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center space-x-3'>
            {getIcon()}
            <h3 className='text-lg font-semibold text-gray-900'>{title}</h3>
          </div>
          {showCloseButton && (
            <CustomButton
              variant='ghost'
              size='md'
              onClick={onClose}
              className='!p-2 !min-w-0 text-gray-400 hover:text-gray-600 !bg-transparent hover:!bg-slate-100'
              aria-label='닫기'
            >
              <X className='h-5 w-5' />
            </CustomButton>
          )}
        </div>

        {/* 메시지 */}
        <p className='text-gray-600 mb-6 whitespace-pre-line'>{message}</p>

        {/* 버튼 */}
        <div className={`flex gap-3 ${showCancel ? "justify-end" : "justify-center"}`}>
          {showCancel && (
            <CustomButton variant='ghost' size='md' onClick={onClose}>
              {cancelText}
            </CustomButton>
          )}
          <CustomButton
            variant={getConfirmVariant()}
            size='md'
            onClick={onConfirm}
            className={!showCancel ? "w-full" : ""}
          >
            {confirmText}
          </CustomButton>
        </div>
      </div>
    </div>
  )
}
