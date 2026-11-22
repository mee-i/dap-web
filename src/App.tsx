import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Terminal,
  Bug,
  Boxes,
  ListTree,
  Code2,
  Binary,
  AlertCircle,
  CircleDot,
} from 'lucide-react'
import { translations, type Language } from './i18n'
import { DAP_EXAMPLES } from './data/examples'
import { useDapEngine } from './hooks/useDapEngine'
import { DapEditor, type DapEditorHandle } from './components/DapEditor'
import { Toolbar } from './components/Toolbar'
import { ConsolePanel } from './components/ConsolePanel'
import { DebuggerPanel } from './components/DebuggerPanel'
import { MemoryPanel } from './components/MemoryPanel'
import { ASTView, BytecodeView, TokensView } from './components/AnalysisPanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import type { ExecutionEngine } from './worker/types'

type RightTab = 'console' | 'debugger' | 'memory' | 'tokens' | 'ast' | 'bytecode'

function safeGetStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetStorage(key: string, val: string) {
  try {
    localStorage.setItem(key, val)
  } catch {
    // ignore storage errors in private mode
  }
}

function DapIdeApp() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = safeGetStorage('dap-web-lang')
    return saved === 'en' || saved === 'id' ? saved : 'id'
  })

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = safeGetStorage('dap-web-theme')
    return saved === 'light' || saved === 'dark' ? saved : 'dark'
  })

  const [selectedExampleId, setSelectedExampleId] = useState<string | null>(null)
  const [fileName, setFileName] = useState('untitled.dap')
  const [code, setCode] = useState('')
  const [stdinPreFill, setStdinPreFill] = useState('')
  const [engine, setEngine] = useState<ExecutionEngine>('interpreter')
  const [breakpoints, setBreakpoints] = useState<number[]>([])
  const [activeTab, setActiveTab] = useState<RightTab>('console')
  const [cursor, setCursor] = useState({ line: 1, col: 1 })

  const editorRef = useRef<DapEditorHandle | null>(null)

  const {
    wasmReady,
    wasmVersion,
    wasmError,
    analysis,
    status,
    inputMode,
    consoleEntries,
    snapshot,
    changedVars,
    finalGlobals,
    finalHeap,
    finalVMState,
    runtimeError,
    metrics,
    analyze,
    startSession,
    sendDebugCommand,
    updateBreakpoints,
    sendStdin,
    clearConsole,
  } = useDapEngine()

  const t = translations[lang]

  // Apply theme & lang to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    safeSetStorage('dap-web-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = lang
    safeSetStorage('dap-web-lang', lang)
  }, [lang])

  // Debounced live static analysis (tokens, AST, bytecode, syntax diagnostics)
  useEffect(() => {
    if (!wasmReady) return
    const timer = window.setTimeout(() => {
      analyze(code, fileName)
    }, 180)
    return () => window.clearTimeout(timer)
  }, [wasmReady, code, fileName, analyze])

  // Sync live breakpoints to running debugger
  useEffect(() => {
    updateBreakpoints(breakpoints)
  }, [breakpoints, updateBreakpoints])

  // Auto-switch to Console when program requests interactive stdin
  useEffect(() => {
    if (inputMode) {
      setActiveTab('console')
    }
  }, [inputMode])

  const handleToggleBreakpoint = useCallback((line: number) => {
    setBreakpoints((prev) =>
      prev.includes(line) ? prev.filter((l) => l !== line) : [...prev, line].sort((a, b) => a - b),
    )
  }, [])

  const handleSelectExample = useCallback((id: string) => {
    const found = DAP_EXAMPLES.find((ex) => ex.id === id)
    if (!found) return
    setSelectedExampleId(found.id)
    setFileName(found.fileName)
    setCode(found.code)
    setStdinPreFill(found.defaultStdin ?? '')
    setBreakpoints([])
    if (found.recommendedEngine) {
      setEngine(found.recommendedEngine)
    }
  }, [])

  const handleRun = useCallback(() => {
    if (code.trim().length === 0) return
    setActiveTab('console')
    startSession(code, fileName, engine, 'run', breakpoints, stdinPreFill)
  }, [breakpoints, code, engine, fileName, startSession, stdinPreFill])

  const handleDebug = useCallback(() => {
    if (code.trim().length === 0) return
    setActiveTab('debugger')
    startSession(code, fileName, engine, 'debug', breakpoints, stdinPreFill)
  }, [breakpoints, code, engine, fileName, startSession, stdinPreFill])

  const handleNewBlankFile = useCallback(() => {
    setSelectedExampleId(null)
    setFileName('untitled.dap')
    setCode('')
    setStdinPreFill('')
    setBreakpoints([])
    clearConsole()
  }, [clearConsole])

  const handleImportFile = useCallback((name: string, content: string) => {
    setSelectedExampleId(null)
    setFileName(name)
    setCode(content)
    setBreakpoints([])
  }, [])

  const handleExportFile = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName.endsWith('.dap') ? fileName : `${fileName}.dap`
    a.click()
    URL.revokeObjectURL(url)
  }, [code, fileName])

  const handleJumpTo = useCallback((line: number, col = 1) => {
    editorRef.current?.jumpTo(line, col)
  }, [])

  // Keyboard shortcuts: Ctrl+Enter to Run
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleRun()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleRun])

  const allDiagnostics = useMemo(() => {
    const list = [...(analysis?.diagnostics ?? [])]
    if (runtimeError) {
      list.push(runtimeError)
    }
    return list
  }, [analysis?.diagnostics, runtimeError])

  const activeHeap = snapshot?.heap ?? finalHeap ?? []
  const activeVars = useMemo(() => {
    if (!snapshot) return finalGlobals ?? []
    const merged = [...(snapshot.globals ?? [])]
    const topFrameVars = snapshot.callStack?.[0]?.variables ?? []
    for (const v of topFrameVars) {
      if (!merged.some((g) => g.name === v.name)) {
        merged.push(v)
      }
    }
    return merged
  }, [snapshot, finalGlobals])

  const statusMeta: Record<typeof status, { label: string; color: string }> = {
    idle: { label: t.statusIdle, color: 'bg-slate-500/15 text-slate-600 dark:text-slate-300' },
    running: { label: t.statusRunning, color: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
    paused: { label: t.statusPaused, color: 'bg-amber-500/20 text-amber-800 dark:text-amber-300' },
    waiting_input: {
      label: t.statusWaitingInput,
      color: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300',
    },
    finished: {
      label: t.statusFinished,
      color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    },
    stopped: { label: t.statusStopped, color: 'bg-slate-500/20 text-slate-600 dark:text-slate-300' },
    error: { label: t.statusError, color: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
  }

  const tabs: { id: RightTab; label: string; icon: typeof Terminal; badge?: number }[] = [
    { id: 'console', label: t.tabConsole, icon: Terminal },
    { id: 'debugger', label: t.tabDebugger, icon: Bug },
    { id: 'memory', label: t.tabMemory, icon: Boxes, badge: activeHeap.length || undefined },
    { id: 'tokens', label: t.tabTokens, icon: Code2, badge: analysis?.tokens?.length || undefined },
    { id: 'ast', label: t.tabAST, icon: ListTree },
    {
      id: 'bytecode',
      label: t.tabBytecode,
      icon: Binary,
      badge: analysis?.bytecode?.instructions?.length || undefined,
    },
  ]

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Toolbar
        t={t}
        lang={lang}
        onToggleLang={() => setLang((l) => (l === 'id' ? 'en' : 'id'))}
        theme={theme}
        onToggleTheme={() => setTheme((th) => (th === 'dark' ? 'light' : 'dark'))}
        wasmReady={wasmReady}
        wasmVersion={wasmVersion}
        wasmError={wasmError}
        engine={engine}
        onEngineChange={setEngine}
        selectedExampleId={selectedExampleId}
        onSelectExample={handleSelectExample}
        onNewBlankFile={handleNewBlankFile}
        status={status}
        hasCode={code.trim().length > 0}
        onRun={handleRun}
        onDebug={handleDebug}
        onDebugCommand={sendDebugCommand}
        onImportFile={handleImportFile}
        onExportFile={handleExportFile}
      />

      {/* Main Split Workspace */}
      <main className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-slate-200 lg:grid-cols-12 lg:divide-x lg:divide-y-0 dark:divide-slate-800">
        {/* Left Pane: Code Editor + Diagnostics */}
        <section className="flex min-h-0 flex-col lg:col-span-6 xl:col-span-6">
          {/* Editor Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {fileName}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusMeta[status].color}`}>
                {statusMeta[status].label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="hidden items-center gap-1 sm:inline-flex" title={t.breakpointHint}>
                <CircleDot className="h-3 w-3 text-rose-500" />
                {t.breakpointsCount(breakpoints.length)}
              </span>
              <span className="font-mono">{t.lineCol(cursor.line, cursor.col)}</span>
            </div>
          </div>

          {/* CodeMirror Editor */}
          <div className="min-h-[280px] flex-1 overflow-hidden">
            <DapEditor
              ref={editorRef}
              value={code}
              onChange={setCode}
              breakpoints={breakpoints}
              onToggleBreakpoint={handleToggleBreakpoint}
              activeLine={snapshot?.line ?? null}
              diagnostics={allDiagnostics}
              theme={theme}
              placeholderText={t.editorPlaceholder}
              onCursorChange={(line, col) => setCursor({ line, col })}
            />
          </div>

          {/* Live Diagnostics Strip */}
          {allDiagnostics.length > 0 && (
            <div className="max-h-32 overflow-auto border-t border-rose-500/30 bg-rose-500/10 px-3 py-2">
              {allDiagnostics.map((d, idx) => (
                <button
                  key={`${d.name}-${d.line}-${idx}`}
                  type="button"
                  onClick={() => handleJumpTo(d.line, d.col)}
                  className="flex w-full items-start gap-2 rounded py-0.5 text-left font-mono text-xs text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <strong>
                      [{d.name} L{d.line}:{d.col}]
                    </strong>{' '}
                    {d.message}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Right Pane: Tabbed Console, Debugger, Memory, Tokens, AST, Bytecode */}
        <section className="flex min-h-0 flex-col bg-white lg:col-span-6 xl:col-span-6 dark:bg-slate-950">
          {/* Tabs Bar */}
          <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-1.5 dark:border-slate-800 dark:bg-slate-900">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition ${
                    isActive
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className="rounded-full bg-slate-200 px-1.5 py-0.2 font-mono text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Active Tab Content */}
          <div className="min-h-0 flex-1 overflow-hidden">
            {activeTab === 'console' && (
              <ConsolePanel
                t={t}
                entries={consoleEntries}
                inputMode={inputMode}
                stdinPreFill={stdinPreFill}
                onStdinPreFillChange={setStdinPreFill}
                onSendInteractiveInput={sendStdin}
                onClear={clearConsole}
                metrics={metrics}
              />
            )}
            {activeTab === 'debugger' && (
              <DebuggerPanel
                t={t}
                snapshot={snapshot}
                finalGlobals={finalGlobals}
                finalVMState={finalVMState}
                changedVars={changedVars}
                onJumpToLine={(line) => handleJumpTo(line, 1)}
              />
            )}
            {activeTab === 'memory' && (
              <MemoryPanel t={t} heap={activeHeap} variables={activeVars} />
            )}
            {activeTab === 'tokens' && (
              <TokensView t={t} analysis={analysis} onJumpToPosition={handleJumpTo} />
            )}
            {activeTab === 'ast' && <ASTView t={t} analysis={analysis} />}
            {activeTab === 'bytecode' && (
              <BytecodeView
                t={t}
                analysis={analysis}
                activeIP={snapshot?.vmState?.ip ?? null}
                onJumpToLine={(line) => handleJumpTo(line, 1)}
              />
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <div>
          {t.footerCredits}{' '}
          <a
            href="https://github.com/rafiathallah3/dap"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
          >
            https://github.com/rafiathallah3/dap
          </a>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <span>{t.breakpointHint}</span>
          <span>•</span>
          <span className="font-mono">Ctrl + Enter: {t.run}</span>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <DapIdeApp />
    </ErrorBoundary>
  )
}
