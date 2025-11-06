"use client"
import { useState } from "react"
import { resultKey, experienceAppliedKey } from "@/lib/examKeys"
import {
  SaveExamStatisticsResponseSchema,
  UpdateExperienceResponseSchema,
  UpdateStudyTimeResponseSchema,
} from "@/lib/schemas/exam"
import {
  getSelectedOptionText,
  isCorrectAnswer,
} from "@/lib/optionUtils"
import type { CorrectAnswerItem, ExamQuestionDetail } from "@/types/exam"

export interface ScoreSummary {
  answeredCount: number
  unansweredCount: number
  correctCount: number
  pointsPerQuestion: number
  score: number
}

export function useExamActions() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const computeScore = (
    answers: Record<string, string | number>,
    correctAnswersArray: Array<string | number>,
    totalQuestions: number
  ): ScoreSummary => {
    let correctCount = 0
    let answeredCount = 0
    for (let i = 0; i < totalQuestions; i++) {
      const qid = `q_${i}`
      const userAnswer = answers[qid]
      if (
        userAnswer !== undefined &&
        userAnswer !== null &&
        userAnswer !== ""
      ) {
        answeredCount++
        if (userAnswer === correctAnswersArray[i]) correctCount++
      }
    }
    const unansweredCount = totalQuestions - answeredCount
    const pointsPerQuestion = totalQuestions > 0 ? 100 / totalQuestions : 0
    const score = Math.round(correctCount * pointsPerQuestion)
    return {
      answeredCount,
      unansweredCount,
      correctCount,
      pointsPerQuestion,
      score,
    }
  }

  const submitWithState = async (fn: () => Promise<void>) => {
    setIsSubmitting(true)
    try {
      await fn()
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitExam = async (params: {
    user: { id: string } | null
    grade: number
    examSession: { questions: ExamQuestionDetail[] } | null
    answers: Record<string, string | number>
    correctAnswersArray: CorrectAnswerItem[]
    finalQuestionsArray: ExamQuestionDetail[]
    currentPattern4Options: string[]
    examDurationSeconds: number
    passScore: number
    refreshUserStatistics: () => Promise<void>
    routerPush: (path: string) => void
  }) => {
    const {
      user,
      grade,
      examSession,
      answers,
      correctAnswersArray,
      finalQuestionsArray,
      currentPattern4Options,
      examDurationSeconds,
      passScore,
      refreshUserStatistics,
      routerPush,
    } = params

    if (!examSession) return

    // 점수 계산 및 통계 집계
    let correctCount = 0
    let answeredCount = 0
    let unansweredCount = 0

    // 유저 답안과 정답 비교 배열
    interface AnswerComparisonItem {
      questionNumber: number
      questionId: string
      userAnswer: string | number | null
      correctAnswer: string | number | null
      isCorrect: boolean
      pattern: string
    }
    const answerComparison: AnswerComparisonItem[] = []

    examSession.questions.forEach((question, index) => {
      const userAnswer = answers[question.id]
      const questionIndex = parseInt(question.id.replace("q_", ""))
      const correctAnswer = correctAnswersArray[questionIndex]
      const hasAnswered =
        userAnswer !== undefined && userAnswer !== null && userAnswer !== ""

      if (hasAnswered) answeredCount++
      else unansweredCount++

      if (hasAnswered && correctAnswer) {
        // optionUtils의 getSelectedOptionText와 isCorrectAnswer 사용
        const questionDetail = question as ExamQuestionDetail
        const selectedOptionText = getSelectedOptionText(
          questionDetail,
          userAnswer,
          finalQuestionsArray,
          currentPattern4Options
        )

        const correctText = correctAnswer?.correctAnswer
        const isCorrect = isCorrectAnswer(
          questionDetail,
          userAnswer,
          correctAnswer,
          selectedOptionText,
          finalQuestionsArray
        )

        if (isCorrect) correctCount++

        // 비교 결과 저장
        answerComparison.push({
          questionNumber: index + 1,
          questionId: question.id,
          userAnswer,
          correctAnswer: correctText,
          isCorrect,
          pattern: question.type,
        })
      } else {
        // 미답변인 경우
        answerComparison.push({
          questionNumber: index + 1,
          questionId: question.id,
          userAnswer: null,
          correctAnswer: correctAnswer?.correctAnswer || null,
          isCorrect: false,
          pattern: question.type,
        })
      }
    })

    // 유저 답안과 정답 비교 배열 로그
    console.log("📊 유저 답안과 정답 비교 배열:", answerComparison)
    console.log(
      "📊 비교 결과 요약:",
      JSON.stringify(
        {
          총문제수: examSession.questions.length,
          정답수: correctCount,
          오답수: answeredCount - correctCount,
          미답변수: unansweredCount,
          정답률: `${Math.round((correctCount / examSession.questions.length) * 100)}%`,
        },
        null,
        2
      )
    )

    const pointsPerQuestion = Math.round(100 / examSession.questions.length)
    const score = Math.round(correctCount * pointsPerQuestion)
    const passed = score >= passScore

    // 오답 수집 (간소화)
    const wrongAnswers = examSession.questions
      .map((question, index) => {
        const userAnswer = answers[question.id]
        const questionIndex = parseInt(question.id.replace("q_", ""))
        const correctAnswer = correctAnswersArray[questionIndex]
        
        if (userAnswer === undefined || userAnswer === null || userAnswer === "") {
          return null
        }

        const questionDetail = question as ExamQuestionDetail
        const selectedOptionText = getSelectedOptionText(
          questionDetail,
          userAnswer,
          finalQuestionsArray,
          currentPattern4Options
        )

        const isCorrect = isCorrectAnswer(
          questionDetail,
          userAnswer,
          correctAnswer,
          selectedOptionText,
          finalQuestionsArray
        )

        if (!isCorrect) {
          const q = finalQuestionsArray.find((q: ExamQuestionDetail) => q.id === question.id)
          interface WrongAnswerData {
            questionNumber: number
            questionId: string
            questionIndex: number
            userAnswer: string | number
            correctAnswer: string | number
            pattern: string
            character?: string
            questionText: string
            options?: string[]
            userSelectedNumber?: number
          }
          const wrongAnswerData: WrongAnswerData = {
            questionNumber: index + 1,
            questionId: question.id,
            questionIndex: index,
            userAnswer,
            correctAnswer: correctAnswer?.correctAnswer || "",
            pattern: question.type,
            character: q?.character,
            questionText: "",
            options: q?.options || [],
          }
          
          // word_meaning_select 패턴일 때 userSelectedNumber 저장
          if (question.type === "word_meaning_select" && typeof userAnswer === "number") {
            wrongAnswerData.userSelectedNumber = userAnswer
          }
          
          return wrongAnswerData
        }
        return null
      })
      .filter(Boolean)

    // examId 및 결과 저장 키 구성
    const examId = user
      ? `exam_${user.id}_${grade}_${Date.now()}`
      : `exam_${grade}_${Date.now()}`

    // 통계 API 저장
    if (user) {
      try {
        const res = await fetch("/api/save-exam-statistics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examId,
            userId: user.id,
            grade,
            score,
            passed,
            correctCount,
            totalQuestions: examSession.questions.length,
            examDate: new Date().toISOString().split("T")[0],
            duration: examDurationSeconds,
            wrongAnswers,
            patternStats: {},
          }),
        })
        const json = await res.json().catch(() => ({}))
        SaveExamStatisticsResponseSchema.parse(json)
      } catch {
        // noop: 로깅은 상위에서
      }
    }

    // 경험치/학습시간 업데이트
    if (user) {
      try {
        const isPassed = score >= passScore
        const baseExperience = isPassed ? (score === 100 ? 100 : 50) : 0
        const experienceGained = baseExperience + correctCount

        const res1 = await fetch("/api/update-user-experience", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            experienceGained,
            activityType: "exam",
            activityDetails: {
              grade,
              score,
              correctCount,
              totalQuestions: examSession.questions.length,
              passed,
            },
          }),
        })
        const json1 = await res1.json().catch(() => ({}))
        UpdateExperienceResponseSchema.parse(json1)

        if (examDurationSeconds > 0) {
          const res2 = await fetch("/api/update-user-study-time", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              studyTimeSeconds: examDurationSeconds,
              activityType: "exam",
              activityDetails: {
                grade,
                score,
                passed,
                duration: examDurationSeconds,
              },
            }),
          })
          const json2 = await res2.json().catch(() => ({}))
          UpdateStudyTimeResponseSchema.parse(json2)
        }
      } catch {
        // noop
      }
    }

    if (passed) await refreshUserStatistics()

    // 결과 세션 저장 및 이동
    const storageKey = resultKey(examId)
    const resultData = {
      score,
      passed,
      grade,
      duration: examDurationSeconds,
      examId,
      experienceGained: passed
        ? (score === 100 ? 100 : 50) + correctCount
        : correctCount,
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem(storageKey, JSON.stringify(resultData))
      sessionStorage.setItem(experienceAppliedKey(examId), "true")
    }
    routerPush(
      `/games/exam/${grade}/result?score=${score}&passed=${passed}&duration=${examDurationSeconds}&examId=${examId}`
    )
  }

  return {
    isSubmitting,
    setIsSubmitting,
    computeScore,
    submitWithState,
    submitExam,
  }
}
