export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<{ uid: string; email?: string } | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey || !idToken) return null
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  )
  if (!res.ok) return null
  const data = (await res.json()) as {
    users?: Array<{ localId?: string; email?: string }>
  }
  const user = data.users?.[0]
  const uid = user?.localId
  if (!uid) return null
  const email = user?.email?.trim()
  return email ? { uid, email } : { uid }
}
