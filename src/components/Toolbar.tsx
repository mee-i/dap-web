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
  Languages,
  Cpu,
  Terminal,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  FilePlus2,
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
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
      {/* Brand & Upstream Attribution */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-sm">
          <Terminal className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              {t.appTitle}
            </span>
            <a
              href="https://github.com/mee-i/dap-web"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
              title="https://github.com/mee-i/dap-web"
            >
              <ExternalLink className="h-3 w-3" />
              mee-i/dap-web
            </a>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>{t.appSubtitle}</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            {wasmError ? (
              <span className="inline-flex items-center gap-1 text-rose-500">
                <AlertTriangle className="h-3 w-3" />
                {t.engineError}
              </span>
            ) : wasmReady ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                {t.engineReady} ({wasmVersion})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t.loadingEngine}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Execution & Debug Controls */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* "Gunakan Contoh" button + popover dropdown */}
        <div ref={exampleMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setExamplesOpen((v) => !v)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-indigo-300 bg-indigo-50 px-2.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500/25"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>{t.useExampleBtn}</span>
            <ChevronDown className="h-3 w-3 opacity-80" />
          </button>

          {examplesOpen && (
            <div className="absolute left-0 z-50 mt-1.5 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t.examples}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onNewBlankFile()
                    setExamplesOpen(false)
                  }}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <FilePlus2 className="h-3 w-3" />
                  {t.newBlankFile}
                </button>
              </div>
              <div className="max-h-80 divide-y divide-slate-100 overflow-auto dark:divide-slate-800">
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
                      className={`block w-full px-3 py-2 text-left transition ${
                        isSelected
                          ? 'bg-indigo-500/10 dark:bg-indigo-500/15'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {lang === 'id' ? ex.titleId : ex.titleEn}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {ex.fileName}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                        {lang === 'id' ? ex.descriptionId : ex.descriptionEn}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Engine selector */}
        <div className="flex h-8 items-center rounded-md border border-slate-300 bg-slate-50 px-1.5 dark:border-slate-700 dark:bg-slate-800">
          <Cpu className="mr-1 h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
          <select
            aria-label={t.engine}
            value={engine}
            onChange={(e) => onEngineChange(e.target.value as ExecutionEngine)}
            disabled={isBusy}
            className="bg-transparent text-xs font-medium text-slate-800 outline-none disabled:opacity-60 dark:text-slate-200"
          >
            <option value="interpreter" className="dark:bg-slate-900">
              {t.engineInterpreter}
            </option>
            <option value="vm" className="dark:bg-slate-900">
              {t.engineVM}
            </option>
          </select>
        </div>

        {/* Run / Debug buttons */}
        <button
          type="button"
          onClick={onRun}
          disabled={!wasmReady || !hasCode}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          {t.run}
        </button>

        <button
          type="button"
          onClick={onDebug}
          disabled={!wasmReady || !hasCode}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Bug className="h-3.5 w-3.5" />
          {t.debug}
        </button>

        {/* Step Controls when running/paused */}
        {isBusy && (
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800/80">
            {isPaused ? (
              <button
                type="button"
                onClick={() => onDebugCommand('continue')}
                title={t.continue}
                className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
              >
                <FastForward className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.continue}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onDebugCommand('pause')}
                title={t.pause}
                className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-amber-700 hover:bg-amber-500/15 dark:text-amber-400"
              >
                <Pause className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onDebugCommand('step_over')}
              disabled={!isPaused}
              title={t.stepOver}
              className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-sky-700 hover:bg-sky-500/15 disabled:opacity-40 dark:text-sky-400"
            >
              <StepForward className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{t.stepOver}</span>
            </button>

            <button
              type="button"
              onClick={() => onDebugCommand('step_into')}
              disabled={!isPaused}
              title={t.stepInto}
              className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-sky-700 hover:bg-sky-500/15 disabled:opacity-40 dark:text-sky-400"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{t.stepInto}</span>
            </button>

            <button
              type="button"
              onClick={() => onDebugCommand('step_out')}
              disabled={!isPaused}
              title={t.stepOut}
              className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-sky-700 hover:bg-sky-500/15 disabled:opacity-40 dark:text-sky-400"
            >
              <ArrowUpFromLine className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">{t.stepOut}</span>
            </button>

            <button
              type="button"
              onClick={() => onDebugCommand('stop')}
              title={t.stop}
              className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-rose-600 hover:bg-rose-500/15 dark:text-rose-400"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span className="hidden sm:inline">{t.stop}</span>
            </button>
          </div>
        )}
      </div>

      {/* File I/O, Language & Theme */}
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
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">{t.importFile}</span>
        </button>
        <button
          type="button"
          onClick={onExportFile}
          title={t.exportFile}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">{t.exportFile}</span>
        </button>

        {/* Language selector (ID / EN) */}
        <button
          type="button"
          onClick={onToggleLang}
          title={t.langToggle}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Languages className="h-3.5 w-3.5 text-indigo-500" />
          <span>{lang.toUpperCase()}</span>
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={t.themeToggle}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
        </button>
      </div>
    </header>
  )
}
