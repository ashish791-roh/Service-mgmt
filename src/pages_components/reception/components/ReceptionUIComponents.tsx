import React from 'react';
import { ChevronRight } from 'lucide-react';

// ── PageHeader ─────────────────────────────────────────────────
export const PageHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-gray-200">
    <div>
      <h1 className="text-[18px] font-medium text-gray-900">{title}</h1>
      <p className="text-[13px] font-normal text-teal-500 mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
);

// ── Card ───────────────────────────────────────────────────────
export const Card = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}
  >
    {children}
  </div>
);

// ── MetricCard ─────────────────────────────────────────────────
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size: number }>;
  colorClass: string;
  sub?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  colorClass,
  sub,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group ${
      onClick
        ? 'cursor-pointer hover:border-teal-300 hover:shadow-md transition-all'
        : ''
    }`}
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon size={20} />
      </div>
      <div className="flex items-center gap-2">
        {sub && (
          <span className="bg-rose-100 text-rose-600 text-[11px] font-medium px-2.5 py-1 rounded-md uppercase tracking-wide">
            {sub}
          </span>
        )}
        {onClick && (
          <span className="text-[10px] font-medium text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            Details <ChevronRight size={12} />
          </span>
        )}
      </div>
    </div>
    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
      {title}
    </p>
    <h3 className="text-[24px] font-medium text-gray-900 leading-none">{value}</h3>
  </div>
);

// ── Button ────────────────────────────────────────────────────
type ButtonVariant =
  | 'primary'
  | 'success'
  | 'danger'
  | 'outline'
  | 'outline_danger'
  | 'ghost';

interface ButtonProps {
  icon?: React.ComponentType<{ size: number }>;
  text: string;
  onClick: () => void;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  icon: Icon,
  text,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
}) => {
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-gray-900 text-white hover:bg-gray-800',
    success: 'bg-green-500 text-white hover:bg-green-600',
    danger: 'bg-rose-500 text-white hover:bg-rose-600',
    outline: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50',
    outline_danger: 'bg-white border border-rose-200 text-rose-600 hover:bg-rose-50',
    ghost: 'bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-[13px] transition-colors ${styles[variant]} ${className} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {Icon && <Icon size={16} />}
      {text}
    </button>
  );
};
