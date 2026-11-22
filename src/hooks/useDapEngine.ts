import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AnalyzeResultDTO,
  DebugCommand,
  DebugSnapshotDTO,
  DiagnosticDTO,
  ExecutionEngine,
  ExecutionMode,
  HeapCellDTO,
  SessionStatus,
  VariableDTO,
  VMStateDTO,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from '../worker/types'

export interface ConsoleEntry {
  id: number
  kind: 'stdout' | 'stdin' | 'error' | 'info'
  text: string
}

export interface ExecutionMetrics {
  durationMs: number
  stepCount: number
}

export function useDapEngine() {
  const workerRef = useRef<Worker | null>(null)
  const analyzeReqIdRef = useRef(0)
  const consoleIdRef = useRef(0)
  const prevVarMapRef = useRef<Record<string, string>>({})

  const [wasmReady, setWasmReady] = useState(false)
  const [wasmVersion, setWasmVersion] = useState<string>('')
  const [wasmError, setWasmError] = useState<string | null>(null)

  const [analysis, setAnalysis] = useState<AnalyzeResultDTO | null>(null)
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [inputMode, setInputMode] = useState<'token' | 'line' | null>(null)
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([])
  const [snapshot, setSnapshot] = useState<DebugSnapshotDTO | null>(null)
  const [changedVars, setChangedVars] = useState<Set<string>>(new Set())
  const [finalGlobals, setFinalGlobals] = useState<VariableDTO[]>([])
  const [finalHeap, setFinalHeap] = useState<HeapCellDTO[]>([])
  const [finalVMState, setFinalVMState] = useState<VMStateDTO | null>(null)
  const [runtimeError, setRuntimeError] = useState<DiagnosticDTO | null>(null)
  const [metrics, setMetrics] = useState<ExecutionMetrics | null>(null)

  const appendConsole = useCallback((kind: ConsoleEntry['kind'], text: string) => {
    setConsoleEntries((prev) => [
      ...prev,
      { id: ++consoleIdRef.current, kind, text },
    ])
  }, [])

  const trackVariableDiffs = useCallback((vars: VariableDTO[]) => {
    const nextMap: Record<string, string> = {}
    const changed = new Set<string>()
    for (const v of vars) {
      nextMap[v.name] = v.value
      if (prevVarMapRef.current[v.name] !== undefined && prevVarMapRef.current[v.name] !== v.value) {
        changed.add(v.name)
      }
    }
    prevVarMapRef.current = nextMap
    setChangedVars(changed)
  }, [])

  const postToWorker = useCallback((msg: WorkerInboundMessage) => {
    workerRef.current?.postMessage(msg)
  }, [])

  const spawnWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    setWasmReady(false)
    setWasmError(null)

    const worker = new Worker(new URL('../worker/dap.worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>) => {
      const msg = event.data
      switch (msg.type) {
        case 'ready':
          setWasmReady(true)
          setWasmVersion(msg.version || 'v1.0.2')
          setWasmError(null)
          break

        case 'init_error':
          setWasmReady(false)
          setWasmError(msg.error)
          break

        case 'analyze_result':
          if (msg.requestId === analyzeReqIdRef.current) {
            setAnalysis(msg.result)
          }
          break

        case 'stdout':
          appendConsole('stdout', msg.text)
          break

        case 'paused':
          setStatus('paused')
          setInputMode(null)
          setSnapshot(msg.snapshot)
          setFinalGlobals(msg.snapshot.globals ?? [])
          setFinalHeap(msg.snapshot.heap ?? [])
          setFinalVMState(msg.snapshot.vmState ?? null)
          trackVariableDiffs(msg.snapshot.callStack?.[0]?.variables ?? msg.snapshot.globals ?? [])
          break

        case 'input_request':
          setStatus('waiting_input')
          setInputMode(msg.mode)
          break

        case 'finished':
          setStatus('finished')
          setInputMode(null)
          setSnapshot(null)
          setFinalGlobals(msg.globals ?? [])
          setFinalHeap(msg.heap ?? [])
          setFinalVMState(msg.vmState ?? null)
          setMetrics({ durationMs: msg.durationMs, stepCount: msg.stepCount })
          trackVariableDiffs(msg.globals ?? [])
          break

        case 'stopped':
          setStatus('stopped')
          setInputMode(null)
          setSnapshot(null)
          setFinalGlobals(msg.globals ?? [])
          setFinalHeap(msg.heap ?? [])
          setFinalVMState(msg.vmState ?? null)
          setMetrics({ durationMs: msg.durationMs, stepCount: msg.stepCount })
          break

        case 'error':
          setStatus('error')
          setInputMode(null)
          setSnapshot(null)
          setRuntimeError(msg.error)
          if (msg.globals) setFinalGlobals(msg.globals)
          if (msg.heap) setFinalHeap(msg.heap)
          if (msg.vmState) setFinalVMState(msg.vmState)
          if (msg.durationMs !== undefined && msg.stepCount !== undefined) {
            setMetrics({ durationMs: msg.durationMs, stepCount: msg.stepCount })
          }
          appendConsole('error', msg.error.formatted || `${msg.error.name}: ${msg.error.message}`)
          break
      }
    }

    worker.onerror = (err) => {
      setStatus('error')
      setWasmError(err.message || 'Web Worker crashed')
    }

    workerRef.current = worker
    const basePath = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`
    const baseUrl = new URL(basePath, window.location.origin).href
    worker.postMessage({ type: 'init', baseUrl } satisfies WorkerInboundMessage)
  }, [appendConsole, trackVariableDiffs])

  useEffect(() => {
    spawnWorker()
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [spawnWorker])

  const analyze = useCallback(
    (source: string, fileName: string) => {
      if (!wasmReady) return
      if (source.trim().length === 0) {
        analyzeReqIdRef.current++
        setAnalysis(null)
        return
      }
      const requestId = ++analyzeReqIdRef.current
      postToWorker({ type: 'analyze', requestId, source, fileName })
    },
    [postToWorker, wasmReady],
  )

  const startSession = useCallback(
    (
      source: string,
      fileName: string,
      engine: ExecutionEngine,
      mode: ExecutionMode,
      breakpoints: number[],
      stdinText: string,
    ) => {
      if (!wasmReady) return
      setConsoleEntries([])
      setSnapshot(null)
      setRuntimeError(null)
      setMetrics(null)
      setInputMode(null)
      setChangedVars(new Set())
      prevVarMapRef.current = {}
      setStatus('running')

      const stdinQueue = stdinText.trim().length > 0 ? stdinText.replace(/\r\n/g, '\n').split('\n') : []
      postToWorker({
        type: 'start_session',
        source,
        fileName,
        config: {
          engine,
          mode,
          breakpoints,
          stdinQueue,
          maxSteps: 500000,
        },
      })
    },
    [postToWorker, wasmReady],
  )

  const sendDebugCommand = useCallback(
    (cmd: DebugCommand) => {
      if (cmd === 'stop') {
        postToWorker({ type: 'debug_cmd', cmd: 'stop' })
        // If worker is busy in a tight infinite loop, allow hard termination fallback
        if (status === 'running') {
          window.setTimeout(() => {
            setStatus((cur) => {
              if (cur === 'running') {
                spawnWorker()
                return 'stopped'
              }
              return cur
            })
          }, 350)
        }
        return
      }
      if (cmd === 'continue' || cmd === 'step_into' || cmd === 'step_over' || cmd === 'step_out') {
        setStatus('running')
      }
      postToWorker({ type: 'debug_cmd', cmd })
    },
    [postToWorker, spawnWorker, status],
  )

  const updateBreakpoints = useCallback(
    (breakpoints: number[]) => {
      if (!wasmReady) return
      postToWorker({ type: 'update_breakpoints', breakpoints })
    },
    [postToWorker, wasmReady],
  )

  const sendStdin = useCallback(
    (value: string) => {
      appendConsole('stdin', `❯ ${value}\n`)
      setInputMode(null)
      setStatus('running')
      postToWorker({ type: 'send_stdin', value })
    },
    [appendConsole, postToWorker],
  )

  const clearConsole = useCallback(() => {
    setConsoleEntries([])
    setRuntimeError(null)
  }, [])

  return {
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
    restartWorker: spawnWorker,
  }
}
