"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import {
  User as FirebaseUser,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth"
import { auth, googleProvider, db } from "@/lib/firebase"
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore"
import { User } from "@/types"
import { calculateLevel } from "@/lib/experienceSystem"
import { ApiClient } from "@/lib/apiClient"

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  initialLoading: boolean // 초기 로딩과 일반 로딩 구분
  isAuthenticated: boolean // 인증 상태 캐싱
  signIn: () => Promise<void>
  signOutUser: () => Promise<void>
  refreshUserData: () => Promise<void>
  updateUserExperience: (experience: number) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true) // 초기 로딩 상태
  const [hasInitialized, setHasInitialized] = useState(false) // 초기화 완료 여부
  const [isAuthenticated, setIsAuthenticated] = useState(false) // 인증 상태 캐싱

  // Firestore에서 사용자 정보 저장/업데이트 (간단한 방식)
  const saveUserToFirestore = async (firebaseUser: FirebaseUser) => {
    try {
      console.log("🔍 사용자 정보 처리 시작:", firebaseUser.email)
      console.log("🔍 Firebase UID:", firebaseUser.uid)

      const userRef = doc(db, "users", firebaseUser.uid)
      console.log("🔍 문서 경로:", `users/${firebaseUser.uid}`)
      const userDoc = await getDoc(userRef)
      console.log("🔍 문서 존재 여부:", userDoc.exists())

      if (userDoc.exists()) {
        // 기존 사용자 - 정보 업데이트만
        const existingUserData = userDoc.data() as User
        console.log("✅ 기존 사용자 발견:", existingUserData.email)

        const updatedUserData = {
          ...existingUserData,
          email: firebaseUser.email || existingUserData.email,
          photoURL: firebaseUser.photoURL || existingUserData.photoURL,
          updatedAt: new Date().toISOString(),
        }

        // 변경사항이 있는 경우에만 업데이트
        if (
          updatedUserData.email !== existingUserData.email ||
          updatedUserData.photoURL !== existingUserData.photoURL
        ) {
          console.log("🔄 사용자 정보 업데이트:", existingUserData.email)
          await setDoc(userRef, updatedUserData, { merge: true })
          return updatedUserData
        }

        return existingUserData
      } else {
        // Firebase UID로 찾지 못한 경우, 이메일로 백업 조회
        console.log("🔍 이메일로 기존 사용자 검색:", firebaseUser.email)
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("email", "==", firebaseUser.email))
        const emailQuery = await getDocs(q)

        if (!emailQuery.empty) {
          // 이메일로 기존 사용자 발견 - UID 마이그레이션
          const existingUserDoc = emailQuery.docs[0]
          const existingUserData = existingUserDoc.data() as User

          console.log(
            "🔄 이메일로 기존 사용자 발견, UID 마이그레이션:",
            existingUserData.email
          )
          console.log(
            "🔄 기존 UID:",
            existingUserData.id,
            "→ 새 UID:",
            firebaseUser.uid
          )

          // 기존 데이터를 새 UID로 마이그레이션
          const migratedUserData = {
            ...existingUserData,
            id: firebaseUser.uid, // 새 Firebase UID로 변경
            email: firebaseUser.email || existingUserData.email,
            photoURL: firebaseUser.photoURL || existingUserData.photoURL,
            updatedAt: new Date().toISOString(),
          }

          // 새 위치에 저장
          await setDoc(userRef, migratedUserData)
          console.log(
            "✅ 사용자 데이터 마이그레이션 완료:",
            existingUserData.email
          )

          // 기존 문서 삭제 (중복 방지)
          await deleteDoc(doc(db, "users", existingUserDoc.id))
          console.log("🗑️ 기존 문서 삭제 완료:", existingUserDoc.id)

          return migratedUserData
        } else {
          // 완전히 새 사용자 - 생성
          console.log("🆕 새 사용자 생성:", firebaseUser.email)

          const newUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || "",
            photoURL: firebaseUser.photoURL || "",
            level: 1,
            experience: 0,
            isAdmin: false,
            preferredGrade: 8,
            createdAt:
              firebaseUser.metadata.creationTime || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          await setDoc(userRef, newUser)
          console.log("✅ 새 사용자 생성 완료:", firebaseUser.email)
          return newUser
        }
      }
    } catch (error) {
      console.error("사용자 정보 저장 에러:", error)
      throw error
    }
  }

  // 사용자 데이터 새로고침
  const refreshUserData = async () => {
    if (firebaseUser) {
      try {
        const userRef = doc(db, "users", firebaseUser.uid)
        const userDoc = await getDoc(userRef)
        if (userDoc.exists()) {
          const userData = userDoc.data() as User

          // 이메일과 photoURL만 업데이트 (displayName은 유지)
          const updatedUserData = {
            ...userData,
            email: firebaseUser.email || userData.email,
            photoURL: firebaseUser.photoURL || userData.photoURL,
            updatedAt: new Date().toISOString(),
          }

          // 변경사항이 있는 경우에만 업데이트
          if (
            updatedUserData.email !== userData.email ||
            updatedUserData.photoURL !== userData.photoURL
          ) {
            await setDoc(userRef, updatedUserData, { merge: true })
            setUser(updatedUserData)
          } else {
            setUser(userData)
          }
        }
      } catch (error) {
        console.error("사용자 데이터 새로고침 에러:", error)
      }
    }
  }

  // 실시간 경험치 업데이트 (새로고침 없이)
  const updateUserExperience = async (experience: number) => {
    if (firebaseUser && user) {
      try {
        const newExperience = user.experience + experience
        const newLevel = calculateLevel(newExperience)

        // 로컬 상태 즉시 업데이트
        setUser((prev) =>
          prev
            ? {
                ...prev,
                experience: newExperience,
                level: newLevel,
              }
            : null
        )

        // Firestore 업데이트
        const userRef = doc(db, "users", firebaseUser.uid)
        await setDoc(
          userRef,
          {
            ...user,
            experience: newExperience,
            level: newLevel,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        )
      } catch (error) {
        console.error("경험치 업데이트 에러:", error)
        // 에러 발생 시 전체 새로고침
        await refreshUserData()
      }
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // 이미 인증 완료된 상태에서 같은 사용자라면 빠른 처리
      if (
        hasInitialized &&
        firebaseUser &&
        user &&
        firebaseUser.uid === user.id
      ) {
        console.log(
          "🔄 이미 로드된 사용자, Firestore 조회 생략:",
          firebaseUser.email
        )
        setFirebaseUser(firebaseUser)
        setIsAuthenticated(true)
        setLoading(false)
        return
      }

      // 로그아웃된 경우
      if (!firebaseUser) {
        setFirebaseUser(null)
        setUser(null)
        setIsAuthenticated(false)
        if (!hasInitialized) {
          setInitialLoading(false)
          setHasInitialized(true)
        }
        setLoading(false)
        return
      }

      // 새로운 사용자이거나 처음 로그인하는 경우에만 Firestore 조회
      console.log("🔍 Firestore에서 사용자 정보 조회 시작:", firebaseUser.email)
      setFirebaseUser(firebaseUser)

      try {
        // Firestore에서 사용자 정보 가져오기 또는 저장
        const appUser = await saveUserToFirestore(firebaseUser)
        setUser(appUser)
        setIsAuthenticated(true)
        console.log("✅ 사용자 정보 로드 완료:", appUser.email)
      } catch (error) {
        console.error("사용자 정보 로드 에러:", error)
        // 에러 발생 시 기본 정보로 설정
        const fallbackUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "",
          photoURL: firebaseUser.photoURL || "",
          level: 1,
          experience: 0,
          isAdmin: false, // 기본적으로 관리자가 아님
          preferredGrade: 8, // 기본값: 8급
          createdAt:
            firebaseUser.metadata.creationTime || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setUser(fallbackUser)
        setIsAuthenticated(true)
      }

      // 초기 로딩 완료 처리
      if (!hasInitialized) {
        setInitialLoading(false)
        setHasInitialized(true)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [hasInitialized, user])

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error("로그인 에러:", error)
      throw new Error("로그인에 실패했습니다.")
    }
  }

  const signOutUser = async () => {
    try {
      await signOut(auth)
      // 로그아웃 후 로그인 페이지로 리다이렉트
      window.location.href = "/login"
    } catch (error) {
      console.error("로그아웃 에러:", error)
      throw new Error("로그아웃에 실패했습니다.")
    }
  }

  const value = {
    user,
    firebaseUser,
    loading,
    initialLoading,
    isAuthenticated,
    signIn,
    signOutUser,
    refreshUserData,
    updateUserExperience,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
