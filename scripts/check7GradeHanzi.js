// 7급 한자들을 확인하는 브라우저 콘솔 스크립트
// 관리자 페이지에서 개발자 도구 콘솔에 붙여넣기

async function check7GradeHanzi() {
  try {
    console.log("7급 한자들을 확인하는 중...")

    // Firebase SDK가 이미 로드되어 있다고 가정
    const { collection, query, where, getDocs } = firebase.firestore
    const db = firebase.firestore()

    // 7급 한자들 조회
    const hanziRef = collection(db, "hanzi")
    const q = query(hanziRef, where("grade", "==", 7))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      console.log("7급 한자가 없습니다.")
      return
    }

    console.log(`${snapshot.docs.length}개의 7급 한자를 찾았습니다.`)

    // 7급 한자들의 정보 출력
    const hanziList = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        character: data.character,
        meaning: data.meaning,
        sound: data.sound,
        strokes: data.strokes,
      }
    })

    console.log("7급 한자 목록:", hanziList)
    console.log("한자들:", hanziList.map((h) => h.character).join(", "))
  } catch (error) {
    console.error("오류 발생:", error)
  }
}

// 스크립트 실행
check7GradeHanzi()
