/// <reference lib="webworker" />

import type { WorkerInboundMessage, WorkerOutboundMessage } from './types'

declare global {
  interface WindowOrWorkerGlobalScope {
    Go?: new () => {
      importObject: WebAssembly.Imports
      run(instance: WebAssembly.Instance): Promise<void>
    }
    __dapEmitEvent?: (jsonStr: string) => void
    dapAnalyze?: (source: string, fileName: string) => string
    dapStartSession?: (source: string, fileName: string, configJson: string) => string
    dapDebugCommand?: (cmd: string) => boolean
    dapUpdateBreakpoints?: (linesJson: string) => boolean
    dapSendStdin?: (val: string) => boolean
  }
}

const g = globalThis as unknown as WindowOrWorkerGlobalScope

let wasmLoaded = false

function post(msg: WorkerOutboundMessage) {
  self.postMessage(msg)
}

async function initWasm(baseUrl: string) {
  if (wasmLoaded) {
    post({ type: 'ready', version: 'v1.0.2' })
    return
  }

  try {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    const wasmExecUrl = `${normalizedBase}wasm_exec.js`
    const wasmUrl = `${normalizedBase}dap.wasm`

    if (!g.Go) {
      const execResp = await fetch(wasmExecUrl)
      if (!execResp.ok) {
        throw new Error(`Failed to fetch wasm_exec.js (${execResp.status})`)
      }
      const execScript = await execResp.text()
      // Execute Go's official wasm_exec.js runtime in worker scope
      new Function(execScript)()
    }

    if (!g.Go) {
      throw new Error('Go WASM runtime class was not registered after loading wasm_exec.js')
    }

    g.__dapEmitEvent = (jsonStr: string) => {
      try {
        const parsed = JSON.parse(jsonStr) as WorkerOutboundMessage
        post(parsed)
      } catch (err) {
        console.error('Failed to parse DAP WASM event:', err)
      }
    }

    const go = new g.Go()
    const wasmResp = await fetch(wasmUrl)
    if (!wasmResp.ok) {
      throw new Error(`Failed to fetch dap.wasm (${wasmResp.status})`)
    }

    let instance: WebAssembly.Instance
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      try {
        const result = await WebAssembly.instantiateStreaming(wasmResp.clone(), go.importObject)
        instance = result.instance
      } catch {
        const bytes = await wasmResp.arrayBuffer()
        const result = await WebAssembly.instantiate(bytes, go.importObject)
        instance = result.instance
      }
    } else {
      const bytes = await wasmResp.arrayBuffer()
      const result = await WebAssembly.instantiate(bytes, go.importObject)
      instance = result.instance
    }

    wasmLoaded = true
    // go.run resolves only when Go main() exits (it stays alive via select{})
    void go.run(instance)
  } catch (err) {
    post({
      type: 'init_error',
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
  const msg = event.data
  switch (msg.type) {
    case 'init':
      void initWasm(msg.baseUrl)
      break

    case 'analyze': {
      if (!g.dapAnalyze) return
      try {
        const raw = g.dapAnalyze(msg.source, msg.fileName)
        const result = JSON.parse(raw)
        post({ type: 'analyze_result', requestId: msg.requestId, result })
      } catch (err) {
        post({
          type: 'analyze_result',
          requestId: msg.requestId,
          result: {
            ok: false,
            programName: '<program>',
            tokens: [],
            ast: null,
            astTreeText: '',
            bytecode: {
              compiled: false,
              vmSupported: false,
              disassembly: '',
              instructions: [],
              constants: [],
              names: [],
              functionNames: [],
            },
            diagnostics: [
              {
                severity: 'error',
                name: 'AnalyzerError',
                message: err instanceof Error ? err.message : String(err),
                formatted: String(err),
                line: 1,
                col: 1,
              },
            ],
          },
        })
      }
      break
    }

    case 'start_session': {
      if (!g.dapStartSession) return
      g.dapStartSession(msg.source, msg.fileName, JSON.stringify(msg.config))
      break
    }

    case 'debug_cmd': {
      if (!g.dapDebugCommand) return
      g.dapDebugCommand(msg.cmd)
      break
    }

    case 'update_breakpoints': {
      if (!g.dapUpdateBreakpoints) return
      g.dapUpdateBreakpoints(JSON.stringify(msg.breakpoints))
      break
    }

    case 'send_stdin': {
      if (!g.dapSendStdin) return
      g.dapSendStdin(msg.value)
      break
    }
  }
}
