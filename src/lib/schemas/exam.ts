import { z } from "zod"

export const BaseApiResponseSchema = z
  .object({
    success: z.boolean().optional(),
    message: z.string().optional(),
  })
  .passthrough()

export type BaseApiResponse = z.infer<typeof BaseApiResponseSchema>

export const SaveExamStatisticsResponseSchema = BaseApiResponseSchema
export const UpdateExperienceResponseSchema = BaseApiResponseSchema
export const UpdateStudyTimeResponseSchema = BaseApiResponseSchema

// Question schemas (runtime 최소 검증)
export const QuestionTypeSchema = z.enum([
  "sound",
  "meaning",
  "word_reading",
  "word_meaning",
  "blank_hanzi",
  "word_meaning_select",
  "hanzi_write",
  "word_reading_write",
  "sentence_reading",
  "subjective",
])

export const FinalQuestionSchema = z
  .object({
    id: z.string(),
    type: QuestionTypeSchema,
    character: z.string(),
    question: z.string().optional(),
    options: z.array(z.string()).optional(),
    aiGeneratedContent: z.string().optional(),
    correctAnswerIndex: z.number().optional(),
    textBookWord: z
      .object({ hanzi: z.string().optional(), korean: z.string().optional() })
      .optional()
      .nullable(),
    relatedWords: z
      .union([
        z.object({ hanzi: z.string().optional(), korean: z.string().optional() }),
        z.array(z.object({ hanzi: z.string().optional(), korean: z.string().optional() })),
      ])
      .optional()
      .nullable(),
  })
  .passthrough()

export const FinalQuestionsArraySchema = z.array(FinalQuestionSchema)

export const CorrectAnswerItemSchema = z.object({
  questionIndex: z.number(),
  type: QuestionTypeSchema,
  character: z.string(),
  correctAnswer: z.union([z.string(), z.number()]),
})

export const CorrectAnswersArraySchema = z.array(CorrectAnswerItemSchema)
