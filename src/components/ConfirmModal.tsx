"use client"

import { X, AlertTriangle, Info, CheckCircle } from "lucide-react"

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: "warning" | "info" | "success"
  showCancel?: boolean
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
      default:
        return <AlertTriangle className='h-6 w-6 text-red-600' />
    }
  }

  const getConfirmButtonClass = () => {
    switch (type) {
      case "warning":
        return "bg-red-600 hover:bg-red-700"
      case "info":
        return "bg-blue-600 hover:bg-blue-700"
      case "success":
        return "bg-green-600 hover:bg-green-700"
      default:
        return "bg-red-600 hover:bg-red-700"
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* 배경 오버레이 */}
      <div
        className='absolute inset-0'
        style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
        onClick={onClose}
      />

      {/* 모달 */}
      <div className='relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6'>
        {/* 헤더 */}
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center space-x-3'>
            {getIcon()}
            <h3 className='text-lg font-semibold text-gray-900'>{title}</h3>
          </div>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 transition-colors'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* 메시지 */}
        <p className='text-gray-600 mb-6'>{message}</p>

        {/* 버튼 */}
        <div className='flex justify-end space-x-3'>
          {showCancel && (
            <button
              onClick={onClose}
              className='px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors'
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`px-4 py-2 text-white rounded-md transition-colors ${getConfirmButtonClass()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
