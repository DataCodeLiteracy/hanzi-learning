"use client"
import ConfirmModal from "@/components/ConfirmModal"

interface Props {
  show: boolean
  grade: number
  onStart: () => void
}

export default function ExamStartModal({ show, grade, onStart }: Props) {
  return (
    <ConfirmModal
      isOpen={show}
      onClose={() => {}}
      onConfirm={onStart}
      title='시험 준비 완료'
      message={`${grade}급 시험 문제가 준비되었습니다.\n시험을 시작하시겠습니까?`}
      confirmText='시험 시작하기'
      type='info'
      showCancel={false}
    />
  )
}
