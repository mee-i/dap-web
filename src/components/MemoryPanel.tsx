import { Boxes, ArrowRight, Link2 } from 'lucide-react'
import type { TranslationDict } from '../i18n'
import type { HeapCellDTO, VariableDTO } from '../worker/types'

interface MemoryPanelProps {
  t: TranslationDict
  heap: HeapCellDTO[]
  variables: VariableDTO[]
}

export function MemoryPanel({ t, heap, variables }: MemoryPanelProps) {
  // Build reverse index: heap address -> list of variable names pointing to it
  const refsByAddr = new Map<string, string[]>()
  for (const v of variables) {
    if (v.isPointer && v.pointerAddress && v.pointerAddress !== 'NIL') {
      const list = refsByAddr.get(v.pointerAddress) ?? []
      list.push(v.name)
      refsByAddr.set(v.pointerAddress, list)
    } else if (v.type === 'struct' || v.value.includes('0x')) {
      // Also detect struct fields pointing to heap cells, e.g. <first: 0x1000, last: 0x1010>
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
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <Boxes className="mb-2 h-8 w-8 opacity-40" />
        <p className="max-w-sm leading-relaxed">{t.heapEmpty}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900/70">
        <span className="font-semibold text-slate-700 dark:text-slate-200">{t.heapTitle}</span>
        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
          {t.heapSummary(heap.length, activeCount, freedCount)}
        </span>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {heap.map((cell) => {
            const pointingVars = refsByAddr.get(cell.address.toLowerCase()) ?? []
            return (
              <div
                key={cell.address}
                className={`rounded-lg border p-3 transition ${
                  cell.freed
                    ? 'border-dashed border-rose-400/60 bg-rose-500/5 opacity-70 dark:border-rose-500/40'
                    : 'border-slate-200 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900'
                }`}
              >
                {/* Card Header: Address + Status Badge */}
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-cyan-500/15 px-2 py-0.5 font-mono text-xs font-bold text-cyan-700 dark:text-cyan-300">
                      {cell.address}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {cell.type}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                      cell.freed
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {cell.freed ? t.heapFreed : t.heapAllocated}
                  </span>
                </div>

                {/* Incoming references from variables */}
                {pointingVars.length > 0 && (
                  <div className="mb-2 flex flex-wrap items-center gap-1">
                    <Link2 className="h-3 w-3 text-indigo-500" />
                    {pointingVars.map((refName) => (
                      <span
                        key={refName}
                        className="rounded bg-indigo-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-indigo-700 dark:text-indigo-300"
                      >
                        {refName}
                      </span>
                    ))}
                  </div>
                )}

                {/* Fields or raw value */}
                {cell.fields && cell.fields.length > 0 ? (
                  <div className="divide-y divide-slate-100 rounded border border-slate-200 bg-slate-50 font-mono text-xs dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">
                    {cell.fields.map((field) => (
                      <div key={field.name} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                        <span className="text-slate-500 dark:text-slate-400">{field.name}</span>
                        {field.isPointer ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                              field.target === 'NIL'
                                ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            <ArrowRight className="h-3 w-3" />
                            {field.target || field.value}
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                            {field.value}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
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
