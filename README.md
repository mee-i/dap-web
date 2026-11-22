# dap-web — Web IDE, Debugger & Analyzer untuk DAP

[![Upstream DAP](https://img.shields.io/badge/Engine-rafiathallah3%2Fdap-blue.svg)](https://github.com/rafiathallah3/dap)
[![Runtime](https://img.shields.io/badge/Runtime-Go%20WebAssembly-00ADD8.svg)](https://go.dev/wiki/WebAssembly)
[![Framework](https://img.shields.io/badge/UI-Astro%20%2B%20React%20%2B%20Tailwind-FF5D01.svg)](https://astro.build/)

**`dap-web`** adalah implementasi berbasis web (Web IDE, Live Debugger, dan Static/Runtime Analyzer) untuk bahasa pseudocode **DAP** yang dibangun menggunakan engine asli dari repositori **[https://github.com/rafiathallah3/dap](https://github.com/rafiathallah3/dap)**.

Proyek ini dibuat untuk mempermudah pelajar, mahasiswa, dan pengembang menjalankan, men-debug langkah demi langkah, serta menganalisis skrip `.dap` secara langsung di browser **tanpa perlu menginstal CLI, compiler, maupun Docker/Podman**.

---

## Mengapa Tanpa Docker / Podman?

Seluruh core engine dari [rafiathallah3/dap](https://github.com/rafiathallah3/dap) (`lexer`, `parser`, `interpreter`, `bytecode compiler & VM`) ditulis dalam **Pure Go** tanpa dependensi eksternal.

Oleh karena itu, `dap-web` mengompilasi langsung source code Go asli DAP ke **WebAssembly (`public/dap.wasm`)** dan menjalankannya di dalam **Web Worker** browser:
- **100% kompatibel dengan DAP CLI asli** — bukan hasil rewrite ulang di JavaScript.
- **Aman & terisolasi secara native** di sandbox WebAssembly browser tiap pengguna (tidak butuh backend eksekusi atau container Docker/Podman).
- **Zero-latency debugging & analisis** — semua proses lexing, parsing, kompilasi bytecode, dan eksekusi terjadi langsung di browser.
- **Proteksi infinite loop** — tersedia batas step dan tombol Stop yang menghentikan/me-restart Web Worker secara instan.

---

## Fitur Utama

1. **Editor Kode DAP Modern (CodeMirror 6)**
   - Syntax highlighting khusus bahasa DAP (`program`, `dictionary`/`kamus`, `algorithm`/`algoritma`, `procedure`/`function`, `in`/`out`/`inout`, `pointer`, `allocate`/`deallocate`, komentar `{{ ... }}`, operator `<-` dan `->`, dll.).
   - **Breakpoint Gutter** (klik nomor baris untuk memasang/melepas breakpoint).
   - **Active Line Highlight** saat sesi debugging berhenti di baris tertentu.
   - **Live Diagnostics** (penanda error lexer/parser secara real-time saat mengetik).
   - Mendukung ekspor/impor file `.dap` dan koleksi contoh bawaan dari repositori upstream (`Singly Linked List`, `Doubly Linked List`, `Stack`, `Factorial`, `L8`, `L9`, dll.).

2. **Live Step-by-Step Debugger**
   - Kontrol penuh: **Run**, **Debug**, **Continue**, **Step Into**, **Step Over**, **Step Out**, **Pause**, dan **Stop**.
   - **Call Stack & Local/Global Variables Inspector**: pantau perubahan nilai variabel, konstanta, dan tipe data pada setiap frame pemanggilan `procedure`/`function`.
   - **Memory & Pointer Visualizer**: visualisasi sel memori heap (`0x1000`, `0x1010`, ...) lengkap dengan status `ALLOCATED` / `FREED`, field struct, dan relasi pointer — sangat membantu untuk memahami **Singly/Doubly/Multi Linked List** dan **Stack**.

3. **Dual Engine Execution**
   - **Tree-Walking Interpreter** (dukungan penuh seluruh fitur DAP termasuk struct, array, pointer, `allocate`/`deallocate`, `procedure`/`function`, `input`/`inputBaris`).
   - **Bytecode VM (`--vm`)** lengkap dengan **VM Operand Stack & Instruction Pointer (IP) Inspector**.

4. **Interactive Terminal & Stdin**
   - Streaming output realtime (`print`, `write`, `output`, `tulis`).
   - Mendukung **`input` / `read` / `masukan` / `inputBaris`** secara interaktif langsung di terminal web, maupun melalui tab **Pre-filled Stdin** untuk pengujian berulang.

5. **Static & Compiler Analysis Suite** *(setara dengan flag CLI `--show-token`, `--show-ast`, `--show-ast-json`, `--show-bytecode`)*
   - **Tokens Inspector**: daftar seluruh token lengkap dengan filter dan klik-untuk-lompat ke posisi baris/kolom di editor.
   - **AST Explorer**: tampilan interaktif *collapsible tree*, **ASCII Tree**, dan **Raw JSON** (siap salin).
   - **Bytecode Disassembler**: tabel instruksi opcode, Constants Pool, dan Names Table dengan highlight instruksi aktif saat debugging VM.

6. **Bilingual & Theme Switcher**
   - Pilihan antarmuka **Bahasa Indonesia** (default) dan **English**.
   - Pilihan tema **Dark Mode** (default) dan **Light Mode**.

---

## Menjalankan Secara Lokal

### Prasyarat
- [Bun](https://bun.sh/) (direkomendasikan) atau Node.js 18+
- *(Opsional)* [Go 1.22+](https://go.dev/) hanya jika ingin mengompilasi ulang `public/dap.wasm` dari source upstream DAP.

### Instalasi & Development Server

```bash
bun install
bun run dev
```

Atau dengan npm:

```bash
npm install
npm run dev
```

Lalu buka URL yang ditampilkan (default `http://localhost:4321`).

### Build Production (Static Hosting)

```bash
bun run build
```

Hasil build berada di folder `dist/` dan dapat langsung di-deploy ke **GitHub Pages**, **Vercel**, **Netlify**, atau **Cloudflare Pages** tanpa server backend.

---

## Membangun Ulang Engine WASM dari Source DAP

Folder ini sudah menyertakan `public/dap.wasm` dan `public/wasm_exec.js` siap pakai. Jika ada pembaruan pada source code Go di repositori utama `dap`, jalankan script build WASM dari struktur workspace `dap`:

- **Windows (PowerShell)**:
  ```powershell
  bun run build:wasm:win
  ```
- **Linux / macOS**:
  ```bash
  bun run build:wasm
  ```

---

## Kredit & Referensi

- **DAP Language & Interpreter Engine**: [https://github.com/rafiathallah3/dap](https://github.com/rafiathallah3/dap)
- **Dokumentasi Bahasa DAP**: [https://rafiathallah3.github.io/dap/](https://rafiathallah3.github.io/dap/)
