import React from 'react';
import { X } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  filters: {
    name: string;
    options: FilterOption[];
    selected: string;
    onChange: (value: string) => void;
  }[];
  onReset: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, title, filters, onReset }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="filter-modal-title">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 id="filter-modal-title" className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full" aria-label="Close filters">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-6">
          {filters.map((filter) => (
            <div key={filter.name}>
              <label className="text-sm font-medium text-gray-700 mb-2 block">{filter.name}</label>
              <div className="flex flex-wrap gap-2">
                {filter.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => filter.onChange(option.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter.selected === option.value
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'

                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600"
          >

            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
