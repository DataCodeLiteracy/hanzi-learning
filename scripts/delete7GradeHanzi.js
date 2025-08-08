// 7급 한자들을 삭제하는 브라우저 콘솔 스크립트
// 관리자 페이지에서 개발자 도구 콘솔에 붙여넣기

async function delete7GradeHanzi() {
  try {
    console.log("7급 한자들을 삭제하는 중...")

    // Firebase SDK가 이미 로드되어 있다고 가정
    const { collection, query, where, getDocs, writeBatch } = firebase.firestore
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

    // 삭제할 한자들의 정보 출력
    const hanziToDelete = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        character: data.character,
        meaning: data.meaning,
        sound: data.sound,
      }
    })

    console.log("삭제할 한자들:", hanziToDelete)

    // 확인 메시지
    if (
      !confirm(
        `정말로 ${
          snapshot.docs.length
        }개의 7급 한자를 삭제하시겠습니까?\n\n삭제할 한자들: ${hanziToDelete
          .map((h) => h.character)
          .join(", ")}`
      )
    ) {
      console.log("삭제가 취소되었습니다.")
      return
    }

    // batch로 일괄 삭제
    const batch = writeBatch(db)
    snapshot.docs.forEach((doc) => {
      const hanziRef = doc.ref
      batch.delete(hanziRef)
    })

    await batch.commit()
    console.log(`${snapshot.docs.length}개의 7급 한자가 삭제되었습니다!`)

    // 페이지 새로고침
    window.location.reload()
  } catch (error) {
    console.error("오류 발생:", error)
  }
}

// 스크립트 실행
delete7GradeHanzi()
