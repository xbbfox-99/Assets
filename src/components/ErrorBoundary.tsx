import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('Uncaught error in React component tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-wabi-bg px-6 text-center">
          <div className="bg-wabi-paper p-8 rounded-3xl border border-wabi-accent/30 shadow-sm max-w-sm w-full space-y-4">
            <h2 className="text-2xl font-serif text-wabi-ink">系統載入異常</h2>
            <p className="text-xs text-wabi-stone leading-relaxed">
              頁面載入時發生非預期狀況，請點擊下方按鈕重新整理頁面。
            </p>
            {this.state.error && (
              <p className="text-[10px] text-red-500 font-mono bg-red-50 p-2 rounded-xl text-left overflow-x-auto break-all">
                {this.state.error.message || String(this.state.error)}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-3 bg-wabi-ink text-wabi-paper rounded-2xl text-xs tracking-widest uppercase hover:opacity-90 transition-opacity"
            >
              重新整理 Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
