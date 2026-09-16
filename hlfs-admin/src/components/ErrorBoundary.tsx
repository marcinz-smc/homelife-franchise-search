import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: "" };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  render() {
    if (this.state.message) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-ink-950 p-8 text-gap-400">
          <p>The atlas hit a snag: {this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
