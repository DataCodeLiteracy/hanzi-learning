import { NextRequest, NextResponse } from "next/server"
import { ApiClient } from "@/lib/apiClient"

interface ExamResult {
  id: string
  userId: string
  grade: number
  questions: Array<{
    id: string
    type: string
    question: string
    options?: string[]
    correctAnswer: string | number
    explanation?: string
    hanziData?: {
      id: string
      character: string
      sound: string
      meaning: string
      relatedWords: Array<{
        hanzi: string
        korean: string
        isTextBook: boolean
      }>
    }
  }>
  answers: Record<string, string | number>
  startTime: string
  endTime: string
  score: number
  passed: boolean
  actualDuration?: number // 실제 소요 시간 (초)
}

export async function POST(request: NextRequest) {
  try {
    const examResult: ExamResult = await request.json()

    // 정답 개수 계산
    const correctAnswers = examResult.questions.filter((question) => {
      const userAnswer = examResult.answers[question.id]
      return userAnswer === question.correctAnswer
    }).length

    // 시험 결과를 Firestore에 저장
    await ApiClient.createDocument("examResults", {
      userId: examResult.userId,
      grade: examResult.grade,
      score: examResult.score,
      passed: examResult.passed,
      totalQuestions: examResult.questions.length,
      correctAnswers,
      startTime: new Date(examResult.startTime),
      endTime: new Date(examResult.endTime),
      duration:
        new Date(examResult.endTime).getTime() -
        new Date(examResult.startTime).getTime(),
      actualDuration: examResult.actualDuration || 0, // 실제 소요 시간 (초)
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // 사용자 통계 업데이트
    // 시험 완료 시 경험치 추가 (합격 여부와 관계없이 10exp)
    const experiencePoints = 10
    await ApiClient.updateUserExperience(examResult.userId, experiencePoints)

    // 사용자 시험 통계 업데이트
    await updateUserExamStatistics(examResult)

    // 시험에 포함된 한자들의 통계 업데이트
    await updateHanziStatisticsFromExam(examResult)

    return NextResponse.json({
      success: true,
      message: "시험 결과가 저장되었습니다.",
    })
  } catch (error) {
    console.error("시험 결과 저장 실패:", error)
    return NextResponse.json(
      {
        error: "시험 결과 저장에 실패했습니다.",
      },
      { status: 500 }
    )
  }
}

// 사용자 시험 통계 업데이트
async function updateUserExamStatistics(examResult: ExamResult) {
  try {
    // 기존 사용자 통계 조회
    const userStats = await ApiClient.getDocument(
      "userStatistics",
      examResult.userId
    )

    if (userStats) {
      // 기존 시험 통계 가져오기
      const existingExamStats = (userStats as any).examStats || {
        totalExams: 0,
        passedExams: 0,
        totalScore: 0,
        averageScore: 0,
        highestScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastExamDate: null,
        gradeStats: {},
      }

      // 새로운 통계 계산
      const newTotalExams = existingExamStats.totalExams + 1
      const newPassedExams =
        existingExamStats.passedExams + (examResult.passed ? 1 : 0)
      const newTotalScore = existingExamStats.totalScore + examResult.score
      const newAverageScore = Math.round(newTotalScore / newTotalExams)
      const newHighestScore = Math.max(
        existingExamStats.highestScore,
        examResult.score
      )

      // 연속 합격 계산
      const newCurrentStreak = examResult.passed
        ? existingExamStats.currentStreak + 1
        : 0
      const newLongestStreak = Math.max(
        existingExamStats.longestStreak,
        newCurrentStreak
      )

      // 급수별 통계 업데이트
      const gradeStats = { ...existingExamStats.gradeStats }
      if (!gradeStats[examResult.grade]) {
        gradeStats[examResult.grade] = {
          totalExams: 0,
          passedExams: 0,
          averageScore: 0,
          lastExamDate: null,
        }
      }

      const gradeStat = gradeStats[examResult.grade]
      gradeStat.totalExams += 1
      gradeStat.passedExams += examResult.passed ? 1 : 0
      gradeStat.averageScore = Math.round(
        (gradeStat.averageScore * (gradeStat.totalExams - 1) +
          examResult.score) /
          gradeStat.totalExams
      )
      gradeStat.lastExamDate = new Date().toISOString()

      // 업데이트된 통계 저장
      await ApiClient.updateDocument("userStatistics", examResult.userId, {
        examStats: {
          totalExams: newTotalExams,
          passedExams: newPassedExams,
          totalScore: newTotalScore,
          averageScore: newAverageScore,
          highestScore: newHighestScore,
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          lastExamDate: new Date().toISOString(),
          gradeStats,
        },
        updatedAt: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("사용자 시험 통계 업데이트 실패:", error)
  }
}

// 시험 결과로부터 한자 통계 업데이트
async function updateHanziStatisticsFromExam(examResult: ExamResult) {
  try {
    // 시험에 포함된 한자들 추출
    const hanziIds = new Set<string>()

    examResult.questions.forEach((question) => {
      if (question.hanziData && question.hanziData.id) {
        hanziIds.add(question.hanziData.id)
      }
    })

    // 각 한자에 대해 시험 통계 업데이트
    for (const hanziId of hanziIds) {
      // 시험에서 해당 한자가 정답으로 사용된 횟수 계산
      const correctCount = examResult.questions.filter((question) => {
        if (!question.hanziData || question.hanziData.id !== hanziId)
          return false

        const userAnswer = examResult.answers[question.id]
        return userAnswer === question.correctAnswer
      }).length

      // hanziStatistics 업데이트
      await ApiClient.updateHanziStatisticsFromExam(
        examResult.userId,
        hanziId,
        correctCount > 0, // 정답 여부
        examResult.passed // 시험 통과 여부
      )
    }
  } catch (error) {
    console.error("한자 통계 업데이트 실패:", error)
  }
}
