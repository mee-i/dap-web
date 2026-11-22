import { useMemo, useState } from 'react'
import { Search, Copy, Check, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react'
import type { TranslationDict } from '../i18n'
import type { AnalyzeResultDTO } from '../worker/types'

interface TokensViewProps {
  t: TranslationDict
  analysis: AnalyzeResultDTO | null
  onJumpToPosition: (line: number, col: number) => void
}

export function TokensView({ t, analysis, onJumpToPosition }: TokensViewProps) {
  const [query, setQuery] = useState('')
  const tokens = analysis?.tokens ?? []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tokens
    return tokens.filter(
      (tk) =>
        tk.kind.toLowerCase().includes(q) ||
        tk.value.toLowerCase().includes(q) ||
        String(tk.line).includes(q),
    )
  }, [tokens, query])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-[#E3E8EE] bg-[#F6F9FC] px-3 py-1.5 dark:border-white/10 dark:bg-[#06182C]">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-[#697386]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.tokensFilter}
            className="h-7 w-full rounded border border-[#E3E8EE] bg-white pl-7 pr-2 text-xs text-[#0A2540] outline-none focus:border-[#635BFF] dark:border-white/15 dark:bg-[#0A2540] dark:text-white"
          />
        </div>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-[#697386] dark:text-[#7C93AB]">
          {t.tokensCount(filtered.length, tokens.length)}
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left font-mono text-xs tabular-nums">
          <thead className="sticky top-0 border-b border-[#E3E8EE] bg-[#F6F9FC] text-[10px] font-semibold uppercase tracking-wider text-[#697386] dark:border-white/10 dark:bg-[#06182C] dark:text-[#7C93AB]">
            <tr>
              <th className="w-12 px-3 py-1.5">{t.colIndex}</th>
              <th className="px-3 py-1.5">{t.colKind}</th>
              <th className="px-3 py-1.5">{t.colTokenVal}</th>
              <th className="w-24 px-3 py-1.5 text-right">{t.colPosition}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E8EE] dark:divide-white/10">
            {filtered.map((tk) => (
              <tr
                key={tk.index}
                onClick={() => onJumpToPosition(tk.line, tk.col)}
                className="cursor-pointer transition hover:bg-[#635BFF]/6 dark:hover:bg-white/5"
              >
                <td className="px-3 py-1.5 text-[#697386] dark:text-[#7C93AB]">{tk.index}</td>
                <td className="px-3 py-1.5 font-semibold text-[#635BFF] dark:text-[#80E9FF]">
                  {tk.kind}
                </td>
                <td className="max-w-[200px] truncate px-3 py-1.5 text-[#0A2540] dark:text-white">
                  {tk.value === '\n' ? '\\n' : tk.value || '—'}
                </td>
                <td className="px-3 py-1.5 text-right text-[#697386] dark:text-[#7C93AB]">
                  {tk.line}:{tk.col}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AstTreeNode({ label, data, depth = 0 }: { label?: string; data: unknown; depth?: number }) {
  const [open, setOpen] = useState(depth < 3)

  if (data === null || data === undefined) {
    return (
      <div className="py-0.5 font-mono text-xs" style={{ paddingLeft: depth * 14 }}>
        {label && <span className="text-[#697386] dark:text-[#7C93AB]">{label}: </span>}
        <span className="text-[#8792A2]">null</span>
      </div>
    )
  }

  if (typeof data !== 'object') {
    return (
      <div className="py-0.5 font-mono text-xs" style={{ paddingLeft: depth * 14 }}>
        {label && <span className="text-[#697386] dark:text-[#7C93AB]">{label}: </span>}
        <span
          className={
            typeof data === 'string'
              ? 'text-[#0E6245] dark:text-[#3ECF8E]'
              : typeof data === 'boolean'
                ? 'text-[#B45309] dark:text-[#FFCB6B]'
                : 'text-[#635BFF] dark:text-[#80E9FF]'
          }
        >
          {typeof data === 'string' ? `"${data}"` : String(data)}
        </span>
      </div>
    )
  }

  if (Array.isArray(data)) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 py-0.5 font-mono text-xs text-[#0A2540] hover:text-[#635BFF] dark:text-[#ADBDCC] dark:hover:text-[#80E9FF]"
          style={{ paddingLeft: depth * 14 }}
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {label && <span className="text-[#697386] dark:text-[#7C93AB]">{label}</span>}
          <span className="text-[10px] text-[#697386]">[{data.length}]</span>
        </button>
        {open &&
          data.map((item, idx) => (
            <AstTreeNode key={idx} label={`#${idx}`} data={item} depth={depth + 1} />
          ))}
      </div>
    )
  }

  const record = data as Record<string, unknown>
  const nodeType = typeof record.type === 'string' ? record.type : null
  const entries = Object.entries(record).filter(([k]) => k !== 'type')

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 py-0.5 font-mono text-xs hover:text-[#635BFF] dark:hover:text-[#80E9FF]"
        style={{ paddingLeft: depth * 14 }}
      >
        {open ? <ChevronDown className="h-3 w-3 text-[#697386]" /> : <ChevronRight className="h-3 w-3 text-[#697386]" />}
        {label && <span className="text-[#697386] dark:text-[#7C93AB]">{label}:</span>}
        {nodeType ? (
          <span className="font-semibold text-[#635BFF] dark:text-[#A9A4FF]">{nodeType}</span>
        ) : (
          <span className="text-[#697386]">{'{...}'}</span>
        )}
      </button>
      {open &&
        entries.map(([k, v]) => <AstTreeNode key={k} label={k} data={v} depth={depth + 1} />)}
    </div>
  )
}

interface ASTViewProps {
  t: TranslationDict
  analysis: AnalyzeResultDTO | null
}

export function ASTView({ t, analysis }: ASTViewProps) {
  const [mode, setMode] = useState<'interactive' | 'ascii' | 'json'>('interactive')
  const [copied, setCopied] = useState(false)

  const jsonText = useMemo(() => {
    if (!analysis?.ast) return ''
    return JSON.stringify(analysis.ast, null, 2)
  }, [analysis?.ast])

  const handleCopy = async () => {
    const content = mode === 'ascii' ? analysis?.astTreeText || '' : jsonText
    if (!content) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  if (!analysis?.ok || !analysis.ast) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-[#697386] dark:text-[#7C93AB]">
        {t.astEmpty}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#E3E8EE] bg-[#F6F9FC] px-3 py-1.5 dark:border-white/10 dark:bg-[#06182C]">
        <div className="flex items-center gap-1">
          {(
            [
              ['interactive', t.astTreeInteractive],
              ['ascii', t.astTreeAscii],
              ['json', t.astJson],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                mode === m
                  ? 'bg-[#635BFF] text-white'
                  : 'text-[#425466] hover:bg-[#E3E8EE]/60 dark:text-[#ADBDCC] dark:hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="stripe-btn-secondary inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium"
        >
          {copied ? <Check className="h-3 w-3 text-[#0E9F6E]" /> : <Copy className="h-3 w-3" />}
          {copied ? t.copiedBtn : t.copyBtn}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {mode === 'interactive' && <AstTreeNode data={analysis.ast} />}
        {mode === 'ascii' && (
          <pre className="font-mono text-xs leading-relaxed text-[#0A2540] dark:text-[#E6EDF3]">
            {analysis.astTreeText}
          </pre>
        )}
        {mode === 'json' && (
          <pre className="font-mono text-xs leading-relaxed text-[#0A2540] dark:text-[#E6EDF3]">
            {jsonText}
          </pre>
        )}
      </div>
    </div>
  )
}

interface BytecodeViewProps {
  t: TranslationDict
  analysis: AnalyzeResultDTO | null
  activeIP: number | null
  onJumpToLine: (line: number) => void
}

export function BytecodeView({ t, analysis, activeIP, onJumpToLine }: BytecodeViewProps) {
  const [showRaw, setShowRaw] = useState(false)
  const [copied, setCopied] = useState(false)
  const bc = analysis?.bytecode
  const instructions = bc?.instructions ?? []
  const constants = bc?.constants ?? []
  const names = bc?.names ?? []

  if (!analysis?.ok || !bc?.compiled) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-xs text-[#697386] dark:text-[#7C93AB]">
        <p>{bc?.error || t.bytecodeUnavailable}</p>
      </div>
    )
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(bc.disassembly)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#E3E8EE] bg-[#F6F9FC] px-3 py-1.5 dark:border-white/10 dark:bg-[#06182C]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowRaw(false)}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              !showRaw
                ? 'bg-[#635BFF] text-white'
                : 'text-[#425466] hover:bg-[#E3E8EE]/60 dark:text-[#ADBDCC] dark:hover:bg-white/10'
            }`}
          >
            {t.bytecodeDisassembly} ({instructions.length})
          </button>
          <button
            type="button"
            onClick={() => setShowRaw(true)}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              showRaw
                ? 'bg-[#635BFF] text-white'
                : 'text-[#425466] hover:bg-[#E3E8EE]/60 dark:text-[#ADBDCC] dark:hover:bg-white/10'
            }`}
          >
            {t.bytecodeRaw}
          </button>
        </div>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="stripe-btn-secondary inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium"
        >
          {copied ? <Check className="h-3 w-3 text-[#0E9F6E]" /> : <Copy className="h-3 w-3" />}
          {copied ? t.copiedBtn : t.copyBtn}
        </button>
      </div>

      {!bc.vmSupported && bc.vmNote && (
        <div className="flex items-start gap-2 border-b border-[#E3E8EE] bg-[#FFFBEB] px-3 py-2 text-[11px] text-[#92400E] dark:border-white/10 dark:bg-[#D97706]/15 dark:text-[#FCD34D]">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <strong>{t.vmNotSupportedWarn}</strong> {bc.vmNote}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {showRaw ? (
          <pre className="p-3 font-mono text-xs leading-relaxed text-[#0A2540] dark:text-[#E6EDF3]">
            {bc.disassembly}
          </pre>
        ) : (
          <div className="divide-y divide-[#E3E8EE] dark:divide-white/10">
            <table className="w-full text-left font-mono text-xs tabular-nums">
              <thead className="sticky top-0 border-b border-[#E3E8EE] bg-[#F6F9FC] text-[10px] font-semibold uppercase tracking-wider text-[#697386] dark:border-white/10 dark:bg-[#06182C] dark:text-[#7C93AB]">
                <tr>
                  <th className="w-16 px-3 py-1.5">IP</th>
                  <th className="w-14 px-3 py-1.5">Line</th>
                  <th className="px-3 py-1.5">Opcode</th>
                  <th className="px-3 py-1.5">Operand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8EE] dark:divide-white/10">
                {instructions.map((inst) => {
                  const isCurrent = activeIP === inst.offset
                  return (
                    <tr
                      key={inst.offset}
                      onClick={() => inst.line > 0 && onJumpToLine(inst.line)}
                      className={`cursor-pointer ${
                        isCurrent
                          ? 'bg-[#635BFF]/12 font-semibold text-[#635BFF] dark:bg-[#635BFF]/25 dark:text-[#80E9FF]'
                          : 'hover:bg-[#F6F9FC] dark:hover:bg-white/5'
                      }`}
                    >
                      <td className="px-3 py-1 text-[#697386] dark:text-[#7C93AB]">
                        {String(inst.offset).padStart(4, '0')}
                      </td>
                      <td className="px-3 py-1 text-[#697386] dark:text-[#7C93AB]">{inst.line || '—'}</td>
                      <td className="px-3 py-1 font-semibold text-[#0A2540] dark:text-white">
                        {inst.op}
                      </td>
                      <td className="px-3 py-1 text-[#425466] dark:text-[#ADBDCC]">
                        {inst.detail || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
              <div className="rounded border border-[#E3E8EE] p-2.5 dark:border-white/10">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#697386] dark:text-[#7C93AB]">
                  {t.bytecodeConstants} ({constants.length})
                </div>
                <div className="space-y-1 font-mono text-xs tabular-nums">
                  {constants.length === 0 ? (
                    <span className="text-[#8792A2]">—</span>
                  ) : (
                    constants.map((c, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-[#697386]">#{idx}</span>
                        <span className="text-[#0A2540] dark:text-white">{c}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded border border-[#E3E8EE] p-2.5 dark:border-white/10">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#697386] dark:text-[#7C93AB]">
                  {t.bytecodeNames} ({names.length})
                </div>
                <div className="space-y-1 font-mono text-xs tabular-nums">
                  {names.length === 0 ? (
                    <span className="text-[#8792A2]">—</span>
                  ) : (
                    names.map((n, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-[#697386]">#{idx}</span>
                        <span className="text-[#0E6245] dark:text-[#3ECF8E]">{n}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
