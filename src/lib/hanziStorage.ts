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

/** isKnown 캐시 데이터 (주간 동기화용) — 아는 한자 / 모르는 한자 분리 저장 */
export interface KnownStatusCache {
  grade: number
  lastSyncedAt: string // ISO string (마지막 동기화 시간)
  /** 체크된 한자 (아는 한자) */
  known: HanziWithKnownStatus[]
  /** 체크 안 된 한자 (모르는 한자) */
  unknown: HanziWithKnownStatus[]
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

    return new Promise((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        resolve()
      }

      const timeout = setTimeout(() => {
        console.warn("IndexedDB open timeout (e.g. iOS 시크릿 모드 또는 저장소 비활성)")
        finish()
      }, 5000)

      try {
        const request = window.indexedDB.open("hanziDB", 1)

        request.onerror = () => {
          clearTimeout(timeout)
          console.warn("IndexedDB open failed:", request.error?.message || request.error, "(시크릿 모드일 수 있음)")
          finish()
        }

        request.onsuccess = () => {
          clearTimeout(timeout)
          this.db = request.result
          console.debug("IndexedDB initialized successfully")
          finish()
        }

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains("hanziStore")) {
            db.createObjectStore("hanziStore")
          }
        }
      } catch (error) {
        clearTimeout(timeout)
        console.error("Error initializing IndexedDB:", error)
        finish()
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
        console.warn("Failed to get storage state:", request.error)
        resolve(null)
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

    return new Promise((resolve) => {
      if (!this.db) {
        console.warn("IndexedDB not available, save skipped")
        return resolve()
      }

      if (!this.userId) {
        return resolve()
      }

      const transaction = this.db.transaction(["hanziStore"], "readwrite")
      const store = transaction.objectStore("hanziStore")
      const request = store.put(data, this.getStorageKey())

      request.onsuccess = () => {
        console.debug("Data saved successfully")
        resolve()
      }

      request.onerror = () => {
        console.warn("Failed to save data:", request.error)
        resolve()
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
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(["hanziStore"], "readonly")
      const store = transaction.objectStore("hanziStore")
      const request = store.get(this.getStorageKeyForGrade(grade))
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => {
        console.warn("getDataByGrade failed:", request.error)
        resolve(null)
      }
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
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(["hanziStore"], "readwrite")
      const store = transaction.objectStore("hanziStore")
      const request = store.put(payload, this.getStorageKeyForGrade(grade))
      request.onsuccess = () => resolve()
      request.onerror = () => {
        console.warn("saveDataByGrade failed:", request.error)
        resolve()
      }
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

  /** isKnown 캐시 저장 키 (급수별로 분리) */
  private getKnownStatusKey(grade: number): string {
    return `knownStatus_${this.userId}_grade_${grade}`
  }

  /** isKnown 캐시 조회 (구 형식 data 배열 있으면 known/unknown으로 변환) — grade 필수 */
  async getKnownStatusCache(grade: number): Promise<KnownStatusCache | null> {
    await this.ensureDBReady()
    if (!this.db || !this.userId) return null

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(["hanziStore"], "readonly")
      const store = transaction.objectStore("hanziStore")
      const request = store.get(this.getKnownStatusKey(grade))
      request.onsuccess = () => {
        const raw = request.result
        if (!raw) return resolve(null)
        // 새 형식 (known / unknown) — unknown 없거나 배열이 아니면 빈 배열로 보정
        if (raw.known && Array.isArray(raw.known)) {
          const unknown = Array.isArray(raw.unknown) ? raw.unknown : []
          return resolve({
            grade: raw.grade,
            lastSyncedAt: raw.lastSyncedAt,
            known: raw.known,
            unknown,
          } as KnownStatusCache)
        }
        // 구 형식 (data 배열) → known/unknown으로 변환
        if (raw.data && Array.isArray(raw.data)) {
          const known = raw.data.filter((h: HanziWithKnownStatus) => h.isKnown)
          const unknown = raw.data.filter((h: HanziWithKnownStatus) => !h.isKnown)
          resolve({
            grade: raw.grade,
            lastSyncedAt: raw.lastSyncedAt,
            known,
            unknown,
          })
          return
        }
        resolve(null)
      }
      request.onerror = () => {
        console.warn("getKnownStatusCache failed:", request.error)
        resolve(null)
      }
    })
  }

  /** isKnown 캐시 저장 (급수별 키로 저장) — known/unknown 배열 모두 명시적으로 저장 */
  async saveKnownStatusCache(cache: KnownStatusCache): Promise<void> {
    await this.ensureDBReady()
    if (!this.db || !this.userId) return

    const toStore: KnownStatusCache = {
      grade: cache.grade,
      lastSyncedAt: cache.lastSyncedAt,
      known: Array.isArray(cache.known) ? [...cache.known] : [],
      unknown: Array.isArray(cache.unknown) ? [...cache.unknown] : [],
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(["hanziStore"], "readwrite")
      const store = transaction.objectStore("hanziStore")
      const request = store.put(toStore, this.getKnownStatusKey(cache.grade))
      request.onsuccess = () => {
        console.debug(
          `✅ isKnown 캐시 저장 완료 (${toStore.grade}급, 아는: ${toStore.known.length} / 모르는: ${toStore.unknown.length})`
        )
        resolve()
      }
      request.onerror = () => {
        console.warn("saveKnownStatusCache failed:", request.error)
        resolve()
      }
    })
  }

  /** 단일 한자 isKnown 상태 업데이트 (체크 변경 시 즉시 반영 — 해당 급수 캐시에서 known ↔ unknown 이동) */
  async updateSingleHanziKnownStatus(
    hanziId: string,
    isKnown: boolean,
    grade: number
  ): Promise<void> {
    const cache = await this.getKnownStatusCache(grade)
    if (!cache) return

    const inKnown = cache.known.find((h) => h.hanziId === hanziId)
    const inUnknown = cache.unknown.find((h) => h.hanziId === hanziId)
    const item = inKnown || inUnknown
    if (!item) return

    if (isKnown && inUnknown) {
      cache.unknown = cache.unknown.filter((h) => h.hanziId !== hanziId)
      cache.known.push({ ...item, isKnown: true })
    } else if (!isKnown && inKnown) {
      cache.known = cache.known.filter((h) => h.hanziId !== hanziId)
      cache.unknown.push({ ...item, isKnown: false })
    }

    await this.saveKnownStatusCache(cache)
    console.debug(
      `✅ 한자 ${hanziId} (${grade}급) → ${isKnown ? "아는 한자" : "모르는 한자"} 목록으로 반영`
    )
  }

  /**
   * 한자 목록 + 아는 한자 ID 집합으로 해당 급수 known/unknown 캐시 생성 후 저장
   * (한자 목록 페이지에서 해당 급수 캐시가 없을 때 사용)
   */
  async buildAndSaveKnownStatusFromList(
    grade: number,
    hanziList: Array<{ id: string; character: string; meaning: string; sound: string }>,
    knownIds: Set<string>
  ): Promise<void> {
    const known: HanziWithKnownStatus[] = []
    const unknown: HanziWithKnownStatus[] = []
    const knownIdSet = new Set(knownIds)

    for (const h of hanziList) {
      const id = h.id
      const isKnown = knownIdSet.has(id)
      const item: HanziWithKnownStatus = {
        hanziId: id,
        character: h.character,
        meaning: h.meaning,
        sound: h.sound,
        isKnown,
      }
      if (isKnown) known.push(item)
      else unknown.push(item)
    }

    // 방어: 모르는 한자가 0인데 전체보다 아는 한자가 적으면, 나머지는 unknown으로
    if (unknown.length === 0 && hanziList.length > known.length) {
      const knownHanziIds = new Set(known.map((x) => x.hanziId))
      for (const h of hanziList) {
        if (knownHanziIds.has(h.id)) continue
        unknown.push({
          hanziId: h.id,
          character: h.character,
          meaning: h.meaning,
          sound: h.sound,
          isKnown: false,
        })
      }
    }

    await this.saveKnownStatusCache({
      grade,
      lastSyncedAt: new Date().toISOString(),
      known,
      unknown,
    })
    console.debug(
      `✅ ${grade}급 known/unknown 캐시 생성 (아는: ${known.length} / 모르는: ${unknown.length})`
    )
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

/** iOS 등에서 첫 연결 실패를 줄이기 위해 앱 로드 직후 DB를 한 번 열어둠 */
export function warmupIndexedDB(): void {
  if (typeof window === "undefined" || !window.indexedDB) return
  try {
    const req = window.indexedDB.open("hanziDB", 1)
    req.onupgradeneeded = (ev) => {
      const db = (ev.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains("hanziStore")) db.createObjectStore("hanziStore")
    }
    req.onsuccess = () => req.result.close()
    req.onerror = () => { /* 무시 */ }
  } catch {
    // 무시
  }
}
