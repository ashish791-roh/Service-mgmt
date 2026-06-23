import React from 'react';

let injected = false;

const injectStyle = () => {
  if (typeof document === 'undefined' || injected) return;
  if (document.getElementById('fixhub-skeleton-style')) {
    injected = true;
    return;
  }
  const el = document.createElement('style');
  el.id = 'fixhub-skeleton-style';
  el.innerHTML = `@keyframes skeleton-pulse { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;
  document.head.appendChild(el);
  injected = true;
};

const pulse: React.CSSProperties = {
  animation: 'skeleton-pulse 1.4s ease-in-out infinite',
  background: 'linear-gradient(90deg, #f3f4f6 25%, #e9eaec 50%, #f3f4f6 75%)',
  backgroundSize: '200% 100%',
  borderRadius: 8,
  contain: 'strict',
  willChange: 'background-position',
};

export const SkeletonLine: React.FC<{ width?: string | number; height?: number; className?: string }> = ({
  width = '100%',
  height = 14,
  className = '',
}) => {
  injectStyle();
  return (
    <div
      style={{ ...pulse, width, height }}
      className={className}
      data-skeleton
    />
  );
};

export const SkeletonCard: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div
    style={{ padding: 16, borderRadius: 12, border: '1px solid #f1f5f9', background: 'white' }}
    data-skeleton="card"
  >
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonLine
        key={i}
        width={i === 0 ? '60%' : i === rows - 1 ? '40%' : '90%'}
        height={i === 0 ? 16 : 12}
        className="mb-3"
      />
    ))}
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full space-y-4" data-skeleton="table">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 py-2 border-b border-gray-100">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine
              key={c}
              width={c === 0 ? '15%' : c === cols - 1 ? '10%' : '25%'}
              height={14}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const SkeletonJobCard: React.FC = () => {
  return (
    <div className="p-4 rounded-xl border border-gray-100 bg-white space-y-4" data-skeleton="job-card">
      <div className="flex justify-between items-center">
        <SkeletonLine width="30%" height={16} />
        <SkeletonLine width="20%" height={20} className="rounded-full" />
      </div>
      <div className="space-y-2">
        <SkeletonLine width="90%" height={12} />
        <SkeletonLine width="60%" height={12} />
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-gray-50">
        <SkeletonLine width="25%" height={10} />
        <SkeletonLine width="15%" height={12} />
      </div>
    </div>
  );
};
