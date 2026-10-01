import { Component, type ReactNode } from "react";

interface ErrorBoundaryState { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <div className="error-boundary"><p className="eyebrow">Suno</p><h1>页面出了点问题。</h1><p>错误信息：{this.state.error.message}</p><button className="button button-dark" onClick={() => { this.setState({ error: null }); window.location.reload(); }}>刷新页面 ↗</button></div>;
    }
    return this.props.children;
  }
}
