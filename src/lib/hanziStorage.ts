import { Hanzi } from "@/types"

interface HanziStorageData {
  grade: number
  lastUpdated: string
  data: Hanzi[]
}

/** isKnown 상태가 포함된 한자 데이터 */
export interface HanziWithKnownStatus {
  hanziId: string
  character: string
  meaning: string
  sound: string
  isKnown: boolean
}

/** isKnown 캐시 데이터 (주간 동기화용) */
export interface KnownStatusCache {
  grade: number
  lastSyncedAt: string // ISO string (마지막 동기화 시간)
  data: HanziWithKnownStatus[]
}

export class HanziStorage {
  private readonly STORAGE_KEY_PREFIX = "currentHanziData_"
  private db: IDBDatabase | null = null
  private userId: string | null = null

  constructor(userId?: string) {
    this.userId = userId || null
    this.initDB()
  }

  private getStorageKey(): string {
    if (!this.userId) {
      throw new Error("User ID is required for storage key")
    }
    return `${this.STORAGE_KEY_PREFIX}${this.userId}`
  }

  setUserId(userId: string): void {
    this.userId = userId
  }

  private async initDB(): Promise<void> {
    // 브라우저 환경인지 확인
    if (typeof window === "undefined" || !window.indexedDB) {
      console.debug("IndexedDB is not available in this environment")
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open("hanziDB", 1)

        request.onerror = () => {
          console.error("Failed to open IndexedDB")
          reject(request.error)
        }

        request.onsuccess = () => {
          this.db = request.result
          console.debug("IndexedDB initialized successfully")
          resolve()
        }

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains("hanziStore")) {
            db.createObjectStore("hanziStore")
          }
        }
      } catch (error) {
        console.error("Error initializing IndexedDB:", error)
        resolve() // 에러가 발생해도 진행할 수 있도록 함
      }
    })
  }

  private async ensureDBReady(): Promise<void> {
    // 브라우저 환경이 아니면 무시
    if (typeof window === "undefined") {
      return
    }

    if (!this.db) {
      await this.initDB()
    }
  }

  async getCurrentStorageState(): Promise<HanziStorageData | null> {
    console.debug("Checking current storage state...")
    await this.ensureDBReady()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.debug("DB not initialized")
        return resolve(null)
      }

      if (!this.userId) {
        console.debug("User ID not set, cannot get storage state")
        return resolve(null)
      }

      const transaction = this.db.transaction(["hanziStore"], "readonly")
      const store = transaction.objectStore("hanziStore")
      const request = store.get(this.getStorageKey())

      request.onsuccess = () => {
        const data = request.result
        console.debug("IndexedDB data:", {
          grade: data?.grade,
          totalCharacters: data?.data?.length,
          sampleCharacters: data?.data?.slice(0, 5).map((h: Hanzi) => ({
            character: h.character,
            meaning: h.meaning,
            sound: h.sound,
          })),
          lastUpdated: data?.lastUpdated,
        })
        resolve(data)
      }

      request.onerror = () => {
        console.error("Failed to get storage state:", request.error)
        reject(request.error)
      }
    })
  }

  async isDataValid(preferredGrade: number): Promise<boolean> {
    const current = await this.getCurrentStorageState()
    const isValid = current?.grade === preferredGrade
    console.debug(
      `Data validity check - Preferred Grade: ${preferredGrade}, Current Grade: ${current?.grade}, Valid: ${isValid}`
    )
    return isValid
  }

  async saveData(data: HanziStorageData): Promise<void> {
    console.debug(
      `Saving data for grade ${data.grade} (${data.data.length} characters)`
    )
    await this.ensureDBReady()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error("DB not initialized"))
      }

      if (!this.userId) {
        return reject(new Error("User ID is required to save data"))
      }

      const transaction = this.db.transaction(["hanziStore"], "readwrite")
      const store = transaction.objectStore("hanziStore")
      const request = store.put(data, this.getStorageKey())

      request.onsuccess = () => {
        console.debug("Data saved successfully")
        resolve()
      }

      request.onerror = () => {
        console.error("Failed to save data:", request.error)
        reject(request.error)
      }
    })
  }

  /** 특정 급수용 저장 키 (아래 급수 캐시 등) */
  private getStorageKeyForGrade(grade: number): string {
    return `${this.getStorageKey()}_grade_${grade}`
  }

  /** 특정 급수 데이터 조회 (아래 급수 캐시용) */
  async getDataByGrade(grade: number): Promise<HanziStorageData | null> {
    await this.ensureDBReady()
    if (!this.db || !this.userId) return null
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["hanziStore"], "readonly")
      const store = transaction.objectStore("hanziStore")
      const request = store.get(this.getStorageKeyForGrade(grade))
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
  }

  /** 특정 급수 데이터 저장 (아래 급수 캐시용) */
  async saveDataByGrade(grade: number, data: Hanzi[]): Promise<void> {
    await this.ensureDBReady()
    if (!this.db || !this.userId) return
    const payload: HanziStorageData = {
      grade,
      lastUpdated: new Date().toISOString(),
      data,
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["hanziStore"], "readwrite")
      const store = transaction.objectStore("hanziStore")
      const request = store.put(payload, this.getStorageKeyForGrade(grade))
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clearData(): Promise<void> {
    console.debug("Clearing stored data...")
    
    // 브라우저 환경이 아니면 무시
    if (typeof window === "undefined") {
      console.debug("IndexedDB not available in this environment")
      return Promise.resolve()
    }

    // DB가 없으면 새로 초기화
    if (!this.db) {
      try {
        await this.initDB()
      } catch (error) {
        console.error("Failed to initialize DB for clearing:", error)
        return Promise.resolve() // 에러가 발생해도 진행
      }
    }

    if (!this.db) {
      console.debug("DB not available, nothing to clear")
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      try {
        if (!this.userId) {
          console.debug("User ID not set, cannot clear data")
          return resolve()
        }

        const transaction = this.db!.transaction(["hanziStore"], "readwrite")
        const store = transaction.objectStore("hanziStore")
        const request = store.delete(this.getStorageKey())

        request.onsuccess = () => {
          console.debug("✅ Data cleared successfully")
          resolve()
        }

        request.onerror = () => {
          console.error("❌ Failed to clear data:", request.error)
          reject(request.error)
        }
      } catch (error) {
        console.error("❌ Error during clear operation:", error)
        resolve() // 에러가 발생해도 진행
      }
    })
  }

  // ============================================
  // isKnown 캐시 관련 메서드 (주간 동기화용)
  // ============================================

  /** isKnown 캐시 저장 키 */
  private getKnownStatusKey(): string {
    return `knownStatus_${this.userId}`
  }

  /** isKnown 캐시 조회 */
  async getKnownStatusCache(): Promise<KnownStatusCache | null> {
    await this.ensureDBReady()
    if (!this.db || !this.userId) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["hanziStore"], "readonly")
      const store = transaction.objectStore("hanziStore")
      const request = store.get(this.getKnownStatusKey())
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
  }

  /** isKnown 캐시 저장 */
  async saveKnownStatusCache(cache: KnownStatusCache): Promise<void> {
    await this.ensureDBReady()
    if (!this.db || !this.userId) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["hanziStore"], "readwrite")
      const store = transaction.objectStore("hanziStore")
      const request = store.put(cache, this.getKnownStatusKey())
      request.onsuccess = () => {
        console.debug(`✅ isKnown 캐시 저장 완료 (${cache.data.length}개)`)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  /** 단일 한자 isKnown 상태 업데이트 (체크 변경 시 즉시 반영) */
  async updateSingleHanziKnownStatus(hanziId: string, isKnown: boolean): Promise<void> {
    const cache = await this.getKnownStatusCache()
    if (!cache) return

    const index = cache.data.findIndex((h) => h.hanziId === hanziId)
    if (index >= 0) {
      cache.data[index].isKnown = isKnown
      await this.saveKnownStatusCache(cache)
      console.debug(`✅ 한자 ${hanziId} isKnown 업데이트: ${isKnown}`)
    }
  }

  /** 주간 동기화 필요 여부 확인 (매주 월요일 00:00 KST 기준) */
  needsWeeklySync(cache: KnownStatusCache | null): boolean {
    if (!cache) return true

    const lastSynced = new Date(cache.lastSyncedAt)
    const now = new Date()

    // 한국 시간 기준으로 이번주 월요일 00:00 계산
    const kstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
    const dayOfWeek = kstNow.getDay() // 0=일, 1=월, ..., 6=토
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    
    const thisMonday = new Date(kstNow)
    thisMonday.setDate(kstNow.getDate() - daysSinceMonday)
    thisMonday.setHours(0, 0, 0, 0)

    // 마지막 동기화가 이번주 월요일 이전이면 동기화 필요
    const lastSyncedKST = new Date(lastSynced.toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
    return lastSyncedKST < thisMonday
  }
}
