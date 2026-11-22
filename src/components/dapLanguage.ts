import { StreamLanguage, type StringStream } from '@codemirror/language'

const controlKeywords = new Set([
  'program',
  'endprogram',
  'dictionary',
  'kamus',
  'algorithm',
  'algoritma',
  'if',
  'then',
  'elif',
  'else',
  'endif',
  'while',
  'do',
  'endwhile',
  'for',
  'to',
  'downto',
  'step',
  'endfor',
  'foreach',
  'repeat',
  'until',
  'depend',
  'on',
  'enddependon',
  'function',
  'endfunction',
  'procedure',
  'prosedur',
  'endprocedure',
  'endprosedur',
  'return',
  'break',
  'continue',
  'end',
])

const declKeywords = new Set([
  'var',
  'const',
  'constant',
  'type',
  'array',
  'of',
  'pointer',
  'in',
  'out',
  'inout',
  'new',
  'and',
  'or',
  'not',
  'div',
  'mod',
])

const typeKeywords = new Set(['integer', 'real', 'string', 'boolean', 'char'])

const builtinFunctions = new Set([
  'print',
  'write',
  'output',
  'tulis',
  'read',
  'input',
  'masukan',
  'inputbaris',
  'input_baris',
  'allocate',
  'alokasi',
  'deallocate',
  'dealokasi',
  'panjang',
  'length',
  'len',
  'bulat',
  'round',
  'isnumber',
  'is_number',
  'isstring',
  'is_string',
  'append',
  'konversikestring',
  'konversi_ke_string',
  'outputret',
  'output_ret',
  'printret',
  'print_ret',
])

const atoms = new Set(['true', 'false', 'nil', 'null'])

interface DapState {
  inComment: boolean
}

export const dapLanguage = StreamLanguage.define<DapState>({
  name: 'dap',
  startState: () => ({ inComment: false }),
  token(stream: StringStream, state: DapState): string | null {
    if (state.inComment) {
      while (!stream.eol()) {
        if (stream.match('}}')) {
          state.inComment = false
          return 'comment'
        }
        stream.next()
      }
      return 'comment'
    }

    if (stream.eatSpace()) return null

    // Block comment {{ ... }}
    if (stream.match('{{')) {
      state.inComment = true
      while (!stream.eol()) {
        if (stream.match('}}')) {
          state.inComment = false
          break
        }
        stream.next()
      }
      return 'comment'
    }

    // Single-line comment // or #
    if (stream.match('//') || stream.peek() === '#') {
      stream.skipToEnd()
      return 'comment'
    }

    // String literals
    const ch = stream.peek()
    if (ch === '"' || ch === "'") {
      const quote = stream.next()
      let escaped = false
      while (!stream.eol()) {
        const c = stream.next()
        if (escaped) {
          escaped = false
        } else if (c === '\\') {
          escaped = true
        } else if (c === quote) {
          break
        }
      }
      return 'string'
    }

    // Numbers
    if (stream.match(/^\d+(\.\d+)?/)) {
      return 'number'
    }

    // Multi-char operators
    if (stream.match(/^(<-|->|<=|>=|==|!=|\.\.|\*\*|<<|>>|\+=|-=|\*=|\/=|%=)/)) {
      return 'operator'
    }

    // Identifiers & keywords
    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
      const word = stream.current().toLowerCase()
      if (controlKeywords.has(word)) return 'keyword'
      if (declKeywords.has(word)) return 'modifier'
      if (typeKeywords.has(word)) return 'typeName'
      if (builtinFunctions.has(word)) return 'standard'
      if (atoms.has(word)) return 'atom'
      return 'variableName'
    }

    // Single-char operators & punctuation
    if (stream.match(/^[+\-*/%^&=<>!~|]/)) {
      return 'operator'
    }
    if (stream.match(/^[()[\]{},.:?]/)) {
      return 'punctuation'
    }

    stream.next()
    return null
  },
})
