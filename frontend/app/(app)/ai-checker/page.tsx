'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  Send,
  AlertTriangle,
  Sparkles,
  Stethoscope,
  Pill,
  Leaf,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { api, apiError } from '@/lib/api';

type Risk = 'green' | 'yellow' | 'red';

interface FollowUp {
  key: string;
  type: 'text' | 'choice' | 'number' | 'boolean';
  label: string;
  options?: { value: string; label: string }[];
}

interface Match {
  name: string;
  confidence: number;
  riskLevel: Risk;
  specialist?: string;
}

interface Advice {
  message: string;
  remedies: { title: string; description?: string }[];
  medicines: { name: string; dosage?: string; purpose?: string; sideEffects?: string }[];
  urgentActions: { title: string; description?: string }[];
  warningSigns: string[];
  doctorAdvice?: string;
  disclaimer: string;
}

interface SuggestedDoctor {
  _id: string;
  specialization: string;
  hospital?: string;
  city?: string;
  yearsOfExperience: number;
  consultationFee: number;
  rating: number;
  bio?: string;
  user: { _id: string; name: string; avatarUrl?: string };
}

interface FinalReport {
  sessionId: string;
  extractedSymptoms: string[];
  matches: Match[];
  topMatch: Match | null;
  overallRisk: Risk;
  advice: Advice;
  suggestedDoctors: SuggestedDoctor[];
  aiProvider?: string;
  disclaimer: string;
}

type Stage = 'symptom_input' | 'asking_followups' | 'analyzing' | 'final';

const STARTERS = [
  'Fever and cough since 2 days',
  'Stomach pain and vomiting',
  'Headache, body ache, chills',
  'Sore throat with mild fever',
];

