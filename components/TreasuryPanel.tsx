'use client'

import { AGENT_TREASURY_ADDRESS, explorerAddr } from '@/lib/constants'
import { shortAddr } from '@/lib/format'
import { Badge, Card } from './ui'

/**
 * Explains the fee routing into the agent treasury vault.
 * The vault is a payout address only — it never signs anything in this app.
 */
export function TreasuryPanel({
    creatorPct,
}: {
    creatorPct: number
}) {
    return (
        <Card
            title="Agent Treasury · Fee Routing"
            subtitle="How trading fees flow to the autonomous agent"
            actions={<Badge tone="violet">feeClaimer</Badge>}
        >
            <div className="space-y-4">
                {/* flow diagram */}
                <svg viewBox="0 0 560 130" className="w-full" role="img" aria-label="Fee routing diagram">
                    <defs>
                        <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                            <path d="M0,0 L8,4 L0,8 Z" fill="#5eead4" />
                        </marker>
                    </defs>
                    {/* swap node */}
                    <rect x="8" y="40" width="110" height="50" rx="8" fill="#141926" stroke="#2a3347" />
                    <text x="63" y="61" textAnchor="middle" fontSize="11" fill="#e2e8f0" fontWeight="600">Trade</text>
                    <text x="63" y="78" textAnchor="middle" fontSize="9" fill="#64748b">buy / sell</text>

                    <line x1="118" y1="65" x2="168" y2="65" stroke="#5eead4" strokeWidth="1.5" markerEnd="url(#arr)" />

                    {/* pool node */}
                    <rect x="172" y="34" width="130" height="62" rx="8" fill="#141926" stroke="#5eead4" strokeOpacity="0.4" />
                    <text x="237" y="56" textAnchor="middle" fontSize="11" fill="#5eead4" fontWeight="600">DBC Pool</text>
                    <text x="237" y="71" textAnchor="middle" fontSize="9" fill="#64748b">fee taken in quote (SOL)</text>
                    <text x="237" y="84" textAnchor="middle" fontSize="9" fill="#64748b">per anti-sniper schedule</text>

                    {/* creator branch */}
                    <line x1="302" y1="50" x2="368" y2="28" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arr)" />
                    <rect x="372" y="8" width="180" height="42" rx="8" fill="#141926" stroke="#fbbf24" strokeOpacity="0.35" />
                    <text x="462" y="25" textAnchor="middle" fontSize="10" fill="#fbbf24" fontWeight="600">Creator — {creatorPct}%</text>
                    <text x="462" y="40" textAnchor="middle" fontSize="9" fill="#64748b">claimable creator trading fee</text>

                    {/* vault branch */}
                    <line x1="302" y1="80" x2="368" y2="102" stroke="#a78bfa" strokeWidth="1.5" markerEnd="url(#arr)" />
                    <rect x="372" y="80" width="180" height="42" rx="8" fill="#141926" stroke="#a78bfa" strokeOpacity="0.4" />
                    <text x="462" y="97" textAnchor="middle" fontSize="10" fill="#a78bfa" fontWeight="600">Agent treasury — {100 - creatorPct}%</text>
                    <text x="462" y="112" textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="ui-monospace, monospace">{shortAddr(AGENT_TREASURY_ADDRESS, 10, 10)}</text>
                </svg>

                <div className="space-y-2 text-xs leading-relaxed text-slate-400">
                    <p>
                        Every pool launched from this studio is bound to a config whose{' '}
                        <code className="rounded bg-ink-800 px-1 py-0.5 font-mono text-[10px] text-violet2">
                            feeClaimer
                        </code>{' '}
                        is the agent treasury vault:{' '}
                        <a
                            href={explorerAddr(AGENT_TREASURY_ADDRESS)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-[11px] text-accent hover:underline"
                        >
                            {shortAddr(AGENT_TREASURY_ADDRESS, 6, 6)} ↗
                        </a>
                    </p>
                    <p>
                        With <strong className="text-slate-200">CollectFeeMode.QuoteToken</strong>,
                        all trading fees accrue in SOL. The split is set by{' '}
                        <strong className="text-slate-200">creatorTradingFeePercentage</strong>:{' '}
                        currently <span className="text-amber2">{creatorPct}% to the creator</span> and{' '}
                        <span className="text-violet2">{100 - creatorPct}% to the vault</span>.
                        The vault is a payout address only — it cannot and does not sign
                        transactions in this app; accumulated fees are claimed on-chain by the
                        treasury controller.
                    </p>
                    <p>
                        After graduation, the migrated DAMM v2 position keeps earning:{' '}
                        {100 - creatorPct > 0
                            ? 'permanent locked liquidity allocated to the partner side continues to route its share of LP fees toward the same treasury.'
                            : 'all migrated LP fee share follows the creator configuration.'}
                    </p>
                </div>
            </div>
        </Card>
    )
}
