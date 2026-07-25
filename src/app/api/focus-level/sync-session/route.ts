import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebaseAdmin"
import {
  FOCUS_LEVEL_LINK_COLLECTION,
  FOCUS_LEVEL_MIN_SYNC_SECONDS,
  FOCUS_LEVEL_SOURCE_APP,
  hanziActivityLabel,
  type FocusLevelLink,
} from "@/lib/focusLevelLink"
import { verifyFirebaseIdToken } from "@/lib/verifyFirebaseIdToken"

type SyncBody = {
  idToken?: string
  op?: "upsert" | "delete"
  sessionId?: string
  startTime?: string
  endTime?: string
  durationSeconds?: number
  activity?: string
  type?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SyncBody
    const verified = await verifyFirebaseIdToken(body.idToken ?? "")
    if (!verified) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }
    const op = body.op
    const sessionId = body.sessionId?.trim()
    if (op !== "upsert" && op !== "delete") {
      return NextResponse.json({ error: "op은 upsert 또는 delete 여야 합니다." }, { status: 400 })
    }
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId가 필요합니다." }, { status: 400 })
    }

    const ingestUrl = process.env.FOCUS_LEVEL_INGEST_URL?.trim()
    const ingestSecret = process.env.FOCUS_LEVEL_INGEST_SECRET?.trim()
    if (!ingestUrl || !ingestSecret) {
      return NextResponse.json({ ok: true, skipped: true, reason: "env" })
    }

    const linkSnap = await getAdminFirestore()
      .collection(FOCUS_LEVEL_LINK_COLLECTION)
      .doc(verified.uid)
      .get()
    if (!linkSnap.exists) {
      return NextResponse.json({ ok: true, skipped: true, reason: "not_linked" })
    }
    const link = linkSnap.data() as FocusLevelLink
    if (!link.focusUserId || !link.activityId) {
      return NextResponse.json({ ok: true, skipped: true, reason: "incomplete_link" })
    }

    if (op === "delete") {
      const upstream = await fetch(ingestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ingest-secret": ingestSecret,
        },
        body: JSON.stringify({
          op: "delete",
          userId: link.focusUserId,
          activityId: link.activityId,
          sourceApp: FOCUS_LEVEL_SOURCE_APP,
          sourceRecordId: sessionId,
        }),
      })
      const result = (await upstream.json().catch(() => ({}))) as { error?: string }
      if (!upstream.ok) {
        return NextResponse.json(
          { error: result.error ?? "동기화 실패" },
          { status: upstream.status >= 400 ? upstream.status : 502 },
        )
      }
      return NextResponse.json({ ok: true, ...result })
    }

    const durationSeconds = Math.max(0, Math.round(Number(body.durationSeconds) || 0))
    if (durationSeconds < FOCUS_LEVEL_MIN_SYNC_SECONDS) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "too_short",
        durationSeconds,
      })
    }
    const startTime = body.startTime
    const endTime = body.endTime
    if (!startTime || !endTime) {
      return NextResponse.json({ error: "startTime과 endTime이 필요합니다." }, { status: 400 })
    }

    const label = hanziActivityLabel(body.activity ?? "")
    const feedbackLines = [
      `활동 : ${label}`,
      body.type ? `유형 : ${body.type === "game" ? "게임" : "페이지"}` : "",
      "출처 : 한자학습",
    ].filter(Boolean)

    const upstream = await fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ingest-secret": ingestSecret,
      },
      body: JSON.stringify({
        op: "upsert",
        userId: link.focusUserId,
        activityId: link.activityId,
        sourceApp: FOCUS_LEVEL_SOURCE_APP,
        sourceRecordId: sessionId,
        startTime,
        endTime,
        durationSeconds,
        feedbackLines,
      }),
    })
    const result = (await upstream.json().catch(() => ({}))) as { error?: string }
    if (!upstream.ok) {
      return NextResponse.json(
        { error: result.error ?? "동기화 실패" },
        { status: upstream.status >= 400 ? upstream.status : 502 },
      )
    }
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("[focus-level/sync-session]", error)
    return NextResponse.json({ error: "동기화에 실패했습니다." }, { status: 500 })
  }
}
