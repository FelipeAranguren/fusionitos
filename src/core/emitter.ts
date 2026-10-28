type Listener<T> = (payload: T) => void;

/** Emisor de eventos tipado y mínimo (el core no depende del EventEmitter de Phaser). */
export class Emitter<Events extends object> {
  private listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  /** Suscribe y devuelve la función para desuscribir. */
  on<K extends keyof Events>(type: K, listener: Listener<Events[K]>): () => void {
    let set = this.listeners[type];
    if (!set) {
      set = new Set();
      this.listeners[type] = set;
    }
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const set = this.listeners[type];
    if (!set) return;
    // Copia: un listener puede desuscribirse mientras se emite.
    for (const listener of [...set]) listener(payload);
  }
}
