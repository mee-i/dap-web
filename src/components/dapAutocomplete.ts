import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  snippetCompletion,
} from '@codemirror/autocomplete'

const SNIPPETS: Completion[] = [
  snippetCompletion(
    `program \${NamaProgram}\ndictionary\n    \${x} : \${integer}\nalgorithm\n    \${}\nendprogram`,
    {
      label: 'program',
      detail: 'template program DAP',
      info: 'Struktur lengkap program ... dictionary ... algorithm ... endprogram',
      type: 'keyword',
      boost: 99,
    },
  ),
  snippetCompletion(`if \${kondisi} then\n    \${}\nendif`, {
    label: 'if',
    detail: 'if ... then ... endif',
    info: 'Percabangan kondisional if-then-endif',
    type: 'keyword',
    boost: 95,
  }),
  snippetCompletion(`if \${kondisi} then\n    \${}\nelse\n    \${}\nendif`, {
    label: 'ifelse',
    detail: 'if ... then ... else ... endif',
    info: 'Percabangan if-else lengkap',
    type: 'keyword',
    boost: 94,
  }),
  snippetCompletion(`for \${i} = \${1} to \${10} do\n    \${}\nendfor`, {
    label: 'for',
    detail: 'for i = 1 to N do ... endfor',
    info: 'Perulangan menaik (to)',
    type: 'keyword',
    boost: 95,
  }),
  snippetCompletion(`for \${i} = \${10} downto \${1} do\n    \${}\nendfor`, {
    label: 'fordownto',
    detail: 'for i = N downto 1 do ... endfor',
    info: 'Perulangan menurun (downto)',
    type: 'keyword',
    boost: 90,
  }),
  snippetCompletion(`while \${kondisi} do\n    \${}\nendwhile`, {
    label: 'while',
    detail: 'while ... do ... endwhile',
    info: 'Perulangan selama kondisi bernilai true',
    type: 'keyword',
    boost: 95,
  }),
  snippetCompletion(`repeat\n    \${}\nuntil \${kondisi}`, {
    label: 'repeat',
    detail: 'repeat ... until ...',
    info: 'Perulangan minimal 1x hingga kondisi true',
    type: 'keyword',
    boost: 92,
  }),
  snippetCompletion(`depend on (\${x})\n    \${1} : \${}\n    default : \${}\nenddependon`, {
    label: 'depend',
    detail: 'depend on (x) ... enddependon',
    info: 'Seleksi kasus berdasarkan nilai variabel',
    type: 'keyword',
    boost: 88,
  }),
  snippetCompletion(`depend on\n    \${kondisi} : \${}\n    default : \${}\nenddependon`, {
    label: 'dependon',
    detail: 'depend on (kondisi) ... enddependon',
    info: 'Seleksi kasus berdasarkan ekspresi/kondisi',
    type: 'keyword',
    boost: 87,
  }),
  snippetCompletion(
    `procedure \${namaProsedur}(in \${x} : \${integer})\n    \${}\nendprocedure`,
    {
      label: 'procedure',
      detail: 'procedure nama(...) ... endprocedure',
      info: 'Deklarasi prosedur dengan modifier in / out / inout',
      type: 'keyword',
      boost: 93,
    },
  ),
  snippetCompletion(
    `function \${namaFungsi}(\${x} : \${integer}) -> \${integer}\n    return \${}\nendfunction`,
    {
      label: 'function',
      detail: 'function nama(...) -> tipe ... endfunction',
      info: 'Deklarasi fungsi yang mengembalikan nilai',
      type: 'keyword',
      boost: 93,
    },
  ),
  snippetCompletion(`type \${ElmList} : <\n    \${info} : \${integer},\n    \${next} : pointer to \${ElmList}\n>`, {
    label: 'struct',
    detail: 'type Nama : < field : tipe >',
    info: 'Deklarasi tipe bentukan (record / struct)',
    type: 'type',
    boost: 90,
  }),
  snippetCompletion(`array [\${1}..\${10}] of \${integer}`, {
    label: 'array',
    detail: 'array [1..N] of tipe',
    info: 'Tipe array dengan indeks awal..akhir',
    type: 'type',
    boost: 88,
  }),
  snippetCompletion(`pointer to \${ElmList}`, {
    label: 'pointer',
    detail: 'pointer to Tipe',
    info: 'Deklarasi tipe pointer',
    type: 'type',
    boost: 88,
  }),
]

