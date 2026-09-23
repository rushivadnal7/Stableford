'use client';

import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ToastTone = 'success' | 'danger' | 'info';

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds before it dismisses itself. 0 disables the timer. */
  duration?: number;
}

interface ToastItem extends Required<Omit<ToastInput, 'description'>> {
  id: number;
  description?: string;
  /** Drives the enter/exit transition: mounted false -> true one frame later, then false again to leave. */
  shown: boolean;
}

const ToastContext = createContext<((input: ToastInput) => void) | null>(null);

/** Anywhere in the app: `const toast = useToast(); toast({ title: 'Saved' });` */
export function useToast() {
  const fn = useContext(ToastContext);
  if (!fn) throw new Error('useToast must be used within <ToastProvider>.');
  return fn;
}

const TONE_ICON: Record<ToastTone, typeof CheckCircle2> = { success: CheckCircle2, danger: XCircle, info: Info };
const TONE_TEXT: Record<ToastTone, string> = { success: 'text-success', danger: 'text-danger', info: 'text-accent-text' };

let nextId = 1;
const EXIT_MS = 200;

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const Icon = TONE_ICON[item.tone];
  return (
    <div
      role={item.tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border border-line bg-surface p-4 shadow-lift transition-[opacity,transform] motion-base',
        item.shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
      )}
    >
      <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', TONE_TEXT[item.tone])} />
      <div className="min-w-0 flex-1">
        <p className="type-label text-fg">{item.title}</p>
        {item.description && <p className="type-small mt-1 text-fg-muted">{item.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss"
        className="grid size-8 shrink-0 place-items-center rounded-pill text-fg-muted transition-colors motion-fast hover:bg-fg/8 hover:text-fg"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const remove = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setItems((list) => list.filter((i) => i.id !== id));
  }, []);

  const dismiss = useCallback(
    (id: number) => {
      setItems((list) => list.map((i) => (i.id === id ? { ...i, shown: false } : i)));
      setTimeout(() => remove(id), EXIT_MS);
    },
    [remove],
  );

  const toast = useCallback((input: ToastInput) => {
    const id = nextId++;
    const item: ToastItem = { id, title: input.title, description: input.description, tone: input.tone ?? 'success', duration: input.duration ?? 5000, shown: false };
    setItems((list) => [...list, item]);
    requestAnimationFrame(() => requestAnimationFrame(() => setItems((list) => list.map((i) => (i.id === id ? { ...i, shown: true } : i)))));
    if (item.duration > 0) {
      timers.current.set(
        id,
        setTimeout(() => {
          setItems((list) => list.map((i) => (i.id === id ? { ...i, shown: false } : i)));
          setTimeout(() => remove(id), EXIT_MS);
        }, item.duration),
      );
    }
  }, [remove]);

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-overlay flex flex-col gap-3 sm:inset-x-auto sm:right-4 sm:w-96">
        {items.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <ToastCard item={item} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
