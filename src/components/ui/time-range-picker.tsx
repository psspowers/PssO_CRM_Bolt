import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar as CalendarComponent } from './calendar';
import { VelocityTimeRange, DateRange } from '@/lib/api/velocity';
import { format } from 'date-fns';

interface TimeRangePickerProps {
  value: VelocityTimeRange;
  customRange?: DateRange;
  onChange: (range: VelocityTimeRange, customRange?: DateRange) => void;
  className?: string;
}

const rangeOptions: { value: VelocityTimeRange; label: string }[] = [
  { value: 'wow', label: 'Week over Week' },
  { value: 'mom', label: 'Month over Month' },
  { value: '3m', label: 'Last 3 Months' },
  { value: 'custom', label: 'Custom Range' }
];

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  value,
  customRange,
  onChange,
  className = ''
}) => {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(customRange?.start);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(customRange?.end);

  const currentLabel = rangeOptions.find(o => o.value === value)?.label || 'Select Range';

  const handleRangeChange = (newRange: VelocityTimeRange) => {
    if (newRange === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
      onChange(newRange);
    }
  };

  const handleApplyCustomRange = () => {
    if (tempStartDate && tempEndDate) {
      onChange('custom', { start: tempStartDate, end: tempEndDate });
      setShowCustomPicker(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="justify-between min-w-[200px] bg-white"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">{currentLabel}</span>
            </div>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col">
            {rangeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => handleRangeChange(option.value)}
                className={`px-4 py-2 text-left text-sm hover:bg-slate-100 transition-colors ${
                  value === option.value ? 'bg-slate-50 font-medium text-orange-600' : ''
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {showCustomPicker && (
        <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Start Date</p>
                <CalendarComponent
                  mode="single"
                  selected={tempStartDate}
                  onSelect={setTempStartDate}
                  disabled={(date) => date > new Date()}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">End Date</p>
                <CalendarComponent
                  mode="single"
                  selected={tempEndDate}
                  onSelect={setTempEndDate}
                  disabled={(date) => date > new Date() || (tempStartDate ? date < tempStartDate : false)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleApplyCustomRange}
                  disabled={!tempStartDate || !tempEndDate}
                  className="flex-1"
                >
                  Apply
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCustomPicker(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {value === 'custom' && customRange && (
        <div className="text-xs text-slate-500 ml-2">
          {format(customRange.start, 'MMM d')} - {format(customRange.end, 'MMM d, yyyy')}
        </div>
      )}
    </div>
  );
};
