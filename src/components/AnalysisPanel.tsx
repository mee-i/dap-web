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
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.tokensFilter}
            className="h-7 w-full rounded border border-slate-300 bg-white pl-7 pr-2 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          />
        </div>
        <span className="shrink-0 font-mono text-[11px] text-slate-500 dark:text-slate-400">
          {t.tokensCount(filtered.length, tokens.length)}
        </span>
      </div>

      <div className="border-b border-slate-200 bg-slate-50/50 px-3 py-1 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
        {t.tokensHint}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="sticky top-0 border-b border-slate-200 bg-slate-100 text-[11px] uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="w-12 px-3 py-1.5">{t.colIndex}</th>
              <th className="px-3 py-1.5">{t.colKind}</th>
              <th className="px-3 py-1.5">{t.colTokenVal}</th>
              <th className="w-24 px-3 py-1.5 text-right">{t.colPosition}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {filtered.map((tk) => (
              <tr
                key={tk.index}
                onClick={() => onJumpToPosition(tk.line, tk.col)}
                className="cursor-pointer transition hover:bg-indigo-500/10"
              >
                <td className="px-3 py-1 text-slate-400">{tk.index}</td>
                <td className="px-3 py-1">
                  <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                    {tk.kind}
                  </span>
                </td>
                <td className="max-w-[200px] truncate px-3 py-1 text-emerald-700 dark:text-emerald-300">
                  {tk.value === '\n' ? '\\n' : tk.value || '—'}
                </td>
                <td className="px-3 py-1 text-right text-slate-500 dark:text-slate-400">
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
        {label && <span className="text-slate-500 dark:text-slate-400">{label}: </span>}
        <span className="text-slate-400">null</span>
      </div>
    )
  }

  if (typeof data !== 'object') {
    return (
      <div className="py-0.5 font-mono text-xs" style={{ paddingLeft: depth * 14 }}>
        {label && <span className="text-slate-500 dark:text-slate-400">{label}: </span>}
        <span
          className={
            typeof data === 'string'
              ? 'text-lime-700 dark:text-lime-300'
              : typeof data === 'boolean'
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-amber-700 dark:text-amber-300'
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
          className="flex items-center gap-1 py-0.5 font-mono text-xs text-slate-700 hover:text-indigo-500 dark:text-slate-300"
          style={{ paddingLeft: depth * 14 }}
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {label && <span className="text-slate-500 dark:text-slate-400">{label}</span>}
          <span className="rounded bg-slate-200 px-1 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            [{data.length}]
          </span>
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
        className="flex items-center gap-1 py-0.5 font-mono text-xs hover:text-indigo-500"
        style={{ paddingLeft: depth * 14 }}
      >
        {open ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}
        {label && <span className="text-slate-500 dark:text-slate-400">{label}:</span>}
        {nodeType ? (
          <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-purple-700 dark:text-purple-300">
            {nodeType}
          </span>
        ) : (
          <span className="text-slate-400">{'{...}'}</span>
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
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-slate-500 dark:text-slate-400">
        {t.astEmpty}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/70">
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
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          {copied ? t.copiedBtn : t.copyBtn}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {mode === 'interactive' && <AstTreeNode data={analysis.ast} />}
        {mode === 'ascii' && (
          <pre className="font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200">
            {analysis.astTreeText}
          </pre>
        )}
        {mode === 'json' && (
          <pre className="font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200">
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
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-xs text-slate-500 dark:text-slate-400">
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
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowRaw(false)}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              !showRaw
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {t.bytecodeDisassembly} ({instructions.length})
          </button>
          <button
            type="button"
            onClick={() => setShowRaw(true)}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              showRaw
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {t.bytecodeRaw}
          </button>
        </div>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          {copied ? t.copiedBtn : t.copyBtn}
        </button>
      </div>

      {!bc.vmSupported && bc.vmNote && (
        <div className="flex items-start gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <strong>{t.vmNotSupportedWarn}</strong> {bc.vmNote}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {showRaw ? (
          <pre className="p-3 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200">
            {bc.disassembly}
          </pre>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            <table className="w-full text-left font-mono text-xs">
              <thead className="sticky top-0 border-b border-slate-200 bg-slate-100 text-[11px] uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="w-16 px-3 py-1.5">IP</th>
                  <th className="w-14 px-3 py-1.5">Line</th>
                  <th className="px-3 py-1.5">Opcode</th>
                  <th className="px-3 py-1.5">Operand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {instructions.map((inst) => {
                  const isCurrent = activeIP === inst.offset
                  return (
                    <tr
                      key={inst.offset}
                      onClick={() => inst.line > 0 && onJumpToLine(inst.line)}
                      className={`cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-500/20 font-bold text-amber-900 dark:text-amber-200'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-3 py-1 text-slate-400">
                        {String(inst.offset).padStart(4, '0')}
                      </td>
                      <td className="px-3 py-1 text-slate-500">{inst.line || '—'}</td>
                      <td className="px-3 py-1 font-semibold text-pink-600 dark:text-pink-400">
                        {inst.op}
                      </td>
                      <td className="px-3 py-1 text-cyan-700 dark:text-cyan-300">
                        {inst.detail || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Constants & Names */}
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
              <div className="rounded border border-slate-200 p-2 dark:border-slate-800">
                <div className="mb-1.5 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                  {t.bytecodeConstants} ({constants.length})
                </div>
                <div className="space-y-1 font-mono text-xs">
                  {constants.length === 0 ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    constants.map((c, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-slate-400">#{idx}</span>
                        <span className="text-amber-700 dark:text-amber-300">{c}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded border border-slate-200 p-2 dark:border-slate-800">
                <div className="mb-1.5 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                  {t.bytecodeNames} ({names.length})
                </div>
                <div className="space-y-1 font-mono text-xs">
                  {names.length === 0 ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    names.map((n, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-slate-400">#{idx}</span>
                        <span className="text-emerald-700 dark:text-emerald-300">{n}</span>
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
