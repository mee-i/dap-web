import { useEffect, useState } from 'react'
import { Layers, Variable, Cpu, PauseCircle } from 'lucide-react'
import type { TranslationDict } from '../i18n'
import type { DebugSnapshotDTO, VariableDTO, VMStateDTO } from '../worker/types'

interface DebuggerPanelProps {
  t: TranslationDict
  snapshot: DebugSnapshotDTO | null
  finalGlobals: VariableDTO[]
  finalVMState: VMStateDTO | null
  changedVars: Set<string>
  onJumpToLine: (line: number) => void
}

function VariablesTable({
  t,
  variables,
  changedVars,
}: {
  t: TranslationDict
  variables: VariableDTO[]
  changedVars: Set<string>
}) {
  if (variables.length === 0) {
    return <p className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400">{t.noVariables}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left font-mono text-xs">
        <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
          <tr>
            <th className="px-3 py-1.5">{t.colName}</th>
            <th className="px-3 py-1.5">{t.colType}</th>
            <th className="px-3 py-1.5">{t.colValue}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
          {variables.map((v) => {
            const isChanged = changedVars.has(v.name)
            return (
              <tr
                key={v.name}
                className={
                  isChanged
                    ? 'bg-amber-500/10 transition-colors dark:bg-amber-400/10'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }
              >
                <td className="px-3 py-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span>{v.name}</span>
                    {v.isConst && (
                      <span className="rounded bg-purple-500/15 px-1 py-0.5 text-[9px] font-bold text-purple-600 dark:text-purple-300">
                        {t.constBadge}
                      </span>
                    )}
                    {isChanged && (
                      <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300">
                        {t.changedBadge}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-sky-700 dark:text-sky-400">{v.type}</td>
                <td className="px-3 py-1.5 break-all text-emerald-700 dark:text-emerald-300">
                  {v.isPointer ? (
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                        v.pointerAddress === 'NIL'
                          ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                      }`}
                    >
                      {v.pointerAddress || v.value}
                    </span>
                  ) : (
                    v.value
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function DebuggerPanel({
  t,
  snapshot,
  finalGlobals,
  finalVMState,
  changedVars,
  onJumpToLine,
}: DebuggerPanelProps) {
  const [selectedFrameIdx, setSelectedFrameIdx] = useState(0)

  useEffect(() => {
    setSelectedFrameIdx(0)
  }, [snapshot?.stepCount])

  const vmState = snapshot?.vmState ?? finalVMState
  const frames = snapshot?.callStack ?? []
  const activeFrame = frames[selectedFrameIdx] ?? frames[0]

  if (!snapshot && finalGlobals.length === 0 && !vmState) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <PauseCircle className="mb-2 h-8 w-8 opacity-40" />
        <p className="max-w-xs leading-relaxed">{t.noDebugSession}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col divide-y divide-slate-200 overflow-auto dark:divide-slate-800">
      {/* Paused banner */}
      {snapshot && (
        <div className="flex items-center justify-between bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">
          <span className="font-medium">
            {t.pausedAtLine(snapshot.line, snapshot.nodeType, snapshot.stepCount)}
          </span>
        </div>
      )}

      {/* VM State (when using Bytecode VM) */}
      {vmState && (
        <div className="p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Cpu className="h-3.5 w-3.5 text-indigo-500" />
            <span>{t.vmStackTitle}</span>
          </div>
          <div className="mb-2 flex flex-wrap gap-2 font-mono text-[11px]">
            <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {t.vmIP}: <strong className="text-indigo-500">{String(vmState.ip).padStart(4, '0')}</strong>
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {t.vmOpcode}: <strong className="text-pink-500">{vmState.opcode}</strong>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 rounded border border-slate-200 bg-slate-50 p-2 font-mono text-xs dark:border-slate-800 dark:bg-slate-950">
            {vmState.stack.length === 0 ? (
              <span className="text-[11px] text-slate-400">[ empty stack ]</span>
            ) : (
              vmState.stack.map((item, idx) => (
                <div
                  key={`${idx}-${item}`}
                  className={`rounded border px-2 py-0.5 ${
                    idx === vmState.stack.length - 1
                      ? 'border-indigo-500 bg-indigo-500/15 font-semibold text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  <span className="mr-1 text-[10px] opacity-60">[{idx}]</span>
                  {item}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Call Stack */}
      {frames.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
            <span>{t.callStack}</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {frames.map((frame) => (
              <button
                key={frame.index}
                type="button"
                onClick={() => {
                  setSelectedFrameIdx(frame.index)
                  onJumpToLine(frame.line)
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left font-mono text-xs transition ${
                  selectedFrameIdx === frame.index
                    ? 'bg-indigo-500/15 font-semibold text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'
                }`}
              >
                <span>
                  #{frame.index} {frame.name}
                </span>
                <span className="text-[11px] opacity-70">:{frame.line}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Frame Variables */}
      {activeFrame && (
        <div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            <Variable className="h-3.5 w-3.5 text-emerald-500" />
            <span>
              {t.localVariables} ({activeFrame.name})
            </span>
          </div>
          <VariablesTable t={t} variables={activeFrame.variables} changedVars={changedVars} />
        </div>
      )}

      {/* Global Variables (always visible when available or after run finished) */}
      {(!activeFrame || frames.length > 1) && (
        <div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            <Variable className="h-3.5 w-3.5 text-sky-500" />
            <span>{t.globalVariables}</span>
          </div>
          <VariablesTable
            t={t}
            variables={snapshot ? snapshot.globals : finalGlobals}
            changedVars={changedVars}
          />
        </div>
      )}
    </div>
  )
}
