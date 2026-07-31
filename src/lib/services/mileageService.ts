import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  orderBy,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getKSTDateISO, ApiClient } from "@/lib/apiClient"
import type { MileageTransaction } from "@/types"
import {
  calculateMileageAccrual,
  yearMonthFromDate,
} from "@/lib/mileageSystem"

/**
 * 마일리지 적립/조회/출금.
 * 기존 경험치 소급 변환 없음 — 호출 이후 획득 XP만 적립.
 */
export class MileageService {
  static async accrueFromExperience(
    userId: string,
    experienceGained: number,
    options?: { note?: string }
  ): Promise<{ accrued: number; hitCap: boolean }> {
    if (experienceGained <= 0) {
      return { accrued: 0, hitCap: false }
    }

    await ApiClient.checkAndResetTodayExperience(userId)

    const userStats = await ApiClient.getUserStatistics(userId)
    const alreadyEarnedToday = userStats?.todayMileageEarned || 0
    const { mileage, hitCap } = calculateMileageAccrual(
      experienceGained,
      alreadyEarnedToday
    )

    if (mileage <= 0) {
      return { accrued: 0, hitCap }
    }

    const today = getKSTDateISO()
    const yearMonth = yearMonthFromDate(today)
    const now = new Date().toISOString()

    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)
    if (!userDoc.exists()) {
      throw new Error("사용자를 찾을 수 없습니다.")
    }

    const currentMileage = (userDoc.data().mileage as number) || 0
    await updateDoc(userRef, {
      mileage: currentMileage + mileage,
      updatedAt: now,
    })

    if (userStats?.id) {
      await updateDoc(doc(db, "userStatistics", userStats.id), {
        todayMileageEarned: alreadyEarnedToday + mileage,
        updatedAt: now,
      })
    }

    const txRef = doc(collection(db, "mileageTransactions"))
    const transaction: MileageTransaction = {
      id: txRef.id,
      userId,
      type: "earn",
      amount: mileage,
      xpConverted: experienceGained,
      date: today,
      yearMonth,
      createdAt: now,
    }
    if (options?.note) {
      transaction.note = options.note
    }
    await setDoc(txRef, transaction)

    return { accrued: mileage, hitCap }
  }

  static async getBalance(userId: string): Promise<number> {
    try {
      const userDoc = await getDoc(doc(db, "users", userId))
      if (!userDoc.exists()) return 0
      return (userDoc.data().mileage as number) || 0
    } catch (error) {
      console.error("마일리지 잔액 조회 실패:", error)
      return 0
    }
  }

  static async getTodayEarned(userId: string): Promise<number> {
    try {
      await ApiClient.checkAndResetTodayExperience(userId)
      const userStats = await ApiClient.getUserStatistics(userId)
      return userStats?.todayMileageEarned || 0
    } catch (error) {
      console.error("오늘 마일리지 조회 실패:", error)
      return 0
    }
  }

  static async getTransactionsForMonth(
    userId: string,
    yearMonth: string
  ): Promise<MileageTransaction[]> {
    try {
      const q = query(
        collection(db, "mileageTransactions"),
        where("userId", "==", userId),
        where("yearMonth", "==", yearMonth),
        orderBy("createdAt", "desc")
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map((d) => d.data() as MileageTransaction)
    } catch (error) {
      console.warn("마일리지 월별 조회 인덱스 폴백:", error)
      try {
        const q = query(
          collection(db, "mileageTransactions"),
          where("userId", "==", userId)
        )
        const snapshot = await getDocs(q)
        return snapshot.docs
          .map((d) => d.data() as MileageTransaction)
          .filter((t) => t.yearMonth === yearMonth)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      } catch (fallbackError) {
        console.error("마일리지 월별 조회 실패:", fallbackError)
        throw new Error("마일리지 내역을 불러오지 못했습니다.")
      }
    }
  }

  static async withdraw(
    userId: string,
    amount: number,
    note?: string
  ): Promise<number> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("출금 금액은 0보다 커야 합니다.")
    }

    const withdrawAmount = Math.floor(amount)
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)
    if (!userDoc.exists()) {
      throw new Error("사용자를 찾을 수 없습니다.")
    }

    const currentMileage = (userDoc.data().mileage as number) || 0
    if (withdrawAmount > currentMileage) {
      throw new Error(
        `잔액이 부족합니다. (잔액: ${currentMileage.toLocaleString("ko-KR")}P)`
      )
    }

    const today = getKSTDateISO()
    const yearMonth = yearMonthFromDate(today)
    const now = new Date().toISOString()
    const newBalance = currentMileage - withdrawAmount

    await updateDoc(userRef, {
      mileage: newBalance,
      updatedAt: now,
    })

    const txRef = doc(collection(db, "mileageTransactions"))
    await setDoc(txRef, {
      id: txRef.id,
      userId,
      type: "withdraw",
      amount: withdrawAmount,
      date: today,
      yearMonth,
      note: note?.trim() || "용돈 출금",
      createdAt: now,
    } satisfies MileageTransaction)

    return newBalance
  }
}
