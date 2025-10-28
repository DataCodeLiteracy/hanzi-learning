import { Hanzi } from "@/types"

// AI 관련 프롬프트 정보
export const aiPrompts = {
  word_meaning: {
    systemPrompt:
      "한자능력검정시험 문제를 생성합니다. 문장은 따옴표 안에, 괄호 (       )는 따옴표 밖에 배치하세요. 정답 한자는 절대 문장 안에 포함하지 마세요. 보기나 선택지 번호도 절대 포함하지 마세요. 한자의 뜻을 자연스러운 형태로 사용하세요.",
    userPrompt: (
      hanzi: Hanzi
    ) => `한자: ${hanzi.character}, 뜻: ${hanzi.meaning}, 음: ${hanzi.sound}

문장에서 [${hanzi.meaning}]로 표시하고, 따옴표 안에 문장을 생성한 후 괄호 (       )를 따옴표 밖에 배치하세요. 

중요: 한자의 뜻을 자연스러운 형태로 사용하세요:
- "무거울" → "무거운"
- "작을" → "작은" 
- "넉" → "넷" 또는 "네"
- "일곱" → "일곱" (그대로)
- "맏" → "맏" (그대로)
- "벨" → "벨" (그대로)

중요: 
- 정답 한자 "${hanzi.character}"는 절대 문장 안에 포함하지 마세요
- 보기나 선택지 번호(1. 2. 3. 4.)는 절대 포함하지 마세요
- 순수하게 문장과 괄호만 생성하세요
- 한자의 뜻을 자연스러운 형태로 사용하세요 (예: "무거울" → "무거운", "작을" → "작은")

예시: 
- "박람회에서 우수한 작품을 [여덟] 개를 선정했습니다." (       )
- "그는 [무거운] 짐을 들고 계단을 올라갔다." (       )
- "이 [작은] 집은 정말 아늑하다." (       )
- "우리 집안에서 [맏]이 가장 책임감이 크다." (       )`,
    maxTokens: 200,
    temperature: 0.3,
  },
  blank_hanzi: {
    systemPrompt:
      "한자능력검정시험 문제를 생성합니다. 주어진 한자어를 사용하여 자연스러운 문장을 생성하고, 정답 한자를 ○로 표시하세요. 문장만 생성하고 설명은 하지 마세요.",
    userPrompt: (
      hanzi: Hanzi & {
        relatedWord?: { hanzi: string; meaning: string }
        targetCharacter?: string
      }
    ) => `한자어: ${hanzi.relatedWord?.hanzi} (한글 의미: ${hanzi.relatedWord?.meaning})
정답 한자: ${hanzi.character}

이 한자어를 사용하여 자연스러운 문장을 생성하세요. 문장에서 정답 한자 "${hanzi.character}" 부분을 ○로 표시하세요.

중요 규칙:
- 한자어를 그대로 문장에 사용하세요
- 정답 한자 부분만 ○로 표시하세요
- 문장은 자연스럽고 이해하기 쉬워야 합니다
- 문장만 생성하고 다른 설명은 하지 마세요

예시:
- 한자어: 水泳 (한글 의미: 수영), 정답 한자: 水 → "그 다이빙 선수는 ○泳 동작이 완벽했습니다."
- 한자어: 木工 (한글 의미: 목공), 정답 한자: 木 → "○工은 나무를 잘라 책상을 만들었습니다."
- 한자어: 配列 (한글 의미: 배열), 정답 한자: 配 → "컴퓨터 과학 수업에서는 데이터 ○列에 대해 배웠습니다."
- 한자어: 整理 (한글 의미: 정리), 정답 한자: 整 → "이 방은 너무 어지럽혀져 있어서 ○리가 필요합니다."`,
    maxTokens: 150,
    temperature: 0.7,
  },
  word_meaning_select: {
    systemPrompt:
      "당신은 한자능력검정시험 문제를 생성하는 전문가입니다. 주어진 한자어의 정확한 사전적 뜻과 유사하지만 틀린 뜻 3개를 생성해주세요.",
    userPrompt: (hanzi: Hanzi) =>
      `한자어: ${hanzi.character}
사전적 뜻: ${hanzi.meaning}

이 한자어의 정확한 사전적 뜻과 유사하지만 틀린 뜻 3개를 생성해주세요.

형식:
정답: [정확한 사전적 뜻]
오답1: [유사하지만 틀린 뜻]
오답2: [유사하지만 틀린 뜻]  
오답3: [유사하지만 틀린 뜻]

예시:
한자어: 學習
사전적 뜻: 학습
정답: 경험의 결과로 나타나는, 비교적 지속적인 행동의 변화나 그 잠재력의 변화. 또는 지식을 습득하는 과정.
오답1: 동일한 성격의 데이터를 관리하기 쉽도록 하나로 묶는 일.
오답2: 한 해 열두 달 가운데 넷째 달.
오답3: 지식을 암기하는 것`,
    maxTokens: 300,
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
      "당신은 한자능력검정시험 문제를 생성하는 전문가입니다. 주어진 한자어를 사용하여 자연스러운 문장을 생성하고, 문장에서 해당 한자어 부분을 [ ]로 표시해주세요.",
    userPrompt: (hanzi: Hanzi) =>
      `한자어: ${hanzi.character}
한글 의미: ${hanzi.meaning}

이 한자어를 사용하여 자연스러운 문장을 생성하세요. 문장에서 해당 한자어 부분을 [ ]로 표시하세요.

예시:
한자어: 規則
한글 의미: 규칙
생성 문장: "우리 반 친구들은 모두 자발적으로 학급 [ 規則 ] 을 잘 지킵니다."

중요 규칙:
- 문장은 자연스럽고 이해하기 쉬워야 합니다
- 한자어 부분만 [ ]로 표시하세요
- 문장은 따옴표로 감싸지 마세요
- 보기나 선택지는 포함하지 마세요`,
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