const KEYWORDS: Completion[] = [
  { label: 'dictionary', detail: 'bagian deklarasi', type: 'keyword' },
  { label: 'kamus', detail: 'alias dictionary', type: 'keyword' },
  { label: 'algorithm', detail: 'bagian algoritma', type: 'keyword' },
  { label: 'algoritma', detail: 'alias algorithm', type: 'keyword' },
  { label: 'endprogram', detail: 'akhir program', type: 'keyword' },
  { label: 'const', detail: 'konstanta', type: 'keyword' },
  { label: 'constant', detail: 'alias const', type: 'keyword' },
  { label: 'type', detail: 'definisi tipe baru', type: 'keyword' },
  { label: 'then', detail: 'blok if', type: 'keyword' },
  { label: 'elif', detail: 'else if', type: 'keyword' },
  { label: 'else', detail: 'cabang alternatif', type: 'keyword' },
  { label: 'endif', detail: 'akhir if', type: 'keyword' },
  { label: 'do', detail: 'awal blok loop', type: 'keyword' },
  { label: 'to', detail: 'batas atas for', type: 'keyword' },
  { label: 'downto', detail: 'batas bawah for', type: 'keyword' },
  { label: 'step', detail: 'kenaikan for', type: 'keyword' },
  { label: 'endfor', detail: 'akhir for', type: 'keyword' },
  { label: 'endwhile', detail: 'akhir while', type: 'keyword' },
  { label: 'until', detail: 'kondisi berhenti repeat', type: 'keyword' },
  { label: 'on', detail: 'depend on', type: 'keyword' },
  { label: 'default', detail: 'cabang default depend on', type: 'keyword' },
  { label: 'enddependon', detail: 'akhir depend on', type: 'keyword' },
  { label: 'endprocedure', detail: 'akhir procedure', type: 'keyword' },
  { label: 'endfunction', detail: 'akhir function', type: 'keyword' },
  { label: 'return', detail: 'kembalikan nilai', type: 'keyword' },
  { label: 'break', detail: 'keluar loop', type: 'keyword' },
  { label: 'continue', detail: 'lanjut iterasi', type: 'keyword' },
  { label: 'in', detail: 'parameter input', type: 'keyword' },
  { label: 'out', detail: 'parameter output', type: 'keyword' },
  { label: 'inout', detail: 'parameter input/output', type: 'keyword' },
  { label: 'of', detail: 'array of tipe', type: 'keyword' },
  { label: 'and', detail: 'logika DAN', type: 'keyword' },
  { label: 'or', detail: 'logika ATAU', type: 'keyword' },
  { label: 'not', detail: 'negasi logika', type: 'keyword' },
  { label: 'div', detail: 'pembagian bulat', type: 'keyword' },
  { label: 'mod', detail: 'sisa bagi', type: 'keyword' },
  { label: 'true', detail: 'boolean benar', type: 'constant' },
  { label: 'false', detail: 'boolean salah', type: 'constant' },
  { label: 'nil', detail: 'pointer kosong', type: 'constant' },
]

const TYPES: Completion[] = [
  { label: 'integer', detail: 'bilangan bulat', type: 'type', boost: 50 },
  { label: 'real', detail: 'bilangan desimal', type: 'type', boost: 50 },
  { label: 'string', detail: 'teks', type: 'type', boost: 50 },
  { label: 'boolean', detail: 'true / false', type: 'type', boost: 50 },
  { label: 'char', detail: 'karakter tunggal', type: 'type', boost: 45 },
]

