"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import {
  User as FirebaseUser,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth"
import { auth, googleProvider, db } from "@/lib/firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { User } from "@/types"
import { calculateLevel } from "@/lib/experienceSystem"

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
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

  // Firestore에서 사용자 정보 저장/업데이트
  const saveUserToFirestore = async (firebaseUser: FirebaseUser) => {
    try {
      const userRef = doc(db, "users", firebaseUser.uid)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
        // 새 사용자인 경우 Firestore에 저장
        const newUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "",
          photoURL: firebaseUser.photoURL || "",
          level: 1,
          experience: 0,
          isAdmin: firebaseUser.email === "admin@example.com", // 특정 이메일을 관리자로 설정
          createdAt:
            firebaseUser.metadata.creationTime || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        await setDoc(userRef, newUser)
        return newUser
      } else {
        // 기존 사용자인 경우 기존 데이터 반환
        return userDoc.data() as User
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
          setUser(userDoc.data() as User)
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
      console.log(
        "Auth state changed:",
        firebaseUser ? "User logged in" : "No user"
      )
      setFirebaseUser(firebaseUser)

      if (firebaseUser) {
        try {
          // Firestore에서 사용자 정보 가져오기 또는 저장
          const appUser = await saveUserToFirestore(firebaseUser)
          setUser(appUser)
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
            isAdmin: firebaseUser.email === "admin@example.com",
            createdAt:
              firebaseUser.metadata.creationTime || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          setUser(fallbackUser)
        }
      } else {
        setUser(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

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
