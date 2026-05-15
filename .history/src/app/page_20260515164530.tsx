'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_STEPS = ['New', 'Assigned', 'In Progress', 'Completed', 'Delivered'];

const STATUS_META: Record<string, { color: string; bg: string; border: string; icon: string; message: string }> = {
    New: {
        color: 'text-slate-700',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        icon: '📋',
        message: 'Your device has been registered and is waiting to be assigned to a technician.',
    },
    Assigned: {
        color: 'text-blue-700',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: '👨‍🔧',
        message: 'A technician has been assigned and will begin working on your device shortly.',
    },
    'In Progress': {
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: '🔧',
        message: 'Your device is currently being repaired by our technician.',
    },
    Completed: {
        color: 'text-teal-700',
        bg: 'bg-teal-50',
        border: 'border-teal-200',
        icon: '✅',
        message: 'Repair is complete! Please visit our service centre to collect your device.',
    },
    Delivered: {
        color: 'text-green-700',
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: '🎉',
        message: 'Your device has been delivered. Thank you for choosing FixHub!',
    },
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface EtaInfo {
    etaIso: string | null;
    isOverdue: boolean;
    isReady: boolean;
    etaLabel: string;
}

interface JobData {
    id: string;
    status: string | null;
    problemDesc: string | null;
    createdAt: string | null;
    completedAt: string | null;
    updatedAt: string | null;
    device: { brand: string; type: string; model: string } | null;
    photos?: { id: string; url: string; type: 'before' | 'after'; createdAt: string }[];
    eta?: EtaInfo;
    estimatedCost?: number | null;
    quoteApprovedByCustomer?: boolean | null;
    unreadMessages?: number;
}

interface PortalMessage {
    id: string;
    jobId: string;
    senderType: 'customer' | 'staff';
    senderName: string;
    text: string;
    createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function shortId(id: string) {
    return id.slice(0, 8).toUpperCase();
}

// ── Lookup Form ───────────────────────────────────────────────────────────────
function LookupForm({ onFound }: { onFound: (jobs: JobData[], name?: string) => void }) {
    const router = useRouter();
    const [mode, setMode] = useState<'phone' | 'jobId'>('phone');
    const [value, setValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleLookup(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;

        setError(null);
        setLoading(true);

        try {
            const param = mode === 'phone'
                ? `phone=${encodeURIComponent(trimmed)}`
                : `jobId=${encodeURIComponent(trimmed)}`;

            const res = await fetch(`/api/track?${param}`);
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Not found. Please check and try again.');
                setLoading(false);
                return;
            }

            if (data.jobs?.length === 1) {
                router.push(`/track?job=${data.jobs[0].id}`);
            } else {
                onFound(data.jobs, data.customerName);
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="flex rounded-xl overflow-hidden border border-slate-200 mb-5 bg-white shadow-sm">
                {(['phone', 'jobId'] as const).map((m) => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => { setMode(m); setValue(''); setError(null); }}
                        className={`flex-1 py-2.5 text-[13px] font-semibold transition-colors ${
                            mode === m ? 'bg-teal-500 text-white' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                        {m === 'phone' ? '📱 Phone Number' : '🔖 Job / Reference ID'}
                    </button>
                ))}
            </div>

            <form onSubmit={handleLookup} className="space-y-3">
                <input
                    type={mode === 'phone' ? 'tel' : 'text'}
                    value={value}
                    onChange={(e) => { setValue(e.target.value); setError(null); }}
                    placeholder={mode === 'phone' ? 'Enter your registered phone number' : 'Enter Job ID or reference (e.g. ABC12345)'}
                    autoFocus
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-[14px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent shadow-sm"
                />

                {error && (
                    <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={loading || !value.trim()}
                    className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[14px] font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Looking up…</>
                    ) : 'Find My Repair'}
                </button>
            </form>

            <p className="text-center text-[11px] text-slate-400 mt-4">
                Your phone number is the one you provided when you dropped off your device.
            </p>
        </div>
    );
}

// ── Job List ──────────────────────────────────────────────────────────────────
function JobList({ jobs, customerName, onSelect }: {
    jobs: JobData[];
    customerName?: string;
    onSelect: (id: string) => void;
}) {
    return (
        <div className="w-full max-w-md mx-auto space-y-3">
            {customerName && (
                <p className="text-[13px] text-slate-600 font-medium mb-1">
                    Hi <span className="text-slate-800 font-bold">{customerName}</span>, we found {jobs.length} repair job{jobs.length !== 1 ? 's' : ''}:
                </p>
            )}
            {jobs.map((job) => {
                const status = job.status ?? 'New';
                const meta = STATUS_META[status] ?? STATUS_META['New'];
                const isActive = !['Completed', 'Delivered'].includes(status);
                return (
                    <button
                        key={job.id}
                        onClick={() => onSelect(job.id)}
                        className={`w-full text-left rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99] ${meta.bg} ${meta.border}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <span className="text-2xl">{meta.icon}</span>
                                <div>
                                    <p className={`text-[13px] font-bold ${meta.color}`}>{status}</p>
                                    <p className="text-[11px] text-slate-500 font-mono">#{shortId(job.id)}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {isActive && job.eta && (
                                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${job.eta.isOverdue ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-700'}`}>
                                        {job.eta.etaLabel}
                                    </span>
                                )}
                                {!isActive && (
                                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                                        {job.eta?.etaLabel ?? 'Done'}
                                    </span>
                                )}
                                {(job.unreadMessages ?? 0) > 0 && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                        💬 {job.unreadMessages} msg
                                    </span>
                                )}
                            </div>
                        </div>
                        {job.device && (
                            <p className="text-[12px] text-slate-600 mt-2 ml-9">
                                {job.device.brand} {job.device.model} <span className="text-slate-400">· {job.device.type}</span>
                            </p>
                        )}
                        {job.problemDesc && (
                            <p className="text-[11px] text-slate-500 mt-0.5 ml-9 line-clamp-1">{job.problemDesc}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1.5 ml-9">Checked in: {formatDate(job.createdAt)}</p>
                    </button>
                );
            })}
        </div>
    );
}

// ── Token Verify Widget ───────────────────────────────────────────────────────
function TokenVerify({ jobId, onVerified }: { jobId: string; onVerified: (token: string) => void }) {
    const [tokenInput, setTokenInput] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function verify(e: React.FormEvent) {
        e.preventDefault();
        if (tokenInput.length !== 4) return;
        setVerifying(true);
        setError(null);
        try {
            const res = await fetch(`/api/portal/messages?jobId=${encodeURIComponent(jobId)}&token=${encodeURIComponent(tokenInput)}`);
            if (res.ok) {
                if (typeof window !== 'undefined') sessionStorage.setItem(`portal_token_${jobId}`, tokenInput);
                onVerified(tokenInput);
            } else {
                const d = await res.json();
                setError(d.error === 'Invalid token.' ? 'Incorrect PIN. Please try the last 4 digits of your registered phone number.' : d.error || 'Verification failed.');
            }
        } catch {
            setError('Network error.');
        } finally {
            setVerifying(false);
        }
    }

    return (
        <div>
            <p className="text-[13px] text-slate-600 mb-3">
                Enter the <span className="font-semibold">last 4 digits</span> of your registered phone number to access this feature.
            </p>
            <form onSubmit={verify} className="flex gap-2">
                <input
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="_ _ _ _"
                    maxLength={4}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-[18px] text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-400 text-center tracking-[0.3em] font-bold"
                />
                <button
                    type="submit"
                    disabled={tokenInput.length !== 4 || verifying}
                    className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[13px] font-semibold transition-colors"
                >
                    {verifying ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> : 'Verify'}
                </button>
            </form>
            {error && <p className="text-[11px] text-red-600 mt-2">{error}</p>}
        </div>
    );
}

// ── Chat Panel ─────────────────────────────────────────────────────────────────
function ChatPanel({ jobId, token, customerName }: { jobId: string; token: string; customerName: string }) {
    const [messages, setMessages] = useState<PortalMessage[]>([]);
    const [loadingMsgs, setLoadingMsgs] = useState(true);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchMessages = useCallback(async () => {
        try {
            const res = await fetch(`/api/portal/messages?jobId=${encodeURIComponent(jobId)}&token=${encodeURIComponent(token)}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages ?? []);
            }
        } catch { /* ignore */ } finally {
            setLoadingMsgs(false);
        }
    }, [jobId, token]);

    useEffect(() => {
        fetchMessages();
        intervalRef.current = setInterval(() => fetchMessages(), 10_000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [fetchMessages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function sendMessage(e: React.FormEvent) {
        e.preventDefault();
        if (!text.trim() || sending) return;
        setSending(true);
        setError(null);
        try {
            const res = await fetch('/api/portal/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId, token, senderName: customerName, text: text.trim() }),
            });
            if (res.ok) {
                setText('');
                await fetchMessages();
            } else {
                const d = await res.json();
                setError(d.error || 'Failed to send.');
            }
        } catch {
            setError('Network error.');
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="flex flex-col h-[400px]">
            <div className="flex-1 overflow-y-auto space-y-2 px-1 py-2">
                {loadingMsgs && (
                    <div className="flex justify-center py-8">
                        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
                {!loadingMsgs && messages.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-[13px] text-slate-400">No messages yet.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Send a message to the workshop below.</p>
                    </div>
                )}
                {messages.map((msg) => {
                    const isCustomer = msg.senderType === 'customer';
                    return (
                        <div key={msg.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${isCustomer ? 'bg-teal-500 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'}`}>
                                {!isCustomer && (
                                    <p className="text-[10px] font-semibold text-slate-500 mb-0.5">{msg.senderName}</p>
                                )}
                                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                <p className={`text-[9px] mt-1 ${isCustomer ? 'text-teal-100' : 'text-slate-400'}`}>
                                    {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {error && <p className="text-[11px] text-red-600 bg-red-50 px-3 py-1.5 rounded-lg mb-2">{error}</p>}
            <form onSubmit={sendMessage} className="flex gap-2 pt-2 border-t border-slate-100">
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message…"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                />
                <button
                    type="submit"
                    disabled={!text.trim() || sending}
                    className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[13px] font-semibold transition-colors flex items-center gap-1.5"
                >
                    {sending ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '↑ Send'}
                </button>
            </form>
        </div>
    );
}

// ── Quote Approval Panel ───────────────────────────────────────────────────────
function QuotePanel({ job, token, onDecision }: { job: JobData; token: string; onDecision: () => void }) {
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const alreadyDecided = job.quoteApprovedByCustomer !== null && job.quoteApprovedByCustomer !== undefined;
    const approved = job.quoteApprovedByCustomer === true;

    if (alreadyDecided) {
        return (
            <div className={`rounded-2xl p-4 ${approved ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-[13px] font-bold ${approved ? 'text-green-700' : 'text-red-700'}`}>
                    {approved ? '✅ Quote Approved' : '❌ Quote Declined'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                    {approved ? 'You approved this quote. Our team will proceed with the repair.' : 'You declined this quote. Please contact us if you change your mind.'}
                </p>
            </div>
        );
    }

    if (done) {
        return (
            <div className="rounded-2xl p-4 bg-green-50 border border-green-200 text-center">
                <p className="text-[14px] font-bold text-green-700">Decision recorded!</p>
                <p className="text-[12px] text-slate-500 mt-1">We'll update the job accordingly.</p>
            </div>
        );
    }

    async function decide(decision: 'approved' | 'rejected') {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/portal/quote-approval', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: job.id, token, decision, note: note.trim() || undefined }),
            });
            if (res.ok) { setDone(true); onDecision(); }
            else { const d = await res.json(); setError(d.error || 'Failed to record decision.'); }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Estimated Cost</p>
                    <p className="text-[22px] font-bold text-slate-800 mt-0.5">₹{(job.estimatedCost ?? 0).toLocaleString('en-IN')}</p>
                </div>
                <span className="text-3xl">💰</span>
            </div>
            <p className="text-[12px] text-slate-600">Please review and approve or decline this quote to proceed with your repair.</p>
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note (e.g. proceed ASAP, or reason for declining)…"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
            />
            {error && <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2">
                <button
                    onClick={() => decide('approved')}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                    {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '✅ Approve'}
                </button>
                <button
                    onClick={() => decide('rejected')}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-50 text-red-700 text-[13px] font-bold transition-colors"
                >
                    ❌ Decline
                </button>
            </div>
        </div>
    );
}

// ── Photo Upload Widget ────────────────────────────────────────────────────────
function PhotoUploadWidget({ onUploaded }: { onUploaded: (urls: string[]) => void }) {
    const [previews, setPreviews] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    function handleFiles(files: FileList | null) {
        if (!files) return;
        const readers: Promise<string>[] = [];
        Array.from(files).slice(0, 4 - previews.length).forEach((file) => {
            readers.push(new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(file);
            }));
        });
        Promise.all(readers).then((urls) => {
            const all = [...previews, ...urls].slice(0, 4);
            setPreviews(all);
            onUploaded(all);
        });
    }

    return (
        <div>
            <div
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-colors"
            >
                <p className="text-[13px] text-slate-500">📷 Tap to add device photos</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Up to 4 photos</p>
            </div>
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            {previews.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                    {previews.map((url, i) => (
                        <div key={i} className="relative">
                            <img src={url} alt={`Photo ${i + 1}`} className="w-full h-16 object-cover rounded-lg border border-slate-200" />
                            <button
                                type="button"
                                onClick={() => {
                                    const updated = previews.filter((_, j) => j !== i);
                                    setPreviews(updated);
                                    onUploaded(updated);
                                }}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center leading-none"
                            >✕</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Book Repair Form ───────────────────────────────────────────────────────────
function BookRepairForm({ onBooked }: { onBooked: (jobId: string) => void }) {
    const [step, setStep] = useState<1 | 2>(1);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [deviceType, setDeviceType] = useState('');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [problemDesc, setProblemDesc] = useState('');
    const [photoUrls, setPhotoUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deviceTypes = ['Phone', 'Laptop', 'Tablet', 'Desktop', 'Other'];

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !phone.trim() || !deviceType || !problemDesc.trim()) {
            setError('Please fill in all required fields.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/portal/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, email, deviceType, brand, model, problemDesc, photoUrls }),
            });
            const data = await res.json();
            if (res.ok) {
                onBooked(data.jobId);
            } else {
                setError(data.error || 'Failed to submit request.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                    <span className="text-2xl">🛠️</span>
                    <div>
                        <h2 className="text-[15px] font-bold text-slate-800">Request a Repair</h2>
                        <p className="text-[11px] text-slate-500">Fill in the details — we'll confirm by phone</p>
                    </div>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-3 mb-5">
                    {[1, 2].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${step >= s ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{s}</div>
                            <span className={`text-[11px] font-medium ${step >= s ? 'text-teal-600' : 'text-slate-400'}`}>
                                {s === 1 ? 'Your Info' : 'Device & Issue'}
                            </span>
                            {s < 2 && <div className="h-px bg-slate-200 w-6" />}
                        </div>
                    ))}
                </div>

                <form onSubmit={submit} className="space-y-3">
                    {step === 1 && (
                        <>
                            <div>
                                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block mb-1">Full Name *</label>
                                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-[14px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                            </div>
                            <div>
                                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block mb-1">Phone Number *</label>
                                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your mobile number"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-[14px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                            </div>
                            <div>
                                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block mb-1">Email (optional)</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="For email updates"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-[14px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                            </div>
                            {error && <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
                            <button
                                type="button"
                                onClick={() => { if (!name.trim() || !phone.trim()) { setError('Name and phone are required.'); return; } setError(null); setStep(2); }}
                                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-[14px] font-semibold transition-colors"
                            >Continue →</button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div>
                                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block mb-1">Device Type *</label>
                                <div className="flex flex-wrap gap-2">
                                    {deviceTypes.map((dt) => (
                                        <button key={dt} type="button" onClick={() => setDeviceType(dt)}
                                            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${deviceType === dt ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'}`}>
                                            {dt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block mb-1">Brand</label>
                                    <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Apple"
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block mb-1">Model</label>
                                    <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. iPhone 14"
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block mb-1">Problem Description *</label>
                                <textarea value={problemDesc} onChange={(e) => setProblemDesc(e.target.value)} placeholder="Describe the issue in detail…" rows={3}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
                            </div>
                            <div>
                                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block mb-1">Device Photos (optional)</label>
                                <PhotoUploadWidget onUploaded={setPhotoUrls} />
                            </div>
                            {error && <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setStep(1)}
                                    className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 transition-colors">← Back</button>
                                <button type="submit" disabled={loading || !deviceType || !problemDesc.trim()}
                                    className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[14px] font-semibold transition-colors flex items-center justify-center gap-2">
                                    {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting…</> : '🛠️ Submit Request'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}

// ── Booking Confirmation ───────────────────────────────────────────────────────
function BookingConfirmation({ jobId, onTrack }: { jobId: string; onTrack: () => void }) {
    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-[17px] font-bold text-slate-800 mb-2">Request Submitted!</h2>
                <p className="text-[13px] text-slate-500 mb-4">
                    Your repair request has been received. Our team will contact you shortly to confirm the appointment.
                </p>
                <div className="bg-slate-50 rounded-xl px-4 py-3 mb-5 inline-block">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Reference ID</p>
                    <p className="text-[16px] font-bold text-teal-600 font-mono mt-0.5">#{jobId.slice(0, 8).toUpperCase()}</p>
                </div>
                <p className="text-[11px] text-slate-400 mb-5">Save this reference ID to track your repair status.</p>
                <button onClick={onTrack} className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-[14px] font-semibold transition-colors">
                    Track This Repair →
                </button>
            </div>
        </div>
    );
}

// ── Single Job Detail View ─────────────────────────────────────────────────────
function JobDetail({ jobId, onBack }: { jobId: string; onBack: () => void }) {
    const [job, setJob] = useState<JobData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'status' | 'chat' | 'quote'>('status');
    const [token, setToken] = useState<string>('');
    const [tokenVerified, setTokenVerified] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem(`portal_token_${jobId}`);
            if (saved) { setToken(saved); setTokenVerified(true); }
        }
    }, [jobId]);

    const fetchJob = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/public`);
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || 'Job not found.');
            }
            const data: JobData = await res.json();
            setJob(data);
            setLastRefreshed(new Date());
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load job.');
        } finally {
            setLoading(false);
        }
    }, [jobId]);

    useEffect(() => {
        fetchJob();
        intervalRef.current = setInterval(() => fetchJob(true), 60_000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [fetchJob]);

    function handleTokenVerified(tok: string) {
        setToken(tok);
        setTokenVerified(true);
    }

    const status = job?.status ?? '';
    const meta = STATUS_META[status] ?? STATUS_META['New'];
    const currentStep = STATUS_STEPS.indexOf(status);
    const isTerminal = ['Completed', 'Delivered'].includes(status);
    const hasQuote = (job?.estimatedCost ?? 0) > 0;
    const needsQuoteApproval = hasQuote && job?.quoteApprovedByCustomer === null;

    const tabs = [
        { id: 'status' as const, label: '📋 Status' },
        ...(hasQuote && !isTerminal ? [{ id: 'quote' as const, label: needsQuoteApproval ? '💰 Quote ⚠️' : '💰 Quote' }] : []),
        { id: 'chat' as const, label: `💬 Messages${(job?.unreadMessages ?? 0) > 0 ? ` (${job!.unreadMessages})` : ''}` },
    ];

    return (
        <>
            {lightboxUrl && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
                    <img src={lightboxUrl} alt="Device photo" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
                    <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 text-white text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70">✕</button>
                </div>
            )}

            <div className="w-full max-w-md mx-auto">
                <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700 mb-4 transition-colors">
                    ← Back to search
                </button>

                {loading && (
                    <div className="bg-white rounded-2xl shadow-sm p-10 flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-[13px] text-slate-400">Loading job details…</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                        <div className="text-4xl mb-3">🔍</div>
                        <h2 className="text-[15px] font-semibold text-slate-700 mb-1">Job Not Found</h2>
                        <p className="text-[13px] text-slate-500">{error}</p>
                    </div>
                )}

                {!loading && job && (
                    <>
                        {/* Tab bar */}
                        <div className="flex rounded-xl overflow-hidden border border-slate-200 mb-3 bg-white shadow-sm">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-2.5 text-[11px] font-semibold transition-colors ${activeTab === tab.id ? 'bg-teal-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* ── STATUS TAB ── */}
                        {activeTab === 'status' && (
                            <>
                                <div className={`rounded-2xl p-5 mb-3 ${meta.bg} border ${meta.border} shadow-sm`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">{meta.icon}</span>
                                            <div>
                                                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Current Status</p>
                                                <p className={`text-[18px] font-bold ${meta.color}`}>{status || 'Unknown'}</p>
                                            </div>
                                        </div>
                                        {!isTerminal && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 border border-slate-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                                                <span className="text-[10px] text-slate-500 font-medium">Live</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[12px] text-slate-600">{meta.message}</p>
                                    {job.eta && (
                                        <div className={`mt-3 pt-3 border-t ${meta.border} flex items-center justify-between`}>
                                            <div>
                                                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                                                    {job.eta.isReady ? 'Status' : 'Estimated Pickup'}
                                                </p>
                                                <p className={`text-[13px] font-bold mt-0.5 ${job.eta.isReady ? 'text-teal-700' : job.eta.isOverdue ? 'text-red-600' : meta.color}`}>
                                                    {job.eta.etaLabel}
                                                </p>
                                                {job.eta.etaIso && !job.eta.isReady && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5">Target: {formatDate(job.eta.etaIso)}</p>
                                                )}
                                            </div>
                                            <span className="text-2xl">{job.eta.isReady ? '✅' : job.eta.isOverdue ? '⏰' : '🕐'}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Quote alert */}
                                {needsQuoteApproval && (
                                    <div
                                        className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3 cursor-pointer hover:bg-amber-100 transition-colors"
                                        onClick={() => setActiveTab('quote')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">💰</span>
                                            <div className="flex-1">
                                                <p className="text-[13px] font-bold text-amber-800">Quote Awaiting Your Approval</p>
                                                <p className="text-[11px] text-amber-700">₹{(job.estimatedCost ?? 0).toLocaleString('en-IN')} — tap to approve or decline</p>
                                            </div>
                                            <span className="text-amber-600 text-lg">→</span>
                                        </div>
                                    </div>
                                )}

                                {/* Progress stepper */}
                                <div className="bg-white rounded-2xl shadow-sm p-5 mb-3">
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-4">Repair Progress</p>
                                    <div className="relative">
                                        <div className="absolute top-3.5 left-3.5 right-3.5 h-0.5 bg-slate-100" />
                                        <div className="absolute top-3.5 left-3.5 h-0.5 bg-teal-400 transition-all duration-700"
                                            style={{ width: currentStep < 0 ? '0%' : `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }} />
                                        <div className="relative flex justify-between">
                                            {STATUS_STEPS.map((step, i) => {
                                                const done = i <= currentStep;
                                                const isCurrent = i === currentStep;
                                                return (
                                                    <div key={step} className="flex flex-col items-center gap-1.5" style={{ width: '20%' }}>
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${done ? isCurrent && !isTerminal ? 'bg-teal-500 text-white ring-2 ring-teal-300 ring-offset-1' : 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                            {done ? '✓' : i + 1}
                                                        </div>
                                                        <span className={`text-[9px] font-medium text-center leading-tight ${done ? 'text-teal-600' : 'text-slate-400'}`}>{step}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="bg-white rounded-2xl shadow-sm p-5 mb-3 space-y-4">
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Job Details</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Reference</p>
                                            <p className="text-[13px] font-bold text-slate-800 font-mono">#{shortId(job.id)}</p>
                                        </div>
                                        {job.device && (
                                            <div>
                                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Device</p>
                                                <p className="text-[13px] font-semibold text-slate-700">{job.device.brand} {job.device.model}</p>
                                                <p className="text-[11px] text-slate-400">{job.device.type}</p>
                                            </div>
                                        )}
                                        <div className="col-span-2">
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Issue Reported</p>
                                            <p className="text-[13px] text-slate-700">{job.problemDesc || '—'}</p>
                                        </div>
                                        {hasQuote && (
                                            <div>
                                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Estimated Cost</p>
                                                <p className="text-[13px] font-bold text-slate-700">₹{(job.estimatedCost ?? 0).toLocaleString('en-IN')}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Checked In</p>
                                            <p className="text-[12px] text-slate-600">{formatDate(job.createdAt)}</p>
                                        </div>
                                        {job.completedAt && (
                                            <div>
                                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Completed</p>
                                                <p className="text-[12px] text-slate-600">{formatDate(job.completedAt)}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Last Updated</p>
                                            <p className="text-[12px] text-slate-600">{formatDate(job.updatedAt)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Device Photos */}
                                {job.photos && job.photos.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm p-5 mb-3">
                                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-4">Device Condition Photos</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {(['before', 'after'] as const).map((type) => {
                                                const filtered = job.photos!.filter((p) => p.type === type);
                                                return (
                                                    <div key={type}>
                                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-2">
                                                            {type === 'before' ? '📷 Intake (Before)' : '📸 Post-Repair (After)'}
                                                        </p>
                                                        <div className="space-y-2">
                                                            {filtered.length > 0 ? (
                                                                filtered.map((p) => (
                                                                    <button key={p.id} onClick={() => setLightboxUrl(p.url)} className="w-full">
                                                                        <img src={p.url} alt={`${type} repair`} className="w-full h-24 object-cover rounded-xl border border-slate-200 hover:opacity-90 transition-opacity cursor-zoom-in" />
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <div className="w-full h-24 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">No photos yet</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {!isTerminal && (
                                    <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm px-4 py-3 mb-3">
                                        <p className="text-[11px] text-slate-400">
                                            Auto-refreshes every minute
                                            {lastRefreshed && <> · last at {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</>}
                                        </p>
                                        <button onClick={() => fetchJob(true)} className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 transition-colors">Refresh ↺</button>
                                    </div>
                                )}

                                <p className="text-center text-[11px] text-slate-400 px-4 mb-6">
                                    Have a question? Use the{' '}
                                    <button onClick={() => setActiveTab('chat')} className="text-teal-600 font-semibold underline">Messages tab</button>
                                    {' '}or visit our service centre and quote{' '}
                                    <span className="font-mono font-semibold text-slate-500">#{shortId(job.id)}</span>.
                                </p>
                            </>
                        )}

                        {/* ── QUOTE TAB ── */}
                        {activeTab === 'quote' && (
                            <div className="bg-white rounded-2xl shadow-sm p-5 mb-3">
                                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-4">Repair Quote</p>
                                {!tokenVerified ? (
                                    <TokenVerify jobId={jobId} onVerified={handleTokenVerified} />
                                ) : (
                                    <QuotePanel job={job} token={token} onDecision={() => fetchJob(true)} />
                                )}
                            </div>
                        )}

                        {/* ── CHAT TAB ── */}
                        {activeTab === 'chat' && (
                            <div className="bg-white rounded-2xl shadow-sm p-5 mb-3">
                                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-3">Messages with Workshop</p>
                                {!tokenVerified ? (
                                    <TokenVerify jobId={jobId} onVerified={handleTokenVerified} />
                                ) : (
                                    <ChatPanel jobId={jobId} token={token} customerName="Customer" />
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

// ── Main Portal ────────────────────────────────────────────────────────────────
type View =
    | { type: 'lookup' }
    | { type: 'book' }
    | { type: 'booked'; jobId: string }
    | { type: 'list'; jobs: JobData[]; customerName?: string }
    | { type: 'detail'; jobId: string };

function TrackContent() {
    const params = useSearchParams();
    const directJobId = params.get('job');

    const [view, setView] = useState<View>(
        directJobId ? { type: 'detail', jobId: directJobId } : { type: 'lookup' }
    );

    useEffect(() => {
        if (view.type === 'detail') {
            const url = new URL(window.location.href);
            url.searchParams.set('job', view.jobId);
            window.history.replaceState(null, '', url.toString());
        } else {
            const url = new URL(window.location.href);
            url.searchParams.delete('job');
            window.history.replaceState(null, '', url.toString());
        }
    }, [view]);

    return (
        <main className="min-h-screen bg-[#eef0f6] flex flex-col items-center justify-start px-4 py-10">
            {/* Brand header */}
            <div className="mb-7 text-center">
                <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: "'Syne', sans-serif" }}>
                    FixHub
                </h1>
                <p className="text-[12px] text-slate-500 mt-0.5">Customer Portal</p>
            </div>

            {view.type === 'lookup' && (
                <>
                    <div className="w-full max-w-md mx-auto mb-5">
                        <div className="bg-white rounded-2xl shadow-sm p-6 mb-3">
                            <h2 className="text-[15px] font-bold text-slate-800 mb-1">Track Your Repair</h2>
                            <p className="text-[12px] text-slate-500 mb-5">
                                Enter your phone number or job reference to see live status, photos, and pickup time — no login needed.
                            </p>
                            <LookupForm onFound={(jobs, name) => setView({ type: 'list', jobs, customerName: name })} />
                        </div>

                        {/* Book a repair CTA */}
                        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-sm p-5 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[14px] font-bold">Need a Repair?</p>
                                    <p className="text-[11px] text-teal-100 mt-0.5">Submit a request online — we'll confirm by phone</p>
                                </div>
                                <button
                                    onClick={() => setView({ type: 'book' })}
                                    className="px-4 py-2 bg-white text-teal-600 rounded-xl text-[12px] font-bold hover:bg-teal-50 transition-colors shrink-0"
                                >
                                    Book Now →
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                        {[
                            { icon: '🔴', label: 'Live status' },
                            { icon: '📷', label: 'Repair photos' },
                            { icon: '🕐', label: 'Pickup ETA' },
                            { icon: '💰', label: 'Quote approval' },
                            { icon: '💬', label: 'In-thread chat' },
                            { icon: '🔒', label: 'No login' },
                        ].map(({ icon, label }) => (
                            <span key={label} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
                                {icon} {label}
                            </span>
                        ))}
                    </div>
                </>
            )}

            {view.type === 'book' && (
                <>
                    <button
                        onClick={() => setView({ type: 'lookup' })}
                        className="w-full max-w-md mx-auto flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700 mb-4 transition-colors"
                    >
                        ← Back
                    </button>
                    <BookRepairForm onBooked={(jobId) => setView({ type: 'booked', jobId })} />
                </>
            )}

            {view.type === 'booked' && (
                <BookingConfirmation jobId={view.jobId} onTrack={() => setView({ type: 'detail', jobId: view.jobId })} />
            )}

            {view.type === 'list' && (
                <div className="w-full max-w-md mx-auto">
                    <button onClick={() => setView({ type: 'lookup' })} className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700 mb-4 transition-colors">
                        ← New search
                    </button>
                    <JobList
                        jobs={view.jobs}
                        customerName={view.customerName}
                        onSelect={(id) => setView({ type: 'detail', jobId: id })}
                    />
                </div>
            )}

            {view.type === 'detail' && (
                <JobDetail jobId={view.jobId} onBack={() => setView({ type: 'lookup' })} />
            )}
        </main>
    );
}

export default function TrackPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#eef0f6] flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                </div>
            }
        >
            <TrackContent />
        </Suspense>
    );
}