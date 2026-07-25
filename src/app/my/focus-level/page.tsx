"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Link2, LogIn, Unlink, Check } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { getClientIdToken } from "@/lib/getClientIdToken"
import {
  isFocusLevelAuthConfigured,
  signInFocusLevelWithGoogle,
  signOutFocusLevel,
} from "@/lib/focusLevelAuth"
import type { FocusLevelLink } from "@/lib/focusLevelLink"

type ActivityRow = {
  id: string
  name: string
  isPinned: boolean
  achievementUnit: string
}

export default function FocusLevelLinkPage() {
  const router = useRouter()
  const { loading, isAuthenticated } = useAuth()
  const [link, setLink] = useState<FocusLevelLink | null>(null)
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [focusEmail, setFocusEmail] = useState<string | null>(null)
  const [focusLevelIdToken, setFocusLevelIdToken] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const configured = isFocusLevelAuthConfigured()

  const loadLink = useCallback(async () => {
    try {
      const idToken = await getClientIdToken()
      const res = await fetch("/api/focus-level/link", {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const data = (await res.json()) as { link?: FocusLevelLink | null; error?: string }
      if (!res.ok) throw new Error(data.error ?? "연동 조회 실패")
      setLink(data.link ?? null)
      if (data.link?.activityId) setSelectedId(data.link.activityId)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/")
      return
    }
    if (isAuthenticated) void loadLink()
  }, [loading, isAuthenticated, router, loadLink])

  const handleFocusLogin = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const { idToken, user } = await signInFocusLevelWithGoogle()
      setFocusLevelIdToken(idToken)
      setFocusEmail(user.email)
      const res = await fetch("/api/focus-level/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focusLevelIdToken: idToken }),
      })
      const data = (await res.json()) as {
        activities?: ActivityRow[]
        focusEmail?: string | null
        error?: string
      }
      if (!res.ok) throw new Error(data.error ?? "활동 목록 실패")
      setActivities(data.activities ?? [])
      if (data.focusEmail) setFocusEmail(data.focusEmail)
      setMessage("활동을 선택한 뒤 연동 저장을 눌러 주세요.")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const handleSaveLink = async () => {
    if (!focusLevelIdToken || !selectedId) return
    const selected = activities.find((a) => a.id === selectedId)
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      const idToken = await getClientIdToken()
      const res = await fetch("/api/focus-level/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          focusLevelIdToken,
          activityId: selected.id,
          activityName: selected.name,
        }),
      })
      const data = (await res.json()) as { link?: FocusLevelLink; error?: string }
      if (!res.ok) throw new Error(data.error ?? "연동 저장 실패")
      setLink(data.link ?? null)
      setMessage(`「${selected.name}」 활동에 연동되었습니다.`)
      await signOutFocusLevel().catch(() => undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const handleUnlink = async () => {
    if (!confirm("나혼자만레벨업 연동을 해제할까요?")) return
    setBusy(true)
    setError(null)
    try {
      const idToken = await getClientIdToken()
      const res = await fetch("/api/focus-level/link", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "연동 해제 실패")
      setLink(null)
      setActivities([])
      setFocusLevelIdToken(null)
      setSelectedId("")
      setMessage("연동이 해제되었습니다.")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (loading || !isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-lg px-4 py-6">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-sm text-slate-600"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </button>
        <h1 className="mb-2 flex items-center gap-2 text-xl font-bold text-slate-900">
          <Link2 className="h-5 w-5" />
          나혼자만레벨업 연동
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          카드 뒤집기·퀴즈·부분 맞추기 등 학습 시간을 선택한 focus-level 활동에 동기화합니다.
        </p>

        {!configured && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            NEXT_PUBLIC_FOCUS_LEVEL_* 환경변수가 필요합니다.
          </div>
        )}

        {link && (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">현재 연동</p>
            <p className="font-semibold text-slate-900">{link.activityName}</p>
            {link.focusEmail && (
              <p className="mt-1 text-xs text-slate-400">{link.focusEmail}</p>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleUnlink()}
              className="mt-3 inline-flex items-center gap-1 text-sm text-red-600"
            >
              <Unlink className="h-4 w-4" />
              연동 해제
            </button>
          </div>
        )}

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          <button
            type="button"
            disabled={busy || !configured}
            onClick={() => void handleFocusLogin()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            focus-level Google 로그인
          </button>
          {focusEmail && <p className="text-xs text-slate-500">로그인: {focusEmail}</p>}
          {activities.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">활동 선택</p>
              {activities.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <input
                    type="radio"
                    name="activity"
                    checked={selectedId === a.id}
                    onChange={() => setSelectedId(a.id)}
                  />
                  <span>
                    {a.name}
                    {a.isPinned ? " · 고정" : ""}
                  </span>
                </label>
              ))}
              <button
                type="button"
                disabled={busy || !selectedId || !focusLevelIdToken}
                onClick={() => void handleSaveLink()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                연동 저장
              </button>
            </div>
          )}
        </div>
        {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
