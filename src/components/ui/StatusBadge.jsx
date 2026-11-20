const styles = {
  pending: 'bg-amber-50 text-amber-700', matching: 'bg-sky-50 text-sky-700', assigned: 'bg-emerald-50 text-emerald-700',
  'in progress': 'bg-blue-50 text-blue-700', completed: 'bg-slate-100 text-slate-600', cancelled: 'bg-rose-50 text-rose-700',
  approved: 'bg-emerald-50 text-emerald-700', rejected: 'bg-rose-50 text-rose-700', online: 'bg-emerald-50 text-emerald-700', offline: 'bg-slate-100 text-slate-500'
};

export default function StatusBadge({ status }) {
  const label = (status || 'pending').replaceAll('_', ' ');
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${styles[label] || 'bg-slate-100 text-slate-600'}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-70"/>{label}</span>;
}