"use client"

interface Props {
  promptHanzi: string
  value: string
  onChange: (newValue: string) => void
}

export default function WordReadingWriteQuestion({
  promptHanzi,
  value,
  onChange,
}: Props) {
  return (
    <div className='space-y-6'>
      <div className='bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 shadow-lg'>
        <h4 className='text-xl font-bold text-blue-800 mb-4 text-center'>
          보기
        </h4>
        <div className='text-center'>
          <div className='inline-block bg-white rounded-lg p-4 border-2 border-gray-300 shadow-md'>
            <span className='text-2xl font-bold text-black'>一日</span>
            <span className='text-lg text-gray-600 mx-2'> ( </span>
            <span className='text-lg font-bold text-black'>일일</span>
            <span className='text-lg text-gray-600'> ) </span>
          </div>
        </div>
      </div>

      <div className='bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200 shadow-lg'>
        <div className='text-center'>
          <div className='text-4xl font-bold text-gray-800 mb-2'>
            {promptHanzi}
          </div>
          <p className='text-sm text-gray-600'>위 한자어의 독음을 입력하세요</p>
        </div>
      </div>

      <div className='bg-white p-6 rounded-xl shadow-sm border border-gray-200'>
        <label className='block text-sm font-medium text-gray-700 mb-2'>
          독음(소리)을 한글로 입력하세요
        </label>
        <input
          type='text'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder='독음을 입력하세요 (예: 질문)'
          className='w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-medium bg-white shadow-inner text-black'
        />

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
