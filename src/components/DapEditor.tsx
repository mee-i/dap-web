import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { EditorState, RangeSet, StateEffect, StateField, Compartment } from '@codemirror/state'
import {
  EditorView,
  Decoration,
  type DecorationSet,
  gutter,
  GutterMarker,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  placeholder as cmPlaceholder,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, HighlightStyle, indentOnInput, bracketMatching } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { dapLanguage } from './dapLanguage'
import type { DiagnosticDTO } from '../worker/types'

export interface DapEditorHandle {
  jumpTo: (line: number, col?: number) => void
}

interface DapEditorProps {
  value: string
  onChange: (value: string) => void
  breakpoints: number[]
  onToggleBreakpoint: (line: number) => void
  activeLine: number | null
  diagnostics: DiagnosticDTO[]
  theme: 'dark' | 'light'
  placeholderText?: string
  onCursorChange?: (line: number, col: number) => void
}

const setBreakpointsEffect = StateEffect.define<number[]>()
const setActiveLineEffect = StateEffect.define<number | null>()
const setErrorLinesEffect = StateEffect.define<number[]>()

class BreakpointMarker extends GutterMarker {
  toDOM() {
    const dot = document.createElement('span')
    dot.className = 'cm-breakpoint-dot'
    return dot
  }
}

const bpMarker = new BreakpointMarker()

const breakpointField = StateField.define<RangeSet<GutterMarker>>({
  create() {
    return RangeSet.empty
  },
  update(set, tr) {
    set = set.map(tr.changes)
    for (const e of tr.effects) {
      if (e.is(setBreakpointsEffect)) {
        const ranges = []
        const sorted = [...new Set(e.value)].sort((a, b) => a - b)
        for (const ln of sorted) {
          if (ln >= 1 && ln <= tr.state.doc.lines) {
            const lineInfo = tr.state.doc.line(ln)
            ranges.push(bpMarker.range(lineInfo.from))
          }
        }
        return RangeSet.of(ranges, true)
      }
    }
    return set
  },
})

const activeLineDeco = Decoration.line({ attributes: { class: 'cm-active-debug-line' } })
const errorLineDeco = Decoration.line({ attributes: { class: 'cm-error-line' } })

const activeLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decos, tr) {
    decos = decos.map(tr.changes)
    for (const e of tr.effects) {
      if (e.is(setActiveLineEffect)) {
        if (e.value !== null && e.value >= 1 && e.value <= tr.state.doc.lines) {
          const lineInfo = tr.state.doc.line(e.value)
          return Decoration.set([activeLineDeco.range(lineInfo.from)])
        }
        return Decoration.none
      }
    }
    return decos
  },
  provide: (f) => EditorView.decorations.from(f),
})

const errorLinesField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decos, tr) {
    decos = decos.map(tr.changes)
    for (const e of tr.effects) {
      if (e.is(setErrorLinesEffect)) {
        const ranges = []
        const sorted = [...new Set(e.value)].sort((a, b) => a - b)
        for (const ln of sorted) {
          if (ln >= 1 && ln <= tr.state.doc.lines) {
            const lineInfo = tr.state.doc.line(ln)
            ranges.push(errorLineDeco.range(lineInfo.from))
          }
        }
        return Decoration.set(ranges, true)
      }
    }
    return decos
  },
  provide: (f) => EditorView.decorations.from(f),
})

const darkHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#c084fc', fontWeight: '600' },
  { tag: tags.modifier, color: '#818cf8', fontWeight: '500' },
  { tag: tags.typeName, color: '#38bdf8', fontWeight: '500' },
  { tag: tags.standard(tags.name), color: '#34d399' },
  { tag: tags.atom, color: '#fb923c', fontWeight: '600' },
  { tag: tags.string, color: '#a3e635' },
  { tag: tags.number, color: '#fbbf24' },
  { tag: tags.comment, color: '#64748b', fontStyle: 'italic' },
  { tag: tags.operator, color: '#f472b6' },
  { tag: tags.variableName, color: '#e2e8f0' },
  { tag: tags.punctuation, color: '#94a3b8' },
])

const lightHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#7c3aed', fontWeight: '600' },
  { tag: tags.modifier, color: '#4f46e5', fontWeight: '500' },
  { tag: tags.typeName, color: '#0284c7', fontWeight: '500' },
  { tag: tags.standard(tags.name), color: '#059669' },
  { tag: tags.atom, color: '#ea580c', fontWeight: '600' },
  { tag: tags.string, color: '#15803d' },
  { tag: tags.number, color: '#b45309' },
  { tag: tags.comment, color: '#64748b', fontStyle: 'italic' },
  { tag: tags.operator, color: '#db2777' },
  { tag: tags.variableName, color: '#0f172a' },
  { tag: tags.punctuation, color: '#475569' },
])

const darkThemeExt = EditorView.theme(
  {
    '&': {
      backgroundColor: '#0b1120',
      color: '#e2e8f0',
    },
    '.cm-content': {
      caretColor: '#38bdf8',
      padding: '10px 0',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#38bdf8',
      borderLeftWidth: '2px',
    },
    '.cm-gutters': {
      backgroundColor: '#0f172a',
      color: '#64748b',
      borderRight: '1px solid #1e293b',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(30, 41, 59, 0.55)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#1e293b',
      color: '#e2e8f0',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(56, 189, 248, 0.25)',
    },
  },
  { dark: true },
)

