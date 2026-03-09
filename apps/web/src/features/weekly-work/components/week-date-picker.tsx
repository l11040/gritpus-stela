'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatDateToYmd,
  formatWeekRangeLabel,
  getCurrentWeekStartDate,
  normalizeToWeekStartDate,
  parseYmdDate,
} from '@/features/weekly-work/utils';

interface WeekDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  allowClear?: boolean;
}

export function WeekDatePicker({
  value,
  onChange,
  placeholder = '주 선택',
  className,
  buttonClassName,
  allowClear = true,
}: WeekDatePickerProps) {
  const weekStart = parseYmdDate(value);
  const todayWeekStart = getCurrentWeekStartDate();
  const weekRange = weekStart
    ? {
      from: weekStart,
      to: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6),
    }
    : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('justify-start text-left font-normal', buttonClassName)}
        >
          <CalendarDays className="size-4" />
          <span>{value ? formatWeekRangeLabel(value) : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-auto p-0', className)} align="start">
        <Calendar
          mode="range"
          selected={weekRange}
          onDayClick={(day) => {
            onChange(normalizeToWeekStartDate(formatDateToYmd(day)));
          }}
        />
        <div className="flex items-center gap-1 border-t px-2 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 flex-1 text-xs text-muted-foreground"
            onClick={() => onChange(todayWeekStart)}
            disabled={value === todayWeekStart}
          >
            오늘 해당 주로 이동
          </Button>
          {allowClear && value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => onChange('')}
            >
              날짜 지우기
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
