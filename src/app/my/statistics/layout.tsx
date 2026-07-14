"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { ReactNode } from "react"

const TABS = [
  { href: "/my/statistics", label: "학습 현황", exact: true },
  { href: "/my/statistics/game", label: "게임" },
  { href: "/my/statistics/hanzi", label: "한자" },
  { href: "/my/statistics/exam", label: "시험" },
] as const

function isTabActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(href + "/")
}

export default function StatisticsLayout({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()

  // detail redirects immediately — skip chrome flash
  if (pathname?.startsWith("/my/statistics/detail")) {
    return <>{children}</>
  }

  return (
    <div className='min-h-screen bg-slate-50'>
      <header className='sticky top-0 z-20 bg-white border-b border-slate-200'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6'>
          <div className='flex items-center gap-3 py-3'>
            <Link
              href='/my'
              className='inline-flex items-center justify-center p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors'
              aria-label='마이페이지로'
            >
              <ArrowLeft className='h-5 w-5' />
            </Link>
            <h1 className='text-lg font-bold text-gray-900'>학습 통계</h1>
          </div>
          <nav
            className='flex gap-0.5 -mb-px overflow-x-auto'
            aria-label='통계 메뉴'
          >
            {TABS.map((tab) => {
              const active = isTabActive(
                pathname ?? "",
                tab.href,
                "exact" in tab ? tab.exact : false
              )
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`shrink-0 px-3.5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                    active
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <main className='max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-12'>
        {children}
      </main>
    </div>
  )
}
