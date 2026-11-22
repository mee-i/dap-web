import { useEffect, useRef, useState } from 'react'
import { Trash2, ChevronDown, ChevronRight, Keyboard, CornerDownLeft } from 'lucide-react'
import type { TranslationDict } from '../i18n'
import type { ConsoleEntry, ExecutionMetrics } from '../hooks/useDapEngine'

interface ConsolePanelProps {
  t: TranslationDict
  entries: ConsoleEntry[]
  inputMode: 'token' | 'line' | null
  stdinPreFill: string
  onStdinPreFillChange: (val: string) => void
  onSendInteractiveInput: (val: string) => void
  onClear: () => void
  metrics: ExecutionMetrics | null
}

export function ConsolePanel({
  t,
  entries,
  inputMode,
  stdinPreFill,
  onStdinPreFillChange,
  onSendInteractiveInput,
  onClear,
  metrics,
}: ConsolePanelProps) {
  const [liveInput, setLiveInput] = useState('')
  const [inputHistory, setInputHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState<number>(-1)
  const [showPreFill, setShowPreFill] = useState(false)
  const outputEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries, inputMode])

  useEffect(() => {
    if (inputMode) {
      // Defer focus slightly to ensure DOM input is mounted after tab switch
      const id = window.setTimeout(() => inputRef.current?.focus(), 20)
      return () => window.clearTimeout(id)
    }
  }, [inputMode, entries.length])

  const submitCurrentInput = () => {
    if (!inputMode) return
    const valueToSend = liveInput
    if (valueToSend.length > 0) {
      setInputHistory((prev) => [...prev.slice(-49), valueToSend])
    }
    setHistoryIdx(-1)
    setLiveInput('')
    onSendInteractiveInput(valueToSend)
  }

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    submitCurrentInput()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' && inputHistory.length > 0) {
      e.preventDefault()
      const nextIdx = historyIdx === -1 ? inputHistory.length - 1 : Math.max(0, historyIdx - 1)
      setHistoryIdx(nextIdx)
      setLiveInput(inputHistory[nextIdx])
    } else if (e.key === 'ArrowDown' && historyIdx !== -1) {
      e.preventDefault()
      if (historyIdx >= inputHistory.length - 1) {
        setHistoryIdx(-1)
        setLiveInput('')
      } else {
        const nextIdx = historyIdx + 1
        setHistoryIdx(nextIdx)
        setLiveInput(inputHistory[nextIdx])
      }
    }
  }

  const handleTerminalClick = () => {
    // Only focus if user isn't dragging to select text
    const sel = window.getSelection()?.toString()
    if (!sel && inputMode) {
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">{t.consoleOutput}</span>
          {inputMode && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[11px] font-medium text-cyan-700 dark:text-cyan-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
              {t.stdinInteractivePrompt} ({inputMode === 'line' ? t.stdinLineMode : t.stdinTokenMode})
            </span>
          )}
          {!inputMode && metrics && (
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
              {t.metricsSummary(metrics.durationMs, metrics.stepCount)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreFill((v) => !v)}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {showPreFill ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <Keyboard className="h-3 w-3" />
            {t.stdinPreFill}
            {stdinPreFill.trim().length > 0 && (
              <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
            )}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <Trash2 className="h-3 w-3" />
            {t.clearConsole}
          </button>
        </div>
      </div>

      {/* Optional pre-filled stdin drawer */}
      {showPreFill && (
        <div className="border-b border-slate-200 bg-slate-100/70 p-2 dark:border-slate-800 dark:bg-slate-900/40">
          <textarea
            value={stdinPreFill}
            onChange={(e) => onStdinPreFillChange(e.target.value)}
            rows={3}
            placeholder={t.stdinPlaceholder}
            className="w-full resize-y rounded border border-slate-300 bg-white p-2 font-mono text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          />
        </div>
      )}

      {/* Interactive Terminal Body */}
      <div
        onClick={handleTerminalClick}
        className={`flex-1 overflow-auto bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-100 ${
          inputMode ? 'cursor-text' : ''
        }`}
      >
        {entries.length === 0 && !inputMode ? (
          <p className="text-slate-500">{t.consoleEmpty}</p>
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {entries.map((entry) => (
              <span
                key={entry.id}
                className={
                  entry.kind === 'error'
                    ? 'block rounded bg-rose-500/10 px-2 py-1.5 text-rose-300'
                    : entry.kind === 'stdin'
                      ? 'text-cyan-300'
                      : entry.kind === 'info'
                        ? 'text-slate-400'
                        : 'text-slate-100'
                }
              >
                {entry.text}
              </span>
            ))}
          </div>
        )}

        {/* Inline live terminal input prompt right inside the terminal stream */}
        {inputMode && (
          <form onSubmit={handleSubmit} className="mt-1 flex items-center gap-1.5">
            <span className="select-none font-bold text-cyan-400">❯</span>
            <input
              ref={inputRef}
              type="text"
              value={liveInput}
              onChange={(e) => setLiveInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.stdinInputPlaceholder}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent font-mono text-xs text-cyan-200 caret-cyan-400 outline-none placeholder:text-slate-600"
            />
            <button
              type="submit"
              title={t.stdinSend}
              className="inline-flex shrink-0 items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/15 px-2 py-0.5 text-[11px] font-medium text-cyan-300 transition hover:bg-cyan-500/25"
            >
              <CornerDownLeft className="h-3 w-3" />
              <span>Enter</span>
            </button>
          </form>
        )}

        <div ref={outputEndRef} />
      </div>
    </div>
  )
}
