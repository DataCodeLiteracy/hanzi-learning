// 패턴 기본 정보 정의
export const patterns = {
  sound: {
    type: "sound",
    name: "한자의 음(소리) 찾기",
    description: "[ ] 안의 한자의 음(소리)으로 알맞은 것을 선택하세요.",
    needsAI: false,
    answerType: "sound", // 한자의 음 (예: "사", "입", "수")
    userInputType: "option", // 옵션 선택 (1, 2, 3, 4)
  },
  sound_same: {
    type: "sound_same",
    name: "같은 음(소리) 한자 찾기",
    description: "[ ] 안의 한자와 음이 같은 한자를 선택하세요.",
    needsAI: false,
    answerType: "character", // 한자 (예: "同", "東")
    userInputType: "option", // 옵션 선택 (1, 2, 3, 4)
  },
  meaning: {
    type: "meaning",
    name: "뜻에 맞는 한자 찾기",
    description: "[ ] 안의 뜻에 맞는 한자를 선택하세요.",
    needsAI: false,
    answerType: "character", // 한자 (예: "男", "川", "火")
    userInputType: "option", // 옵션 선택 (1, 2, 3, 4)
  },
  word_reading: {
    type: "word_reading",
    name: "한자어 독음 문제",
    description: "[ ] 안의 한자어를 바르게 읽은 것을 선택하세요.",
    needsAI: false,
    answerType: "korean_word", // 한글 단어 (예: "시간", "발음", "체육")
    userInputType: "option", // 옵션 선택 (1, 2, 3, 4)
  },
  word_meaning: {
    type: "word_meaning",
    name: "한자어 뜻 문제",
    description: "[ ] 안의 뜻을 가진 한자를 선택하세요.",
    needsAI: true,
    answerType: "character", // 한자 (예: "人", "口", "石")
    userInputType: "character", // 직접 한자 입력
  },
  blank_hanzi: {
    type: "blank_hanzi",
    name: "빈칸 한자 찾기",
    description: "O에 들어갈 알맞은 한자를 선택하세요.",
    needsAI: true,
    answerType: "character", // 한자 (예: "模", "境")
    userInputType: "character", // 직접 한자 입력
  },
  word_meaning_select: {
    type: "word_meaning_select",
    name: "한자어 뜻 찾기",
    description: "[ ] 안의 한자어의 뜻을 선택하세요.",
    needsAI: true,
    answerType: "korean_word", // 한글 단어 (예: "계산", "실감")
    userInputType: "option", // 옵션 선택 (1, 2, 3, 4)
  },
  hanzi_write: {
    type: "hanzi_write",
    name: "한자 뜻과 음 쓰기",
    description: "한자의 훈(뜻)과 음(소리)을 한글로 쓰세요.",
    needsAI: false,
    answerType: "meaning_sound", // 훈음 (예: "설 립", "스스로 자")
    userInputType: "meaning_sound", // 직접 훈음 입력
  },
  word_reading_write: {
    type: "word_reading_write",
    name: "한자어 독음 쓰기",
    description: "한자어의 독음(소리)을 <보기>와 같이 한글로 쓰세요.",
    needsAI: false,
    answerType: "korean_word", // 한글 단어 (예: "준비", "시간")
    userInputType: "korean_word", // 직접 한글 단어 입력
  },
  sentence_reading: {
    type: "sentence_reading",
    name: "문장 독음 문제",
    description: "[ ] 안의 한자어의 독음(소리)을 선택하세요.",
    needsAI: true,
    answerType: "korean_word", // 한글 단어 (예: "체험", "공부")
    userInputType: "option", // 옵션 선택 (1, 2, 3, 4)
  },
} as const

export type PatternType = keyof typeof patterns

// 패턴별 데이터 타입 정의
export type AnswerType =
  | "sound" // 한자의 음 (예: "사", "입", "수")
  | "character" // 한자 (예: "男", "川", "人")
  | "korean_word" // 한글 단어 (예: "시간", "발음", "준비")
  | "meaning_sound" // 훈음 (예: "설 립", "스스로 자")

export type UserInputType =
  | "option" // 옵션 선택 (1, 2, 3, 4)
  | "character" // 직접 한자 입력
  | "korean_word" // 직접 한글 단어 입력
  | "meaning_sound" // 직접 훈음 입력
