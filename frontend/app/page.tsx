import Link from 'next/link';
import {
  Bot,
  Stethoscope,
  MapPin,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  HeartPulse,
  CheckCircle2,
} from 'lucide-react';
import Logo from '@/components/Logo';

const FEATURES = [
  {
    icon: Bot,
    title: 'AI Symptom Checker',
    body: 'Describe what you feel in plain words. Our hybrid medical engine ranks likely conditions and explains next steps.',
  },
  {
    icon: Stethoscope,
    title: 'Real Doctor Consultations',
    body: 'Book verified specialists. Chat or jump on a secure video call with your medical history attached.',
  },
  {
    icon: MapPin,
    title: 'Nearby Care',
    body: 'Find hospitals, pharmacies, and clinics near you with live map directions — no Google billing required.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by Default',
    body: 'Your health profile is encrypted in transit, scoped to you, and never sold. JWT + bcrypt secured.',
  },
];

const STEPS = [
  { n: '01', title: 'Describe symptoms', body: 'Type freely — fever, cough, stomach pain since 2 days.' },
  { n: '02', title: 'Get an AI report', body: 'Confidence-ranked conditions with a clear risk band.' },
  { n: '03', title: 'Talk to a doctor', body: 'One tap into chat or HD video with the right specialist.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <header className="border-b border-slate-100 bg-white/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-7 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
            <Link href="/login" className="hover:text-slate-900">Login</Link>
            <Link href="/signup" className="btn-primary text-sm py-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="chip mb-5"><Sparkles className="w-3.5 h-3.5 mr-1" /> AI-powered first-line healthcare</span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
              Your trusted health companion,
              <span className="block bg-gradient-to-r from-brand-600 to-teal-500 bg-clip-text text-transparent">
                from symptom to specialist.
              </span>
            </h1>
            <p className="text-slate-600 mt-5 text-lg max-w-xl">
              SHS combines a medical-grade symptom engine with verified doctors and nearby care —
              built for rural access, urban convenience, and everyone in between.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn-primary px-6 py-3 text-base">
                Talk to AI <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="btn-outline px-6 py-3 text-base">
                I already have an account
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-500">
              {['HIPAA-style data handling', 'Verified doctors only', 'Free to start'].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t}
                </span>
              ))}
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80"
              alt="Doctor consulting with patient"
              className="rounded-3xl shadow-soft w-full object-cover aspect-[4/3]"
            />
            <div className="hidden md:block absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-soft p-4 border border-slate-100 max-w-[220px]">
              <div className="text-xs text-slate-500">AI-extracted symptoms</div>
              <div className="text-sm font-semibold mt-1">Fever · Cough · Fatigue</div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-slate-600">Likely flu — yellow risk</span>
              </div>
            </div>
            <div className="hidden md:block absolute -top-4 -right-4 bg-white rounded-2xl shadow-soft p-4 border border-slate-100">
              <div className="flex items-center gap-2 text-xs">
                <img
                  src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=80&q=80"
                  alt="Doctor"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <div className="text-sm font-semibold">Dr. Asha Rao</div>
                  <div className="text-slate-500">verified · pulmonologist</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card p-6 hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 grid place-items-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="font-semibold text-slate-900">{f.title}</div>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How */}
      <section id="how" className="bg-slate-50 border-y border-slate-100 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
            <p className="text-slate-600 mt-2">Three steps from a vague feeling to clear next action.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mt-10">
            {STEPS.map((s) => (
              <div key={s.n} className="card p-6">
                <div className="text-xs font-semibold text-brand-600">{s.n}</div>
                <div className="font-semibold mt-1.5">{s.title}</div>
                <p className="text-sm text-slate-600 mt-1.5">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold tracking-tight text-center">Common questions</h2>
        <div className="mt-8 space-y-4">
          {[
            ['Is SHS a replacement for a doctor?', 'No. SHS gives indicative guidance and connects you with licensed clinicians. We never give a final diagnosis.'],
            ['Is my data safe?', 'Yes. Auth is JWT + bcrypt, all transport is TLS, and your records are scoped to your account.'],
            ['Does it work in rural areas?', 'The platform is mobile-first, and the AI engine works offline of any third party — Gemini is only used to phrase responses.'],
          ].map(([q, a]) => (
            <details key={q} className="card p-5 group">
              <summary className="font-semibold cursor-pointer flex items-center justify-between">
                {q}
                <span className="text-slate-400 group-open:rotate-45 transition">+</span>
              </summary>
              <p className="text-slate-600 text-sm mt-2 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-100 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-brand-600" />
            <span>© {new Date().getFullYear()} SHS — Smart Healthcare System</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
