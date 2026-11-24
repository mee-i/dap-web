import { useEffect, useRef, useState } from 'react'
import {
  Play,
  Bug,
  Square,
  Pause,
  StepForward,
  ArrowDownToLine,
  ArrowUpFromLine,
  FastForward,
  Upload,
  Download,
  Sun,
  Moon,
  ChevronDown,
  FilePlus2,
  ArrowUpRight,
} from 'lucide-react'
import type { Language, TranslationDict } from '../i18n'
import type { DebugCommand, ExecutionEngine, SessionStatus } from '../worker/types'
import { DAP_EXAMPLES } from '../data/examples'

interface ToolbarProps {
  t: TranslationDict
  lang: Language
  onToggleLang: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  wasmReady: boolean
  wasmVersion: string
  wasmError: string | null
  engine: ExecutionEngine
  onEngineChange: (engine: ExecutionEngine) => void
  selectedExampleId: string | null
  onSelectExample: (id: string) => void
  onNewBlankFile: () => void
  status: SessionStatus
  hasCode: boolean
  onRun: () => void
  onDebug: () => void
  onDebugCommand: (cmd: DebugCommand) => void
  onImportFile: (name: string, content: string) => void
  onExportFile: () => void
}

export function Toolbar({
  t,
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  wasmReady,
  wasmVersion,
  wasmError,
  engine,
  onEngineChange,
  selectedExampleId,
  onSelectExample,
  onNewBlankFile,
  status,
  hasCode,
  onRun,
  onDebug,
  onDebugCommand,
  onImportFile,
  onExportFile,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const exampleMenuRef = useRef<HTMLDivElement | null>(null)
  const [examplesOpen, setExamplesOpen] = useState(false)

  const isBusy = status === 'running' || status === 'paused' || status === 'waiting_input'
  const isPaused = status === 'paused'

  useEffect(() => {
    if (!examplesOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (exampleMenuRef.current && !exampleMenuRef.current.contains(e.target as Node)) {
        setExamplesOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExamplesOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [examplesOpen])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportFile(file.name, reader.result)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E8EE] bg-white px-3 py-2 dark:border-white/10 dark:bg-[#0A2540]">
      {/* Typographic Wordmark & Repo Link */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[15px] font-semibold tracking-[-0.04em] text-[#0A2540] dark:text-white">
            dap
          </span>
          <span className="text-[#CBD5E1] dark:text-white/20">/</span>
          <a
            href="https://github.com/mee-i/dap-web"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-xs font-medium text-[#425466] transition hover:text-[#635BFF] dark:text-[#ADBDCC] dark:hover:text-[#80E9FF]"
            title="https://github.com/mee-i/dap-web"
          >
            <span>mee-i/dap-web</span>
            <ArrowUpRight className="h-3 w-3 opacity-70" />
          </a>
        </div>

        {/* Minimal Engine Readiness Indicator */}
        <div className="hidden items-center gap-1.5 border-l border-[#E3E8EE] pl-3 text-[11px] text-[#697386] sm:flex dark:border-white/10 dark:text-[#7C93AB]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              wasmError ? 'bg-[#DF1B41]' : wasmReady ? 'bg-[#0E9F6E]' : 'animate-pulse bg-[#D97706]'
            }`}
          />
          <span className="font-mono tabular-nums">
            {wasmError ? t.engineError : wasmReady ? wasmVersion || 'v1.0.3' : t.loadingEngine}
          </span>
        </div>
      </div>

      {/* Primary Execution & Debug Controls */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Examples Dropdown */}
        <div ref={exampleMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setExamplesOpen((v) => !v)}
            className="stripe-btn-secondary inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition"
          >
            <span>{t.useExampleBtn}</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {examplesOpen && (
            <div className="stripe-card-shadow absolute left-0 z-50 mt-1.5 w-80 overflow-hidden rounded-md border border-[#E3E8EE] bg-white dark:border-white/15 dark:bg-[#0A2540]">
              <div className="flex items-center justify-between border-b border-[#E3E8EE] bg-[#F6F9FC] px-3 py-2 dark:border-white/10 dark:bg-[#06182C]">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] dark:text-[#7C93AB]">
                  {t.examples}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onNewBlankFile()
                    setExamplesOpen(false)
                  }}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-[#425466] hover:bg-[#E3E8EE]/60 dark:text-[#ADBDCC] dark:hover:bg-white/10"
                >
                  <FilePlus2 className="h-3 w-3" />
                  {t.newBlankFile}
                </button>
              </div>
              <div className="max-h-80 divide-y divide-[#E3E8EE] overflow-auto dark:divide-white/10">
                {DAP_EXAMPLES.map((ex) => {
                  const isSelected = selectedExampleId === ex.id
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => {
                        onSelectExample(ex.id)
                        setExamplesOpen(false)
                      }}
                      className={`block w-full px-3 py-2.5 text-left transition ${
                        isSelected
                          ? 'bg-[#635BFF]/8 dark:bg-[#635BFF]/20'
                          : 'hover:bg-[#F6F9FC] dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#0A2540] dark:text-white">
                          {lang === 'id' ? ex.titleId : ex.titleEn}
                        </span>
                        <span className="font-mono text-[10px] text-[#697386] dark:text-[#7C93AB]">
                          {ex.fileName}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-[#425466] dark:text-[#ADBDCC]">
                        {lang === 'id' ? ex.descriptionId : ex.descriptionEn}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Engine Selector */}
        <select
          aria-label={t.engine}
          value={engine}
          onChange={(e) => onEngineChange(e.target.value as ExecutionEngine)}
          disabled={isBusy}
          className="stripe-btn-secondary h-8 rounded px-2 text-xs font-medium outline-none disabled:opacity-50"
        >
          <option value="interpreter" className="dark:bg-[#0A2540]">
            {t.engineInterpreter}
          </option>
          <option value="vm" className="dark:bg-[#0A2540]">
            {t.engineVM}
          </option>
        </select>

        {/* Primary Action: Stripe Blurple #635BFF */}
        <button
          type="button"
          onClick={onRun}
          disabled={!wasmReady || !hasCode}
          className="inline-flex h-8 items-center gap-1.5 rounded bg-[#635BFF] px-3 text-xs font-medium text-white shadow-xs transition hover:bg-[#5349F0] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Play className="h-3 w-3 fill-current" />
          <span>{t.run}</span>
        </button>

        {/* Secondary Action: Debug */}
        <button
          type="button"
          onClick={onDebug}
          disabled={!wasmReady || !hasCode}
          className="stripe-btn-secondary inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Bug className="h-3.5 w-3.5 text-[#635BFF] dark:text-[#80E9FF]" />
          <span>{t.debug}</span>
        </button>

        {/* Always-mounted Segmented Step Controls (zero layout shift) */}
        <div className="flex h-8 items-center divide-x divide-[#E3E8EE] overflow-hidden rounded border border-[#E3E8EE] bg-[#F6F9FC] dark:divide-white/10 dark:border-white/15 dark:bg-[#06182C]">
          <button
            type="button"
            onClick={() => onDebugCommand(isPaused ? 'continue' : 'pause')}
            disabled={!isBusy}
            title={isPaused ? t.continue : t.pause}
            aria-label={isPaused ? t.continue : t.pause}
            className="inline-flex h-full w-7 items-center justify-center text-[#0A2540] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 dark:text-white dark:hover:bg-white/10"
          >
            {isPaused ? (
              <FastForward className="h-3.5 w-3.5 text-[#635BFF] dark:text-[#80E9FF]" />
            ) : (
              <Pause className="h-3.5 w-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onDebugCommand('step_over')}
            disabled={!isPaused}
            title={t.stepOver}
            aria-label={t.stepOver}
            className="inline-flex h-full w-7 items-center justify-center text-[#0A2540] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 dark:text-white dark:hover:bg-white/10"
          >
            <StepForward className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDebugCommand('step_into')}
            disabled={!isPaused}
            title={t.stepInto}
            aria-label={t.stepInto}
            className="inline-flex h-full w-7 items-center justify-center text-[#0A2540] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 dark:text-white dark:hover:bg-white/10"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDebugCommand('step_out')}
            disabled={!isPaused}
            title={t.stepOut}
            aria-label={t.stepOut}
            className="inline-flex h-full w-7 items-center justify-center text-[#0A2540] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 dark:text-white dark:hover:bg-white/10"
          >
            <ArrowUpFromLine className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDebugCommand('stop')}
            disabled={!isBusy}
            title={t.stop}
            aria-label={t.stop}
            className="inline-flex h-full w-7 items-center justify-center text-[#DF1B41] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/10"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
        </div>
      </div>

      {/* Utility Controls: Import, Export, Language, Theme */}
      <div className="flex items-center gap-1">
        <input
          ref={fileInputRef}
          type="file"
          accept=".dap,.txt"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title={t.importFile}
          className="stripe-btn-secondary inline-flex h-8 items-center gap-1 rounded px-2 text-xs font-medium transition"
        >
          <Upload className="h-3.5 w-3.5 opacity-70" />
          <span className="hidden xl:inline">{t.importFile}</span>
        </button>
        <button
          type="button"
          onClick={onExportFile}
          title={t.exportFile}
          className="stripe-btn-secondary inline-flex h-8 items-center gap-1 rounded px-2 text-xs font-medium transition"
        >
          <Download className="h-3.5 w-3.5 opacity-70" />
          <span className="hidden xl:inline">{t.exportFile}</span>
        </button>

        <button
          type="button"
          onClick={onToggleLang}
          title={t.langToggle}
          className="stripe-btn-secondary inline-flex h-8 items-center rounded px-2 font-mono text-[11px] font-semibold transition"
        >
          {lang.toUpperCase()}
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          title={t.themeToggle}
          aria-label={t.themeToggle}
          className="stripe-btn-secondary inline-flex h-8 w-8 items-center justify-center rounded transition"
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </div>
    </header>
  )
}
