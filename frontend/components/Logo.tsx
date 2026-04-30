import Link from 'next/link';
import { Activity } from 'lucide-react';

export default function Logo({ subtle = false }: { subtle?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
      <span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 text-white shadow-soft">
        <Activity className="w-4 h-4" />
      </span>
      <span className="text-lg tracking-tight">
        SHS{!subtle && <span className="text-slate-400 font-medium"> · Health</span>}
      </span>
    </Link>
  );
}