export default function AICheckerPage() {
  const [stage, setStage] = useState<Stage>('symptom_input');
  const [originalText, setOriginalText] = useState('');
  const [input, setInput] = useState('');
  const [extractedSymptoms, setExtractedSymptoms] = useState<string[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentFollowUpIdx, setCurrentFollowUpIdx] = useState(0);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [thinking, setThinking] = useState(false);
  const [history, setHistory] = useState<{ from: 'bot' | 'user'; text: string }[]>([
    {
      from: 'bot',
      text: "Hi, I'm your AI health assistant. Tell me what you're feeling — for example: \"fever and cough since 2 days\".",
    },
  ]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, thinking, stage, currentFollowUpIdx]);

  function pushBot(text: string) {
    setHistory((h) => [...h, { from: 'bot', text }]);
  }
  function pushUser(text: string) {
    setHistory((h) => [...h, { from: 'user', text }]);
  }

  async function startPreliminary(symptomText: string) {
    if (!symptomText.trim()) return;
    pushUser(symptomText);
    setOriginalText(symptomText);
    setInput('');
    setThinking(true);

    try {
      const { data } = await api.post('/ai/preliminary', { text: symptomText });
      setSessionId(data.sessionId);
      setExtractedSymptoms(data.extractedSymptoms || []);
      setFollowUps(data.followUps || []);
      pushBot(data.message);

      if (!data.followUps?.length) {
        setStage('symptom_input');
      } else {
        setStage('asking_followups');
        setCurrentFollowUpIdx(0);
        setTimeout(() => pushBot(data.followUps[0].label), 250);
      }
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setThinking(false);
    }
  }

  function answerCurrent(value: any, displayLabel?: string) {
    const q = followUps[currentFollowUpIdx];
    if (!q) return;
    pushUser(displayLabel || String(value));
    const nextAnswers = { ...answers, [q.key]: value };
    setAnswers(nextAnswers);

    const nextIdx = currentFollowUpIdx + 1;
    if (nextIdx < followUps.length) {
      setCurrentFollowUpIdx(nextIdx);
      setTimeout(() => pushBot(followUps[nextIdx].label), 350);
    } else {
      finalize(nextAnswers);
    }
  }

  async function finalize(finalAnswers: Record<string, any>) {
    setStage('analyzing');
    setThinking(true);
    pushBot('Got it. Let me put this together for you…');

    try {
      const { data } = await api.post<FinalReport>('/ai/finalize', {
        text: originalText,
        answers: finalAnswers,
        sessionId,
      });
      setReport(data);
      setStage('final');
    } catch (err) {
      toast.error(apiError(err));
      setStage('symptom_input');
    } finally {
      setThinking(false);
    }
  }

  function reset() {
    setStage('symptom_input');
    setOriginalText('');
    setInput('');
    setExtractedSymptoms([]);
    setFollowUps([]);
    setAnswers({});
    setCurrentFollowUpIdx(0);
    setReport(null);
    setSessionId(undefined);
    setHistory([
      {
        from: 'bot',
        text: "Tell me what you're feeling — for example: \"sore throat and mild fever\".",
      },
    ]);
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 md:px-10 pt-6 md:pt-10 pb-3">
        <PageHeader
          title="AI Symptom Checker"
          subtitle="Describe how you feel — I'll ask a few quick questions, then give you a report."
          right={
            stage !== 'symptom_input' && (
              <button onClick={reset} className="btn-outline text-sm">
                <RotateCcw className="w-4 h-4" /> Restart
              </button>
            )
          }
        />
      </div>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-6 md:px-10 pb-6">
        <div className="max-w-3xl mx-auto space-y-3">
          {history.map((h, i) =>
            h.from === 'bot' ? (
              <BotBubble key={i} text={h.text} />
            ) : (
              <UserBubble key={i} text={h.text} />
            )
          )}

          {thinking && (
            <div className="flex items-center gap-2 text-slate-500 text-sm pl-11">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:0.15s]" />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:0.3s]" />
              {stage === 'analyzing' ? 'Analyzing…' : 'Thinking…'}
            </div>
          )}

          {stage === 'asking_followups' && !thinking && followUps[currentFollowUpIdx] && (
            <FollowUpInput
              q={followUps[currentFollowUpIdx]}
              onAnswer={answerCurrent}
              progress={{ idx: currentFollowUpIdx + 1, total: followUps.length }}
            />
          )}

          {stage === 'final' && report && <FinalReportCard report={report} onReset={reset} />}
        </div>
      </div>

      {stage === 'symptom_input' && (
        <div className="border-t border-slate-100 bg-white px-6 md:px-10 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startPreliminary(input);
            }}
            className="max-w-3xl mx-auto"
          >
            {history.length === 1 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => startPreliminary(s)}
                    className="text-sm px-3 py-1.5 rounded-full border border-slate-200 hover:border-brand-300 hover:bg-brand-50 text-slate-700"
                  >
                    <Sparkles className="inline w-3.5 h-3.5 mr-1 text-brand-500" />
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. fever, cough, headache since 2 days"
                className="input"
              />
              <button disabled={thinking || !input.trim()} className="btn-primary">
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              SHS gives indicative guidance only and is not a medical diagnosis.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}

function BotBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 grid place-items-center text-white shrink-0">
        <Bot className="w-4 h-4" />
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 text-slate-800 leading-relaxed shadow-soft max-w-[85%]">
        {text}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
        {text}
      </div>
    </div>
  );
}

