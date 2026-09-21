'use client'

import { useState } from 'react'
import type { StudioParams } from '@/lib/studio'
import { analyzeIntent, type AssistantSuggestion } from '@/lib/assistant'
import { Badge, Button, Card } from './ui'

interface Msg {
    role: 'user' | 'assistant'
    text?: string
    suggestion?: AssistantSuggestion
}

/** render **bold** segments from the rule engine's rationale strings */
function Rich({ text }: { text: string }) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return (
        <>
            {parts.map((p, i) =>
                p.startsWith('**') ? (
                    <strong key={i} className="font-semibold text-slate-100">
                        {p.slice(2, -2)}
                    </strong>
                ) : (
                    <span key={i}>{p}</span>
                )
            )}
        </>
    )
}

export function AiAssistant({
    onApply,
}: {
    onApply: (params: StudioParams) => void
}) {
    const [input, setInput] = useState('')
    const [msgs, setMsgs] = useState<Msg[]>([
        {
            role: 'assistant',
            text: 'Describe your launch intent in plain language — e.g. "I want a fair meme launch with anti-sniper protection and graduation around 80 SOL". I\'ll map it to curve parameters and explain the trade-offs.',
        },
    ])

    const send = () => {
        const text = input.trim()
        if (!text) return
        const suggestion = analyzeIntent(text)
        setMsgs((m) => [...m, { role: 'user', text }, { role: 'assistant', suggestion }])
        setInput('')
    }

    return (
        <Card
            title="AI Parameter Assistant"
            subtitle="AI-assisted (rule-based core, LLM-pluggable)"
            className="flex h-full flex-col"
            actions={<Badge tone="violet">no external API</Badge>}
        >
            <div className="flex h-full flex-col gap-3">
                <div className="max-h-96 flex-1 space-y-3 overflow-y-auto pr-1">
                    {msgs.map((m, i) => (
                        <div
                            key={i}
                            className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                                m.role === 'user'
                                    ? 'ml-8 border border-accent/30 bg-accent/10 text-slate-200'
                                    : 'mr-4 border border-ink-700 bg-ink-900/70 text-slate-300'
                            }`}
                        >
                            {m.text && <Rich text={m.text} />}
                            {m.suggestion && (
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-slate-500">Base preset:</span>
                                        <Badge>{m.suggestion.preset.label}</Badge>
                                        {m.suggestion.adjustments.map((a, j) => (
                                            <Badge key={j} tone="amber">
                                                {a}
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                        Why these parameters
                                    </div>
                                    <ul className="list-disc space-y-1.5 pl-4">
                                        {m.suggestion.rationale.map((r, j) => (
                                            <li key={j}>
                                                <Rich text={r} />
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="pt-1">
                                        <Button
                                            onClick={() =>
                                                onApply({ ...m.suggestion!.params })
                                            }
                                        >
                                            ✓ Apply to designer
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && send()}
                        placeholder="I want a fair meme launch, anti-sniper, graduate ~80 SOL…"
                        className="min-w-0 flex-1 rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-accent/60"
                    />
                    <Button onClick={send}>Send</Button>
                </div>
            </div>
        </Card>
    )
}
