"use client"
import { useCallback, useState } from "react"

interface UseExamEngineParams {
  totalPatterns: number
  onSubmit: () => void
}

export function useExamEngine({
  totalPatterns,
  onSubmit,
}: UseExamEngineParams) {
  const [currentPattern, setCurrentPattern] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | number>>({})

  const handleAnswer = useCallback(
    (questionId: string, answer: string | number) => {
      setAnswers((prev) => ({ ...prev, [questionId]: answer }))
    },
    []
  )

  const handleNextPattern = useCallback(() => {
    if (currentPattern < totalPatterns - 1) {
      setCurrentPattern(currentPattern + 1)
      setCurrentQuestion(0)
    } else {
      onSubmit()
    }
  }, [currentPattern, totalPatterns, onSubmit])

  const handlePreviousPattern = useCallback(() => {
    if (currentPattern > 0) {
      setCurrentPattern(currentPattern - 1)
      setCurrentQuestion(0)
    }
  }, [currentPattern])

  return {
    currentPattern,
    setCurrentPattern,
    currentQuestion,
    setCurrentQuestion,
    answers,
    setAnswers,
    handleAnswer,
    handleNextPattern,
    handlePreviousPattern,
  }
}