function FollowUpInput({
  q,
  onAnswer,
  progress,
}: {
  q: FollowUp;
  onAnswer: (v: any, label?: string) => void;
  progress: { idx: number; total: number };
}) {
  const [text, setText] = useState('');
  return (
    <div className="ml-11 card p-4">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span>Question {progress.idx} of {progress.total}</span>
      </div>
      {q.type === 'choice' && q.options && (
        <div className="flex flex-wrap gap-2">
          {q.options.map((o) => (
            <button
              key={o.value}
              onClick={() => onAnswer(o.value, o.label)}
              className="px-3 py-1.5 rounded-full text-sm border border-slate-200 hover:border-brand-300 hover:bg-brand-50"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {q.type === 'boolean' && (
        <div className="flex gap-2">
          {['Yes', 'No'].map((o) => (
            <button
              key={o}
              onClick={() => onAnswer(o === 'Yes', o)}
              className="px-3 py-1.5 rounded-full text-sm border border-slate-200 hover:border-brand-300 hover:bg-brand-50"
            >
              {o}
            </button>
          ))}
        </div>
      )}
      {(q.type === 'text' || q.type === 'number') && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            onAnswer(q.type === 'number' ? Number(text) : text, text);
            setText('');
          }}
          className="flex gap-2"
        >
          <input
            type={q.type === 'number' ? 'number' : 'text'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input"
            placeholder="Your answer"
            autoFocus
          />
          <button className="btn-primary" disabled={!text.trim()}>
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}

function FinalReportCard({ report, onReset }: { report: FinalReport; onReset: () => void }) {
  const risk = report.overallRisk;
  const banner =
    risk === 'red'
      ? { tone: 'risk-red', label: 'High risk — seek care now', Icon: ShieldAlert }
      : risk === 'yellow'
      ? { tone: 'risk-yellow', label: 'Moderate — monitor and treat', Icon: AlertTriangle }
      : { tone: 'risk-green', label: 'Mild — home care should help', Icon: Leaf };

  return (
    <div className="ml-11 space-y-4">
      <div className={`card p-5 ${banner.tone}`} style={{ borderWidth: 1 }}>
        <div className="flex items-center gap-2 font-semibold">
          <banner.Icon className="w-5 h-5" />
          {banner.label}
        </div>
        <p className="text-sm mt-2 leading-relaxed">{report.advice.message}</p>
        {report.extractedSymptoms.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {report.extractedSymptoms.map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {report.matches.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-700">
              Symptoms may be associated with
            </div>
            {report.aiProvider && (
              <span className="text-[10px] uppercase tracking-wide text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand-500" />
                Powered by {report.aiProvider}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {report.matches.slice(0, 3).map((m) => (
              <div key={m.name} className="bg-slate-50 rounded-xl px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-xs text-slate-500">
                      Specialist: {m.specialist || 'General Physician'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold">{m.confidence}%</div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">likelihood</div>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-teal-500"
                    style={{ width: `${Math.max(2, m.confidence)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Likelihoods are normalized across the top matches to help you compare them.
          </p>
        </div>
      )}

      {report.suggestedDoctors?.length > 0 && (
        <SuggestedDoctorsCard
          risk={risk}
          specialty={report.topMatch?.specialist}
          doctors={report.suggestedDoctors}
        />
      )}

      {risk === 'green' && report.advice.remedies.length > 0 && (
        <Section icon={Leaf} title="Home remedies" tone="green" items={report.advice.remedies} />
      )}

      {risk === 'yellow' && (
        <>
          {report.advice.remedies.length > 0 && (
            <Section icon={Leaf} title="Home care" tone="green" items={report.advice.remedies} />
          )}
          {report.advice.medicines.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 font-semibold mb-3">
                <Pill className="w-4 h-4 text-brand-600" />
                Suggested over-the-counter medicines
              </div>
              <div className="space-y-3">
                {report.advice.medicines.map((m, i) => (
                  <div key={i} className="border border-slate-100 rounded-xl p-3">
                    <div className="font-semibold">{m.name}</div>
                    {m.dosage && (
                      <div className="text-xs text-slate-500">Dosage: {m.dosage}</div>
                    )}
                    {m.purpose && (
                      <div className="text-xs text-slate-500">Purpose: {m.purpose}</div>
                    )}
                    {m.sideEffects && (
                      <div className="text-xs text-rose-600 mt-1">
                        <strong>Side effects:</strong> {m.sideEffects}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {report.advice.doctorAdvice && (
            <div className="card p-5 bg-amber-50/40 border-amber-200">
              <div className="flex items-center gap-2 font-semibold text-amber-800">
                <Stethoscope className="w-4 h-4" /> Doctor advice
              </div>
              <p className="text-sm text-amber-800 mt-1.5">{report.advice.doctorAdvice}</p>
              <Link href="/doctors" className="btn-primary text-sm py-2 mt-3 inline-flex">
                Book a doctor
              </Link>
            </div>
          )}
        </>
      )}

      {risk === 'red' && (
        <>
          {report.advice.urgentActions.length > 0 && (
            <Section
              icon={ShieldAlert}
              title="What to do right now"
              tone="red"
              items={report.advice.urgentActions}
            />
          )}
          {report.advice.warningSigns.length > 0 && (
            <div className="card p-5 risk-red" style={{ borderWidth: 1 }}>
              <div className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Watch for these warning signs
              </div>
              <ul className="text-sm mt-2 list-disc pl-5 space-y-1">
                {report.advice.warningSigns.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="card p-5 bg-rose-50 border-rose-200">
            <div className="font-semibold text-rose-700">Connect to a doctor immediately</div>
            <p className="text-sm text-rose-700/90 mt-1">
              {report.advice.doctorAdvice ||
                'Your symptoms could indicate something serious. Please book a video consultation now or visit the nearest emergency room.'}
            </p>
            <div className="flex gap-2 mt-3">
              <Link href="/doctors" className="btn-primary text-sm py-2">
                <Stethoscope className="w-4 h-4" /> Book doctor now
              </Link>
              <Link href="/nearby?type=hospital" className="btn-outline text-sm py-2">
                Find ER nearby
              </Link>
            </div>
          </div>
        </>
      )}

      <div className="text-[11px] text-slate-400 px-2">{report.advice.disclaimer || report.disclaimer}</div>

      <button onClick={onReset} className="btn-outline text-sm">
        <RotateCcw className="w-4 h-4" /> Run another check
      </button>
    </div>
  );
}

function SuggestedDoctorsCard({
  risk,
  specialty,
  doctors,
}: {
  risk: Risk;
  specialty?: string;
  doctors: SuggestedDoctor[];
}) {
  const heading =
    risk === 'red'
      ? `Recommended specialists for urgent consultation`
      : `Specialists for ${specialty || 'this concern'}`;
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 font-semibold text-slate-800">
        <Stethoscope className={`w-4 h-4 ${risk === 'red' ? 'text-rose-600' : 'text-brand-600'}`} />
        {heading}
      </div>
      <p className="text-xs text-slate-500 mt-1">
        Verified doctors who match the suggested specialty.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        {doctors.slice(0, 4).map((d) => (
          <div key={d._id} className="border border-slate-100 rounded-xl p-3 flex gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 grid place-items-center text-white font-semibold shrink-0">
              {d.user?.name?.[0] || 'D'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate">Dr. {d.user?.name}</div>
              <div className="text-xs text-slate-500">{d.specialization}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {d.yearsOfExperience}y · ₹{d.consultationFee || 0} · ★ {d.rating || 'New'}
              </div>
              {d.bio && (
                <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">{d.bio}</div>
              )}
              <Link
                href="/doctors"
                className="text-[11px] text-brand-600 font-medium mt-1.5 inline-block"
              >
                Book →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  tone,
  items,
}: {
  icon: any;
  title: string;
  tone: 'green' | 'red';
  items: { title: string; description?: string }[];
}) {
  const accent =
    tone === 'green' ? 'text-emerald-600' : 'text-rose-600';
  return (
    <div className="card p-5">
      <div className={`flex items-center gap-2 font-semibold ${accent}`}>
        <Icon className="w-4 h-4" /> {title}
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-sm">
            <div className="font-medium text-slate-800">• {it.title}</div>
            {it.description && (
              <div className="text-slate-500 ml-3 mt-0.5 leading-relaxed">{it.description}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
