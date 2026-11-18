"use client";

import { Component, type ReactNode } from "react";

/**
 * Last line of defense (R12/R16): a render crash must never brick a screen —
 * an unmounted tree also kills the stall watchdog, so nothing would ever
 * recover. Show the themed ground and self-reload shortly after.
 */
export class PlayerErrorBoundary extends Component<
  { children: ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch() {
    setTimeout(() => window.location.reload(), 4000);
  }

  render() {
    if (this.state.crashed) {
      return (
        <div style={{ width: "100vw", height: "100dvh", background: "#121722" }} />
      );
    }
    return this.props.children;
  }
}
