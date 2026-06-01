import React from 'react';

interface BarChartProps {
  data: { label: string; value: number; secondaryValue?: number; secondaryColor?: string }[];
  height?: number;
  barColor?: string;
  label?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data, height = 140, barColor = '#14b8a6', label,
}) => {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const W = 600;
  const H = height;
  const padT = 20, padB = 28, padL = 8, padR = 8;
  const chartH = H - padT - padB;
  const barW = Math.floor((W - padL - padR) / data.length);
  const gap = Math.max(2, Math.floor(barW * 0.18));

  return (
    <div className="w-full overflow-x-auto">
      {label && <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 280 }}>
        {data.map((d, i) => {
          const bH = Math.max(Math.round((d.value / maxVal) * chartH), d.value > 0 ? 3 : 0);
          const secH = d.secondaryValue != null
            ? Math.max(Math.round((d.secondaryValue / maxVal) * chartH), d.secondaryValue > 0 ? 3 : 0)
            : 0;
          const x = padL + i * barW + gap / 2;
          const bWidth = barW - gap;
          const y = padT + chartH - bH;

          return (
            <g key={d.label}>
              {/* primary bar */}
              <rect x={x} y={y} width={bWidth} height={bH} fill={barColor} rx={2} opacity={0.9} />
              {/* secondary bar overlaid */}
              {d.secondaryValue != null && secH > 0 && (
                <rect
                  x={x} y={padT + chartH - secH}
                  width={bWidth} height={secH}
                  fill={d.secondaryColor ?? '#86efac'} rx={2} opacity={0.85}
                />
              )}
              {/* value label */}
              {d.value > 0 && (
                <text x={x + bWidth / 2} y={y - 4} textAnchor="middle" fontSize={8} fill="#6b7280" fontWeight={600}>
                  {d.value >= 1000 ? `${(d.value / 1000).toFixed(0)}k` : d.value}
                </text>
              )}
              {/* x label */}
              <text x={x + bWidth / 2} y={H - 4} textAnchor="middle" fontSize={8} fill="#9ca3af">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
