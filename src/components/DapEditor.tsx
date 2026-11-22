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
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete'
import { tags } from '@lezer/highlight'
import { dapLanguage } from './dapLanguage'
import { dapCompletionSource } from './dapAutocomplete'
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
  { tag: tags.keyword, color: '#a9a4ff', fontWeight: '600' },
  { tag: tags.modifier, color: '#80e9ff', fontWeight: '500' },
  { tag: tags.typeName, color: '#80e9ff', fontWeight: '500' },
  { tag: tags.standard(tags.name), color: '#3ecf8e' },
  { tag: tags.atom, color: '#ffcb6b', fontWeight: '600' },
  { tag: tags.string, color: '#8ce99a' },
  { tag: tags.number, color: '#ffcb6b' },
  { tag: tags.comment, color: '#6c849c', fontStyle: 'italic' },
  { tag: tags.operator, color: '#ff80b5' },
  { tag: tags.variableName, color: '#f6f9fc' },
  { tag: tags.punctuation, color: '#adbdcc' },
])

const lightHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#635bff', fontWeight: '600' },
  { tag: tags.modifier, color: '#0073e6', fontWeight: '500' },
  { tag: tags.typeName, color: '#0073e6', fontWeight: '500' },
  { tag: tags.standard(tags.name), color: '#0e6245' },
  { tag: tags.atom, color: '#b45309', fontWeight: '600' },
  { tag: tags.string, color: '#0e6245' },
  { tag: tags.number, color: '#9c36b5' },
  { tag: tags.comment, color: '#8792a2', fontStyle: 'italic' },
  { tag: tags.operator, color: '#c21437' },
  { tag: tags.variableName, color: '#0a2540' },
  { tag: tags.punctuation, color: '#697386' },
])

const darkThemeExt = EditorView.theme(
  {
    '&': {
      backgroundColor: '#06182c',
      color: '#f6f9fc',
    },
    '.cm-content': {
      caretColor: '#80e9ff',
      padding: '10px 0',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#80e9ff',
      borderLeftWidth: '2px',
    },
    '.cm-gutters': {
      backgroundColor: '#0a2540',
      color: '#6c849c',
      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#0d2b4a',
      color: '#ffffff',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(128, 233, 255, 0.2)',
    },
    '.cm-tooltip.cm-tooltip-autocomplete': {
      backgroundColor: '#0a2540',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '6px',
      boxShadow: '0 12px 24px -4px rgba(0, 0, 0, 0.45)',
      overflow: 'hidden',
    },
    '.cm-tooltip-autocomplete > ul > li': {
      padding: '4px 10px',
      color: '#f6f9fc',
    },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: '#635bff',
      color: '#ffffff',
    },
    '.cm-completionDetail': {
      color: '#adbdcc',
      fontStyle: 'normal',
      marginLeft: '8px',
      fontSize: '11px',
    },
    '.cm-tooltip.cm-completionInfo': {
      backgroundColor: '#0d2b4a',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '6px',
      color: '#adbdcc',
      fontSize: '12px',
      padding: '6px 10px',
    },
  },
  { dark: true },
)

const lightThemeExt = EditorView.theme({
  '&': {
    backgroundColor: '#ffffff',
    color: '#0a2540',
  },
  '.cm-content': {
    caretColor: '#635bff',
    padding: '10px 0',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#635bff',
    borderLeftWidth: '2px',
  },
  '.cm-gutters': {
    backgroundColor: '#f6f9fc',
    color: '#8792a2',
    borderRight: '1px solid #e3e8ee',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(246, 249, 252, 0.85)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#edf2f7',
    color: '#0a2540',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(99, 91, 255, 0.16)',
  },
  '.cm-tooltip.cm-tooltip-autocomplete': {
    backgroundColor: '#ffffff',
    border: '1px solid #e3e8ee',
    borderRadius: '6px',
    boxShadow: '0 6px 12px -2px rgba(50, 50, 93, 0.14), 0 3px 7px -3px rgba(0, 0, 0, 0.12)',
    overflow: 'hidden',
  },
  '.cm-tooltip-autocomplete > ul > li': {
    padding: '4px 10px',
    color: '#0a2540',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: '#635bff',
    color: '#ffffff',
  },
  '.cm-completionDetail': {
    color: '#697386',
    fontStyle: 'normal',
    marginLeft: '8px',
    fontSize: '11px',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected] .cm-completionDetail': {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  '.cm-tooltip.cm-completionInfo': {
    backgroundColor: '#f6f9fc',
    border: '1px solid #e3e8ee',
    borderRadius: '6px',
    color: '#425466',
    fontSize: '12px',
    padding: '6px 10px',
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
        closeBrackets(),
        dapLanguage,
        autocompletion({
          override: [dapCompletionSource],
          activateOnTyping: true,
          maxRenderedOptions: 14,
          icons: true,
        }),
        keymap.of([
          ...completionKeymap,
          ...closeBracketsKeymap,
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
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
