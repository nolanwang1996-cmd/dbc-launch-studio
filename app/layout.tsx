import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'DBC Launch Studio',
    description:
        'Design, simulate and launch Meteora Dynamic Bonding Curve tokens on Solana devnet — with agent treasury fee routing.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className="dark">
            <body>{children}</body>
        </html>
    )
}
