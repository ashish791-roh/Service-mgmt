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

function isValidJobId(v: string) {
    // UUIDs are 36 chars; also accept 8-char shortId prefix
    return v.length >= 8;
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
                // Single job → navigate directly to the detail view
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
            {/* Mode toggle */}
            <div className="flex rounded-xl overflow-hidden border border-slate-200 mb-5 bg-white shadow-sm">
                {(['phone', 'jobId'] as const).map((m) => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => { setMode(m); setValue(''); setError(null); }}
                        className={`flex-1 py-2.5 text-[13px] font-semibold transition-colors ${
                            mode === m
                                ? 'bg-teal-500 text-white'
                                : 'text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                        {m === 'phone' ? '📱 Phone Number' : '🔖 Job / Reference ID'}
                    </button>
                ))}
            </div>

            <form onSubmit={handleLookup} className="space-y-3">
                <div className="relative">
                    <input
                        type={mode === 'phone' ? 'tel' : 'text'}
                        value={value}
                        onChange={(e) => { setValue(e.target.value); setError(null); }}
                        placeholder={
                            mode === 'phone'
                                ? 'Enter your registered phone number'
                                : 'Enter Job ID or reference (e.g. ABC12345)'
                        }
                        autoFocus
                        className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-[14px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent shadow-sm"
                    />
                </div>

                {error && (
                    <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading || !value.trim()}
                    className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[14px] font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Looking up…
                        </>
                    ) : (
                        'Find My Repair'
                    )}
                </button>
            </form>

            <p className="text-center text-[11px] text-slate-400 mt-4">
                Your phone number is the one you provided when you dropped off your device.
            </p>
        </div>
    );
}

// ── Job List (multi-job view when phone lookup returns multiple) ───────────────
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
                            {isActive && job.eta && (
                                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                                    job.eta.isOverdue
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-teal-100 text-teal-700'
                                }`}>
                                    {job.eta.etaLabel}
                                </span>
                            )}
                            {!isActive && (
                                <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                                    {job.eta?.etaLabel ?? 'Done'}
                                </span>
                            )}
                        </div>
                        {job.device && (
                            <p className="text-[12px] text-slate-600 mt-2 ml-9">
                                {job.device.brand} {job.device.model}{' '}
                                <span className="text-slate-400">· {job.device.type}</span>
                            </p>
                        )}
                        {job.problemDesc && (
                            <p className="text-[11px] text-slate-500 mt-0.5 ml-9 line-clamp-1">{job.problemDesc}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1.5 ml-9">
                            Checked in: {formatDate(job.createdAt)}
                        </p>
                    </button>
                );
            })}
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
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        // Auto-refresh every 60 seconds while the page is open
        intervalRef.current = setInterval(() => fetchJob(true), 60_000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [fetchJob]);

    const status = job?.status ?? '';
    const meta = STATUS_META[status] ?? STATUS_META['New'];
    const currentStep = STATUS_STEPS.indexOf(status);
    const isTerminal = ['Completed', 'Delivered'].includes(status);

    return (
        <>
            {/* Lightbox */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setLightboxUrl(null)}
                >
                    <img
                        src={lightboxUrl}
                        alt="Device photo"
                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setLightboxUrl(null)}
                        className="absolute top-4 right-4 text-white text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70"
                    >
                        ✕
                    </button>
                </div>
            )}

            <div className="w-full max-w-md mx-auto">
                {/* Back button */}
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700 mb-4 transition-colors"
                >
                    ← Back to search
                </button>

                {/* Loading */}
                {loading && (
                    <div className="bg-white rounded-2xl shadow-sm p-10 flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-[13px] text-slate-400">Loading job details…</p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                        <div className="text-4xl mb-3">🔍</div>
                        <h2 className="text-[15px] font-semibold text-slate-700 mb-1">Job Not Found</h2>
                        <p className="text-[13px] text-slate-500">{error}</p>
                    </div>
                )}

                {/* Job card */}
                {!loading && job && (
                    <>
                        {/* Status hero */}
                        <div className={`rounded-2xl p-5 mb-3 ${meta.bg} border ${meta.border} shadow-sm`}>
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{meta.icon}</span>
                                    <div>
                                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Current Status</p>
                                        <p className={`text-[18px] font-bold ${meta.color}`}>{status || 'Unknown'}</p>
                                    </div>
                                </div>
                                {/* Live indicator */}
                                {!isTerminal && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 border border-slate-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                                        <span className="text-[10px] text-slate-500 font-medium">Live</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-[12px] text-slate-600">{meta.message}</p>

                            {/* ETA */}
                            {job.eta && (
                                <div className={`mt-3 pt-3 border-t ${meta.border} flex items-center justify-between`}>
                                    <div>
                                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                                            {job.eta.isReady ? 'Status' : 'Estimated Pickup'}
                                        </p>
                                        <p className={`text-[13px] font-bold mt-0.5 ${
                                            job.eta.isReady
                                                ? 'text-teal-700'
                                                : job.eta.isOverdue
                                                ? 'text-red-600'
                                                : meta.color
                                        }`}>
                                            {job.eta.etaLabel}
                                        </p>
                                        {job.eta.etaIso && !job.eta.isReady && (
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                Target: {formatDate(job.eta.etaIso)}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-2xl">
                                        {job.eta.isReady ? '✅' : job.eta.isOverdue ? '⏰' : '🕐'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Progress stepper */}
                        <div className="bg-white rounded-2xl shadow-sm p-5 mb-3">
                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-4">Repair Progress</p>
                            <div className="relative">
                                <div className="absolute top-3.5 left-3.5 right-3.5 h-0.5 bg-slate-100" />
                                <div
                                    className="absolute top-3.5 left-3.5 h-0.5 bg-teal-400 transition-all duration-700"
                                    style={{
                                        width: currentStep < 0
                                            ? '0%'
                                            : `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%`,
                                    }}
                                />
                                <div className="relative flex justify-between">
                                    {STATUS_STEPS.map((step, i) => {
                                        const done = i <= currentStep;
                                        const isCurrent = i === currentStep;
                                        return (
                                            <div key={step} className="flex flex-col items-center gap-1.5" style={{ width: '20%' }}>
                                                <div
                                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                                        done
                                                            ? isCurrent && !isTerminal
                                                                ? 'bg-teal-500 text-white ring-2 ring-teal-300 ring-offset-1'
                                                                : 'bg-teal-500 text-white'
                                                            : 'bg-slate-100 text-slate-400'
                                                    }`}
                                                >
                                                    {done ? '✓' : i + 1}
                                                </div>
                                                <span className={`text-[9px] font-medium text-center leading-tight ${done ? 'text-teal-600' : 'text-slate-400'}`}>
                                                    {step}
                                                </span>
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
                                        <p className="text-[13px] font-semibold text-slate-700">
                                            {job.device.brand} {job.device.model}
                                        </p>
                                        <p className="text-[11px] text-slate-400">{job.device.type}</p>
                                    </div>
                                )}
                                <div className="col-span-2">
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Issue Reported</p>
                                    <p className="text-[13px] text-slate-700">{job.problemDesc || '—'}</p>
                                </div>
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
                                                            <button
                                                                key={p.id}
                                                                onClick={() => setLightboxUrl(p.url)}
                                                                className="w-full"
                                                            >
                                                                <img
                                                                    src={p.url}
                                                                    alt={`${type} repair`}
                                                                    className="w-full h-24 object-cover rounded-xl border border-slate-200 hover:opacity-90 transition-opacity cursor-zoom-in"
                                                                />
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="w-full h-24 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                                                            No photos yet
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Auto-refresh notice + manual refresh */}
                        {!isTerminal && (
                            <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm px-4 py-3 mb-3">
                                <p className="text-[11px] text-slate-400">
                                    Auto-refreshes every minute
                                    {lastRefreshed && (
                                        <> · last at {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</>
                                    )}
                                </p>
                                <button
                                    onClick={() => fetchJob(true)}
                                    className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                                >
                                    Refresh ↺
                                </button>
                            </div>
                        )}

                        {/* Footer note */}
                        <p className="text-center text-[11px] text-slate-400 px-4 mb-6">
                            For queries, please visit our service centre and quote reference{' '}
                            <span className="font-mono font-semibold text-slate-500">#{shortId(job.id)}</span>.
                        </p>
                    </>
                )}
            </div>
        </>
    );
}

// ── Main Portal ────────────────────────────────────────────────────────────────
type View =
    | { type: 'lookup' }
    | { type: 'list'; jobs: JobData[]; customerName?: string }
    | { type: 'detail'; jobId: string };

function TrackContent() {
    const params = useSearchParams();
    const router = useRouter();
    const directJobId = params.get('job');

    const [view, setView] = useState<View>(
        directJobId ? { type: 'detail', jobId: directJobId } : { type: 'lookup' }
    );

    // Sync URL when user navigates to detail
    useEffect(() => {
        if (view.type === 'detail') {
            const url = new URL(window.location.href);
            url.searchParams.set('job', view.jobId);
            window.history.replaceState(null, '', url.toString());
        } else if (view.type !== 'detail') {
            const url = new URL(window.location.href);
            url.searchParams.delete('job');
            window.history.replaceState(null, '', url.toString());
        }
    }, [view]);

    return (
        <main className="min-h-screen bg-[#eef0f6] flex flex-col items-center justify-start px-4 py-10">
            {/* Brand header */}
            <div className="mb-7 text-center">
                <h1
                    className="text-2xl font-bold text-slate-800"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                >
                    FixHub
                </h1>
                <p className="text-[12px] text-slate-500 mt-0.5">Repair Tracking Portal</p>
            </div>

            {/* Views */}
            {view.type === 'lookup' && (
                <>
                    <div className="w-full max-w-md mx-auto mb-5">
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <h2 className="text-[15px] font-bold text-slate-800 mb-1">Track Your Repair</h2>
                            <p className="text-[12px] text-slate-500 mb-5">
                                Enter your phone number or job reference to see live status, photos, and pickup time — no login needed.
                            </p>
                            <LookupForm
                                onFound={(jobs, name) =>
                                    setView({ type: 'list', jobs, customerName: name })
                                }
                            />
                        </div>
                    </div>

                    {/* Benefit pills */}
                    <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                        {[
                            { icon: '🔴', label: 'Live status' },
                            { icon: '📷', label: 'Repair photos' },
                            { icon: '🕐', label: 'Pickup ETA' },
                            { icon: '🔒', label: 'No login' },
                        ].map(({ icon, label }) => (
                            <span
                                key={label}
                                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200"
                            >
                                {icon} {label}
                            </span>
                        ))}
                    </div>
                </>
            )}

            {view.type === 'list' && (
                <div className="w-full max-w-md mx-auto">
                    <button
                        onClick={() => setView({ type: 'lookup' })}
                        className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700 mb-4 transition-colors"
                    >
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
                <JobDetail
                    jobId={view.jobId}
                    onBack={() => {
                        // If we came from a list, go back to it; else go to lookup
                        setView({ type: 'lookup' });
                    }}
                />
            )}
        </main>
    );
}

// Suspense boundary required by Next.js for useSearchParams()
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
