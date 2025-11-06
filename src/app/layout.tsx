import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { DataProvider } from "@/contexts/DataContext"
import { SelectedHanziProvider } from "@/contexts/SelectedHanziContext"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "한자 학습 앱",
  description: "한자 진흥회 데이터를 기반으로 한 한자 학습 게임",
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='ko'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <DataProvider>
            <SelectedHanziProvider>{children}</SelectedHanziProvider>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
