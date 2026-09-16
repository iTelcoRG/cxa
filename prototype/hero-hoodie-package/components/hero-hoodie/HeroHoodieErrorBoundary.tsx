"use client";

import { Component, type ReactNode } from "react";

interface Props {
  fallback: ReactNode;
  onError?: (error: unknown) => void;
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * Catches errors thrown while loading/parsing/rendering the GLB (a bad
 * or missing model file, a WebGL context failure mid-session, etc.) and
 * swaps in the static fallback image instead of taking the whole hero
 * section down. React error boundaries must be class components --
 * there is no hook equivalent.
 */
export class HeroHoodieErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError?.(error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
