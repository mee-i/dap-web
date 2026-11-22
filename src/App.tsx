import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
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
import { FileTabBar, type WorkspaceFile } from './components/FileTabBar'
import type { ExecutionEngine } from './worker/types'

type RightTab = 'console' | 'debugger' | 'memory' | 'tokens' | 'ast' | 'bytecode'

const WORKSPACE_STORAGE_KEY = 'dap-web-workspace-v1'

interface PersistedWorkspace {
  version: 1
  activeFileId: string
  files: WorkspaceFile[]
}

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
    // ignore storage quota/privacy errors
  }
}

function createFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function nextUntitledName(existingFiles: WorkspaceFile[]): string {
  const names = new Set(existingFiles.map((f) => f.name.toLowerCase()))
  if (!names.has('untitled.dap')) return 'untitled.dap'
  let n = 2
  while (names.has(`untitled-${n}.dap`)) {
    n++
  }
  return `untitled-${n}.dap`
}

function createDefaultWorkspace(): PersistedWorkspace {
  const first: WorkspaceFile = {
    id: createFileId(),
    name: 'untitled.dap',
    code: '',
    stdin: '',
    breakpoints: [],
    exampleId: null,
  }
  return {
    version: 1,
    activeFileId: first.id,
    files: [first],
  }
}

function loadInitialWorkspace(): PersistedWorkspace {
  const raw = safeGetStorage(WORKSPACE_STORAGE_KEY)
  if (!raw) return createDefaultWorkspace()
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedWorkspace>
    if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
      return createDefaultWorkspace()
    }
    const validFiles: WorkspaceFile[] = parsed.files
      .filter((f): f is WorkspaceFile => Boolean(f && typeof f.id === 'string' && typeof f.name === 'string'))
      .map((f) => ({
        id: f.id,
        name: f.name.trim() || 'untitled.dap',
        code: typeof f.code === 'string' ? f.code : '',
        stdin: typeof f.stdin === 'string' ? f.stdin : '',
        breakpoints: Array.isArray(f.breakpoints)
          ? f.breakpoints.filter((n): n is number => typeof n === 'number' && n > 0)
          : [],
        exampleId: typeof f.exampleId === 'string' ? f.exampleId : null,
      }))

    if (validFiles.length === 0) return createDefaultWorkspace()

    const activeExists = validFiles.some((f) => f.id === parsed.activeFileId)
    return {
      version: 1,
      activeFileId: activeExists ? (parsed.activeFileId as string) : validFiles[0].id,
      files: validFiles,
    }
  } catch {
    return createDefaultWorkspace()
  }
}

