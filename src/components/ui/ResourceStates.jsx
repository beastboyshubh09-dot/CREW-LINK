export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} aria-label="Loading" />;
}

export function LoadingRows({ count = 3 }) {
  return <div className="space-y-3" aria-label="Loading results">{Array.from({ length: count }, (_, index) => <div key={index} className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4"><Skeleton className="h-11 w-11 rounded-full"/><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3"/><Skeleton className="h-3 w-2/3"/></div><Skeleton className="h-7 w-20"/></div>)}</div>;
}

export function EmptyState({ title, detail, action }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-forest-50 font-display text-xl font-extrabold text-forest-700">—</div><h3 className="mt-4 font-display text-lg font-extrabold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">{detail}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function ErrorState({ onRetry }) {
  return <div role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-5 py-6 text-center"><p className="font-bold text-rose-800">We couldn’t load this right now.</p><p className="mt-1 text-sm text-rose-700">Check your connection and try again.</p>{onRetry && <button onClick={onRetry} className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-bold text-rose-700">Try again</button>}</div>;
}