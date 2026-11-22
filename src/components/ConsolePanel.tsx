import { useEffect, useRef, useState } from 'react'
import { Trash2, ChevronDown, ChevronRight, CornerDownLeft } from 'lucide-react'
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
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [entries, inputMode])

  useEffect(() => {
    if (inputMode) {
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
    const sel = window.getSelection()?.toString()
    if (!sel && inputMode) {
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Sub-header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E8EE] bg-[#F6F9FC] px-3 py-1.5 text-xs dark:border-white/10 dark:bg-[#0A2540]">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#0A2540] dark:text-white">{t.consoleOutput}</span>
          {inputMode && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#635BFF] dark:text-[#80E9FF]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#635BFF] dark:bg-[#80E9FF]" />
              {t.stdinInteractivePrompt} ({inputMode === 'line' ? t.stdinLineMode : t.stdinTokenMode})
            </span>
          )}
          {!inputMode && metrics && (
            <span className="font-mono text-[11px] tabular-nums text-[#697386] dark:text-[#7C93AB]">
              {t.metricsSummary(metrics.durationMs, metrics.stepCount)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreFill((v) => !v)}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-[#425466] hover:bg-[#E3E8EE]/60 dark:text-[#ADBDCC] dark:hover:bg-white/10"
          >
            {showPreFill ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {t.stdinPreFill}
            {stdinPreFill.trim().length > 0 && (
              <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-[#635BFF]" />
            )}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-[#697386] hover:bg-[#E3E8EE]/60 hover:text-[#0A2540] dark:text-[#7C93AB] dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Trash2 className="h-3 w-3" />
            {t.clearConsole}
          </button>
        </div>
      </div>

      {/* Optional pre-filled stdin drawer */}
      {showPreFill && (
        <div className="border-b border-[#E3E8EE] bg-white p-2 dark:border-white/10 dark:bg-[#0A2540]">
          <textarea
            value={stdinPreFill}
            onChange={(e) => onStdinPreFillChange(e.target.value)}
            rows={3}
            placeholder={t.stdinPlaceholder}
            className="w-full resize-y rounded border border-[#E3E8EE] bg-[#F6F9FC] p-2 font-mono text-xs text-[#0A2540] outline-none focus:border-[#635BFF] dark:border-white/15 dark:bg-[#06182C] dark:text-white"
          />
        </div>
      )}

      {/* Stripe Shell Deep Navy Terminal Surface */}
      <div
        onClick={handleTerminalClick}
        className={`min-h-0 flex-1 overflow-auto bg-[#0A2540] p-3.5 font-mono text-[13px] leading-relaxed text-[#E6EDF3] dark:bg-[#06182C] ${
          inputMode ? 'cursor-text' : ''
        }`}
      >
        {entries.length === 0 && !inputMode ? (
          <p className="text-xs text-[#7C93AB]">{t.consoleEmpty}</p>
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {entries.map((entry) => (
              <span
                key={entry.id}
                className={
                  entry.kind === 'error'
                    ? 'my-1 block rounded border border-[#DF1B41]/30 bg-[#DF1B41]/10 px-2.5 py-1.5 text-[#FF8DA1]'
                    : entry.kind === 'stdin'
                      ? 'text-[#80E9FF]'
                      : entry.kind === 'info'
                        ? 'text-[#7C93AB]'
                        : 'text-[#F6F9FC]'
                }
              >
                {entry.text}
              </span>
            ))}
          </div>
        )}

        {/* Inline live terminal prompt */}
        {inputMode && (
          <form onSubmit={handleSubmit} className="mt-1.5 flex items-center gap-2">
            <span className="select-none font-semibold text-[#80E9FF]">❯</span>
            <input
              ref={inputRef}
              type="text"
              value={liveInput}
              onChange={(e) => setLiveInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.stdinInputPlaceholder}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-white caret-[#80E9FF] outline-none placeholder:text-[#7C93AB]/70"
            />
            <button
              type="submit"
              title={t.stdinSend}
              className="inline-flex shrink-0 items-center gap-1 rounded border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white transition hover:bg-white/20"
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
