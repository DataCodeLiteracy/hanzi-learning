import { Hanzi } from "@/types"

// AI 관련 프롬프트 정보
export const aiPrompts = {
  word_meaning: {
    systemPrompt:
      "한자능력검정시험 문제를 생성합니다. 문장은 따옴표 안에, 괄호 (       )는 따옴표 밖에 배치하세요. 정답 한자는 절대 문장 안에 포함하지 마세요. 보기나 선택지 번호도 절대 포함하지 마세요.",
    userPrompt: (
      hanzi: Hanzi
    ) => `한자: ${hanzi.character}, 뜻: ${hanzi.meaning}, 음: ${hanzi.sound}

문장에서 [${hanzi.meaning}]로 표시하고, 따옴표 안에 문장을 생성한 후 괄호 (       )를 따옴표 밖에 배치하세요.

중요: 
- 정답 한자 "${hanzi.character}"는 절대 문장 안에 포함하지 마세요
- 보기나 선택지 번호(1. 2. 3. 4.)는 절대 포함하지 마세요
- 순수하게 문장과 괄호만 생성하세요

예시: "박람회에서 우수한 작품을 [여덟] 개를 선정했습니다." (       )`,
    maxTokens: 200,
    temperature: 0.3,
  },
  blank_hanzi: {
    systemPrompt:
      "한자능력검정시험 문제를 생성합니다. 주어진 한자어의 한글 의미로 자연스러운 문장을 생성하세요. 문장만 생성하고 설명은 하지 마세요.",
    userPrompt: (
      hanzi: Hanzi & {
        relatedWord?: { hanzi: string; meaning: string }
        targetCharacter?: string
      }
    ) => `한자어: ${hanzi.relatedWord?.hanzi} (한글 의미: ${hanzi.relatedWord?.meaning})

이 한자어의 한글 의미를 사용하여 자연스러운 문장을 생성하세요. 문장만 생성하고 다른 설명은 하지 마세요.

예시:
- 한자어: 水泳 (한글 의미: 수영) → "그 다이빙 선수는 수영 동작이 완벽했습니다."
- 한자어: 木工 (한글 의미: 목공) → "목공은 나무를 잘라 책상을 만들었습니다."
- 한자어: 配列 (한글 의미: 배열) → "컴퓨터 과학 수업에서는 데이터 배열에 대해 배웠습니다."
- 한자어: 整理 (한글 의미: 정리) → "이 방은 너무 어지럽혀져 있어서 정리가 필요합니다."`,
    maxTokens: 100,
    temperature: 0.7,
  },
  word_meaning_select: {
    systemPrompt:
      "당신은 한자능력검정시험 문제를 생성하는 전문가입니다. 주어진 한자어의 뜻과 오답을 생성해주세요.",
    userPrompt: (hanzi: Hanzi) =>
      `한자어: ${hanzi.character}\n뜻: ${hanzi.meaning}\n\n이 한자어의 정확한 뜻을 생성하고, 유사하지만 틀린 뜻 3개를 생성해주세요.`,
    maxTokens: 200,
    temperature: 0.7,
  },
  hanzi_write: {
    systemPrompt:
      "당신은 한자능력검정시험 문제를 생성하는 전문가입니다. 주어진 한자의 뜻과 음을 바탕으로 문제를 생성해주세요.",
    userPrompt: (hanzi: Hanzi) =>
      `한자: ${hanzi.character}\n뜻: ${hanzi.meaning}\n음: ${hanzi.sound}\n\n이 한자의 뜻과 음을 묻는 문제를 생성해주세요.`,
    maxTokens: 200,
    temperature: 0.7,
  },
  word_reading_write: {
    systemPrompt:
      "당신은 한자능력검정시험 문제를 생성하는 전문가입니다. 주어진 한자어의 독음을 묻는 문제를 생성해주세요.",
    userPrompt: (hanzi: Hanzi) =>
      `한자어: ${hanzi.character}\n뜻: ${hanzi.meaning}\n음: ${hanzi.sound}\n\n이 한자어의 독음을 묻는 문제를 생성해주세요.`,
    maxTokens: 200,
    temperature: 0.7,
  },
  sentence_reading: {
    systemPrompt:
      "당신은 한자능력검정시험 문제를 생성하는 전문가입니다. 주어진 문장의 독음을 묻는 문제를 생성해주세요.",
    userPrompt: (hanzi: Hanzi) =>
      `문장: ${hanzi.character}\n뜻: ${hanzi.meaning}\n음: ${hanzi.sound}\n\n이 문장의 독음을 묻는 문제를 생성해주세요.`,
    maxTokens: 200,
    temperature: 0.7,
  },
  subjective: {
    systemPrompt:
      "당신은 한자능력검정시험 문제를 생성하는 전문가입니다. 주어진 한자에 대한 주관식 문제를 생성해주세요.",
    userPrompt: (hanzi: Hanzi) =>
      `한자: ${hanzi.character}\n뜻: ${hanzi.meaning}\n음: ${hanzi.sound}\n\n이 한자에 대한 주관식 문제를 생성해주세요.`,
    maxTokens: 200,
    temperature: 0.7,
  },
}