const BUILTINS: Completion[] = [
  snippetCompletion('print ${expr}', {
    label: 'print',
    detail: 'cetak ke output',
    info: 'Menampilkan nilai ke terminal',
    type: 'function',
    boost: 85,
  }),
  snippetCompletion('output(${expr})', {
    label: 'output',
    detail: 'output(nilai)',
    info: 'Menampilkan nilai ke terminal (gaya akademis)',
    type: 'function',
    boost: 84,
  }),
  snippetCompletion('write ${expr}', {
    label: 'write',
    detail: 'write nilai',
    info: 'Alias print untuk mencetak output',
    type: 'function',
    boost: 80,
  }),
  snippetCompletion('tulis(${expr})', {
    label: 'tulis',
    detail: 'tulis(nilai)',
    info: 'Alias print (Bahasa Indonesia)',
    type: 'function',
    boost: 75,
  }),
  snippetCompletion('read ${var}', {
    label: 'read',
    detail: 'read variabel',
    info: 'Membaca satu token input dari terminal ke variabel',
    type: 'function',
    boost: 84,
  }),
  snippetCompletion('input(${var})', {
    label: 'input',
    detail: 'input(variabel)',
    info: 'Membaca satu token input dari terminal ke variabel',
    type: 'function',
    boost: 83,
  }),
  snippetCompletion('inputBaris(${var})', {
    label: 'inputBaris',
    detail: 'inputBaris(variabel)',
    info: 'Membaca satu baris penuh (termasuk spasi) dari terminal',
    type: 'function',
    boost: 82,
  }),
  snippetCompletion('masukan(${var})', {
    label: 'masukan',
    detail: 'masukan(variabel)',
    info: 'Alias input (Bahasa Indonesia)',
    type: 'function',
    boost: 75,
  }),
  snippetCompletion('allocate(${P})', {
    label: 'allocate',
    detail: 'allocate(P)',
    info: 'Alokasi memori heap baru untuk pointer P',
    type: 'function',
    boost: 82,
  }),
  snippetCompletion('alokasi(${P})', {
    label: 'alokasi',
    detail: 'alokasi(P)',
    info: 'Alias allocate (Bahasa Indonesia)',
    type: 'function',
    boost: 78,
  }),
  snippetCompletion('deallocate(${P})', {
    label: 'deallocate',
    detail: 'deallocate(P)',
    info: 'Dealokasi / bebaskan memori heap yang ditunjuk pointer P',
    type: 'function',
    boost: 82,
  }),
  snippetCompletion('dealokasi(${P})', {
    label: 'dealokasi',
    detail: 'dealokasi(P)',
    info: 'Alias deallocate (Bahasa Indonesia)',
    type: 'function',
    boost: 78,
  }),
  snippetCompletion('panjang(${x})', {
    label: 'panjang',
    detail: 'panjang(str | array)',
    info: 'Mengembalikan panjang string, array, atau list',
    type: 'function',
    boost: 78,
  }),
  snippetCompletion('length(${x})', {
    label: 'length',
    detail: 'length(str | array)',
    info: 'Alias panjang()',
    type: 'function',
    boost: 76,
  }),
  snippetCompletion('bulat(${x})', {
    label: 'bulat',
    detail: 'bulat(real) -> integer',
    info: 'Membulatkan angka real ke integer terdekat',
    type: 'function',
    boost: 75,
  }),
  snippetCompletion('round(${x})', {
    label: 'round',
    detail: 'round(real) -> integer',
    info: 'Alias bulat()',
    type: 'function',
    boost: 74,
  }),
  snippetCompletion('isNumber(${x})', {
    label: 'isNumber',
    detail: 'isNumber(val)',
    info: 'Mengecek apakah nilai bertipe angka (1 / 0)',
    type: 'function',
    boost: 70,
  }),
  snippetCompletion('isString(${x})', {
    label: 'isString',
    detail: 'isString(val)',
    info: 'Mengecek apakah nilai bertipe string (1 / 0)',
    type: 'function',
    boost: 70,
  }),
  snippetCompletion('konversiKeString(${x})', {
    label: 'konversiKeString',
    detail: 'konversiKeString(val)',
    info: 'Mengonversi nilai ke string',
    type: 'function',
    boost: 70,
  }),
  snippetCompletion('append(${list}, ${val})', {
    label: 'append',
    detail: 'append(list, val)',
    info: 'Menambahkan elemen ke list',
    type: 'function',
    boost: 70,
  }),
]

