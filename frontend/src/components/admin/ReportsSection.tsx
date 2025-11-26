import React, { useState } from 'react';
import { Download, FileText, TrendingUp, AlertTriangle } from 'lucide-react';
import DateRangePicker from './DateRangePicker';
import { adminAPI, monitoringAPI } from '../../services/api';
import './ReportsSection.css';

const ReportsSection: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [detectorId, setDetectorId] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!startDate || !endDate) {
      alert('시작 날짜와 종료 날짜를 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await monitoringAPI.getHistory({
        start_date: startDate,
        end_date: endDate,
        detector_id: detectorId || undefined,
        limit: 100000, // 충분히 큰 값으로 설정하여 모든 데이터 가져오기
      });

      const logs = response.data.logs;
      const totalScans = logs.length;
      const defects = logs.filter((log: any) => log.final_verdict === 'NG').length;
      const defectRate = totalScans > 0 ? (defects / totalScans) * 100 : 0;
      const falsePositives = logs.filter((log: any) => log.is_false_positive).length;

      const byDetector: any = {};
      logs.forEach((log: any) => {
        if (!byDetector[log.detector_id]) {
          byDetector[log.detector_id] = { total: 0, defects: 0, falsePositives: 0 };
        }
        byDetector[log.detector_id].total++;
        if (log.final_verdict === 'NG') byDetector[log.detector_id].defects++;
        if (log.is_false_positive) byDetector[log.detector_id].falsePositives++;
      });

      const hourly: any = {};
      logs.forEach((log: any) => {
        const hour = new Date(log.timestamp).getHours();
        if (!hourly[hour]) hourly[hour] = { total: 0, defects: 0 };
        hourly[hour].total++;
        if (log.final_verdict === 'NG') hourly[hour].defects++;
      });

      const peakHours = Object.entries(hourly)
        .sort(([, a]: any, [, b]: any) => b.defects - a.defects)
        .slice(0, 3);

      setReportData({ totalScans, defects, defectRate, falsePositives, byDetector, peakHours, logs });
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('리포트 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData || !reportData.logs) {
      alert('먼저 리포트를 생성해주세요.');
      return;
    }

    const headers = ['Log ID', 'Detector ID', 'Timestamp', 'Verdict', 'Confidence Score', 'Is False Positive'];
    const rows = reportData.logs.map((log: any) => [
      log.log_id,
      log.detector_id,
      new Date(log.timestamp).toLocaleString('ko-KR'),
      log.final_verdict,
      log.confidence_score,
      log.is_false_positive ? 'Yes' : 'No',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `report_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="reports-section">
      {/* 필터 및 설정 카드 */}
      <div className="report-card">
        <div className="card-header">
          <FileText size={20} />
          <h2>리포트 생성</h2>
        </div>
        <p className="card-subtitle">기간 및 필터를 설정하여 리포트를 생성하세요</p>

        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onQuickSelect={() => {}}
        />

        <div className="form-group">
          <label className="form-label">검사 장비 (선택사항)</label>
          <select
            value={detectorId}
            onChange={(e) => setDetectorId(e.target.value)}
            className="form-select"
          >
            <option value="">전체</option>
            <option value="1호기">1호기</option>
            <option value="2호기">2호기</option>
            <option value="3호기">3호기</option>
          </select>
        </div>

        <div className="button-group">
          <button onClick={generateReport} disabled={loading} className="btn btn--primary">
            <FileText size={18} />
            <span>{loading ? '생성 중...' : '리포트 생성'}</span>
          </button>

          {reportData && (
            <button onClick={exportToCSV} className="btn btn--success">
              <Download size={18} />
              <span>CSV 다운로드</span>
            </button>
          )}
        </div>
      </div>

      {/* 리포트 결과 */}
      {reportData && (
        <div className="report-results">
          {/* 통계 요약 */}
          <div className="report-card">
            <div className="card-header">
              <TrendingUp size={20} />
              <h2>통계 요약</h2>
            </div>

            <div className="stats-grid">
              <div className="stat-card stat-card--primary">
                <div className="stat-card__label">총 검사 수</div>
                <div className="stat-card__value">{reportData.totalScans}</div>
              </div>
              <div className="stat-card stat-card--danger">
                <div className="stat-card__label">불량 건수</div>
                <div className="stat-card__value">{reportData.defects}</div>
              </div>
              <div className="stat-card stat-card--warning">
                <div className="stat-card__label">불량률</div>
                <div className="stat-card__value">{reportData.defectRate.toFixed(2)}%</div>
              </div>
              <div className="stat-card stat-card--orange">
                <div className="stat-card__label">오탐 건수</div>
                <div className="stat-card__value">{reportData.falsePositives}</div>
              </div>
            </div>
          </div>

          {/* 장비별 통계 */}
          <div className="report-card">
            <div className="card-header">
              <h2>장비별 통계</h2>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>장비</th>
                    <th>총 검사 수</th>
                    <th>불량 건수</th>
                    <th>불량률</th>
                    <th>오탐 건수</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(reportData.byDetector).map(([detector, stats]: any) => (
                    <tr key={detector}>
                      <td className="font-semibold">{detector}</td>
                      <td>{stats.total}</td>
                      <td>
                        <span className="text-danger">{stats.defects}</span>
                      </td>
                      <td>{((stats.defects / stats.total) * 100).toFixed(2)}%</td>
                      <td>
                        <span className="text-warning">{stats.falsePositives}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 주요 불량 발생 시간대 */}
          <div className="report-card">
            <div className="card-header">
              <AlertTriangle size={20} />
              <h2>주요 불량 발생 시간대 (Top 3)</h2>
            </div>

            <div className="peak-times">
              {reportData.peakHours.map(([hour, stats]: any, index: number) => (
                <div key={hour} className="peak-time-item">
                  <div className="peak-time-rank">#{index + 1}</div>
                  <div className="peak-time-content">
                    <div className="peak-time-hour">{hour}:00 - {hour}:59</div>
                    <div className="peak-time-stats">
                      불량: <span className="text-danger font-semibold">{stats.defects}</span> / 총: {stats.total}
                      <span className="peak-time-percent">
                        ({((stats.defects / stats.total) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsSection;
