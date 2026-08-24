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

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')

const description =
  'Nyalthe settles event-based payouts on Starknet while keeping the claimant protected.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Nyalthe',
  title: 'Nyalthe · Public proof for private claims',
  description,
  openGraph: {
    type: 'website',
    siteName: 'Nyalthe',
    url: '/',
    title: 'Nyalthe · Public proof for private claims',
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nyalthe · Public proof for private claims',
    description,
  },
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
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  )
}