interface ExtractedSymbols {
  variables: Map<string, string>
  functions: Map<string, { kind: 'procedure' | 'function'; signature: string }>
  types: Map<string, string>
  fields: Map<string, string>
}

const RESERVED_SET = new Set([
  ...KEYWORDS.map((k) => k.label.toLowerCase()),
  ...TYPES.map((t) => t.label.toLowerCase()),
  'program',
  'if',
  'for',
  'while',
  'repeat',
  'depend',
  'on',
  'procedure',
  'function',
])

function extractDocumentSymbols(docText: string): ExtractedSymbols {
  const variables = new Map<string, string>()
  const functions = new Map<string, { kind: 'procedure' | 'function'; signature: string }>()
  const types = new Map<string, string>()
  const fields = new Map<string, string>()

  // Strip {{ ... }} comments so we don't extract words from comments
  const clean = docText.replace(/\{\{[\s\S]*?\}\}/g, ' ')

  // 1. Struct definitions: type Name : < field : type, ... >
  const structRegex = /\btype\s+([A-Za-z_]\w*)\s*:\s*<([\s\S]*?)>/gi
  let match: RegExpExecArray | null
  while ((match = structRegex.exec(clean)) !== null) {
    const typeName = match[1]
    types.set(typeName, 'struct')
    const body = match[2]
    const fieldRegex = /([A-Za-z_]\w*)\s*:\s*([^,\n>]+)/g
    let fm: RegExpExecArray | null
    while ((fm = fieldRegex.exec(body)) !== null) {
      fields.set(fm[1], `${fm[2].trim()} (${typeName})`)
    }
  }

  // 2. Type aliases: type Address : pointer to ElmList
  const typeAliasRegex = /\btype\s+([A-Za-z_]\w*)\s*:\s*([^\n<]+)/gi
  while ((match = typeAliasRegex.exec(clean)) !== null) {
    const typeName = match[1]
    if (!types.has(typeName)) {
      types.set(typeName, match[2].trim())
    }
  }

  // 3. Procedures & Functions
  const procRegex = /\b(procedure|prosedur|function)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)(?:\s*->\s*([A-Za-z_]\w*))?/gi
  while ((match = procRegex.exec(clean)) !== null) {
    const rawKind = match[1].toLowerCase()
    const kind: 'procedure' | 'function' = rawKind === 'function' ? 'function' : 'procedure'
    const name = match[2]
    const params = match[3].trim()
    const ret = match[4]?.trim()
    const sig = ret ? `(${params}) -> ${ret}` : `(${params})`
    functions.set(name, { kind, signature: sig })

    // Also collect parameter names as variables
    if (params) {
      for (const part of params.split(',')) {
        const pm = part.trim().match(/(?:(?:in|out|inout)\s+)?([A-Za-z_]\w*)\s*:\s*(.+)/i)
        if (pm) {
          variables.set(pm[1], pm[2].trim())
        }
      }
    }
  }

  // 4. Constants: const pi = 3.14
  const constRegex = /\b(?:const|constant)\s+([A-Za-z_]\w*)\s*=/gi
  while ((match = constRegex.exec(clean)) !== null) {
    variables.set(match[1], 'const')
  }

  // 5. Variable declarations: a, b, c : integer (skip lines starting with type/procedure/function/depend)
  for (const rawLine of clean.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (
      !line ||
      /^(type|procedure|prosedur|function|program|depend|if|while|for|repeat)\b/i.test(line)
    ) {
      continue
    }
    const decl = line.match(/^([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s*:\s*([A-Za-z_][^<=\n]+)$/)
    if (decl) {
      const varType = decl[2].trim()
      for (const v of decl[1].split(',')) {
        const vName = v.trim()
        if (vName && !RESERVED_SET.has(vName.toLowerCase()) && !fields.has(vName)) {
          variables.set(vName, varType)
        }
      }
    }
  }

  // 6. Loop variables: for i = 1 to n do
  const forVarRegex = /\bfor\s+([A-Za-z_]\w*)\s*=/gi
  while ((match = forVarRegex.exec(clean)) !== null) {
    if (!variables.has(match[1])) {
      variables.set(match[1], 'integer (loop)')
    }
  }

  // 7. Assigned variables: z <- ...
  const assignRegex = /^\s*([A-Za-z_]\w*)\s*<-/gm
  while ((match = assignRegex.exec(clean)) !== null) {
    if (!variables.has(match[1]) && !RESERVED_SET.has(match[1].toLowerCase())) {
      variables.set(match[1], 'variable')
    }
  }

  return { variables, functions, types, fields }
}

export function dapCompletionSource(context: CompletionContext): CompletionResult | null {
  const docText = context.state.doc.toString()

  // Check if user just typed `->` or `.` for struct field suggestions
  const memberMatch = context.matchBefore(/(?:->|\.)[A-Za-z_0-9]*$/)
  if (memberMatch) {
    const opLen = memberMatch.text.startsWith('->') ? 2 : 1
    const from = memberMatch.from + opLen
    const symbols = extractDocumentSymbols(docText)
    if (symbols.fields.size === 0) return null

    const fieldOptions: Completion[] = []
    for (const [name, detail] of symbols.fields.entries()) {
      fieldOptions.push({
        label: name,
        detail,
        type: 'property',
        boost: 95,
      })
    }
    return {
      from,
      options: fieldOptions,
      validFor: /^[A-Za-z_0-9]*$/,
    }
  }

  // Standard word completion
  const word = context.matchBefore(/[A-Za-z_][A-Za-z_0-9]*/)
  if (!word && !context.explicit) {
    return null
  }

  const from = word ? word.from : context.pos

  // Context-aware keyword pairing (e.g., `depend o` -> `on`, `pointer t` -> `to`, `array [...] o` -> `of`)
  const line = context.state.doc.lineAt(from)
  const beforeWord = line.text.slice(0, from - line.from).trimEnd()
  if (/\bdepend$/i.test(beforeWord)) {
    return {
      from,
      options: [
        { label: 'on', detail: 'depend on', type: 'keyword', boost: 99 },
        snippetCompletion(`on (\${x})\n    \${1} : \${}\n    default : \${}\nenddependon`, {
          label: 'on (...)',
          detail: 'depend on (x) ... enddependon',
          type: 'keyword',
          boost: 98,
        }),
      ],
      validFor: /^[A-Za-z_0-9]*$/,
    }
  }
  if (/\bpointer$/i.test(beforeWord)) {
    return {
      from,
      options: [{ label: 'to', detail: 'pointer to Tipe', type: 'keyword', boost: 99 }],
      validFor: /^[A-Za-z_0-9]*$/,
    }
  }
  if (/\barray\s*\[[^\]]*\]$/i.test(beforeWord)) {
    return {
      from,
      options: [{ label: 'of', detail: 'array [...] of Tipe', type: 'keyword', boost: 99 }],
      validFor: /^[A-Za-z_0-9]*$/,
    }
  }

  const symbols = extractDocumentSymbols(docText)

  const options: Completion[] = [...SNIPPETS, ...BUILTINS, ...TYPES, ...KEYWORDS]
  const seen = new Set(options.map((o) => o.label))

  // Add user-defined variables
  for (const [name, varType] of symbols.variables.entries()) {
    if (!seen.has(name)) {
      seen.add(name)
      options.push({
        label: name,
        detail: varType,
        type: varType === 'const' ? 'constant' : 'variable',
        boost: 92,
      })
    }
  }

  // Add user-defined functions & procedures
  for (const [name, meta] of symbols.functions.entries()) {
    if (!seen.has(name)) {
      seen.add(name)
      options.push(
        snippetCompletion(`${name}(\${})`, {
          label: name,
          detail: `${meta.kind} ${meta.signature}`,
          type: 'function',
          boost: 94,
        }),
      )
    }
  }

  // Add user-defined types
  for (const [name, detail] of symbols.types.entries()) {
    if (!seen.has(name)) {
      seen.add(name)
      options.push({
        label: name,
        detail,
        type: 'type',
        boost: 89,
      })
    }
  }

  return {
    from,
    options,
    validFor: /^[A-Za-z_0-9]*$/,
  }
}
