"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import {
  BookOpen,
  PenTool,
  Trophy,
  User,
  LogIn,
  Gamepad2,
  Eye,
  TrendingUp,
  Award,
} from "lucide-react"
import Link from "next/link"
import {
  calculateLevelProgress,
  calculateExperienceToNextLevel,
  calculateRequiredExperience,
  calculateBonusExperience,
} from "@/lib/experienceSystem"
import BonusExperienceModal from "@/components/BonusExperienceModal"
import { useState, useEffect } from "react"
import { ApiClient } from "@/lib/apiClient"

export default function Home() {
  const { user, initialLoading, signIn } = useAuth()
  const { hanziList, isLoading: dataLoading, refreshHanziData } = useData()

  // hanziList 상태 확인
  useEffect(() => {
    console.log("🏠 메인페이지 - hanziList 상태 확인:", {
      count: hanziList.length,
      isLoading: dataLoading,
      userGrade: user?.preferredGrade,
      allData: hanziList.map((h) => ({
        character: h.character,
        meaning: h.meaning,
        sound: h.sound,
        grade: h.grade,
        id: h.id,
      })),
      dataSource: hanziList.length > 0 ? "IndexedDB/DataContext" : "No Data",
    })

    // hanziList 전체 배열 출력
    console.log("📦 메인페이지 - hanziList 전체 배열:", hanziList)
  }, [hanziList.length, dataLoading, user?.preferredGrade])

  // IndexedDB 새로운 데이터베이스 테스트
  useEffect(() => {
    const checkAndUpdateIndexedDB = async () => {
      console.group("🔍 IndexedDB 급수 비교 및 데이터 관리")
      console.log("🚀 checkAndUpdateIndexedDB 함수 시작")

      try {
        // 1. 현재 급수 확인
        const currentGrade = user?.preferredGrade || 7
        console.debug("1️⃣ 현재 급수:", currentGrade)
        console.log("✅ 1단계 완료 - 현재 급수 확인")

        // 2. IndexedDB로 데이터 조회
        console.debug("2️⃣ IndexedDB 데이터 조회 시작...")
        console.log("🔍 indexedDB 객체 확인:", typeof indexedDB)
        console.log("🔍 window.indexedDB 확인:", typeof window.indexedDB)

        if (typeof indexedDB === "undefined") {
          console.error("❌ indexedDB가 정의되지 않음!")
          console.groupEnd()
          return
        }

        console.log("✅ indexedDB 사용 가능, 데이터베이스 열기 시도...")
        const request = indexedDB.open("hanziDB", 1)
        console.log("📂 hanziDB 열기 요청 생성됨")

        request.onsuccess = () => {
          console.log("🎉 hanziDB 데이터베이스 열기 성공!")
          const db = request.result
          console.debug("✅ hanziDB 데이터베이스 열기 성공")
          console.log("📊 데이터베이스 객체:", db)
          console.log("📊 데이터베이스 이름:", db.name)
          console.log("📊 데이터베이스 버전:", db.version)
          console.log(
            "📊 오브젝트 스토어 목록:",
            Array.from(db.objectStoreNames)
          )

          // 트랜잭션 시작
          console.log("🔄 트랜잭션 시작...")
          const transaction = db.transaction(["hanziStore"], "readwrite")
          console.log("✅ 트랜잭션 생성됨")
          const store = transaction.objectStore("hanziStore")
          console.log("✅ 오브젝트 스토어 접근됨")

          // 먼저 모든 키 조회해서 어떤 데이터가 있는지 확인
          console.log("🔍 모든 키 조회 시작...")
          const getAllKeysRequest = store.getAllKeys()

          getAllKeysRequest.onsuccess = () => {
            const allKeys = getAllKeysRequest.result
            console.log("📋 IndexedDB에 저장된 모든 키:", allKeys)

            if (allKeys.length === 0) {
              console.log("❌ IndexedDB에 저장된 데이터가 없음")
              console.log("📥 API에서 데이터 가져오기 시작...")

              // API에서 실제 한자 데이터 가져오기
              ApiClient.getHanziByGrade(currentGrade)
                .then((hanziData) => {
                  console.debug("✅ API에서 데이터 가져오기 성공:", {
                    grade: currentGrade,
                    charactersCount: hanziData.length,
                    sampleCharacters: hanziData.slice(0, 3).map((h) => ({
                      character: h.character,
                      meaning: h.meaning,
                      sound: h.sound,
                    })),
                  })

                  // 새로운 트랜잭션 생성
                  const newTransaction = db.transaction(
                    ["hanziStore"],
                    "readwrite"
                  )
                  const newStore = newTransaction.objectStore("hanziStore")

                  const newData = {
                    grade: currentGrade,
                    lastUpdated: new Date().toISOString(),
                    data: hanziData,
                  }

                  const putRequest = newStore.put(newData, "currentHanziData")

                  putRequest.onsuccess = () => {
                    console.debug("✅ API 데이터 IndexedDB 저장 완료!")
                    console.debug("📦 저장된 데이터:", {
                      grade: newData.grade,
                      charactersCount: newData.data.length,
                      lastUpdated: newData.lastUpdated,
                      sampleCharacters: newData.data.slice(0, 3).map((h) => ({
                        character: h.character,
                        meaning: h.meaning,
                        sound: h.sound,
                      })),
                    })
                    console.groupEnd()
                  }

                  putRequest.onerror = () => {
                    console.error("❌ API 데이터 저장 실패:", putRequest.error)
                    console.groupEnd()
                  }
                })
                .catch((error) => {
                  console.error("❌ API 호출 실패:", error)
                  console.debug("📥 API 실패 시 테스트 데이터 생성...")

                  // API 실패 시 테스트 데이터 생성
                  const fallbackData = {
                    grade: currentGrade,
                    lastUpdated: new Date().toISOString(),
                    data: [
                      {
                        id: `fallback_${currentGrade}_1`,
                        character: "人",
                        pinyin: "rén",
                        sound: "인",
                        meaning: "사람",
                        grade: currentGrade,
                        gradeNumber: 1,
                        strokes: 2,
                        radicals: ["人"],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      },
                    ],
                  }

                  // 새로운 트랜잭션 생성
                  const newTransaction = db.transaction(
                    ["hanziStore"],
                    "readwrite"
                  )
                  const newStore = newTransaction.objectStore("hanziStore")

                  const putRequest = newStore.put(
                    fallbackData,
                    "currentHanziData"
                  )

                  putRequest.onsuccess = () => {
                    console.debug("✅ 테스트 데이터 생성 완료!")
                    console.groupEnd()
                  }

                  putRequest.onerror = () => {
                    console.error(
                      "❌ 테스트 데이터 생성 실패:",
                      putRequest.error
                    )
                    console.groupEnd()
                  }
                })
              return
            }

            // 데이터가 있지만 비어있는 경우도 처리
            console.log("🔍 기존 데이터 확인 중...")
            const getRequest1 = store.get("currentHanziData")

            getRequest1.onsuccess = () => {
              const storedData = getRequest1.result
              console.log("📦 조회된 데이터:", storedData)

              if (
                !storedData ||
                !storedData.data ||
                storedData.data.length === 0
              ) {
                console.log(
                  "❌ IndexedDB에 데이터가 비어있음 - API에서 데이터 가져오기"
                )
                console.log("📥 API에서 데이터 가져오기 시작...")
                console.log("🔍 API 호출 시작 - currentGrade:", currentGrade)

                // API에서 실제 한자 데이터 가져오기
                ApiClient.getHanziByGrade(currentGrade)
                  .then((hanziData) => {
                    console.log("🔍 API 응답 받음 - hanziData:", hanziData)
                    console.log("🔍 hanziData 타입:", typeof hanziData)
                    console.log("🔍 hanziData 길이:", hanziData?.length || 0)
                    console.debug("✅ API에서 데이터 가져오기 성공:", {
                      grade: currentGrade,
                      charactersCount: hanziData.length,
                      sampleCharacters: hanziData.slice(0, 3).map((h) => ({
                        character: h.character,
                        meaning: h.meaning,
                        sound: h.sound,
                      })),
                    })

                    const newData = {
                      grade: currentGrade,
                      lastUpdated: new Date().toISOString(),
                      data: hanziData,
                    }

                    // 새로운 트랜잭션 생성
                    const newTransaction = db.transaction(
                      ["hanziStore"],
                      "readwrite"
                    )
                    const newStore = newTransaction.objectStore("hanziStore")

                    const putRequest = newStore.put(newData, "currentHanziData")

                    putRequest.onsuccess = () => {
                      console.debug("✅ API 데이터 IndexedDB 저장 완료!")
                      console.debug("📦 저장된 데이터:", {
                        grade: newData.grade,
                        charactersCount: newData.data.length,
                        lastUpdated: newData.lastUpdated,
                        sampleCharacters: newData.data.slice(0, 3).map((h) => ({
                          character: h.character,
                          meaning: h.meaning,
                          sound: h.sound,
                        })),
                      })
                      console.groupEnd()
                    }

                    putRequest.onerror = () => {
                      console.error(
                        "❌ API 데이터 저장 실패:",
                        putRequest.error
                      )
                      console.groupEnd()
                    }
                  })
                  .catch((error) => {
                    console.error("❌ API 호출 실패:", error)
                    console.groupEnd()
                  })
              } else {
                console.log("✅ IndexedDB에 유효한 데이터가 있음")
                console.groupEnd()
              }
            }

            getRequest1.onerror = () => {
              console.error("❌ 데이터 조회 실패:", getRequest1.error)
              console.groupEnd()
            }

            // currentHanziData 키로 데이터 조회
            console.log("🔍 currentHanziData 키로 데이터 조회 시작...")
            const getRequest2 = store.get("currentHanziData")
            console.log("📥 조회 요청 생성됨")

            getRequest2.onsuccess = async () => {
              console.log("🎉 데이터 조회 성공!")
              const storedData = getRequest2.result
              console.debug("3️⃣ 조회된 데이터 구조:", {
                hasData: !!storedData,
                dataType: typeof storedData,
                dataKeys: storedData ? Object.keys(storedData) : null,
                storedGrade: storedData?.grade,
                storedLastUpdated: storedData?.lastUpdated,
                storedCharactersCount: storedData?.data?.length || 0,
              })
              console.log("📦 조회된 데이터:", storedData)
              console.log("🔍 storedData 존재 여부:", !!storedData)
              console.log("🔍 storedData 타입:", typeof storedData)
              console.log("📊 data 배열 상세:", {
                length: storedData?.data?.length || 0,
                data: storedData?.data || [],
                sampleData: storedData?.data?.slice(0, 3) || [],
              })

              if (storedData) {
                console.log("✅ storedData가 존재함, 급수 비교 시작")
                const storedGrade = storedData.grade
                console.debug("4️⃣ 급수 비교:", {
                  currentGrade,
                  storedGrade,
                  isSameGrade: currentGrade === storedGrade,
                })
                console.log("🔍 급수 비교 결과:", {
                  current: currentGrade,
                  stored: storedGrade,
                  isSame: currentGrade === storedGrade,
                })

                console.log("🔍 급수 비교 후 조건 확인:", {
                  currentGrade,
                  storedGrade,
                  isEqual: currentGrade === storedGrade,
                  willEnterIfBlock: currentGrade === storedGrade,
                })

                if (currentGrade === storedGrade) {
                  console.log("✅ 같은 급수 조건 진입!")
                  // 5. 같은 급수면 데이터 그대로 사용 (단, data 배열이 비어있지 않은 경우만)
                  if (storedData.data && storedData.data.length > 0) {
                    console.debug("5️⃣ ✅ 같은 급수 - 기존 데이터 사용")
                    console.debug("📦 사용할 데이터:", {
                      grade: storedData.grade,
                      charactersCount: storedData.data.length,
                      lastUpdated: storedData.lastUpdated,
                      sampleCharacters: storedData.data
                        .slice(0, 3)
                        .map((h: any) => ({
                          character: h.character,
                          meaning: h.meaning,
                          sound: h.sound,
                        })),
                    })

                    // 🔍 IndexedDB 데이터를 실제로 활용하는지 확인
                    console.log("🎯 IndexedDB 데이터 활용 확인:", {
                      source: "IndexedDB Cache",
                      grade: storedData.grade,
                      charactersCount: storedData.data.length,
                      sampleCharacters: storedData.data
                        .slice(0, 3)
                        .map((h: any) => ({
                          character: h.character,
                          meaning: h.meaning,
                          sound: h.sound,
                        })),
                    })

                    // DataContext에 데이터 전달 (실제 활용)
                    console.log("🔄 DataContext에 IndexedDB 데이터 전달 중...")
                    console.log("🎯 IndexedDB 데이터 활용 확인:", {
                      source: "IndexedDB Cache",
                      grade: storedData.grade,
                      charactersCount: storedData.data.length,
                      lastUpdated: storedData.lastUpdated,
                      sampleCharacters: storedData.data
                        .slice(0, 3)
                        .map((h: any) => ({
                          character: h.character,
                          meaning: h.meaning,
                          sound: h.sound,
                        })),
                    })

                    // 🔍 실제로 DataContext의 hanziList가 업데이트되는지 확인
                    console.log("🔄 DataContext hanziList 업데이트 확인:", {
                      expectedLength: storedData.data.length,
                      expectedGrade: storedData.grade,
                      isUsingIndexedDB: true,
                    })

                    // 🔍 DataContext에 IndexedDB 데이터를 직접 전달
                    console.log(
                      "🎯 DataContext에 IndexedDB 데이터 직접 전달:",
                      {
                        dataSource: "IndexedDB",
                        charactersCount: storedData.data.length,
                        grade: storedData.grade,
                      }
                    )

                    // DataContext의 refreshHanziData 함수를 호출하여 IndexedDB 데이터를 DataContext에 전달
                    console.log("🔄 DataContext refreshHanziData 호출 중...")
                    console.log("🔍 refreshHanziData 함수 존재 확인:", {
                      exists: !!refreshHanziData,
                      type: typeof refreshHanziData,
                    })

                    try {
                      console.log("🚀 refreshHanziData() 호출 시작!")
                      await refreshHanziData()
                      console.log("✅ DataContext refreshHanziData 호출 완료!")
                    } catch (error) {
                      console.error(
                        "❌ DataContext refreshHanziData 실패:",
                        error
                      )
                    }

                    console.groupEnd()
                  } else {
                    // 같은 급수이지만 data 배열이 비어있는 경우 - API에서 데이터 가져오기
                    console.debug(
                      "5️⃣ ❌ 같은 급수이지만 데이터가 비어있음 - API에서 데이터 가져오기"
                    )
                    console.debug("📥 API에서 데이터 가져오기 시작...")

                    // API에서 실제 한자 데이터 가져오기
                    ApiClient.getHanziByGrade(currentGrade)
                      .then((hanziData) => {
                        console.debug("✅ API에서 데이터 가져오기 성공:", {
                          grade: currentGrade,
                          charactersCount: hanziData.length,
                          sampleCharacters: hanziData.slice(0, 3).map((h) => ({
                            character: h.character,
                            meaning: h.meaning,
                            sound: h.sound,
                          })),
                        })

                        // 새로운 트랜잭션 생성
                        const newTransaction = db.transaction(
                          ["hanziStore"],
                          "readwrite"
                        )
                        const newStore =
                          newTransaction.objectStore("hanziStore")

                        const newData = {
                          grade: currentGrade,
                          lastUpdated: new Date().toISOString(),
                          data: hanziData,
                        }

                        const putRequest = newStore.put(
                          newData,
                          "currentHanziData"
                        )

                        putRequest.onsuccess = () => {
                          console.debug("✅ API 데이터 IndexedDB 저장 완료!")
                          console.debug("📦 저장된 데이터:", {
                            grade: newData.grade,
                            charactersCount: newData.data.length,
                            lastUpdated: newData.lastUpdated,
                            sampleCharacters: newData.data
                              .slice(0, 3)
                              .map((h) => ({
                                character: h.character,
                                meaning: h.meaning,
                                sound: h.sound,
                              })),
                          })
                          console.groupEnd()
                        }

                        putRequest.onerror = () => {
                          console.error(
                            "❌ API 데이터 저장 실패:",
                            putRequest.error
                          )
                          console.groupEnd()
                        }
                      })
                      .catch((error) => {
                        console.error("❌ API 호출 실패:", error)
                        console.groupEnd()
                      })
                  }
                } else {
                  // 6. 다른 급수면 기존 데이터 클리어 후 새로운 데이터 저장
                  console.debug(
                    "6️⃣ ❌ 다른 급수 - 기존 데이터 클리어 후 새 데이터 저장"
                  )
                  console.debug("🧹 기존 데이터 클리어 중...")

                  // 기존 데이터 삭제
                  const deleteRequest = store.delete("currentHanziData")

                  deleteRequest.onsuccess = () => {
                    console.debug("✅ 기존 데이터 클리어 완료")
                    console.log(
                      "📥 API에서 새로운 급수 데이터 가져오기 시작..."
                    )
                    console.log(
                      "🔍 API 호출 시작 - currentGrade:",
                      currentGrade
                    )

                    // API에서 실제 한자 데이터 가져오기
                    ApiClient.getHanziByGrade(currentGrade)
                      .then((hanziData) => {
                        console.log("🔍 API 응답 받음 - hanziData:", hanziData)
                        console.log("🔍 hanziData 타입:", typeof hanziData)
                        console.log(
                          "🔍 hanziData 길이:",
                          hanziData?.length || 0
                        )
                        console.debug("✅ API에서 데이터 가져오기 성공:", {
                          grade: currentGrade,
                          charactersCount: hanziData.length,
                          sampleCharacters: hanziData.slice(0, 3).map((h) => ({
                            character: h.character,
                            meaning: h.meaning,
                            sound: h.sound,
                          })),
                        })

                        const newData = {
                          grade: currentGrade,
                          lastUpdated: new Date().toISOString(),
                          data: hanziData,
                        }

                        // 새로운 트랜잭션 생성
                        const newTransaction = db.transaction(
                          ["hanziStore"],
                          "readwrite"
                        )
                        const newStore =
                          newTransaction.objectStore("hanziStore")

                        const putRequest = newStore.put(
                          newData,
                          "currentHanziData"
                        )

                        putRequest.onsuccess = () => {
                          console.debug("✅ API 데이터 IndexedDB 저장 완료!")
                          console.debug("📦 저장된 데이터:", {
                            grade: newData.grade,
                            charactersCount: newData.data.length,
                            lastUpdated: newData.lastUpdated,
                            sampleCharacters: newData.data
                              .slice(0, 3)
                              .map((h) => ({
                                character: h.character,
                                meaning: h.meaning,
                                sound: h.sound,
                              })),
                          })
                          console.groupEnd()
                        }

                        putRequest.onerror = () => {
                          console.error(
                            "❌ API 데이터 저장 실패:",
                            putRequest.error
                          )
                          console.groupEnd()
                        }
                      })
                      .catch((error) => {
                        console.error("❌ API 호출 실패:", error)
                        console.groupEnd()
                      })
                  }

                  deleteRequest.onerror = () => {
                    console.error(
                      "❌ 기존 데이터 클리어 실패:",
                      deleteRequest.error
                    )
                  }
                }
              } else {
                // 데이터가 없는 경우 - API에서 실제 데이터 가져오기
                console.debug(
                  "4️⃣ ❌ IndexedDB에 데이터 없음 - API에서 데이터 가져오기"
                )
                console.debug("📥 API 호출 시작...")

                // API에서 실제 한자 데이터 가져오기
                ApiClient.getHanziByGrade(currentGrade)
                  .then((hanziData) => {
                    console.debug("✅ API에서 데이터 가져오기 성공:", {
                      grade: currentGrade,
                      charactersCount: hanziData.length,
                      sampleCharacters: hanziData.slice(0, 3).map((h) => ({
                        character: h.character,
                        meaning: h.meaning,
                        sound: h.sound,
                      })),
                    })

                    const newData = {
                      grade: currentGrade,
                      lastUpdated: new Date().toISOString(),
                      data: hanziData,
                    }

                    // 새로운 트랜잭션 생성
                    const newTransaction = db.transaction(
                      ["hanziStore"],
                      "readwrite"
                    )
                    const newStore = newTransaction.objectStore("hanziStore")

                    const putRequest = newStore.put(newData, "currentHanziData")

                    putRequest.onsuccess = () => {
                      console.debug("✅ API 데이터 IndexedDB 저장 완료!")
                      console.debug("📦 저장된 데이터:", {
                        grade: newData.grade,
                        charactersCount: newData.data.length,
                        lastUpdated: newData.lastUpdated,
                        sampleCharacters: newData.data.slice(0, 3).map((h) => ({
                          character: h.character,
                          meaning: h.meaning,
                          sound: h.sound,
                        })),
                      })
                    }

                    putRequest.onerror = () => {
                      console.error(
                        "❌ API 데이터 저장 실패:",
                        putRequest.error
                      )
                    }
                  })
                  .catch((error) => {
                    console.error("❌ API 호출 실패:", error)
                    console.debug("📥 API 실패 시 테스트 데이터 생성...")

                    // API 실패 시 테스트 데이터 생성
                    const fallbackData = {
                      grade: currentGrade,
                      lastUpdated: new Date().toISOString(),
                      data: [
                        {
                          id: `fallback_${currentGrade}_1`,
                          character: "人",
                          pinyin: "rén",
                          sound: "인",
                          meaning: "사람",
                          grade: currentGrade,
                          gradeNumber: 1,
                          strokes: 2,
                          radicals: ["人"],
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        },
                      ],
                    }

                    // 새로운 트랜잭션 생성
                    const newTransaction = db.transaction(
                      ["hanziStore"],
                      "readwrite"
                    )
                    const newStore = newTransaction.objectStore("hanziStore")

                    const putRequest = newStore.put(
                      fallbackData,
                      "currentHanziData"
                    )

                    putRequest.onsuccess = () => {
                      console.debug("✅ 테스트 데이터 생성 완료!")
                    }

                    putRequest.onerror = () => {
                      console.error(
                        "❌ 테스트 데이터 생성 실패:",
                        putRequest.error
                      )
                    }
                  })
              }

              console.groupEnd()
            }

            getRequest2.onerror = () => {
              console.error("❌ IndexedDB 데이터 조회 실패:", getRequest2.error)
              console.log("🔍 조회 실패 상세:", {
                error: getRequest2.error,
                errorName: getRequest2.error?.name,
                errorMessage: getRequest2.error?.message,
              })
              console.groupEnd()
            }
          }

          getAllKeysRequest.onerror = () => {
            console.error("❌ 모든 키 조회 실패:", getAllKeysRequest.error)
            console.groupEnd()
          }
        }

        request.onerror = () => {
          console.error("❌ hanziDB 데이터베이스 열기 실패:", request.error)
          console.log("🔍 데이터베이스 열기 실패 상세:", {
            error: request.error,
            errorName: request.error?.name,
            errorMessage: request.error?.message,
          })
          console.groupEnd()
        }
      } catch (error) {
        console.error("❌ IndexedDB 처리 중 에러:", error)
        console.groupEnd()
      }
    }

    // 사용자가 로그인한 후에만 실행
    if (user) {
      checkAndUpdateIndexedDB()
    }
  }, [user])
  const [showGuideModal, setShowGuideModal] = useState(false)
  const [todayExperience, setTodayExperience] = useState<number>(0)
  const [todayGoal, setTodayGoal] = useState<number>(100)
  const [consecutiveGoalDays, setConsecutiveGoalDays] = useState<number>(0)
  const [weeklyGoalAchievement, setWeeklyGoalAchievement] = useState<{
    achievedDays: number
    totalDays: number
  }>({ achievedDays: 0, totalDays: 7 }) // 0/7로 시작
  const [totalStudyTime, setTotalStudyTime] = useState<number>(0) // 총 학습시간 (초 단위)

  // 보너스 경험치 모달 상태
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [bonusInfo, setBonusInfo] = useState<{
    consecutiveDays: number
    bonusExperience: number
    dailyGoal: number
  }>({ consecutiveDays: 0, bonusExperience: 0, dailyGoal: 100 })

  // 유저 순위 상태
  const [userRankings, setUserRankings] = useState<
    Array<{
      userId: string
      username: string
      level: number
      experience: number
      totalPlayed: number
      accuracy: number
      totalStudyTime: number
      preferredGrade?: number
      rank: number
    }>
  >([])
  const [isLoadingRankings, setIsLoadingRankings] = useState<boolean>(false)
  const [showRankingModal, setShowRankingModal] = useState(false)

  // 사용자 정보 상태 (실시간 업데이트용)
  const [userInfo, setUserInfo] = useState({
    level: user?.level || 1,
    experience: user?.experience || 0,
  })

  // 데이터베이스의 level과 experience 사용
  const currentLevel = userInfo.level
  const currentExperience = userInfo.experience
  const levelProgress = calculateLevelProgress(currentExperience)
  const expToNextLevel = calculateExperienceToNextLevel(currentExperience)

  // 사용자 정보 새로고침 함수
  const refreshUserInfo = async () => {
    if (!user) return

    try {
      const userDoc = (await ApiClient.getDocument("users", user.id)) as any
      if (userDoc) {
        setUserInfo({
          level: userDoc.level || 1,
          experience: userDoc.experience || 0,
        })
        console.log("🔄 사용자 정보 새로고침:", {
          level: userDoc.level,
          experience: userDoc.experience,
        })
      }
    } catch (error) {
      console.error("사용자 정보 새로고침 실패:", error)
    }
  }

  // 페이지 포커스 시 사용자 정보 새로고침
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        refreshUserInfo()
      }
    }

    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [user])

  // 컴포넌트 마운트 시 사용자 정보 새로고침
  useEffect(() => {
    if (user) {
      refreshUserInfo()
    }
  }, [user])

  // 페이지 가시성 변경 시 사용자 정보 새로고침 (다른 탭에서 돌아올 때)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        refreshUserInfo()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [user])

  // 오늘 경험치 로드
  useEffect(() => {
    if (user) {
      const loadTodayExperience = async () => {
        try {
          // 자정 리셋 확인 및 처리
          await ApiClient.checkAndResetTodayExperience(user.id)

          const todayExp = await ApiClient.getTodayExperience(user.id)
          setTodayExperience(todayExp)

          // 오늘의 학습 목표와 목표 달성 통계 로드
          const userStats = await ApiClient.getUserStatistics(user.id)
          if (userStats) {
            setTodayGoal(userStats.todayGoal || 100)
            setConsecutiveGoalDays(userStats.consecutiveGoalDays || 0)
            setTotalStudyTime(userStats.totalStudyTime || 0)
            if (userStats.weeklyGoalAchievement) {
              setWeeklyGoalAchievement({
                achievedDays: userStats.weeklyGoalAchievement.achievedDays || 0,
                totalDays: userStats.weeklyGoalAchievement.totalDays || 0,
              })
            }

            // 보너스 경험치 확인 및 모달 표시
            if (
              userStats.consecutiveGoalDays &&
              userStats.consecutiveGoalDays >= 10
            ) {
              const bonusExp = calculateBonusExperience(
                userStats.consecutiveGoalDays,
                userStats.todayGoal || 100
              )
              if (bonusExp > 0) {
                // 보너스 모달 표시
                setBonusInfo({
                  consecutiveDays: userStats.consecutiveGoalDays,
                  bonusExperience: bonusExp,
                  dailyGoal: userStats.todayGoal || 100,
                })
                setShowBonusModal(true)
              }
            }
          }
        } catch (error) {
          console.error("오늘 경험치 로드 실패:", error)
        }
      }
      loadTodayExperience()
    }
  }, [user])

  // 보너스 경험치 획득 시 모달 표시 (현재 사용하지 않음)
  // const handleBonusEarned = (
  //   consecutiveDays: number,
  //   bonusExperience: number,
  //   dailyGoal: number
  // ) => {
  //   setBonusInfo({ consecutiveDays, bonusExperience, dailyGoal })
  //   setShowBonusModal(true)
  // }

  // 유저 순위 로드
  useEffect(() => {
    const loadUserRankings = async () => {
      try {
        setIsLoadingRankings(true)

        const rankings = await ApiClient.getUserRankings()

        setUserRankings(rankings)
      } catch (error) {
        console.error("유저 순위 로드 실패:", error)
      } finally {
        setIsLoadingRankings(false)
      }
    }

    loadUserRankings()
  }, [])

  // 로딩 중일 때는 로딩 스피너만 표시 (진짜 초기 로딩만)
  if (initialLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='인증 상태를 확인하는 중...' />
      </div>
    )
  }

  // 데이터 로딩 중일 때는 기본 레이아웃을 유지하면서 로딩 표시
  if (dataLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
        <header className='bg-white shadow-sm'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex justify-between items-center py-4'>
              <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>
                한자 학습 앱
              </h1>
              <div className='flex items-center space-x-2 sm:space-x-4'>
                {user ? (
                  <Link
                    href='/profile'
                    className='flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors'
                  >
                    <User className='h-4 w-4 sm:h-5 sm:w-5' />
                    <span>마이페이지</span>
                  </Link>
                ) : (
                  <button
                    onClick={signIn}
                    className='flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors'
                  >
                    <LogIn className='h-3 w-3 sm:h-4 sm:w-4' />
                    <span className='hidden sm:inline'>로그인</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8'>
          <div className='flex items-center justify-center py-12'>
            <LoadingSpinner message='데이터를 불러오는 중...' />
          </div>
        </main>
      </div>
    )
  }

  const games = [
    {
      id: "memory",
      title: "카드 뒤집기",
      description: "같은 한자를 찾아보세요",
      icon: Gamepad2,
      color: "bg-blue-500",
      href: "/games/memory",
    },
    {
      id: "quiz",
      title: "퀴즈",
      description: "한자의 뜻과 음을 맞춰보세요",
      icon: BookOpen,
      color: "bg-green-500",
      href: "/games/quiz",
    },
    {
      id: "writing",
      title: "쓰기 연습",
      description: "획순을 따라 한자를 써보세요",
      icon: PenTool,
      color: "bg-purple-500",
      href: "/games/writing",
    },
    {
      id: "partial",
      title: "부분 맞추기",
      description: "가려진 한자를 맞춰보세요",
      icon: Eye,
      color: "bg-orange-500",
      href: "/games/partial",
    },
  ]

  const handleGameClick = (gameId: string, href: string) => {
    window.location.href = href
  }

  // 학습시간을 읽기 쉬운 형식으로 변환
  const formatStudyTime = (seconds: number | undefined): string => {
    if (!seconds || seconds === 0) {
      return "0초"
    }

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}시간 ${minutes}분`
    } else if (minutes > 0) {
      return `${minutes}분`
    } else {
      return `${seconds}초`
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <header className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>
              한자 학습 앱
              <span className='text-sm sm:text-base font-normal text-gray-600 ml-2'>
                (한자 진흥회 기반)
              </span>
            </h1>
            <div className='flex items-center space-x-2 sm:space-x-4'>
              {user ? (
                <Link
                  href='/profile'
                  className='flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors'
                >
                  <User className='h-4 w-4 sm:h-5 sm:w-5' />
                  <span>마이페이지</span>
                </Link>
              ) : (
                <Link
                  href='/login'
                  className='flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors'
                >
                  <LogIn className='h-3 w-3 sm:h-4 sm:w-4' />
                  <span className='hidden sm:inline'>로그인</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-16'>
        {user ? (
          <div className='space-y-6 sm:space-y-8'>
            {/* 사용자 정보 및 환영 메시지 */}
            <div className='bg-white rounded-lg shadow-sm p-4 sm:p-6 pb-8'>
              <div className='flex items-center justify-between mb-4'>
                <div>
                  <h2 className='text-lg sm:text-xl font-semibold text-gray-900 mb-1'>
                    안녕하세요, {user.displayName}님!
                  </h2>
                  <p className='text-sm sm:text-base text-gray-600'>
                    오늘도 한자 학습을 시작해보세요.
                  </p>
                </div>
              </div>

              {/* 레벨 정보 */}
              <div className='space-y-3'>
                {/* 레벨 표시 */}
                <h3 className='text-lg font-semibold text-gray-900'>
                  레벨 {currentLevel}
                </h3>

                {/* 오늘의 학습 성과 */}
                <div className='bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100'>
                  <div className='flex items-center space-x-2 mb-2'>
                    <TrendingUp className='h-5 w-5 text-blue-600' />
                    <span className='text-sm font-semibold text-blue-800'>
                      오늘의 학습
                    </span>
                  </div>
                  <div className='flex items-baseline space-x-2 mb-2'>
                    <span className='text-2xl font-bold text-blue-600'>
                      {todayExperience}
                    </span>
                    <span className='text-sm text-blue-600'>EXP 획득</span>
                    <span className='text-sm text-gray-500'>
                      / {todayGoal} 목표
                    </span>
                  </div>

                  {/* 진행률 바 */}
                  <div className='w-full bg-gray-200 rounded-full h-2 mb-2'>
                    <div
                      className='bg-blue-600 h-2 rounded-full transition-all duration-300'
                      style={{
                        width: `${Math.min(
                          100,
                          (todayExperience / todayGoal) * 100
                        )}%`,
                      }}
                    ></div>
                  </div>

                  <p className='text-xs text-blue-700'>
                    {todayExperience >= todayGoal
                      ? `🎉 목표 달성! ${todayExperience}EXP를 획득했어요!`
                      : `목표까지 ${
                          todayGoal - todayExperience
                        }EXP 남았어요! 🎯`}
                  </p>

                  {/* 목표 달성 통계 */}
                  <div className='mt-3 pt-3 border-t border-blue-200'>
                    <div className='flex justify-around items-center'>
                      {/* 연속 목표 달성일 */}
                      <div className='text-center'>
                        <div className='text-lg font-bold text-green-600'>
                          {consecutiveGoalDays}일
                        </div>
                        <div className='text-xs text-gray-600'>연속 달성</div>
                        {consecutiveGoalDays >= 10 && (
                          <div className='text-xs text-blue-600 mt-1 font-medium'>
                            🎁 보너스!
                          </div>
                        )}
                      </div>
                      {/* 이번주 달성 현황 */}
                      <div className='text-center'>
                        <div className='text-lg font-bold text-purple-600'>
                          {weeklyGoalAchievement.achievedDays}/
                          {weeklyGoalAchievement.totalDays}
                        </div>
                        <div className='text-xs text-gray-600'>이번주 달성</div>
                      </div>
                      {/* 누적 공부 시간 */}
                      <div className='text-center'>
                        <div className='text-lg font-bold text-orange-600'>
                          {formatStudyTime(totalStudyTime)}
                        </div>
                        <div className='text-xs text-gray-600'>
                          누적 공부 시간
                        </div>
                      </div>
                    </div>

                    {/* 보너스 경험치 정보 */}
                    {consecutiveGoalDays >= 10 && (
                      <div className='mt-3 pt-3 border-t border-blue-100'>
                        <div className='text-center'>
                          <div className='text-sm font-medium text-blue-600 mb-1'>
                            🎁 보너스 경험치 정보
                          </div>
                          <div className='text-xs text-gray-600 space-y-1'>
                            {consecutiveGoalDays >= 30 ? (
                              <div>
                                30일 연속: +
                                {Math.round(
                                  500 *
                                    Math.min(
                                      Math.max(todayGoal / 100, 1.0),
                                      3.0
                                    )
                                )}{" "}
                                EXP
                              </div>
                            ) : consecutiveGoalDays >= 20 ? (
                              <div>
                                20일 연속: +
                                {Math.round(
                                  200 *
                                    Math.min(
                                      Math.max(todayGoal / 100, 1.0),
                                      3.0
                                    )
                                )}{" "}
                                EXP
                              </div>
                            ) : (
                              <div>
                                10일 연속: +
                                {Math.round(
                                  50 *
                                    Math.min(
                                      Math.max(todayGoal / 100, 1.0),
                                      3.0
                                    )
                                )}{" "}
                                EXP
                              </div>
                            )}
                            <div className='text-blue-500'>
                              목표 {todayGoal} EXP ×{" "}
                              {Math.min(
                                Math.max(todayGoal / 100, 1.0),
                                3.0
                              ).toFixed(1)}
                              배
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 다음 레벨까지와 진행률 */}
                <div className='flex items-center justify-between text-sm text-gray-600'>
                  <span>다음 레벨까지 {expToNextLevel} EXP 필요</span>
                  <span>
                    진행률:{" "}
                    <span className='text-blue-600 font-semibold'>
                      {Math.round(levelProgress * 100)}%
                    </span>
                  </span>
                </div>

                {/* 경험치 바와 정보 */}
                <div className='space-y-2'>
                  {/* 레벨 시작/끝 경험치 (바 위) */}
                  <div className='flex justify-between text-xs text-gray-500'>
                    <span>{calculateRequiredExperience(currentLevel)}</span>
                    <span>{calculateRequiredExperience(currentLevel + 1)}</span>
                  </div>

                  {/* 경험치 바 */}
                  <div className='w-full bg-gray-200 rounded-full h-4 relative'>
                    <div
                      className='bg-blue-600 h-4 rounded-full transition-all duration-300'
                      style={{ width: `${levelProgress * 100}%` }}
                    ></div>
                  </div>

                  {/* 화살표와 현재 경험치 (바 아래, 진행률에 따라 위치) */}
                  <div className='relative'>
                    <div
                      className='absolute transform -translate-x-1/2 text-center'
                      style={{
                        left: `${Math.min(
                          100,
                          Math.max(0, levelProgress * 100)
                        )}%`,
                        top: "-8px",
                      }}
                    >
                      <div className='text-blue-600 text-xs'>▲</div>
                      <div className='text-blue-600 text-xs font-medium'>
                        {currentExperience}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 보너스 경험치 모달 */}
            <BonusExperienceModal
              isOpen={showBonusModal}
              onClose={() => setShowBonusModal(false)}
              consecutiveDays={bonusInfo.consecutiveDays}
              bonusExperience={bonusInfo.bonusExperience}
              dailyGoal={bonusInfo.dailyGoal}
            />

            {/* 유저 순위 */}
            <div className='mb-6 sm:mb-8'>
              <h2 className='text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6'>
                🏆 유저 순위
              </h2>
              <div className='bg-white rounded-lg shadow-sm p-4 sm:p-6'>
                {isLoadingRankings ? (
                  <div className='flex items-center justify-center py-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                    <span className='ml-2 text-gray-600'>
                      순위를 불러오는 중...
                    </span>
                  </div>
                ) : userRankings.length > 0 ? (
                  <div className='space-y-3'>
                    {userRankings.slice(0, 5).map((user) => (
                      <div
                        key={user.userId}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          user.rank === 1
                            ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200"
                            : user.rank === 2
                            ? "bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200"
                            : user.rank === 3
                            ? "bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200"
                            : "bg-gray-50 border border-gray-100"
                        }`}
                      >
                        <div className='flex items-center space-x-3'>
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              user.rank === 1
                                ? "bg-yellow-400 text-white"
                                : user.rank === 2
                                ? "bg-gray-400 text-white"
                                : user.rank === 3
                                ? "bg-orange-400 text-white"
                                : "bg-blue-400 text-white"
                            }`}
                          >
                            {user.rank}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <div className='font-semibold text-gray-900 truncate'>
                              {user.username}
                            </div>
                            <div className='text-xs text-gray-600 space-y-1'>
                              <div className='flex items-center space-x-2'>
                                <span>레벨 {user.level}</span>
                                <span>•</span>
                                <span>
                                  {user.experience.toLocaleString()} EXP
                                </span>
                                <span>•</span>
                                <span className='text-orange-600 font-medium'>
                                  {formatStudyTime(user.totalStudyTime)}
                                </span>
                              </div>
                              <div className='flex items-center space-x-2'>
                                <span>{user.totalPlayed}문제</span>
                                <span>•</span>
                                <span className='text-green-600 font-medium'>
                                  정답률 {user.accuracy}%
                                </span>
                                <span>•</span>
                                <span className='text-blue-600 font-medium'>
                                  {user.preferredGrade}급
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* 더보기 버튼 */}
                    {userRankings.length > 5 && (
                      <div className='text-center pt-3'>
                        <button
                          onClick={() => setShowRankingModal(true)}
                          className='text-xs text-gray-500 hover:text-gray-700 underline'
                        >
                          더보기
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='text-center py-8 text-gray-500'>
                    아직 순위 데이터가 없습니다.
                  </div>
                )}
              </div>
            </div>

            {/* 게임 선택 */}
            <div>
              <div className='flex items-center justify-between mb-4 sm:mb-6'>
                <h2 className='text-xl sm:text-2xl font-bold text-gray-900'>
                  학습 게임
                </h2>
                {user && (
                  <div className='bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-bold'>
                    현재 학습 급수:{" "}
                    {user.preferredGrade === 5.5
                      ? "준5급"
                      : user.preferredGrade === 4.5
                      ? "준4급"
                      : user.preferredGrade === 3.5
                      ? "준3급"
                      : `${user.preferredGrade}급`}
                  </div>
                )}
              </div>
              <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6'>
                {games.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleGameClick(game.id, game.href)}
                    className='bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer text-left w-full'
                  >
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 ${game.color} rounded-lg flex items-center justify-center mb-3 sm:mb-4`}
                    >
                      <game.icon className='h-5 w-5 sm:h-6 sm:w-6 text-white' />
                    </div>
                    <h3 className='text-sm sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2'>
                      {game.title}
                    </h3>
                    <p className='text-xs sm:text-sm text-gray-600'>
                      {game.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* 한자 정보 */}
            <div className='mt-8'>
              <h2 className='text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6'>
                한자 정보
              </h2>
              <div className='grid grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6'>
                {/* 한자 목록 카드 */}
                <button
                  onClick={() => (window.location.href = "/hanzi/list")}
                  className='bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer text-left w-full'
                >
                  <div className='w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-3 sm:mb-4'>
                    <BookOpen className='h-5 w-5 sm:h-6 sm:w-6 text-white' />
                  </div>
                  <h3 className='text-sm sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2'>
                    한자 목록
                  </h3>
                  <p className='text-xs sm:text-sm text-gray-600'>
                    급수별 한자 현황과 학습 통계를 확인하세요
                  </p>
                </button>

                {/* 교과서 한자어 카드 */}
                <button
                  onClick={() => (window.location.href = "/textbook-words")}
                  className='bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer text-left w-full'
                >
                  <div className='w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-3 sm:mb-4'>
                    <BookOpen className='h-5 w-5 sm:h-6 sm:w-6 text-white' />
                  </div>
                  <h3 className='text-sm sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2'>
                    교과서 한자어
                  </h3>
                  <p className='text-xs sm:text-sm text-gray-600'>
                    교과서에 나오는 한자어를 학습하세요
                  </p>
                </button>
              </div>

              {/* 시험 섹션 */}
              <div className='mt-8'>
                <h2 className='text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6'>
                  한자 실력 급수 시험
                </h2>
                <div className='grid grid-cols-1 gap-4 sm:gap-6'>
                  <button
                    onClick={() => (window.location.href = "/games/exam")}
                    className='bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer text-left w-full'
                  >
                    <div className='w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-3 sm:mb-4'>
                      <Trophy className='h-5 w-5 sm:h-6 sm:w-6 text-white' />
                    </div>
                    <h3 className='text-sm sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2'>
                      급수 시험
                    </h3>
                    <p className='text-xs sm:text-sm text-gray-600'>
                      공식 급수 시험으로 실력을 인증하고 자격증을 취득해보세요
                    </p>
                  </button>
                </div>
              </div>

              {/* 학습 가이드 섹션 */}
              <div className='mt-8'>
                <h2 className='text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6'>
                  학습 가이드
                </h2>
                <div className='grid grid-cols-1 gap-4 sm:gap-6'>
                  <button
                    onClick={() => setShowGuideModal(true)}
                    className='bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer text-left w-full'
                  >
                    <div className='w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-lg flex items-center justify-center mb-3 sm:mb-4'>
                      <Trophy className='h-5 w-5 sm:h-6 sm:w-6 text-white' />
                    </div>
                    <h3 className='text-sm sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2'>
                      학습 가이드
                    </h3>
                    <p className='text-xs sm:text-sm text-gray-600'>
                      효과적인 한자 학습 방법과 팁을 확인하세요
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 로그인 전 화면 */
          <div className='text-center py-8 sm:py-12 pb-16'>
            <div className='max-w-md mx-auto'>
              <h2 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-4'>
                한자 학습에 오신 것을 환영합니다
              </h2>
              <p className='text-sm sm:text-base text-gray-600 mb-6 sm:mb-8'>
                한자 진흥회 데이터를 기반으로 한 다양한 학습 게임을 통해 한자를
                재미있게 배워보세요.
              </p>
              <button
                onClick={() => (window.location.href = "/login")}
                className='flex items-center space-x-2 px-4 py-3 sm:px-6 sm:py-3 text-base sm:text-lg text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors mx-auto'
              >
                <LogIn className='h-4 w-4 sm:h-5 sm:w-5' />
                <span>Google로 시작하기</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 학습 가이드 준비 중 모달 */}
      {showGuideModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          {/* 배경 오버레이 */}
          <div
            className='absolute inset-0'
            style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
            onClick={() => setShowGuideModal(false)}
          />

          {/* 모달 */}
          <div className='relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6'>
            <div className='text-center'>
              <div className='text-yellow-500 text-4xl mb-4'>🚧</div>
              <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                준비 중인 기능
              </h3>
              <p className='text-gray-700 mb-6'>
                학습 가이드 기능은 현재 개발 중입니다.
              </p>
              <button
                onClick={() => setShowGuideModal(false)}
                className='px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors'
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 유저 순위 모달 */}
      {showRankingModal && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
          onClick={() => setShowRankingModal(false)}
        >
          <div
            className='bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col'
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className='flex items-center justify-between p-6 border-b'>
              <h2 className='text-xl font-bold text-gray-900'>
                🏆 전체 유저 순위
              </h2>
              <button
                onClick={() => setShowRankingModal(false)}
                className='text-gray-400 hover:text-gray-600 text-2xl'
              >
                ×
              </button>
            </div>

            {/* 모달 내용 */}
            <div className='flex-1 overflow-y-auto p-6'>
              {isLoadingRankings ? (
                <div className='flex items-center justify-center py-8'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                  <span className='ml-2 text-gray-600'>
                    순위를 불러오는 중...
                  </span>
                </div>
              ) : userRankings.length > 0 ? (
                <div className='space-y-3'>
                  {userRankings.map((user) => (
                    <div
                      key={user.userId}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        user.rank === 1
                          ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200"
                          : user.rank === 2
                          ? "bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200"
                          : user.rank === 3
                          ? "bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200"
                          : "bg-gray-50 border border-gray-100"
                      }`}
                    >
                      <div className='flex items-center space-x-3'>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            user.rank === 1
                              ? "bg-yellow-400 text-white"
                              : user.rank === 2
                              ? "bg-gray-400 text-white"
                              : user.rank === 3
                              ? "bg-orange-400 text-white"
                              : "bg-blue-400 text-white"
                          }`}
                        >
                          {user.rank}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='font-semibold text-gray-900 truncate'>
                            {user.username}
                          </div>
                          <div className='text-xs text-gray-600 space-y-1'>
                            <div className='flex items-center space-x-2'>
                              <span>레벨 {user.level}</span>
                              <span>•</span>
                              <span>
                                {user.experience.toLocaleString()} EXP
                              </span>
                              <span>•</span>
                              <span className='text-orange-600 font-medium'>
                                {formatStudyTime(user.totalStudyTime)}
                              </span>
                            </div>
                            <div className='flex items-center space-x-2'>
                              <span>{user.totalPlayed}문제</span>
                              <span>•</span>
                              <span className='text-green-600 font-medium'>
                                정답률 {user.accuracy}%
                              </span>
                              <span>•</span>
                              <span className='text-blue-600 font-medium'>
                                {user.preferredGrade}급
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  아직 순위 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
