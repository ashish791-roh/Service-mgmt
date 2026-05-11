'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_STEPS = ['New', 'Assigned', 'In Progress', 'Completed', 'Delivered'];

const STATUS_META: Record<string, { color: string; bg: string; icon: string; message: string }> = {
    New: {
        color: 'text-slate-600',
        bg: 'bg-slate-100',
        icon: '📋',
        message: 'Your device has been registered and is waiting to be assigned to a technician.',
    },
    Assigned: {
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        icon: '👨‍🔧',
        message: 'A technician has been assigned and will begin working on your device shortly.',
    },
    'In Progress': {
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        icon: '🔧',
        message: 'Your device is currently being repaired by our technician.',
    },
    Completed: {
        color: 'text-teal-600',
        bg: 'bg-teal-50',
        icon: '✅',
        message: 'Repair is complete! Your device is ready for pickup.',
    },
    Delivered: {
        color: 'text-green-600',
        bg: 'bg-green-50',
        icon: '🎉',
        message: 'Your device has been delivered. Thank you for choosing FixHub!',
    },
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface JobData {
    id: string;
    status: string | null;
    problemDesc: string | null;
    createdAt: string | null;
    completedAt: string | null;
    updatedAt: string | null;
    device: { brand: string; type: string; model: string } | null;
}

// ── Helper ─────────────────────────────────────────────────────────────────────
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

// ── Main tracking content ──────────────────────────────────────────────────────
function TrackContent() {
    const params = useSearchParams();
    const jobId = params.get('job');

    const [job, setJob] = useState<JobData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!jobId) {
            setError('No job ID provided. Please scan the QR code again.');
            setLoading(false);
            return;
        }

        fetch(`/api/jobs/${encodeURIComponent(jobId)}/public`)
            .then(async (res) => {
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || 'Job not found.');
                }
                return res.json() as Promise<JobData>;
            })
            .then((data) => {
                setJob(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message || 'Failed to load job details.');
                setLoading(false);
            });
    }, [jobId]);

    const status = job?.status ?? '';
    const meta = STATUS_META[status] ?? STATUS_META['New'];
    const currentStep = STATUS_STEPS.indexOf(status);

    return (
        <main className="min-h-screen bg-[#eef0f6] flex flex-col items-center justify-start px-4 py-10">
            {/* Logo / Brand */}
            <div className="mb-8 text-center">
                <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: "'Syne', sans-serif" }}>
                    FixHub
                </h1>
                <p className="text-[13px] text-slate-500 mt-0.5">Repair Tracking Portal</p>
            </div>

            <div className="w-full max-w-md">

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
                        <div className={`rounded-2xl p-6 mb-4 ${meta.bg} border border-white/60 shadow-sm`}>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-3xl">{meta.icon}</span>
                                <div>
                                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Current Status</p>
                                    <p className={`text-[18px] font-bold ${meta.color}`}>{status}</p>
                                </div>
                            </div>
                            <p className="text-[13px] text-slate-600">{meta.message}</p>
                        </div>

                        {/* Progress stepper */}
                        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
                            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-4">Repair Progress</p>
                            <div className="relative">
                                {/* Track line */}
                                <div className="absolute top-3.5 left-3.5 right-3.5 h-0.5 bg-slate-100" />
                                <div
                                    className="absolute top-3.5 left-3.5 h-0.5 bg-teal-400 transition-all duration-500"
                                    style={{
                                        width: currentStep < 0
                                            ? '0%'
                                            : `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%`,
                                    }}
                                />
                                <div className="relative flex justify-between">
                                    {STATUS_STEPS.map((step, i) => {
                                        const done = i <= currentStep;
                                        return (
                                            <div key={step} className="flex flex-col items-center gap-1.5" style={{ width: '20%' }}>
                                                <div
                                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                                                        done
                                                            ? 'bg-teal-500 text-white'
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
                        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 space-y-4">
                            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Job Details</p>

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
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Issue</p>
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

                        {/* Footer note */}
                        <p className="text-center text-[11px] text-slate-400 px-4">
                            For queries, please visit our service centre and quote reference{' '}
                            <span className="font-mono font-semibold text-slate-500">#{shortId(job.id)}</span>.
                        </p>
                    </>
                )}
            </div>
        </main>
    );
}

// Suspense boundary required by Next.js for useSearchParams()
export default function TrackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#eef0f6] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <TrackContent />
        </Suspense>
    );
}