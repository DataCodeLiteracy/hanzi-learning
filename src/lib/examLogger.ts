import { DEBUG_EXAM } from "@/lib/examConstants"

export function debugExam(...args: unknown[]) {
  if (DEBUG_EXAM) {
    console.log(...args)
  }
}
