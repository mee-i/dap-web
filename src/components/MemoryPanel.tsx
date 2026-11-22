import { ArrowRight } from 'lucide-react'
import type { TranslationDict } from '../i18n'
import type { HeapCellDTO, VariableDTO } from '../worker/types'

interface MemoryPanelProps {
  t: TranslationDict
  heap: HeapCellDTO[]
  variables: VariableDTO[]
}

export function MemoryPanel({ t, heap, variables }: MemoryPanelProps) {
  const refsByAddr = new Map<string, string[]>()
  for (const v of variables) {
    if (v.isPointer && v.pointerAddress && v.pointerAddress !== 'NIL') {
      const list = refsByAddr.get(v.pointerAddress) ?? []
      list.push(v.name)
      refsByAddr.set(v.pointerAddress, list)
    } else if (v.type === 'struct' || v.value.includes('0x')) {
      const matches = v.value.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(0x[0-9a-fA-F]+)/g)
      for (const m of matches) {
        const fieldName = m[1]
        const addr = m[2].toLowerCase()
        const list = refsByAddr.get(addr) ?? []
        list.push(`${v.name}.${fieldName}`)
        refsByAddr.set(addr, list)
      }
    }
  }

  const activeCount = heap.filter((c) => !c.freed).length
  const freedCount = heap.length - activeCount

  if (heap.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-xs text-[#697386] dark:text-[#7C93AB]">
        <p className="max-w-sm leading-relaxed">{t.heapEmpty}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#E3E8EE] bg-[#F6F9FC] px-3 py-1.5 text-xs dark:border-white/10 dark:bg-[#06182C]">
        <span className="font-medium text-[#0A2540] dark:text-white">{t.heapTitle}</span>
        <span className="font-mono text-[11px] tabular-nums text-[#697386] dark:text-[#7C93AB]">
          {t.heapSummary(heap.length, activeCount, freedCount)}
        </span>
      </div>

      <div className="flex-1 overflow-auto bg-[#F6F9FC] p-3 dark:bg-[#06182C]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {heap.map((cell) => {
            const pointingVars = refsByAddr.get(cell.address.toLowerCase()) ?? []
            return (
              <div
                key={cell.address}
                className={`rounded-md border p-3 transition ${
                  cell.freed
                    ? 'border-dashed border-[#DF1B41]/50 bg-white/60 opacity-70 dark:bg-[#0A2540]/40'
                    : 'border-[#E3E8EE] bg-white shadow-xs dark:border-white/15 dark:bg-[#0A2540]'
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold tabular-nums text-[#635BFF] dark:text-[#80E9FF]">
                      {cell.address}
                    </span>
                    <span className="font-mono text-[11px] text-[#697386] dark:text-[#7C93AB]">
                      {cell.type}
                    </span>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide ${
                      cell.freed
                        ? 'bg-[#DF1B41]/10 text-[#DF1B41]'
                        : 'bg-[#0E9F6E]/10 text-[#0E6245] dark:text-[#3ECF8E]'
                    }`}
                  >
                    {cell.freed ? t.heapFreed : t.heapAllocated}
                  </span>
                </div>

                {pointingVars.length > 0 && (
                  <div className="mb-2 flex flex-wrap items-center gap-1">
                    {pointingVars.map((refName) => (
                      <span
                        key={refName}
                        className="rounded border border-[#635BFF]/25 bg-[#635BFF]/8 px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#635BFF] dark:border-[#80E9FF]/30 dark:bg-[#80E9FF]/10 dark:text-[#80E9FF]"
                      >
                        {refName}
                      </span>
                    ))}
                  </div>
                )}

                {cell.fields && cell.fields.length > 0 ? (
                  <div className="divide-y divide-[#E3E8EE] rounded border border-[#E3E8EE] bg-[#F6F9FC] font-mono text-xs tabular-nums dark:divide-white/10 dark:border-white/10 dark:bg-[#06182C]">
                    {cell.fields.map((field) => (
                      <div key={field.name} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                        <span className="text-[#425466] dark:text-[#ADBDCC]">{field.name}</span>
                        {field.isPointer ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                              field.target === 'NIL'
                                ? 'text-[#697386] dark:text-[#7C93AB]'
                                : 'text-[#635BFF] dark:text-[#80E9FF]'
                            }`}
                          >
                            <ArrowRight className="h-3 w-3" />
                            {field.target || field.value}
                          </span>
                        ) : (
                          <span className="font-semibold text-[#0A2540] dark:text-white">
                            {field.value}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded border border-[#E3E8EE] bg-[#F6F9FC] px-2.5 py-1.5 font-mono text-xs text-[#0A2540] dark:border-white/10 dark:bg-[#06182C] dark:text-white">
                    {cell.display}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
