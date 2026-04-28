type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeUnauthorized(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitUnauthorized(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}
