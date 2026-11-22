export interface TokenDTO {
  index: number
  kind: string
  value: string
  line: number
  col: number
  endLine: number
  endCol: number
}

export interface DiagnosticDTO {
  severity: string
  name: string
  message: string
  formatted: string
  line: number
  col: number
  endLine?: number
  endCol?: number
}

export interface InstructionDTO {
  offset: number
  line: number
  op: string
  arg: number
  detail: string
  hasArg: boolean
}

export interface BytecodeDTO {
  compiled: boolean
  vmSupported: boolean
  vmNote?: string
  error?: string
  disassembly: string
  instructions: InstructionDTO[]
  constants: string[]
  names: string[]
  functionNames: string[]
}

export interface AnalyzeResultDTO {
  ok: boolean
  programName: string
  tokens: TokenDTO[]
  ast: unknown
  astTreeText: string
  bytecode: BytecodeDTO
  diagnostics: DiagnosticDTO[]
}

export interface VariableDTO {
  name: string
  type: string
  value: string
  isConst: boolean
  isPointer: boolean
  pointerAddress?: string
}

export interface StackFrameDTO {
  index: number
  name: string
  line: number
  variables: VariableDTO[]
}

export interface HeapFieldDTO {
  name: string
  type: string
  value: string
  isPointer: boolean
  target?: string
}

export interface HeapCellDTO {
  address: string
  freed: boolean
  type: string
  display: string
  fields?: HeapFieldDTO[]
}

export interface VMStateDTO {
  ip: number
  opcode: string
  line: number
  stack: string[]
  globals: VariableDTO[]
}

export interface DebugSnapshotDTO {
  line: number
  col: number
  nodeType: string
  stepCount: number
  callStack: StackFrameDTO[]
  globals: VariableDTO[]
  heap: HeapCellDTO[]
  vmState?: VMStateDTO
}

export type ExecutionEngine = 'interpreter' | 'vm'
export type ExecutionMode = 'run' | 'debug'
export type DebugCommand = 'continue' | 'step_into' | 'step_over' | 'step_out' | 'pause' | 'stop'

export type SessionStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'waiting_input'
  | 'finished'
  | 'stopped'
  | 'error'

export interface SessionConfig {
  engine: ExecutionEngine
  mode: ExecutionMode
  breakpoints: number[]
  stdinQueue: string[]
  maxSteps?: number
}

export type WorkerInboundMessage =
  | { type: 'init'; baseUrl: string }
  | { type: 'analyze'; requestId: number; source: string; fileName: string }
  | { type: 'start_session'; source: string; fileName: string; config: SessionConfig }
  | { type: 'debug_cmd'; cmd: DebugCommand }
  | { type: 'update_breakpoints'; breakpoints: number[] }
  | { type: 'send_stdin'; value: string }

export type WorkerOutboundMessage =
  | { type: 'ready'; version: string }
  | { type: 'init_error'; error: string }
  | { type: 'analyze_result'; requestId: number; result: AnalyzeResultDTO }
  | { type: 'stdout'; text: string }
  | { type: 'paused'; snapshot: DebugSnapshotDTO }
  | { type: 'input_request'; mode: 'token' | 'line' }
  | {
      type: 'finished'
      durationMs: number
      stepCount: number
      globals: VariableDTO[]
      heap: HeapCellDTO[]
      vmState?: VMStateDTO
    }
  | {
      type: 'stopped'
      durationMs: number
      stepCount: number
      globals: VariableDTO[]
      heap: HeapCellDTO[]
      vmState?: VMStateDTO
    }
  | {
      type: 'error'
      error: DiagnosticDTO
      durationMs?: number
      stepCount?: number
      globals?: VariableDTO[]
      heap?: HeapCellDTO[]
      vmState?: VMStateDTO
    }
