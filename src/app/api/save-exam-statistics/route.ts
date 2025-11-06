import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  setDoc,
} from "firebase/firestore"
import { ApiClient } from "@/lib/apiClient"

export async function POST(request: NextRequest) {
  try {
    const {
      examId,
      userId,
      grade,
      score,
      passed,
      correctCount,
      totalQuestions,
      examDate,
      duration,
      wrongAnswers,
      patternStats,
    } = await request.json()

    // 🎯 서버 로그: 정답 매칭 확인
    console.log("🎯 === 서버 정답 매칭 확인 ===")
    console.log("🎯 시험 결과 요청:", {
      userId,
      grade,
      score,
      passed,
      correctCount,
      totalQuestions,
      duration,
      patternStats,
      wrongAnswersCount: wrongAnswers?.length || 0,
    })

    if (!userId || !grade || score === undefined || passed === undefined) {
      return NextResponse.json(
        { success: false, error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      )
    }

    // 시험 통계 문서 생성
    const examStatsData = {
      examId: examId || `exam_${userId}_${grade}_${Date.now()}`,
      userId,
      grade,
      score,
      passed,
      correctCount,
      totalQuestions,
      examDate: examDate || new Date().toISOString().split("T")[0],
      duration: duration || 0,
      wrongAnswers: wrongAnswers || [],
      patternStats: patternStats || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // examStatistics 컬렉션에 추가 (examId가 있으면 해당 ID로 저장)
    let examStatsRef
    if (examId) {
      await setDoc(doc(db, "examStatistics", examId), examStatsData)
      examStatsRef = { id: examId }
    } else {
      examStatsRef = await addDoc(
        collection(db, "examStatistics"),
        examStatsData
      )
    }

    // 사용자 통계 업데이트
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      const userData = userDoc.data()
      const currentStats = userData.examStatistics || {}

      // 급수별 통계 업데이트
      const gradeKey = `grade${grade}`
      const currentGradeStats = currentStats[gradeKey] || {
        totalAttempts: 0,
        passedAttempts: 0,
        totalScore: 0,
        bestScore: 0,
        totalDuration: 0,
        averageDuration: 0,
        bestDuration: 0,
        lastExamDate: null,
      }

      const updatedGradeStats = {
        totalAttempts: currentGradeStats.totalAttempts + 1,
        passedAttempts: currentGradeStats.passedAttempts + (passed ? 1 : 0),
        totalScore: currentGradeStats.totalScore + score,
        bestScore: Math.max(currentGradeStats.bestScore, score),
        totalDuration: currentGradeStats.totalDuration + (duration || 0),
        averageDuration: Math.round(
          (currentGradeStats.totalDuration + (duration || 0)) /
            (currentGradeStats.totalAttempts + 1)
        ),
        bestDuration:
          currentGradeStats.bestDuration === 0
            ? duration || 0
            : Math.min(currentGradeStats.bestDuration, duration || 0),
        lastExamDate: examDate || new Date().toISOString().split("T")[0],
      }

      // 전체 통계 업데이트
      const updatedStats = {
        ...currentStats,
        [gradeKey]: updatedGradeStats,
        totalExams: (currentStats.totalExams || 0) + 1,
        totalPassedExams:
          (currentStats.totalPassedExams || 0) + (passed ? 1 : 0),
        averageScore: Math.round(
          ((currentStats.averageScore || 0) * (currentStats.totalExams || 0) +
            score) /
            ((currentStats.totalExams || 0) + 1)
        ),
        lastExamDate: examDate || new Date().toISOString().split("T")[0],
        lastExamGrade: grade,
      }

      await updateDoc(userRef, {
        examStatistics: updatedStats,
        lastActivity: new Date(),
      })

      console.log(`🎯 시험 통계 저장 완료:`, {
        userId,
        grade,
        score,
        passed,
        examStatsId: examStatsRef.id,
        gradeStats: updatedGradeStats,
      })

      // 🎯 서버 로그: 최종 정답 매칭 결과
      console.log("🎯 === 서버 정답 매칭 최종 결과 ===")
      console.log("🎯 점수 계산 검증:", {
        총문제수: totalQuestions,
        정답수: correctCount,
        오답수: totalQuestions - correctCount,
        계산된점수: score,
        통과여부: passed,
        패턴별통계: patternStats,
      })
      console.log("🎯 === 서버 정답 매칭 확인 완료 ===")

      // 사용자 통계 업데이트 (userStatistics)
      await updateUserStatistics(
        userId,
        grade,
        score,
        passed,
        correctCount,
        totalQuestions
      )

      // 한자 통계 업데이트 (hanziStatistics) - 필요시 추가
      // await updateHanziStatistics(userId, wrongAnswers)

      return NextResponse.json({
        success: true,
        message: "시험 통계가 성공적으로 저장되었습니다.",
        data: {
          examStatsId: examStatsRef.id,
          gradeStats: updatedGradeStats,
          overallStats: updatedStats,
        },
      })
    } else {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error("시험 통계 저장 실패:", error)
    return NextResponse.json(
      { success: false, error: "시험 통계 저장에 실패했습니다." },
      { status: 500 }
    )
  }
}

// 사용자 통계 업데이트 함수
async function updateUserStatistics(
  userId: string,
  grade: number,
  score: number,
  passed: boolean,
  correctCount: number,
  totalQuestions: number
) {
  try {
    // 기존 사용자 통계 조회
    const userStats = await ApiClient.getDocument("userStatistics", userId)

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
      const newPassedExams = existingExamStats.passedExams + (passed ? 1 : 0)
      const newTotalScore = existingExamStats.totalScore + score
      const newAverageScore = Math.round(newTotalScore / newTotalExams)
      const newHighestScore = Math.max(existingExamStats.highestScore, score)

      // 연속 합격 계산
      const newCurrentStreak = passed ? existingExamStats.currentStreak + 1 : 0
      const newLongestStreak = Math.max(
        existingExamStats.longestStreak,
        newCurrentStreak
      )

      // 급수별 통계 업데이트
      const gradeStats = { ...existingExamStats.gradeStats }
      if (!gradeStats[grade]) {
        gradeStats[grade] = {
          totalExams: 0,
          passedExams: 0,
          averageScore: 0,
          lastExamDate: null,
        }
      }

      const gradeStat = gradeStats[grade]
      gradeStat.totalExams += 1
      gradeStat.passedExams += passed ? 1 : 0
      gradeStat.averageScore = Math.round(
        (gradeStat.averageScore * (gradeStat.totalExams - 1) + score) /
          gradeStat.totalExams
      )
      gradeStat.lastExamDate = new Date().toISOString()

      // 업데이트된 통계 저장
      await ApiClient.updateDocument("userStatistics", userId, {
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

      console.log(`🎯 사용자 통계 업데이트 완료:`, {
        userId,
        grade,
        score,
        passed,
        newTotalExams,
        newPassedExams,
      })
    }
  } catch (error) {
    console.error("사용자 통계 업데이트 실패:", error)
  }
}
