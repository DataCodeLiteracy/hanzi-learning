export interface GradeInfoItem {
  name: string
  questionCount: number
  timeLimit: number
}

export const gradeInfo: Record<number, GradeInfoItem> = {
  8: { name: "8급", questionCount: 50, timeLimit: 60 },
  7: { name: "7급", questionCount: 50, timeLimit: 60 },
  6: { name: "6급", questionCount: 80, timeLimit: 60 },
  5: { name: "5급", questionCount: 100, timeLimit: 60 },
  4: { name: "4급", questionCount: 100, timeLimit: 60 },
  3: { name: "3급", questionCount: 100, timeLimit: 60 },
  2: { name: "2급", questionCount: 100, timeLimit: 60 },
  1: { name: "1급", questionCount: 100, timeLimit: 60 },
  0: { name: "사범급", questionCount: 100, timeLimit: 60 },
}
