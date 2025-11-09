// scripts/analyzeSoundDistribution.js
// 6th.json 파일을 읽어서 sound별 한자 개수를 분석하는 스크립트
// 사용법: node scripts/analyzeSoundDistribution.js

const fs = require('fs')
const path = require('path')

function analyzeSoundDistribution() {
  try {
    // 6th.json 파일 읽기
    const filePath = path.join(__dirname, '..', '6th.json')
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const hanziList = JSON.parse(fileContent)

    console.log(`\n📊 6급 한자 sound 분포 분석 시작...`)
    console.log(`총 한자 개수: ${hanziList.length}개\n`)

    // sound별로 그룹화
    const soundMap = new Map()
    
    hanziList.forEach((hanzi) => {
      const sound = hanzi.sound || '없음'
      
      if (!soundMap.has(sound)) {
        soundMap.set(sound, [])
      }
      
      soundMap.get(sound).push({
        character: hanzi.character,
        meaning: hanzi.meaning,
        sound: hanzi.sound,
      })
    })

    // sound별 개수 정렬 (많은 순서대로)
    const soundStats = Array.from(soundMap.entries())
      .map(([sound, hanziList]) => ({
        sound,
        count: hanziList.length,
        characters: hanziList.map(h => h.character),
        meanings: hanziList.map(h => h.meaning),
      }))
      .sort((a, b) => b.count - a.count)

    // 통계 출력
    console.log('='.repeat(80))
    console.log('📈 Sound별 한자 개수 통계 (많은 순서)')
    console.log('='.repeat(80))
    
    soundStats.forEach((stat, index) => {
      console.log(`\n${index + 1}. Sound: "${stat.sound}" (${stat.count}개)`)
      console.log(`   한자: ${stat.characters.join(', ')}`)
      console.log(`   뜻: ${stat.meanings.join(', ')}`)
    })

    // 요약 통계
    console.log('\n' + '='.repeat(80))
    console.log('📊 요약 통계')
    console.log('='.repeat(80))
    console.log(`총 sound 종류: ${soundMap.size}개`)
    console.log(`평균 한자 개수 per sound: ${(hanziList.length / soundMap.size).toFixed(2)}개`)
    
    // 2개 이상인 sound만 필터링 (같은 sound 문제를 만들 수 있는 것들)
    const multipleSoundStats = soundStats.filter(stat => stat.count >= 2)
    console.log(`\n✅ 같은 sound를 가진 한자가 2개 이상인 경우: ${multipleSoundStats.length}개`)
    console.log(`   (이것들로 "같은 sound 찾기" 문제를 만들 수 있음)`)
    
    if (multipleSoundStats.length > 0) {
      console.log('\n📝 2개 이상인 sound 목록:')
      multipleSoundStats.forEach((stat) => {
        console.log(`   - "${stat.sound}": ${stat.count}개 (${stat.characters.join(', ')})`)
      })
    }

    // 1개만 있는 sound (문제 만들기 어려운 것들)
    const singleSoundStats = soundStats.filter(stat => stat.count === 1)
    console.log(`\n⚠️  sound가 1개만 있는 경우: ${singleSoundStats.length}개`)
    console.log(`   (이것들은 "같은 sound 찾기" 문제를 만들 수 없음)`)

    // 가장 많은 sound
    const maxSound = soundStats[0]
    console.log(`\n🏆 가장 많은 한자를 가진 sound: "${maxSound.sound}" (${maxSound.count}개)`)
    console.log(`   한자: ${maxSound.characters.join(', ')}`)

    // JSON으로 저장 (선택사항)
    const outputPath = path.join(__dirname, '..', '6th-sound-stats.json')
    const outputData = {
      totalHanzi: hanziList.length,
      totalSounds: soundMap.size,
      averagePerSound: (hanziList.length / soundMap.size).toFixed(2),
      multipleSoundCount: multipleSoundStats.length,
      stats: soundStats.map(stat => ({
        sound: stat.sound,
        count: stat.count,
        characters: stat.characters,
      })),
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8')
    console.log(`\n💾 상세 통계가 ${outputPath}에 저장되었습니다.`)

    return {
      totalHanzi: hanziList.length,
      totalSounds: soundMap.size,
      multipleSoundCount: multipleSoundStats.length,
      soundStats,
      multipleSoundStats,
    }
  } catch (error) {
    console.error('❌ 오류 발생:', error)
    throw error
  }
}

// 스크립트 실행
if (require.main === module) {
  analyzeSoundDistribution()
}

module.exports = { analyzeSoundDistribution }

