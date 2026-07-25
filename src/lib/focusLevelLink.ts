export const FOCUS_LEVEL_LINK_COLLECTION = "focusLevelLink"
export const FOCUS_LEVEL_SOURCE_APP = "hanzi-learning"
export const FOCUS_LEVEL_MIN_SYNC_SECONDS = 30

export type FocusLevelLink = {
  focusUserId: string
  focusEmail?: string
  activityId: string
  activityName: string
  linkedAt: string
  updatedAt?: string
}

export const HANZI_ACTIVITY_LABELS: Record<string, string> = {
  memory: "카드 뒤집기",
  quiz: "퀴즈",
  partial: "부분 맞추기",
  exam: "시험",
  writing: "쓰기",
  "hanzi-list": "한자 목록",
  "textbook-words": "교과서 단어",
}

export function hanziActivityLabel(activity: string): string {
  return HANZI_ACTIVITY_LABELS[activity] ?? activity
}
