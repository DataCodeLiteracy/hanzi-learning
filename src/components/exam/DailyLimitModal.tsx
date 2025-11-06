"use client"
import ConfirmModal from "@/components/ConfirmModal"

interface Props {
  show: boolean
  grade: number
  onClose: () => void
}

export default function DailyLimitModal({ show, grade, onClose }: Props) {
  return (
    <ConfirmModal
      isOpen={show}
      onClose={onClose}
      onConfirm={onClose}
      title='오늘 시험 완료'
      message={`오늘은 이미 ${grade}급 시험을 완료했습니다.\n내일 다시 시도해주세요.`}
      confirmText='메인 페이지로 돌아가기'
      type='info'
      showCancel={false}
      showCloseButton={false}
    />
  )
}
