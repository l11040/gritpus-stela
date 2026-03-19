import type { ReactNode } from 'react';

type CalloutType = 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION';

const calloutConfig: Record<
  CalloutType,
  { icon: string; color: string; bg: string; border: string }
> = {
  NOTE: {
    icon: 'i',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    border: 'border-blue-400 dark:border-blue-600',
  },
  TIP: {
    icon: '💡',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/50',
    border: 'border-green-400 dark:border-green-600',
  },
  IMPORTANT: {
    icon: '❗',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/50',
    border: 'border-purple-400 dark:border-purple-600',
  },
  WARNING: {
    icon: '⚠️',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    border: 'border-amber-400 dark:border-amber-600',
  },
  CAUTION: {
    icon: '🔴',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/50',
    border: 'border-red-400 dark:border-red-600',
  },
};

interface CalloutProps {
  type: CalloutType;
  children: ReactNode;
}

export function Callout({ type, children }: CalloutProps) {
  const config = calloutConfig[type] || calloutConfig.NOTE;

  return (
    <div
      className={`callout my-4 rounded-lg border-l-4 ${config.border} ${config.bg} p-4`}
    >
      <div
        className={`mb-1 flex items-center gap-2 text-sm font-semibold ${config.color}`}
      >
        <span>{config.icon}</span>
        <span>{type}</span>
      </div>
      <div className="callout-content text-sm leading-relaxed text-foreground">
        {children}
      </div>
    </div>
  );
}

export function isCalloutType(text: string): CalloutType | null {
  const types: CalloutType[] = [
    'NOTE',
    'TIP',
    'IMPORTANT',
    'WARNING',
    'CAUTION',
  ];
  const upper = text.toUpperCase();
  return types.find((t) => upper === t) || null;
}
