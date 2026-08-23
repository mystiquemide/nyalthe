import type { Metadata } from 'next'
import { Hanken_Grotesk, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import SmoothScroll from './components/SmoothScroll'

// Humanist geometric grotesque for everything (close to the reference site's
// Matter), plus a mono only for on-chain hashes and addresses.
const sans = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono-ui',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nyalthe · Public proof for private claims',
  description:
    'Nyalthe settles event-based payouts on Starknet while keeping the claimant and amount protected.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  )
}
