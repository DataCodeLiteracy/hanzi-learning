"use client"

import { ArrowLeft, BookOpen, Gamepad2, List, GraduationCap, PenTool, Target, CheckCircle, Lightbulb, TrendingUp } from "lucide-react"
import Link from "next/link"

export default function LearningGuidePage() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <header className='fixed top-0 left-0 right-0 bg-white shadow-sm z-50'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center py-4'>
            <Link
              href='/'
              className='mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors'
            >
              <ArrowLeft className='h-5 w-5 text-gray-600' />
            </Link>
            <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>
              한자 학습 가이드
            </h1>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24'>
        <div className='space-y-8'>
          {/* 소개 섹션 */}
          <div className='bg-white rounded-lg shadow-lg p-6 sm:p-8'>
            <div className='flex items-center mb-4'>
              <Lightbulb className='h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 mr-3' />
              <h2 className='text-xl sm:text-2xl font-bold text-gray-900'>
                효과적인 한자 학습 방법
              </h2>
            </div>
            <p className='text-gray-700 leading-relaxed mb-4'>
              한자 학습은 체계적인 접근과 반복 연습이 중요합니다. 이 가이드는 여러 학습 도구를 활용하여 
              효율적으로 한자를 마스터할 수 있는 방법을 제시합니다.
            </p>
            <div className='bg-blue-50 border-l-4 border-blue-500 p-4 rounded'>
              <p className='text-sm sm:text-base text-gray-700'>
                <strong className='text-blue-700'>핵심 원칙:</strong> 암기 → 이해 → 활용 → 평가의 순환 구조를 통해 
                한자를 단계적으로 내재화하세요.
              </p>
            </div>
          </div>

          {/* 학습 단계별 가이드 */}
          <div className='bg-white rounded-lg shadow-lg p-6 sm:p-8'>
            <div className='flex items-center mb-6'>
              <TrendingUp className='h-6 w-6 sm:h-8 sm:w-8 text-green-500 mr-3' />
              <h2 className='text-xl sm:text-2xl font-bold text-gray-900'>
                학습 단계별 추천 순서
              </h2>
            </div>
            <div className='space-y-6'>
              {/* 1단계 */}
              <div className='border-l-4 border-blue-500 pl-4'>
                <div className='flex items-center mb-2'>
                  <span className='bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3'>
                    1
                  </span>
                  <h3 className='text-lg sm:text-xl font-semibold text-gray-900'>
                    기초 암기 단계
                  </h3>
                </div>
                <p className='text-gray-700 mb-3'>
                  새로운 한자를 처음 접할 때는 <strong>한자 목록</strong>과 <strong>교과서 한자어</strong>를 통해 
                  한자의 모양, 뜻, 소리를 익히는 것이 중요합니다.
                </p>
                <div className='bg-gray-50 p-3 rounded'>
                  <p className='text-sm text-gray-600'>
                    💡 <strong>추천 도구:</strong> 한자 목록, 교과서 한자어
                  </p>
                </div>
              </div>

              {/* 2단계 */}
              <div className='border-l-4 border-green-500 pl-4'>
                <div className='flex items-center mb-2'>
                  <span className='bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3'>
                    2
                  </span>
                  <h3 className='text-lg sm:text-xl font-semibold text-gray-900'>
                    반복 연습 단계
                  </h3>
                </div>
                <p className='text-gray-700 mb-3'>
                  암기한 한자를 <strong>카드 뒤집기</strong>, <strong>퀴즈</strong>, <strong>부분 맞추기</strong>로 반복 연습하여 
                  장기 기억으로 전환시킵니다.
                </p>
                <div className='bg-gray-50 p-3 rounded'>
                  <p className='text-sm text-gray-600'>
                    💡 <strong>추천 도구:</strong> 카드 뒤집기, 퀴즈, 부분 맞추기
                  </p>
                </div>
              </div>

              {/* 3단계 */}
              <div className='border-l-4 border-purple-500 pl-4'>
                <div className='flex items-center mb-2'>
                  <span className='bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3'>
                    3
                  </span>
                  <h3 className='text-lg sm:text-xl font-semibold text-gray-900'>
                    심화 학습 단계
                  </h3>
                </div>
                <p className='text-gray-700 mb-3'>
                  <strong>쓰기 연습</strong>을 통해 한자의 구조와 필순을 
                  정확히 익히고 실제로 활용할 수 있도록 합니다.
                </p>
                <div className='bg-gray-50 p-3 rounded'>
                  <p className='text-sm text-gray-600'>
                    💡 <strong>추천 도구:</strong> 쓰기 연습
                  </p>
                </div>
              </div>

              {/* 4단계 */}
              <div className='border-l-4 border-orange-500 pl-4'>
                <div className='flex items-center mb-2'>
                  <span className='bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3'>
                    4
                  </span>
                  <h3 className='text-lg sm:text-xl font-semibold text-gray-900'>
                    평가 및 확인 단계
                  </h3>
                </div>
                <p className='text-gray-700 mb-3'>
                  <strong>급수 시험</strong>을 통해 학습한 내용을 종합적으로 평가하고, 
                  부족한 부분을 파악하여 다시 학습합니다.
                </p>
                <div className='bg-gray-50 p-3 rounded'>
                  <p className='text-sm text-gray-600'>
                    💡 <strong>추천 도구:</strong> 급수 시험
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 각 기능별 상세 가이드 */}
          <div className='space-y-6'>
            <h2 className='text-xl sm:text-2xl font-bold text-gray-900 flex items-center'>
              <Target className='h-6 w-6 sm:h-8 sm:w-8 text-red-500 mr-3' />
              기능별 학습 가이드
            </h2>

            {/* 한자 목록 */}
            <div className='bg-white rounded-lg shadow-lg p-6 sm:p-8'>
              <div className='flex items-center mb-4'>
                <List className='h-6 w-6 text-blue-500 mr-3' />
                <h3 className='text-lg sm:text-xl font-semibold text-gray-900'>
                  한자 목록
                </h3>
              </div>
              <p className='text-gray-700 mb-4'>
                각 급수별 한자를 체계적으로 정리하여 볼 수 있는 기능입니다. 새로운 한자를 처음 접할 때 
                가장 먼저 활용해야 하는 기본 도구입니다.
              </p>
              <div className='bg-blue-50 p-4 rounded-lg mb-4'>
                <h4 className='font-semibold text-gray-900 mb-2'>학습 방법:</h4>
                <ul className='space-y-2 text-sm text-gray-700'>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>한자의 모양, 뜻, 소리를 함께 확인하며 반복해서 읽어보세요.</span>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>학습 완료 체크박스를 활용하여 익힌 한자를 표시하세요.</span>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>하루에 10~20개씩 새로운 한자를 목표로 학습하세요.</span>
                  </li>
                </ul>
              </div>
              <Link
                href='/hanzi/list'
                className='inline-flex items-center text-blue-600 hover:text-blue-700 font-medium'
              >
                한자 목록으로 이동 →
              </Link>
            </div>

            {/* 교과서 한자어 */}
            <div className='bg-white rounded-lg shadow-lg p-6 sm:p-8'>
              <div className='flex items-center mb-4'>
                <BookOpen className='h-6 w-6 text-green-500 mr-3' />
                <h3 className='text-lg sm:text-xl font-semibold text-gray-900'>
                  교과서 한자어
                </h3>
              </div>
              <p className='text-gray-700 mb-4'>
                한자가 실제로 사용되는 단어와 문맥을 통해 학습할 수 있는 기능입니다. 
                한자를 단독으로 암기하는 것보다 실제 사용 예시를 통해 학습하면 기억에 오래 남습니다.
                각 단어 옆에 있는 아이콘을 클릭하면 네이버 국어사전으로 연결되어 더 자세한 의미와 
                사용 예시를 확인할 수 있습니다.
              </p>
              <div className='bg-green-50 p-4 rounded-lg mb-4'>
                <h4 className='font-semibold text-gray-900 mb-2'>학습 방법:</h4>
                <ul className='space-y-2 text-sm text-gray-700'>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>한자어의 의미와 한자의 뜻을 연결하여 이해하세요.</span>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>문맥 속에서 한자가 어떻게 사용되는지 확인하세요.</span>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>단어 옆의 아이콘을 클릭하여 네이버 국어사전에서 더 자세한 정보를 확인하세요.</span>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>비슷한 의미의 한자어들을 함께 묶어서 학습하세요.</span>
                  </li>
                </ul>
              </div>
              <Link
                href='/textbook-words'
                className='inline-flex items-center text-green-600 hover:text-green-700 font-medium'
              >
                교과서 한자어로 이동 →
              </Link>
            </div>

            {/* 카드 뒤집기 */}
            <div className='bg-white rounded-lg shadow-lg p-6 sm:p-8'>
              <div className='flex items-center mb-4'>
                <Gamepad2 className='h-6 w-6 text-purple-500 mr-3' />
                <h3 className='text-lg sm:text-xl font-semibold text-gray-900'>
                  카드 뒤집기
                </h3>
              </div>
              <p className='text-gray-700 mb-4'>
                게임 형식으로 한자를 암기하는 재미있는 학습 도구입니다. 카드를 뒤집어 같은 한자 쌍을 
                찾는 과정에서 자연스럽게 한자를 반복 학습할 수 있습니다.
              </p>
              <div className='bg-purple-50 p-4 rounded-lg mb-4'>
                <h4 className='font-semibold text-gray-900 mb-2'>학습 방법:</h4>
                <ul className='space-y-2 text-sm text-gray-700'>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>처음에는 쉬운 난이도(3x4)부터 시작하여 점진적으로 난이도를 높이세요.</span>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>카드를 뒤집을 때마다 한자의 모양과 뜻을 소리 내어 읽어보세요.</span>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>시간을 단축하는 것보다 정확하게 맞추는 것을 우선하세요.</span>
                  </li>
                </ul>
              </div>
              <Link
                href='/games/memory'
                className='inline-flex items-center text-purple-600 hover:text-purple-700 font-medium'
              >
                카드 뒤집기로 이동 →
              </Link>
            </div>

            {/* 퀴즈 */}
            <div className='bg-white rounded-lg shadow-lg p-6 sm:p-8'>
              <div className='flex items-center mb-4'>
                <Target className='h-6 w-6 text-orange-500 mr-3' />
                <h3 className='text-lg sm:text-xl font-semibold text-gray-900'>
                  퀴즈
                </h3>
              </div>
              <p className='text-gray-700 mb-4'>
                한자의 <strong>뜻</strong>과 <strong>소리</strong>를 테스트하는 기능입니다. 
                학습한 한자가 제대로 기억되고 있는지 확인하는 데 효과적입니다.
              </p>
              <div className='bg-orange-50 p-4 rounded-lg mb-4'>
                <h4 className='font-semibold text-gray-900 mb-2'>학습 방법:</h4>
                <ul className='space-y-2 text-sm text-gray-700'>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>틀린 문제는 다시 한자 목록에서 확인하고 복습하세요.</span>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>정답률이 80% 이상이 될 때까지 반복 연습하세요.</span>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>다양한 문제 유형을 골고루 풀어보며 한자를 다각도로 이해하세요.</span>
                  </li>
                </ul>
              </div>
              <Link
                href='/games/quiz'
                className='inline-flex items-center text-orange-600 hover:text-orange-700 font-medium'
              >
                퀴즈로 이동 →
              </Link>
            </div>

            {/* 부분 맞추기 */}
            <div className='bg-white rounded-lg shadow-lg p-6 sm:p-8'>
              <div className='flex items-center mb-4'>
                <CheckCircle className='h-6 w-6 text-indigo-500 mr-3' />
                <h3 className='text-lg sm:text-xl font-semibold text-gray-900'>
                  부분 맞추기
                </h3>
              </div>
              <p className='text-gray-700 mb-4'>
                한자의 일부를 보고 전체 한자를 맞추는 게임입니다. 한자의 구조와 부수를 이해하는 데 
                도움이 되며, 비슷한 한자들을 구분하는 능력을 키울 수 있습니다. 
                반복 연습을 통해 한자를 더 깊이 기억할 수 있습니다.
              </p>
              <div className='bg-indigo-50 p-4 rounded-lg mb-4'>
                <h4 className='font-semibold text-gray-900 mb-2'>학습 방법:</h4>
                <ul className='space-y-2 text-sm text-gray-700'>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-indigo-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>한자의 부수와 구조를 먼저 학습한 후 도전하세요.</span>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-indigo-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>틀린 문제는 한자의 전체 모양을 다시 확인하고 기억하세요.</span>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-indigo-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>비슷한 한자들을 함께 묶어서 비교하며 학습하세요.</span>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-indigo-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>반복 연습을 통해 한자의 구조를 자연스럽게 익히세요.</span>
                  </li>
                </ul>
              </div>
              <Link
                href='/games/partial-match'
                className='inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium'
              >
                부분 맞추기로 이동 →
              </Link>
            </div>

            {/* 쓰기 연습 */}
            <div className='bg-white rounded-lg shadow-lg p-6 sm:p-8'>
              <div className='flex items-center mb-4'>
                <PenTool className='h-6 w-6 text-pink-500 mr-3' />
                <h3 className='text-lg sm:text-xl font-semibold text-gray-900'>
                  쓰기 연습
                </h3>
              </div>
              <p className='text-gray-700 mb-4'>
                A4 용지에 7x8 격자 형식으로 한자를 직접 써보며 필순(筆順)과 구조를 익히는 기능입니다. 
                손으로 쓰는 과정을 통해 한자를 더 깊이 이해하고 오래 기억할 수 있습니다.
                하루에 56개(7x8)의 한자를 꾸준히 쓰는 것을 목표로 하세요.
              </p>
              <div className='bg-pink-50 p-4 rounded-lg mb-4'>
                <h4 className='font-semibold text-gray-900 mb-2'>학습 방법:</h4>
                <ul className='space-y-2 text-sm text-gray-700'>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-pink-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>필순을 정확히 따라 쓰는 연습을 반복하세요.</span>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-pink-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>한자의 균형과 비율을 고려하여 깔끔하게 쓰도록 노력하세요.</span>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-pink-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>하루에 56개(7x8 격자)씩 꾸준히 쓰기 연습을 하세요.</span>
                  </li>
                </ul>
              </div>
              <Link
                href='/games/writing'
                className='inline-flex items-center text-pink-600 hover:text-pink-700 font-medium'
              >
                쓰기 연습으로 이동 →
              </Link>
            </div>

            {/* 급수 시험 */}
            <div className='bg-white rounded-lg shadow-lg p-6 sm:p-8'>
              <div className='flex items-center mb-4'>
                <GraduationCap className='h-6 w-6 text-red-500 mr-3' />
                <h3 className='text-lg sm:text-xl font-semibold text-gray-900'>
                  급수 시험
                </h3>
              </div>
              <p className='text-gray-700 mb-4'>
                학습한 한자를 종합적으로 평가하는 시험입니다. 다양한 문제 유형으로 구성되어 있으며, 
                <strong>70점 이상</strong>을 받으면 합격으로 인정됩니다. 같은 급수에서 
                <strong>70점 이상 합격을 20번 이상</strong> 달성하면 다음 급수로 진급할 수 있습니다.
              </p>
              <div className='bg-red-50 p-4 rounded-lg mb-4'>
                <h4 className='font-semibold text-gray-900 mb-2'>학습 방법:</h4>
                <ul className='space-y-2 text-sm text-gray-700'>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>다른 학습 도구로 충분히 연습한 후 시험에 도전하세요.</span>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>시험 후 틀린 문제는 반드시 복습하고 다시 학습하세요.</span>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>하루에 1회만 시험을 볼 수 있으므로 신중하게 준비하세요.</span>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0' />
                    <span>70점 이상 합격을 20번 달성하면 다음 급수로 진급할 수 있습니다.</span>
                  </li>
                </ul>
              </div>
              <Link
                href='/games/exam'
                className='inline-flex items-center text-red-600 hover:text-red-700 font-medium'
              >
                급수 시험으로 이동 →
              </Link>
            </div>
          </div>

          {/* 학습 팁 */}
          <div className='bg-white rounded-lg shadow-lg p-6 sm:p-8'>
            <div className='flex items-center mb-4'>
              <Lightbulb className='h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 mr-3' />
              <h2 className='text-xl sm:text-2xl font-bold text-gray-900'>
                학습 성공을 위한 팁
              </h2>
            </div>
            <div className='space-y-4'>
              <div className='flex items-start'>
                <span className='text-2xl mr-3'>📅</span>
                <div>
                  <h3 className='font-semibold text-gray-900 mb-1'>규칙적인 학습 습관</h3>
                  <p className='text-gray-700 text-sm'>
                    하루 30분씩이라도 매일 꾸준히 학습하는 것이 주 1회 3시간 학습보다 효과적입니다.
                  </p>
                </div>
              </div>
              <div className='flex items-start'>
                <span className='text-2xl mr-3'>🔄</span>
                <div>
                  <h3 className='font-semibold text-gray-900 mb-1'>반복 학습의 중요성</h3>
                  <p className='text-gray-700 text-sm'>
                    한 번 학습한 한자는 다음 날, 일주일 후, 한 달 후에 다시 복습하여 장기 기억으로 전환하세요.
                  </p>
                </div>
              </div>
              <div className='flex items-start'>
                <span className='text-2xl mr-3'>🎯</span>
                <div>
                  <h3 className='font-semibold text-gray-900 mb-1'>목표 설정</h3>
                  <p className='text-gray-700 text-sm'>
                    하루에 학습할 한자 개수를 정하고, 주간 목표와 월간 목표를 설정하여 동기를 유지하세요.
                  </p>
                </div>
              </div>
              <div className='flex items-start'>
                <span className='text-2xl mr-3'>📊</span>
                <div>
                  <h3 className='font-semibold text-gray-900 mb-1'>진행 상황 확인</h3>
                  <p className='text-gray-700 text-sm'>
                    한자 목록에서 학습 완료 체크박스를 활용하여 자신의 학습 진행도를 확인하세요.
                  </p>
                </div>
              </div>
              <div className='flex items-start'>
                <span className='text-2xl mr-3'>💪</span>
                <div>
                  <h3 className='font-semibold text-gray-900 mb-1'>포기하지 않기</h3>
                  <p className='text-gray-700 text-sm'>
                    어려운 한자도 반복 학습을 통해 결국 익힐 수 있습니다. 꾸준함이 가장 중요한 요소입니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 마무리 */}
          <div className='bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg p-6 sm:p-8 text-white'>
            <h2 className='text-xl sm:text-2xl font-bold mb-4'>
              시작하세요!
            </h2>
            <p className='mb-4 opacity-90'>
              이제 여러분의 한자 학습 여정을 시작할 준비가 되었습니다. 위의 가이드를 참고하여 
              체계적으로 학습하시면 한자 실력이 눈에 띄게 향상될 것입니다.
            </p>
            <Link
              href='/'
              className='inline-flex items-center bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors'
            >
              메인으로 돌아가기
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

