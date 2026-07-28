import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('CineRooms render error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="min-h-dvh flex items-center justify-center px-6 text-center">
        <div className="max-w-md">
          <span className="text-6xl" aria-hidden="true">🎞️</span>
          <h1 className="mt-5 text-3xl font-black font-nevis">畫面暫時卡住了</h1>
          <p className="mt-3 text-text-muted">
            CineRooms 遇到未預期的顯示錯誤。重新載入通常就能恢復。
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 rounded-full bg-[#FE494A] text-[#1A1A1A] font-black"
          >
            重新載入
          </button>
        </div>
      </main>
    );
  }
}
