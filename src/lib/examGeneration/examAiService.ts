type ProgressUpdater = (progress: number, message?: string) => void

export const processAIQuestions = async (
  structuredQuestions: any[],
  updateProgress?: ProgressUpdater,
  hanziList?: any[]
) => {
  const aiQuestionsToProcess = structuredQuestions.filter((q) => q.aiText)

  if (aiQuestionsToProcess.length === 0) {
    return structuredQuestions
  }

  // 진행률 업데이트: 40초 동안 1초마다 2.5%씩 증가 (50% ~ 90%)
  const startProgress = 50
  const endProgress = 90
  const interval = 1000 // 1초
  const increment = 2.5 // 2.5%씩 증가
  const maxDuration = 40000 // 40초 최대
  const startTime = Date.now()

  // 진행률 상태를 객체로 관리하여 클로저 문제 방지
  const progressState = {
    interval: null as NodeJS.Timeout | null,
    isCleared: false,
    currentProgress: startProgress,
  }

  if (updateProgress) {
    updateProgress(progressState.currentProgress, "문제 문장 생성 중...")
  }

  // 진행률 업데이트 인터벌 설정 (안전한 종료 조건 포함)
  if (updateProgress) {
    progressState.interval = setInterval(() => {
      // 이미 정리되었으면 중지
      if (progressState.isCleared) {
        if (progressState.interval) {
          clearInterval(progressState.interval)
          progressState.interval = null
        }
        return
      }

      // 최대 시간 초과 확인
      const elapsed = Date.now() - startTime
      if (elapsed >= maxDuration) {
        progressState.isCleared = true
        if (progressState.interval) {
          clearInterval(progressState.interval)
          progressState.interval = null
        }
        if (updateProgress) updateProgress(endProgress, "문제 생성 완료")
        return
      }

      // 진행률 증가
      progressState.currentProgress += increment
      if (progressState.currentProgress <= endProgress) {
        if (updateProgress && !progressState.isCleared) {
          updateProgress(progressState.currentProgress, "문제 문장 생성 중...")
        }
      } else {
        // 진행률이 endProgress를 초과하면 종료
        progressState.isCleared = true
        if (progressState.interval) {
          clearInterval(progressState.interval)
          progressState.interval = null
        }
        if (updateProgress) updateProgress(endProgress, "문제 생성 완료")
      }
    }, interval)
  }
  try {
    const requestBody = {
      questions: aiQuestionsToProcess.map((q) => ({
        id: q.id,
        type: q.type,
        aiPrompt: q.aiText,
        hanziData: {
          character: q.character,
          meaning: q.meaning,
          sound: q.sound,
          relatedWords: q.relatedWords,
        },
      })),
    }

    const response = await fetch("/api/generate-ai-exam-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      console.error(
        "❌ AI API 응답 실패:",
        response.status,
        response.statusText
      )
      throw new Error("AI 처리 실패")
    }

    const aiResult = await response.json()

    if (aiResult.success && aiResult.questions) {
      aiResult.questions.forEach((aiProcessed: any) => {
        const questionIndex = parseInt(String(aiProcessed.id).replace("q_", ""))
        if (!structuredQuestions[questionIndex]) return
        let processedContent = aiProcessed.aiGeneratedContent as string

        // 패턴 5: blank_hanzi 후처리
        if (structuredQuestions[questionIndex].type === "blank_hanzi") {
          const question = structuredQuestions[questionIndex]
          let relatedWord = null
          if (Array.isArray(question.relatedWords)) {
            relatedWord = question.relatedWords.find((w: any) => w?.isTextBook)
          } else if (question.relatedWords?.isTextBook) {
            relatedWord = question.relatedWords
          }
          if (relatedWord) {
            // 한글을 한자로 변환
            processedContent = processedContent.replace(
              new RegExp(relatedWord.korean, "g"),
              relatedWord.hanzi
            )
            // 정답 한자를 ○ 하나로 변환 (한 개의 한자만)
            processedContent = processedContent.replace(
              new RegExp(question.character, "g"),
              "○"
            )
            // ○○가 두 개 이상 나오는 경우를 ○ 하나로 통합
            processedContent = processedContent.replace(/○+/g, "○")
          }
        }

        // 패턴 6: word_meaning_select 후처리 (정답/오답 파싱 및 옵션 구성)
        if (structuredQuestions[questionIndex].type === "word_meaning_select") {
          // 이미 옵션이 설정되어 있으면 다시 처리하지 않음 (최종 문제 고정)
          if (
            structuredQuestions[questionIndex].options &&
            structuredQuestions[questionIndex].options.length > 0 &&
            structuredQuestions[questionIndex].correctAnswerIndex !== undefined
          ) {
            // 이미 처리된 문제는 스킵 (aiGeneratedContent만 업데이트)
            structuredQuestions[questionIndex].aiGeneratedContent =
              processedContent
            return
          }

          const lines = String(processedContent)
            .split("\n")
            .filter((line: string) => line.trim())
          let correctAnswer = ""
          let wrongAnswers: string[] = []

          // 정답/오답 파싱
          lines.forEach((line: string) => {
            const trimmedLine = line.trim()
            // 정답 파싱 (다양한 형식 지원)
            if (
              trimmedLine.includes("정답:") ||
              trimmedLine.includes("정답 :")
            ) {
              const parsed = trimmedLine
                .replace(/정답\s*[:：]\s*/i, "")
                .replace(/^\[.*?\]\s*/, "")
                .trim()
              if (parsed) {
                correctAnswer = parsed
              }
            }
            // 오답 파싱 (다양한 형식 지원)
            else if (
              trimmedLine.includes("오답") ||
              trimmedLine.match(/^오답\d*[:：]/i)
            ) {
              const wrongAnswer = trimmedLine
                .replace(/오답\d*\s*[:：]\s*/i, "")
                .replace(/^\[.*?\]\s*/, "")
                .trim()
              if (wrongAnswer && wrongAnswer.length > 0) {
                wrongAnswers.push(wrongAnswer)
              }
            }
          })

          // 파싱 실패 시 fallback
          if (!correctAnswer || wrongAnswers.length < 3) {
            correctAnswer =
              structuredQuestions[questionIndex].textBookWord?.korean ||
              (Array.isArray(structuredQuestions[questionIndex].relatedWords)
                ? structuredQuestions[questionIndex].relatedWords.find(
                    (rw: any) => rw?.isTextBook
                  )?.korean
                : structuredQuestions[questionIndex].relatedWords?.isTextBook
                ? structuredQuestions[questionIndex].relatedWords.korean
                : null) ||
              structuredQuestions[questionIndex].meaning ||
              ""

            if (correctAnswer && wrongAnswers.length < 3) {
              const base = correctAnswer
              const fallbackWrongAnswers = [
                `${base}의 반대`,
                `${base}와 유사한`,
                `${base}의 다른 의미`,
              ]
              // 기존 오답이 있으면 추가, 없으면 fallback 사용
              if (wrongAnswers.length === 0) {
                wrongAnswers = fallbackWrongAnswers
              } else {
                // 기존 오답에 추가로 필요한 만큼 fallback에서 가져옴
                while (wrongAnswers.length < 3) {
                  wrongAnswers.push(
                    fallbackWrongAnswers[wrongAnswers.length] ||
                      `${base}의 다른 의미`
                  )
                }
              }
            }
          }

          // 옵션이 4개가 되도록 보장
          if (wrongAnswers.length < 3) {
            const base = correctAnswer || "기본값"
            while (wrongAnswers.length < 3) {
              wrongAnswers.push(`${base}의 보기 ${wrongAnswers.length + 1}`)
            }
          }

          // 옵션 섞기 및 정답 인덱스 계산 (한 번만 실행, 고정)
          const allOptions = [correctAnswer, ...wrongAnswers].filter(Boolean)
          if (allOptions.length === 0) {
            // 최후의 fallback
            allOptions.push("정답 없음", "오답1", "오답2", "오답3")
          }

          // 고정 시드로 섞기 (questionIndex를 시드로 사용하여 일관성 유지)
          // Fisher-Yates 알고리즘을 사용한 고정 시드 셔플
          const seed = questionIndex
          const shuffledOptions = [...allOptions.slice(0, 4)]

          // 간단한 시드 기반 랜덤 생성 함수
          let seedValue = seed
          const seededRandom = () => {
            seedValue = (seedValue * 9301 + 49297) % 233280
            return seedValue / 233280
          }

          // Fisher-Yates 셔플
          for (let i = shuffledOptions.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom() * (i + 1))
            ;[shuffledOptions[i], shuffledOptions[j]] = [
              shuffledOptions[j],
              shuffledOptions[i],
            ]
          }

          // 정답 인덱스 찾기 (정확한 문자열 비교)
          const correctAnswerIndex =
            shuffledOptions.findIndex((o) => {
              return o.trim() === correctAnswer.trim()
            }) + 1

          // 정답 인덱스가 0이면 (없으면) 1로 설정 (fallback)
          const finalCorrectAnswerIndex =
            correctAnswerIndex > 0 ? correctAnswerIndex : 1

          // 디버깅: word_meaning_select의 correctAnswerIndex 상세 확인
          console.log(`🔍 word_meaning_select 정답 인덱스 계산 상세:`, {
            questionIndex,
            character: structuredQuestions[questionIndex].character,
            correctAnswer: `"${correctAnswer}"`,
            correctAnswerLength: correctAnswer.length,
            correctAnswerTrimmed: `"${correctAnswer.trim()}"`,
            shuffledOptions: shuffledOptions.map((o, i) => ({
              index: i + 1,
              value: `"${o}"`,
              length: o.length,
              trimmed: `"${o.trim()}"`,
              match: o.trim() === correctAnswer.trim(),
            })),
            correctAnswerIndex: correctAnswerIndex > 0 ? correctAnswerIndex : 1,
            finalCorrectAnswerIndex,
            allOptions: allOptions.map((o, i) => ({
              index: i,
              value: `"${o}"`,
            })),
            wrongAnswers: wrongAnswers.map((o, i) => ({
              index: i,
              value: `"${o}"`,
            })),
          })

          // 정답 인덱스 찾기 실패 시 추가 에러 로그
          if (correctAnswerIndex === 0) {
            console.error(`⚠️ word_meaning_select 정답 인덱스 찾기 실패:`, {
              questionIndex,
              character: structuredQuestions[questionIndex].character,
              correctAnswer,
              shuffledOptions,
              correctAnswerIndex: finalCorrectAnswerIndex,
              allOptions,
              wrongAnswers,
            })
          }

          structuredQuestions[questionIndex].correctAnswer = correctAnswer
          structuredQuestions[questionIndex].correctAnswerIndex =
            finalCorrectAnswerIndex
          structuredQuestions[questionIndex].wrongAnswers = wrongAnswers
          structuredQuestions[questionIndex].allOptions = shuffledOptions
          structuredQuestions[questionIndex].options = shuffledOptions
        }

        // 패턴 9: sentence_reading 후처리 (정답과 오답을 함께 구성)
        if (structuredQuestions[questionIndex].type === "sentence_reading") {
          const question = structuredQuestions[questionIndex]
          // 정답은 textBookWord.korean (단어 음)을 사용
          const correctAnswer =
            question.textBookWord?.korean ||
            (Array.isArray(question.relatedWords)
              ? question.relatedWords.find((rw: any) => rw?.isTextBook)?.korean
              : question.relatedWords?.isTextBook
              ? question.relatedWords.korean
              : null) ||
            question.sound

          // 옵션 생성 (정답 포함하여 4개)
          if (hanziList && hanziList.length > 0) {
            // 모든 한자에서 textBookWord.korean 또는 relatedWords의 korean 값 수집
            const allKoreanWords = new Set<string>()
            allKoreanWords.add(correctAnswer)

            // 정답의 글자 수 계산
            const correctAnswerLength = correctAnswer ? correctAnswer.length : 0

            for (const h of hanziList) {
              // textBookWord가 있으면 그 korean 사용
              if (h.textBookWord?.korean) {
                const korean = h.textBookWord.korean
                if (
                  korean &&
                  korean.trim() !== "" &&
                  korean !== correctAnswer
                ) {
                  allKoreanWords.add(korean)
                }
              }

              // relatedWords에서 모든 korean 값 수집 (isTextBook 여부와 무관)
              if (Array.isArray(h.relatedWords)) {
                for (const rw of h.relatedWords) {
                  if (rw?.korean) {
                    const korean = rw.korean
                    if (
                      korean &&
                      korean.trim() !== "" &&
                      korean !== correctAnswer
                    ) {
                      allKoreanWords.add(korean)
                    }
                  }
                }
              } else if (h.relatedWords?.korean) {
                const korean = h.relatedWords.korean
                if (
                  korean &&
                  korean.trim() !== "" &&
                  korean !== correctAnswer
                ) {
                  allKoreanWords.add(korean)
                }
              }
            }

            // 디버깅: 수집된 단어 확인
            console.log(`🔍 sentence_reading 옵션 생성:`, {
              questionIndex,
              character: question.character,
              correctAnswer,
              correctAnswerLength,
              allKoreanWordsCount: allKoreanWords.size,
              allKoreanWords: Array.from(allKoreanWords).slice(0, 10), // 첫 10개만
            })

            // 정답과 같은 글자 수의 단어를 우선적으로 선택
            const sameLengthWords = Array.from(allKoreanWords).filter(
              (word) => word.length === correctAnswerLength
            )
            const otherWords = Array.from(allKoreanWords).filter(
              (word) => word.length !== correctAnswerLength
            )

            const options = [correctAnswer]
            const usedValues = new Set([correctAnswer])

            // 같은 글자 수의 단어 추가
            while (options.length < 4 && sameLengthWords.length > 0) {
              const randomIndex = Math.floor(
                Math.random() * sameLengthWords.length
              )
              const word = sameLengthWords.splice(randomIndex, 1)[0]
              if (word && !usedValues.has(word)) {
                options.push(word)
                usedValues.add(word)
              }
            }

            // 같은 글자 수의 단어가 부족하면 다른 글자 수의 단어 추가
            while (options.length < 4 && otherWords.length > 0) {
              const randomIndex = Math.floor(Math.random() * otherWords.length)
              const word = otherWords.splice(randomIndex, 1)[0]
              if (word && !usedValues.has(word)) {
                options.push(word)
                usedValues.add(word)
              }
            }

            // 옵션이 4개 미만이면 모든 단어에서 추가
            if (options.length < 4) {
              const remainingWords = Array.from(allKoreanWords).filter(
                (word) => !usedValues.has(word)
              )
              while (options.length < 4 && remainingWords.length > 0) {
                const randomIndex = Math.floor(
                  Math.random() * remainingWords.length
                )
                const word = remainingWords.splice(randomIndex, 1)[0]
                if (word) {
                  options.push(word)
                  usedValues.add(word)
                }
              }
            }

            // 여전히 4개 미만이면 fallback 옵션 추가
            if (options.length < 4) {
              const fallbackOptions = [
                "방법",
                "규칙",
                "학습",
                "실험",
                "체험",
                "공부",
                "연구",
                "연습",
              ]
              for (const fallback of fallbackOptions) {
                if (options.length >= 4) break
                if (!usedValues.has(fallback) && fallback !== correctAnswer) {
                  options.push(fallback)
                  usedValues.add(fallback)
                }
              }
            }

            // 옵션 섞기 (고정 시드 사용)
            const seed = questionIndex
            let seedValue = seed
            const seededRandom = () => {
              seedValue = (seedValue * 9301 + 49297) % 233280
              return seedValue / 233280
            }
            const shuffledOptions = [...options]
            for (let i = shuffledOptions.length - 1; i > 0; i--) {
              const j = Math.floor(seededRandom() * (i + 1))
              ;[shuffledOptions[i], shuffledOptions[j]] = [
                shuffledOptions[j],
                shuffledOptions[i],
              ]
            }

            console.log(`✅ sentence_reading 최종 옵션:`, {
              questionIndex,
              correctAnswer,
              options: shuffledOptions.slice(0, 4),
              optionsCount: shuffledOptions.slice(0, 4).length,
            })

            structuredQuestions[questionIndex].options = shuffledOptions.slice(
              0,
              4
            )
            structuredQuestions[questionIndex].correctAnswer = correctAnswer
          } else {
            // hanziList가 없으면 기본 옵션 생성 (고정 시드로 섞기)
            const seed = questionIndex
            const baseOptions = [correctAnswer, "십", "법", "실"]
            let seedValue = seed
            const seededRandom = () => {
              seedValue = (seedValue * 9301 + 49297) % 233280
              return seedValue / 233280
            }
            const shuffledOptions = [...baseOptions]
            for (let i = shuffledOptions.length - 1; i > 0; i--) {
              const j = Math.floor(seededRandom() * (i + 1))
              ;[shuffledOptions[i], shuffledOptions[j]] = [
                shuffledOptions[j],
                shuffledOptions[i],
              ]
            }
            structuredQuestions[questionIndex].options = shuffledOptions
            structuredQuestions[questionIndex].correctAnswer = correctAnswer
          }
        }

        structuredQuestions[questionIndex].aiGeneratedContent = processedContent
      })
    }

    // word_meaning_select 패턴의 correctAnswerIndex 확인 로그
    const wmSelectAfterProcessing = structuredQuestions.filter(
      (q: any) => q.type === "word_meaning_select"
    )
    if (wmSelectAfterProcessing.length > 0) {
      console.log(
        "🔍 processAIQuestions 반환 전 word_meaning_select 확인:",
        wmSelectAfterProcessing.map((q: any) => ({
          id: q.id,
          character: q.character,
          correctAnswerIndex: q.correctAnswerIndex,
          correctAnswer: q.correctAnswer,
          hasCorrectAnswerIndex: q.correctAnswerIndex !== undefined,
          options: q.options,
        }))
      )
    }

    // 진행률 인터벌 정리 및 최종 진행률 설정
    progressState.isCleared = true
    if (progressState.interval) {
      clearInterval(progressState.interval)
      progressState.interval = null
    }
    if (updateProgress) updateProgress(90, "문제 생성 완료")
  } catch (err) {
    progressState.isCleared = true
    if (progressState.interval) {
      clearInterval(progressState.interval)
      progressState.interval = null
    }
    console.error("❌ processAIQuestions 에러:", err)
    // 실패 시 그대로 반환하여 시험 진행
  } finally {
    // 최종적으로 인터벌 정리 보장
    if (progressState.interval) {
      clearInterval(progressState.interval)
      progressState.interval = null
    }
    progressState.isCleared = true
  }

  // 최종 확인: correctAnswerIndex가 모든 word_meaning_select 문제에 설정되었는지 확인
  const wmSelectFinal = structuredQuestions.filter(
    (q: any) => q.type === "word_meaning_select"
  )
  wmSelectFinal.forEach((q: any) => {
    if (q.correctAnswerIndex === undefined || q.correctAnswerIndex === null) {
      console.error(
        `⚠️ word_meaning_select 문제에 correctAnswerIndex가 없습니다:`,
        {
          id: q.id,
          character: q.character,
          options: q.options,
        }
      )
    }
  })

  return structuredQuestions
}