const lightThemeExt = EditorView.theme({
  '&': {
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  '.cm-content': {
    caretColor: '#2563eb',
    padding: '10px 0',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#2563eb',
    borderLeftWidth: '2px',
  },
  '.cm-gutters': {
    backgroundColor: '#f8fafc',
    color: '#94a3b8',
    borderRight: '1px solid #e2e8f0',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(226, 232, 240, 0.45)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#e2e8f0',
    color: '#0f172a',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
})

export const DapEditor = forwardRef<DapEditorHandle, DapEditorProps>(function DapEditor(
  {
    value,
    onChange,
    breakpoints,
    onToggleBreakpoint,
    activeLine,
    diagnostics,
    theme,
    placeholderText = '',
    onCursorChange,
  },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const themeCompartmentRef = useRef(new Compartment())
  const highlightCompartmentRef = useRef(new Compartment())
  const placeholderCompartmentRef = useRef(new Compartment())
  const onChangeRef = useRef(onChange)
  const onToggleBpRef = useRef(onToggleBreakpoint)
  const onCursorRef = useRef(onCursorChange)

  onChangeRef.current = onChange
  onToggleBpRef.current = onToggleBreakpoint
  onCursorRef.current = onCursorChange

  useImperativeHandle(ref, () => ({
    jumpTo(line: number, col = 1) {
      const view = viewRef.current
      if (!view) return
      const safeLine = Math.max(1, Math.min(line, view.state.doc.lines))
      const lineInfo = view.state.doc.line(safeLine)
      const pos = Math.min(lineInfo.from + Math.max(0, col - 1), lineInfo.to)
      view.dispatch({
        selection: { anchor: pos },
        scrollIntoView: true,
      })
      view.focus()
    },
  }))

  useEffect(() => {
    if (!hostRef.current) return

    const bpGutter = gutter({
      class: 'cm-breakpoint-gutter',
      markers: (v) => v.state.field(breakpointField),
      initialSpacer: () => bpMarker,
      domEventHandlers: {
        mousedown(view, line) {
          const lineNum = view.state.doc.lineAt(line.from).number
          onToggleBpRef.current(lineNum)
          return true
        },
      },
    })

    const lineNumGutter = lineNumbers({
      domEventHandlers: {
        mousedown(view, line) {
          const lineNum = view.state.doc.lineAt(line.from).number
          onToggleBpRef.current(lineNum)
          return true
        },
      },
    })

    const state = EditorState.create({
      doc: value,
      extensions: [
        breakpointField,
        activeLineField,
        errorLinesField,
        bpGutter,
        lineNumGutter,
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        indentOnInput(),
        bracketMatching(),
        dapLanguage,
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
        themeCompartmentRef.current.of(theme === 'dark' ? darkThemeExt : lightThemeExt),
        highlightCompartmentRef.current.of(
          syntaxHighlighting(theme === 'dark' ? darkHighlight : lightHighlight),
        ),
        placeholderCompartmentRef.current.of(cmPlaceholder(placeholderText)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString())
          }
          if (update.selectionSet || update.docChanged) {
            const head = update.state.selection.main.head
            const lineInfo = update.state.doc.lineAt(head)
            onCursorRef.current?.(lineInfo.number, head - lineInfo.from + 1)
          }
        }),
      ],
    })

    const view = new EditorView({ state, parent: hostRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external code changes (e.g. loading example or file import)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
    }
  }, [value])

  // Sync theme
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: [
        themeCompartmentRef.current.reconfigure(theme === 'dark' ? darkThemeExt : lightThemeExt),
        highlightCompartmentRef.current.reconfigure(
          syntaxHighlighting(theme === 'dark' ? darkHighlight : lightHighlight),
        ),
      ],
    })
  }, [theme])

  // Sync placeholder text (e.g. when language switches)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: placeholderCompartmentRef.current.reconfigure(cmPlaceholder(placeholderText)),
    })
  }, [placeholderText])

  // Sync breakpoints
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: setBreakpointsEffect.of(breakpoints) })
  }, [breakpoints])

  // Sync active debug line + auto-scroll
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const effects: StateEffect<unknown>[] = [setActiveLineEffect.of(activeLine)]
    if (activeLine !== null && activeLine >= 1 && activeLine <= view.state.doc.lines) {
      const lineInfo = view.state.doc.line(activeLine)
      view.dispatch({
        effects,
        scrollIntoView: true,
        selection: { anchor: lineInfo.from },
      })
    } else {
      view.dispatch({ effects })
    }
  }, [activeLine])

  // Sync diagnostic error lines
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const errLines = diagnostics.map((d) => d.line).filter((ln) => ln > 0)
    view.dispatch({ effects: setErrorLinesEffect.of(errLines) })
  }, [diagnostics])

  return <div ref={hostRef} className="h-full w-full overflow-hidden" />
})