function DapIdeApp() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = safeGetStorage('dap-web-lang')
    return saved === 'en' || saved === 'id' ? saved : 'id'
  })

  // Stripe default: clean light editorial canvas, with instant toggle to Stripe Deep Navy Dark
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = safeGetStorage('dap-web-theme')
    return saved === 'dark' || saved === 'light' ? saved : 'light'
  })

  const [workspace, setWorkspace] = useState<PersistedWorkspace>(() => loadInitialWorkspace())
  const [engine, setEngine] = useState<ExecutionEngine>('interpreter')
  const [activeTab, setActiveTab] = useState<RightTab>('console')
  const [cursor, setCursor] = useState({ line: 1, col: 1 })

  const editorRef = useRef<DapEditorHandle | null>(null)
  const workspaceRef = useRef(workspace)
  workspaceRef.current = workspace

  const activeFile = useMemo(
    () => workspace.files.find((f) => f.id === workspace.activeFileId) ?? workspace.files[0],
    [workspace],
  )

  const fileName = activeFile.name
  const code = activeFile.code
  const stdinPreFill = activeFile.stdin
  const breakpoints = activeFile.breakpoints
  const selectedExampleId = activeFile.exampleId ?? null

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

  // Persist workspace to localStorage
  useEffect(() => {
    const timer = window.setTimeout(() => {
      safeSetStorage(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace))
    }, 200)
    return () => window.clearTimeout(timer)
  }, [workspace])

  useEffect(() => {
    const flushNow = () => {
      safeSetStorage(WORKSPACE_STORAGE_KEY, JSON.stringify(workspaceRef.current))
    }
    window.addEventListener('beforeunload', flushNow)
    window.addEventListener('pagehide', flushNow)
    return () => {
      window.removeEventListener('beforeunload', flushNow)
      window.removeEventListener('pagehide', flushNow)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    safeSetStorage('dap-web-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = lang
    safeSetStorage('dap-web-lang', lang)
  }, [lang])

  useEffect(() => {
    if (!wasmReady) return
    const timer = window.setTimeout(() => {
      analyze(code, fileName)
    }, 180)
    return () => window.clearTimeout(timer)
  }, [wasmReady, code, fileName, analyze])

  useEffect(() => {
    updateBreakpoints(breakpoints)
  }, [breakpoints, updateBreakpoints])

  useEffect(() => {
    if (inputMode) {
      setActiveTab('console')
    }
  }, [inputMode])

  const updateActiveFile = useCallback((updater: (file: WorkspaceFile) => WorkspaceFile) => {
    setWorkspace((prev) => ({
      ...prev,
      files: prev.files.map((f) => (f.id === prev.activeFileId ? updater(f) : f)),
    }))
  }, [])

  const handleCodeChange = useCallback(
    (nextCode: string) => {
      updateActiveFile((f) => (f.code === nextCode ? f : { ...f, code: nextCode }))
    },
    [updateActiveFile],
  )

  const handleStdinChange = useCallback(
    (nextStdin: string) => {
      updateActiveFile((f) => ({ ...f, stdin: nextStdin }))
    },
    [updateActiveFile],
  )

  const handleToggleBreakpoint = useCallback(
    (line: number) => {
      updateActiveFile((f) => {
        const nextBps = f.breakpoints.includes(line)
          ? f.breakpoints.filter((l) => l !== line)
          : [...f.breakpoints, line].sort((a, b) => a - b)
        return { ...f, breakpoints: nextBps }
      })
    },
    [updateActiveFile],
  )

  const handleAddTab = useCallback(() => {
    setWorkspace((prev) => {
      const newFile: WorkspaceFile = {
        id: createFileId(),
        name: nextUntitledName(prev.files),
        code: '',
        stdin: '',
        breakpoints: [],
        exampleId: null,
      }
      return {
        ...prev,
        activeFileId: newFile.id,
        files: [...prev.files, newFile],
      }
    })
  }, [])

  const handleSelectTab = useCallback((id: string) => {
    setWorkspace((prev) => ({ ...prev, activeFileId: id }))
  }, [])

  const handleCloseTab = useCallback((id: string) => {
    setWorkspace((prev) => {
      const idx = prev.files.findIndex((f) => f.id === id)
      if (idx === -1) return prev
      const remaining = prev.files.filter((f) => f.id !== id)
      if (remaining.length === 0) {
        return createDefaultWorkspace()
      }
      const nextActiveId =
        prev.activeFileId === id
          ? remaining[Math.min(idx, remaining.length - 1)].id
          : prev.activeFileId
      return {
        ...prev,
        activeFileId: nextActiveId,
        files: remaining,
      }
    })
  }, [])

  const handleRenameTab = useCallback((id: string, newName: string) => {
    setWorkspace((prev) => ({
      ...prev,
      files: prev.files.map((f) => (f.id === id ? { ...f, name: newName } : f)),
    }))
  }, [])

  const handleSelectExample = useCallback((id: string) => {
    const found = DAP_EXAMPLES.find((ex) => ex.id === id)
    if (!found) return

    setWorkspace((prev) => {
      const current = prev.files.find((f) => f.id === prev.activeFileId)
      if (current && current.code.trim().length === 0) {
        return {
          ...prev,
          files: prev.files.map((f) =>
            f.id === current.id
              ? {
                  ...f,
                  name: found.fileName,
                  code: found.code,
                  stdin: found.defaultStdin ?? '',
                  breakpoints: [],
                  exampleId: found.id,
                }
              : f,
          ),
        }
      }

      const newFile: WorkspaceFile = {
        id: createFileId(),
        name: found.fileName,
        code: found.code,
        stdin: found.defaultStdin ?? '',
        breakpoints: [],
        exampleId: found.id,
      }
      return {
        ...prev,
        activeFileId: newFile.id,
        files: [...prev.files, newFile],
      }
    })

    if (found.recommendedEngine) {
      setEngine(found.recommendedEngine)
    }
  }, [])

  const handleImportFile = useCallback((name: string, content: string) => {
    setWorkspace((prev) => {
      const current = prev.files.find((f) => f.id === prev.activeFileId)
      if (current && current.code.trim().length === 0) {
        return {
          ...prev,
          files: prev.files.map((f) =>
            f.id === current.id
              ? { ...f, name, code: content, breakpoints: [], exampleId: null }
              : f,
          ),
        }
      }
      const newFile: WorkspaceFile = {
        id: createFileId(),
        name,
        code: content,
        stdin: '',
        breakpoints: [],
        exampleId: null,
      }
      return {
        ...prev,
        activeFileId: newFile.id,
        files: [...prev.files, newFile],
      }
    })
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

  const statusMeta: Record<typeof status, { label: string; dot: string }> = {
    idle: { label: t.statusIdle, dot: 'bg-[#8792A2]' },
    running: { label: t.statusRunning, dot: 'bg-[#635BFF] animate-pulse' },
    paused: { label: t.statusPaused, dot: 'bg-[#D97706]' },
    waiting_input: { label: t.statusWaitingInput, dot: 'bg-[#00A3FF] animate-pulse' },
    finished: { label: t.statusFinished, dot: 'bg-[#0E9F6E]' },
    stopped: { label: t.statusStopped, dot: 'bg-[#8792A2]' },
    error: { label: t.statusError, dot: 'bg-[#DF1B41]' },
  }

  const tabs: { id: RightTab; label: string; badge?: number }[] = [
    { id: 'console', label: t.tabConsole },
    { id: 'debugger', label: t.tabDebugger },
    { id: 'memory', label: t.tabMemory, badge: activeHeap.length || undefined },
    { id: 'tokens', label: t.tabTokens, badge: analysis?.tokens?.length || undefined },
    { id: 'ast', label: t.tabAST },
    {
      id: 'bytecode',
      label: t.tabBytecode,
      badge: analysis?.bytecode?.instructions?.length || undefined,
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F9FC] text-[#0A2540] lg:h-screen lg:overflow-hidden dark:bg-[#06182C] dark:text-white">
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
        onNewBlankFile={handleAddTab}
        status={status}
        hasCode={code.trim().length > 0}
        onRun={handleRun}
        onDebug={handleDebug}
        onDebugCommand={sendDebugCommand}
        onImportFile={handleImportFile}
        onExportFile={handleExportFile}
      />

      {/* Main Split Workspace — unclipped generous stacked panes on mobile, full-height 50/50 split on desktop */}
      <main className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-[#E3E8EE] lg:grid-cols-12 lg:divide-x lg:divide-y-0 dark:divide-white/10">
        {/* Left Pane: File Tabs + Code Editor + Diagnostics */}
        <section className="flex h-[50vh] min-h-[320px] flex-col bg-white lg:col-span-6 lg:h-auto lg:min-h-0 dark:bg-[#06182C]">
          <FileTabBar
            t={t}
            files={workspace.files}
            activeFileId={activeFile.id}
            onSelectTab={handleSelectTab}
            onAddTab={handleAddTab}
            onCloseTab={handleCloseTab}
            onRenameTab={handleRenameTab}
          />

          {/* Crisp Editor Status Strip */}
          <div className="flex items-center justify-between border-b border-[#E3E8EE] bg-white px-3 py-1 text-[11px] text-[#697386] dark:border-white/10 dark:bg-[#0A2540] dark:text-[#7C93AB]">
            <div className="flex items-center gap-3">
              <span className="inline-flex min-w-[96px] items-center gap-1.5 font-medium text-[#0A2540] dark:text-white">
                <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[status].dot}`} />
                {statusMeta[status].label}
              </span>
              <span className="hidden sm:inline">{t.savedLocally}</span>
            </div>
            <div className="flex items-center gap-3 font-mono tabular-nums">
              <span className="hidden sm:inline" title={t.breakpointHint}>
                {t.breakpointsCount(breakpoints.length)}
              </span>
              <span>{t.lineCol(cursor.line, cursor.col)}</span>
            </div>
          </div>

          {/* CodeMirror Editor */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <DapEditor
              key={activeFile.id}
              ref={editorRef}
              value={code}
              onChange={handleCodeChange}
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
            <div className="max-h-28 overflow-auto border-t border-[#DF1B41]/25 bg-[#FFF5F7] px-3 py-2 dark:bg-[#DF1B41]/10">
              {allDiagnostics.map((d, idx) => (
                <button
                  key={`${d.name}-${d.line}-${idx}`}
                  type="button"
                  onClick={() => handleJumpTo(d.line, d.col)}
                  className="flex w-full items-start gap-2 rounded py-0.5 text-left font-mono text-xs text-[#C21437] hover:underline dark:text-[#FF8DA1]"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <strong>
                      {d.name} ({d.line}:{d.col})
                    </strong>{' '}
                    — {d.message}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Right Pane: Always generously sized on mobile (h-[48vh] min-h-[340px]) so terminal NEVER disappears */}
        <section className="flex h-[48vh] min-h-[340px] flex-col bg-white lg:col-span-6 lg:h-auto lg:min-h-0 dark:bg-[#0A2540]">
          {/* Clean Stripe-style Tab Strip */}
          <div className="flex overflow-x-auto border-b border-[#E3E8EE] bg-[#F6F9FC] px-2 dark:border-white/10 dark:bg-[#06182C]">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative inline-flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition ${
                    isActive
                      ? 'text-[#635BFF] dark:text-[#80E9FF]'
                      : 'text-[#425466] hover:text-[#0A2540] dark:text-[#ADBDCC] dark:hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className="font-mono text-[10px] tabular-nums opacity-70">{tab.badge}</span>
                  )}
                  {isActive && (
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[#635BFF] dark:bg-[#80E9FF]" />
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
                onStdinPreFillChange={handleStdinChange}
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

      {/* Minimal IDE Status Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E3E8EE] bg-white px-3 py-1.5 text-[11px] text-[#697386] dark:border-white/10 dark:bg-[#0A2540] dark:text-[#7C93AB]">
        <div>
          {t.footerCredits}{' '}
          <a
            href="https://github.com/rafiathallah3/dap"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#635BFF] hover:underline dark:text-[#80E9FF]"
          >
            rafiathallah3/dap
          </a>
        </div>
        <div className="hidden items-center gap-3 font-mono sm:flex">
          <span>Ctrl + Space: {t.suggestShortcut}</span>
          <span className="opacity-30">|</span>
          <span>Ctrl + Enter: {t.run}</span>
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
