import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface FormatMetricOptions {
  precision?: number;
  locale?: string;
  showSign?: boolean;
}

export function formatMetric(
  value: number,
  type: 'currency' | 'capacity' | 'count' | 'percentage' | 'days',
  options?: FormatMetricOptions
): string {
  const { precision = 1, locale = 'th-TH', showSign = false } = options || {};

  const sign = showSign && value > 0 ? '+' : '';

  switch (type) {
    case 'capacity':
      if (value < 0.01) return `${value.toFixed(3)} MW`;
      if (value < 1) return `${value.toFixed(2)} MW`;
      if (value >= 1000) return `${sign}${(value / 1000).toFixed(precision)} GW`;
      if (value >= 100) return `${sign}${Math.round(value).toLocaleString(locale)} MW`;
      return `${sign}${value.toFixed(precision)} MW`;

    case 'currency':
      if (value >= 1_000_000_000) {
        return `${sign}฿${(value / 1_000_000_000).toFixed(precision)}B`;
      }
      if (value >= 1_000_000) {
        return `${sign}฿${(value / 1_000_000).toFixed(precision)}M`;
      }
      if (value >= 1_000) {
        return `${sign}฿${(value / 1000).toFixed(0)}K`;
      }
      return `${sign}฿${value.toFixed(0)}`;

    case 'percentage':
      return `${sign}${value.toFixed(precision)}%`;

    case 'days':
      if (value === 1) return '1 day';
      if (value < 7) return `${Math.round(value)} days`;
      if (value < 30) return `${(value / 7).toFixed(1)} weeks`;
      if (value < 365) return `${(value / 30).toFixed(1)} months`;
      return `${(value / 365).toFixed(1)} years`;

    case 'count':
      return value.toLocaleString(locale);

    default:
      return value.toString();
  }
}
