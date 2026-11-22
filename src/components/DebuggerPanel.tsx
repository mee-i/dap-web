import { useEffect, useState } from 'react'
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
    return <p className="px-3 py-4 text-xs text-[#697386] dark:text-[#7C93AB]">{t.noVariables}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left font-mono text-xs tabular-nums">
        <thead className="border-b border-[#E3E8EE] bg-[#F6F9FC] text-[10px] font-semibold uppercase tracking-wider text-[#697386] dark:border-white/10 dark:bg-[#06182C] dark:text-[#7C93AB]">
          <tr>
            <th className="px-3 py-1.5">{t.colName}</th>
            <th className="px-3 py-1.5">{t.colType}</th>
            <th className="px-3 py-1.5">{t.colValue}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E3E8EE] dark:divide-white/10">
          {variables.map((v) => {
            const isChanged = changedVars.has(v.name)
            return (
              <tr
                key={v.name}
                className={
                  isChanged
                    ? 'bg-[#635BFF]/8 dark:bg-[#635BFF]/20'
                    : 'hover:bg-[#F6F9FC] dark:hover:bg-white/5'
                }
              >
                <td className="px-3 py-1.5 font-medium text-[#0A2540] dark:text-white">
                  <div className="flex items-center gap-1.5">
                    <span>{v.name}</span>
                    {v.isConst && (
                      <span className="rounded border border-[#E3E8EE] px-1 py-0.2 text-[9px] font-semibold text-[#697386] dark:border-white/15 dark:text-[#ADBDCC]">
                        {t.constBadge}
                      </span>
                    )}
                    {isChanged && (
                      <span className="rounded bg-[#635BFF]/15 px-1 py-0.2 text-[9px] font-semibold text-[#635BFF] dark:text-[#80E9FF]">
                        {t.changedBadge}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-[#425466] dark:text-[#ADBDCC]">{v.type}</td>
                <td className="px-3 py-1.5 break-all text-[#0E6245] dark:text-[#3ECF8E]">
                  {v.isPointer ? (
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${
                        v.pointerAddress === 'NIL'
                          ? 'bg-[#F6F9FC] text-[#697386] dark:bg-white/10 dark:text-[#7C93AB]'
                          : 'bg-[#635BFF]/10 text-[#635BFF] dark:bg-[#80E9FF]/15 dark:text-[#80E9FF]'
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
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-xs text-[#697386] dark:text-[#7C93AB]">
        <p className="max-w-xs leading-relaxed">{t.noDebugSession}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col divide-y divide-[#E3E8EE] overflow-auto dark:divide-white/10">
      {snapshot && (
        <div className="flex items-center justify-between border-l-2 border-[#635BFF] bg-[#F6F9FC] px-3 py-2 text-xs text-[#0A2540] dark:border-[#80E9FF] dark:bg-[#06182C] dark:text-white">
          <span className="font-mono tabular-nums">
            {t.pausedAtLine(snapshot.line, snapshot.nodeType, snapshot.stepCount)}
          </span>
        </div>
      )}

      {vmState && (
        <div className="p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#697386] dark:text-[#7C93AB]">
            {t.vmStackTitle}
          </div>
          <div className="mb-2 flex flex-wrap gap-3 font-mono text-xs tabular-nums">
            <span className="text-[#425466] dark:text-[#ADBDCC]">
              {t.vmIP}: <strong className="text-[#635BFF] dark:text-[#80E9FF]">{String(vmState.ip).padStart(4, '0')}</strong>
            </span>
            <span className="text-[#425466] dark:text-[#ADBDCC]">
              {t.vmOpcode}: <strong className="text-[#0A2540] dark:text-white">{vmState.opcode}</strong>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 rounded border border-[#E3E8EE] bg-[#F6F9FC] p-2 font-mono text-xs dark:border-white/10 dark:bg-[#06182C]">
            {vmState.stack.length === 0 ? (
              <span className="text-[11px] text-[#697386]">[ empty stack ]</span>
            ) : (
              vmState.stack.map((item, idx) => (
                <div
                  key={`${idx}-${item}`}
                  className={`rounded border px-2 py-0.5 tabular-nums ${
                    idx === vmState.stack.length - 1
                      ? 'border-[#635BFF] bg-[#635BFF]/10 font-semibold text-[#635BFF] dark:border-[#80E9FF] dark:text-[#80E9FF]'
                      : 'border-[#E3E8EE] bg-white text-[#0A2540] dark:border-white/10 dark:bg-[#0A2540] dark:text-white'
                  }`}
                >
                  <span className="mr-1 text-[10px] opacity-55">[{idx}]</span>
                  {item}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {frames.length > 0 && (
        <div>
          <div className="bg-[#F6F9FC] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#697386] dark:bg-[#06182C] dark:text-[#7C93AB]">
            {t.callStack}
          </div>
          <div className="divide-y divide-[#E3E8EE] dark:divide-white/10">
            {frames.map((frame) => (
              <button
                key={frame.index}
                type="button"
                onClick={() => {
                  setSelectedFrameIdx(frame.index)
                  onJumpToLine(frame.line)
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left font-mono text-xs tabular-nums transition ${
                  selectedFrameIdx === frame.index
                    ? 'bg-[#635BFF]/10 font-semibold text-[#635BFF] dark:bg-[#635BFF]/20 dark:text-[#80E9FF]'
                    : 'text-[#0A2540] hover:bg-[#F6F9FC] dark:text-[#ADBDCC] dark:hover:bg-white/5'
                }`}
              >
                <span>
                  #{frame.index} {frame.name}
                </span>
                <span className="text-[11px] opacity-65">:{frame.line}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeFrame && (
        <div>
          <div className="bg-[#F6F9FC] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#697386] dark:bg-[#06182C] dark:text-[#7C93AB]">
            {t.localVariables} ({activeFrame.name})
          </div>
          <VariablesTable t={t} variables={activeFrame.variables} changedVars={changedVars} />
        </div>
      )}

      {(!activeFrame || frames.length > 1) && (
        <div>
          <div className="bg-[#F6F9FC] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#697386] dark:bg-[#06182C] dark:text-[#7C93AB]">
            {t.globalVariables}
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
