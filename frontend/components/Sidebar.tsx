'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Stethoscope,
  Bot,
  CalendarCheck,
  MessagesSquare,
  Video,
  MapPin,
  UserCircle2,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import Logo from './Logo';
import { cn } from '@/lib/cn';
import { clearSession, AuthUser } from '@/lib/auth';

const PATIENT_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ai-checker', label: 'AI Checker', icon: Bot },
  { href: '/doctors', label: 'Doctors', icon: Stethoscope },
  { href: '/appointments', label: 'Appointments', icon: CalendarCheck },
  { href: '/chat', label: 'Chat', icon: MessagesSquare },
  { href: '/nearby', label: 'Nearby Care', icon: MapPin },
  { href: '/profile', label: 'Medical Profile', icon: UserCircle2 },
];

const DOCTOR_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/appointments', label: 'Appointments', icon: CalendarCheck },
  { href: '/chat', label: 'Chat', icon: MessagesSquare },
  { href: '/profile', label: 'Profile', icon: UserCircle2 },
];

const ADMIN_NAV = [
  { href: '/admin', label: 'Admin', icon: ShieldCheck },
  { href: '/admin/doctors', label: 'Verify Doctors', icon: Stethoscope },
  { href: '/admin/users', label: 'Users', icon: UserCircle2 },
];

export default function Sidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const nav =
    user.role === 'admin' ? ADMIN_NAV : user.role === 'doctor' ? DOCTOR_NAV : PATIENT_NAV;

  function logout() {
    clearSession();
    router.push('/login');
  }

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-100 bg-white">
      <div className="px-5 h-16 flex items-center border-b border-slate-100">
        <Logo />
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-teal-500 grid place-items-center text-white font-semibold">
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{user.name}</div>
            <div className="text-xs text-slate-500 capitalize truncate">{user.role}</div>
          </div>
        </div>
        <button onClick={logout} className="btn-ghost w-full justify-start mt-1 text-sm">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
