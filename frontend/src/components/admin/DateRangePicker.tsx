import React from 'react';
import './DateRangePicker.css';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onQuickSelect?: (range: 'today' | 'week' | 'month') => void;
}

/**
 * DateRangePicker - 날짜 범위 선택 컴포넌트
 *
 * @param startDate - 시작 날짜
 * @param endDate - 종료 날짜
 * @param onStartDateChange - 시작 날짜 변경 핸들러
 * @param onEndDateChange - 종료 날짜 변경 핸들러
 * @param onQuickSelect - 빠른 선택 핸들러 (optional)
 */
const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onQuickSelect,
}) => {
  const handleQuickSelect = (range: 'today' | 'week' | 'month') => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start: string;

    switch (range) {
      case 'today':
        start = end;
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        start = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        start = monthAgo.toISOString().split('T')[0];
        break;
    }

    onStartDateChange(start);
    onEndDateChange(end);
    onQuickSelect?.(range);
  };

  return (
    <div className="date-range-picker">
      {/* Quick Select Buttons */}
      {onQuickSelect && (
        <div className="quick-select-buttons">
          <button
            onClick={() => handleQuickSelect('today')}
            className="quick-select-btn"
          >
            오늘
          </button>
          <button
            onClick={() => handleQuickSelect('week')}
            className="quick-select-btn"
          >
            최근 7일
          </button>
          <button
            onClick={() => handleQuickSelect('month')}
            className="quick-select-btn"
          >
            최근 30일
          </button>
        </div>
      )}

      {/* Date Inputs */}
      <div className="date-inputs-grid">
        <div className="date-input-group">
          <label className="date-label">
            시작 날짜
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            max={endDate}
            className="date-input"
          />
        </div>

        <div className="date-input-group">
          <label className="date-label">
            종료 날짜
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            min={startDate}
            className="date-input"
          />
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;
