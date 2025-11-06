import { DEBUG_EXAM } from "@/lib/examConstants"

export function debugExam(...args: unknown[]) {
  if (DEBUG_EXAM) {
    // eslint-disable-next-line no-console
    console.log(...args)
  }
}
