import { Hanzi } from "@/types"

interface HanziStorageData {
  grade: number
  lastUpdated: string
  data: Hanzi[]
}

export class HanziStorage {
  private readonly STORAGE_KEY = "currentHanziData"
  private db: IDBDatabase | null = null

  constructor() {
    this.initDB()
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

      const transaction = this.db.transaction(["hanziStore"], "readonly")
      const store = transaction.objectStore("hanziStore")
      const request = store.get(this.STORAGE_KEY)

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

      const transaction = this.db.transaction(["hanziStore"], "readwrite")
      const store = transaction.objectStore("hanziStore")
      const request = store.put(data, this.STORAGE_KEY)

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
        const transaction = this.db!.transaction(["hanziStore"], "readwrite")
        const store = transaction.objectStore("hanziStore")
        const request = store.delete(this.STORAGE_KEY)

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
}
