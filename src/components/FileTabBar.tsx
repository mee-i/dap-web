import { useEffect, useRef, useState } from 'react'
import { Plus, X, Pencil, Check } from 'lucide-react'
import type { TranslationDict } from '../i18n'

export interface WorkspaceFile {
  id: string
  name: string
  code: string
  stdin: string
  breakpoints: number[]
  exampleId?: string | null
}

interface FileTabBarProps {
  t: TranslationDict
  files: WorkspaceFile[]
  activeFileId: string
  onSelectTab: (id: string) => void
  onAddTab: () => void
  onCloseTab: (id: string) => void
  onRenameTab: (id: string, newName: string) => void
}

export function FileTabBar({
  t,
  files,
  activeFileId,
  onSelectTab,
  onAddTab,
  onCloseTab,
  onRenameTab,
}: FileTabBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      const dotIdx = draftName.lastIndexOf('.')
      if (dotIdx > 0) {
        inputRef.current.setSelectionRange(0, dotIdx)
      } else {
        inputRef.current.select()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId])

  const startRename = (file: WorkspaceFile) => {
    setEditingId(file.id)
    setDraftName(file.name)
  }

  const commitRename = () => {
    if (!editingId) return
    const cleaned = draftName.trim()
    if (cleaned.length > 0) {
      const finalName = cleaned.includes('.') ? cleaned : `${cleaned}.dap`
      onRenameTab(editingId, finalName)
    }
    setEditingId(null)
  }

  const cancelRename = () => {
    setEditingId(null)
  }

  return (
    <div className="flex items-stretch overflow-x-auto border-b border-[#E3E8EE] bg-[#F6F9FC] dark:border-white/10 dark:bg-[#06182C]">
      {files.map((file) => {
        const isActive = file.id === activeFileId
        const isEditing = editingId === file.id

        return (
          <div
            key={file.id}
            onClick={() => {
              if (!isActive) onSelectTab(file.id)
            }}
            onDoubleClick={() => startRename(file)}
            title={t.renameHint}
            className={`group relative flex max-w-[220px] shrink-0 cursor-pointer items-center gap-1.5 border-r border-[#E3E8EE] px-3 py-2 text-xs transition dark:border-white/10 ${
              isActive
                ? 'bg-white font-medium text-[#0A2540] dark:bg-[#0A2540] dark:text-white'
                : 'bg-transparent text-[#697386] hover:bg-white/60 hover:text-[#0A2540] dark:text-[#7C93AB] dark:hover:bg-white/5 dark:hover:text-white'
            }`}
          >
            {isActive && (
              <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[#635BFF]" />
            )}

            {isEditing ? (
              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitRename()
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      cancelRename()
                    }
                  }}
                  className="w-28 rounded border border-[#635BFF] bg-white px-1.5 py-0.5 font-mono text-xs text-[#0A2540] outline-none dark:bg-[#06182C] dark:text-white"
                />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    commitRename()
                  }}
                  className="rounded p-0.5 text-[#0E9F6E] hover:bg-[#0E9F6E]/10"
                  title="OK"
                >
                  <Check className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <>
                <span className="truncate font-mono text-[12px]">{file.name}</span>

                {file.breakpoints.length > 0 && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#DF1B41]"
                    title={t.breakpointsCount(file.breakpoints.length)}
                  />
                )}

                {isActive && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      startRename(file)
                    }}
                    title={t.renameFile}
                    className="rounded p-0.5 text-[#697386] transition hover:bg-[#F6F9FC] hover:text-[#635BFF] dark:text-[#7C93AB] dark:hover:bg-white/10 dark:hover:text-[#80E9FF]"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCloseTab(file.id)
                  }}
                  title={t.closeTab}
                  className={`rounded p-0.5 text-[#697386] transition hover:bg-[#DF1B41]/10 hover:text-[#DF1B41] dark:text-[#7C93AB] ${
                    isActive ? 'opacity-70 hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        )
      })}

      {/* Add new file tab */}
      <button
        type="button"
        onClick={onAddTab}
        title={t.newTab}
        aria-label={t.newTab}
        className="inline-flex w-9 shrink-0 items-center justify-center text-[#697386] transition hover:bg-white hover:text-[#0A2540] dark:text-[#7C93AB] dark:hover:bg-white/5 dark:hover:text-white"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
