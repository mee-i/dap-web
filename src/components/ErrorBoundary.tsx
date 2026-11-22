import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  errorMessage: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || String(error),
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('DAP Web UI Error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-slate-950 p-6 text-slate-100">
          <div className="max-w-lg rounded-xl border border-rose-500/40 bg-slate-900 p-6 shadow-xl">
            <h1 className="text-base font-bold text-rose-400">
              Terjadi kesalahan tampilan (UI Runtime Error)
            </h1>
            <pre className="mt-3 max-h-40 overflow-auto rounded bg-slate-950 p-3 font-mono text-xs text-rose-300">
              {this.state.errorMessage}
            </pre>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Muat Ulang Tampilan
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
