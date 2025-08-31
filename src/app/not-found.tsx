import Link from "next/link"

export default function NotFound() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100'>
      <div className='text-center'>
        <h1 className='text-6xl font-bold text-gray-800 mb-4'>404</h1>
        <h2 className='text-2xl font-semibold text-gray-600 mb-6'>
          페이지를 찾을 수 없습니다
        </h2>
        <p className='text-gray-500 mb-8'>
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
        <Link
          href='/'
          className='inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200'
        >
          메인 페이지로 돌아가기
        </Link>
      </div>
    </div>
  )
}
