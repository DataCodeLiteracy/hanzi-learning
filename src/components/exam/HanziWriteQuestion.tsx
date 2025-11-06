"use client"

interface Props {
  character: string
  value: string
  onChange: (newValue: string) => void
}

export default function HanziWriteQuestion({
  character,
  value,
  onChange,
}: Props) {
  const meaning = typeof value === "string" ? value.split(" ")[0] || "" : ""
  const sound = typeof value === "string" ? value.split(" ")[1] || "" : ""

  return (
    <div className='space-y-4'>
      <div className='bg-white p-6 rounded-xl shadow-sm border border-gray-200'>
        <div className='text-center mb-6'>
          <div className='text-6xl font-bold text-gray-800 mb-2'>
            {character}
          </div>
        </div>
      </div>

      <div className='bg-white p-6 rounded-xl shadow-sm border border-gray-200'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              훈(뜻)
            </label>
            <input
              type='text'
              value={meaning}
              onChange={(e) => {
                const normalizedMeaning = e.target.value.trim()
                const normalizedSound = sound.trim()
                onChange(`${normalizedMeaning} ${normalizedSound}`.trim())
              }}
              placeholder='뜻을 입력하세요 (예: 착할)'
              className='w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-medium bg-white shadow-inner text-black'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              음(소리)
            </label>
            <input
              type='text'
              value={sound}
              onChange={(e) => {
                const normalizedMeaning = meaning.trim()
                const normalizedSound = e.target.value.trim()
                onChange(`${normalizedMeaning} ${normalizedSound}`.trim())
              }}
              placeholder='소리를 입력하세요 (예: 선)'
              className='w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-medium bg-white shadow-inner text-black'
            />
          </div>
        </div>

        {value && (
          <div className='mt-4 p-3 bg-gray-50 rounded-lg'>
            <p className='text-sm text-gray-600'>
              입력된 값: <span className='font-medium'>{value}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
