import React from 'react';

interface FilterBarProps {
  filters: {
    detector_id?: string;
    start_date?: string;
    end_date?: string;
    verdict?: string;
  };
  onFilterChange: (filters: any) => void;
  onReset: () => void;
}

/**
 * FilterBar - 검사 이력 필터링을 위한 재사용 가능한 컴포넌트
 *
 * @param filters - 현재 필터 상태
 * @param onFilterChange - 필터 변경 핸들러
 * @param onReset - 필터 초기화 핸들러
 */
const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange, onReset }) => {
  const handleChange = (key: string, value: string) => {
    onFilterChange({ ...filters, [key]: value || undefined });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <h3 className="text-lg font-semibold mb-4">필터</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Detector ID Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            검사 장비
          </label>
          <select
            value={filters.detector_id || ''}
            onChange={(e) => handleChange('detector_id', e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체</option>
            <option value="1호기">1호기</option>
            <option value="2호기">2호기</option>
            <option value="3호기">3호기</option>
          </select>
        </div>

        {/* Start Date Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            시작 날짜
          </label>
          <input
            type="date"
            value={filters.start_date || ''}
            onChange={(e) => handleChange('start_date', e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* End Date Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            종료 날짜
          </label>
          <input
            type="date"
            value={filters.end_date || ''}
            onChange={(e) => handleChange('end_date', e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Verdict Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            판정 결과
          </label>
          <select
            value={filters.verdict || ''}
            onChange={(e) => handleChange('verdict', e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체</option>
            <option value="OK">정상 (OK)</option>
            <option value="NG">불량 (NG)</option>
          </select>
        </div>
      </div>

      {/* Reset Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={onReset}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
        >
          필터 초기화
        </button>
      </div>
    </div>
  );
};

export default FilterBar;
