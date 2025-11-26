import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { monitoringAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './AdminPage.css';
import '../components/admin/ReportsSection.css';

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null); // 오늘 요약 KPI
  const [overallStats, setOverallStats] = useState<{ total: number; defects: number }>({
    total: 0,
    defects: 0,
  }); // 전체 DB 기준
  const [recentDefects, setRecentDefects] = useState<any[]>([]);
  const [perDetectorStats, setPerDetectorStats] = useState<Record<string, { ok: number; ng: number }>>({});
  const [perDetectorSeries, setPerDetectorSeries] = useState<Record<string, { label: string; rate: number }[]>>({});
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleString('ko-KR'));
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fetchData = async () => {
    try {
      const now = new Date();
      const windowEndTs = now.getTime();
      const windowStartTs = windowEndTs - 10 * 60 * 1000; // 최근 10분

      const [statsRes, historyRes] = await Promise.all([
        monitoringAPI.getStatsSummary('today'),
        // 전체 DB 기준 이력 조회 (날짜 필터 없이)
        monitoringAPI.getHistory({ limit: 100000 }),
      ]);

      setStats(statsRes.data);

      const allLogs = historyRes.data.logs || [];

      // 전체 DB 기준 총 검사 수 / 불량 수 (원형 그래프, 검출기, 최근 불량 로그용)
      const totalAll = allLogs.length;
      const defectsAll = allLogs.filter((log: any) => log.final_verdict === 'NG').length;
      setOverallStats({ total: totalAll, defects: defectsAll });

      // 시계열 계산용: 최근 10분 구간 로그만 필터링
      const logs = allLogs.filter(
        (log: any) =>
          new Date(log.timestamp).getTime() >= windowStartTs &&
          new Date(log.timestamp).getTime() <= windowEndTs,
      );
      const perDetector: Record<string, { ok: number; ng: number }> = {};
      allLogs.forEach((log: any) => {
        const id = log.detector_id || '기타';
        if (!perDetector[id]) {
          perDetector[id] = { ok: 0, ng: 0 };
        }
        if (log.final_verdict === 'OK') {
          perDetector[id].ok += 1;
        } else if (log.final_verdict === 'NG') {
          perDetector[id].ng += 1;
        }
      });
      setPerDetectorStats(perDetector);

      // Detector별 시간대별 불량률(최근 10분, 1분 단위)
      const seriesByDetector: Record<string, { label: string; rate: number }[]> = {};
      const buckets: Record<string, { total: number; ng: number }> = {};

      logs.forEach((log: any) => {
        const detId = log.detector_id || '기타';
        const ts = new Date(log.timestamp).getTime();
        const minuteIndex = Math.max(
          0,
          Math.min(10, Math.floor((ts - windowStartTs) / (60 * 1000))),
        );
        const bucketKey = `${detId}_${minuteIndex}`;

        if (!buckets[bucketKey]) {
          buckets[bucketKey] = { total: 0, ng: 0 };
        }
        buckets[bucketKey].total += 1;
        if (log.final_verdict === 'NG') buckets[bucketKey].ng += 1;
      });

      ['1호기', '2호기', '3호기'].forEach((detId) => {
        const series: { label: string; rate: number }[] = [];
        for (let i = 0; i <= 10; i++) {
          const bucketKey = `${detId}_${i}`;
          const bucket = buckets[bucketKey];
          const t = new Date(windowStartTs + i * 60 * 1000);
          const label = `${t.getHours().toString().padStart(2, '0')}:${t
            .getMinutes()
            .toString()
            .padStart(2, '0')}`;
          // 불량률 산식: (해당 1분 동안 NG 수 / 해당 1분 총 검사 수)
          const rate =
            bucket && bucket.total > 0 ? (bucket.ng / bucket.total) * 100 : 0;
          series.push({ label, rate });
        }
        seriesByDetector[detId] = series;
      });

      setPerDetectorSeries(seriesByDetector);

      // 최근 NG 불량 로그 3개 (전체 로그 기준)
      const recentNg = allLogs
        .filter((log: any) => log.final_verdict === 'NG')
        .sort(
          (a: any, b: any) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, 3);
      setRecentDefects(recentNg);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const renderLinePath = (points: { label: string; rate: number }[]) => {
    if (!points.length) return '';
    const maxRate = Math.max(100, ...points.map((p) => p.rate));
    const width = 100;
    const height = 40;
    const stepX = points.length > 1 ? width / (points.length - 1) : 0;

    return points
      .map((p, idx) => {
        const x = idx * stepX;
        const y = height - (p.rate / maxRate) * height;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  };

  const openDetailModal = async (logId: string) => {
    setIsModalOpen(true);
    setDetailLoading(true);
    setSelectedLog(null);
    try {
      const res = await monitoringAPI.getDefectDetail(logId);
      setSelectedLog(res.data);
    } catch (error) {
      console.error('Failed to fetch defect detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedLog(null);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString('ko-KR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="admin-page">
      <header className="admin-navbar">
        <div className="admin-navbar__logo">Smart QC Platform</div>
        <nav className="admin-navbar__links">
          <Link to="/main" className="active">
            대시보드
          </Link>
          <Link to="/history">검사 이력</Link>
          <Link to="/inspection">수동 검사</Link>
          {user?.role === 'admin' ? (
            <Link to="/admin">관리자 페이지</Link>
          ) : (
            <Link to="/mypage">마이페이지</Link>
          )}
        </nav>
        <div className="admin-navbar__right">
          <div className="admin-navbar__profile">
            <span className="admin-navbar__user">
              {user?.name || user?.username || '사용자'}
            </span>
            <button onClick={handleLogout}>로그아웃</button>
          </div>
        </div>
      </header>
      <main className="admin-content">{children}</main>
    </div>
  );

  if (loading) {
    return (
      <Shell>
        <div className="admin-card">
          <div className="loading-state">로딩 중...</div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="admin-header">
        <div>
          <p className="admin-header__subtitle">실시간 품질 모니터링</p>
          <h1>대시보드</h1>
        </div>
        <div className="admin-header__clock">{currentTime}</div>
      </div>

      {/* KPI 카드 (ReportsSection 스타일 활용) */}
      <section className="admin-card">
        <div className="stats-grid">
          <div className="stat-card stat-card--primary">
            <div className="stat-card__label">총 검사 수 (오늘)</div>
            <div className="stat-card__value">{stats?.total_scans || 0}</div>
          </div>
          <div className="stat-card stat-card--danger">
            <div className="stat-card__label">불량품 수</div>
            <div className="stat-card__value">{stats?.defects || 0}</div>
          </div>
          <div className="stat-card stat-card--warning">
            <div className="stat-card__label">불량률</div>
            <div className="stat-card__value">
              {((stats?.defect_rate || 0) * 100).toFixed(2)}%
            </div>
          </div>
          <div className="stat-card stat-card--orange">
            <div className="stat-card__label">누적 검사 수</div>
            <div className="stat-card__value">{stats?.cumulative_usage || 0}</div>
          </div>
        </div>
      </section>

      {/* 하단 메인 영역: 원형 그래프 / 막대그래프 / 최근 불량 로그 */}
      <section className="admin-card dashboard-main-row">
        {/* 총 검사 수 - 원형 그래프 */}
        <div className="dashboard-panel">
          <h2 className="text-xl font-bold mb-4">총 검사 수</h2>
          <div className="pie-chart">
            {overallStats.total ? (
              <>
                {(() => {
                  const total = overallStats.total || 0;
                  const defects = overallStats.defects || 0;
                  const normal = Math.max(total - defects, 0);
                  const defectRate = total > 0 ? (defects / total) * 100 : 0;
                  return (
                    <>
                      <div
                        className="pie-chart__circle"
                        style={{
                          background: `conic-gradient(#ef4444 0 ${defectRate}%, #2563eb ${defectRate}% 100%)`,
                        }}
                      >
                        <div className="pie-chart__center">{total}</div>
                      </div>
                      <div className="pie-chart__legend">
                        <div>
                          <span className="legend-dot legend-dot--ng" />
                          불량품 {defects}건
                        </div>
                        <div>
                          <span className="legend-dot legend-dot--ok" />
                          정상품 {normal}건
                        </div>
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <div className="empty-state">데이터가 없습니다.</div>
            )}
          </div>
        </div>

        {/* 검출기 누적 사용 - 막대그래프 */}
        <div className="dashboard-panel">
          <h2 className="text-xl font-bold mb-4">검출기</h2>
          <div className="bar-chart">
            {['1호기', '2호기', '3호기'].map(id => {
              const data = perDetectorStats[id] || { ok: 0, ng: 0 };
              const total = data.ok + data.ng || 1;
              const maxTotal = Math.max(
                1,
                ...Object.values(perDetectorStats).map(v => v.ok + v.ng || 0),
              );
              const heightOk = (data.ok / maxTotal) * 100;
              const heightNg = (data.ng / maxTotal) * 100;

              return (
                <div key={id} className="bar-chart__item">
                  <div className="bar-chart__bar">
                    <div
                      className="bar bar--ng"
                      style={{ height: `${heightNg}%` }}
                      title={`NG: ${data.ng}`}
                    />
                    <div
                      className="bar bar--ok"
                      style={{ height: `${heightOk}%` }}
                      title={`OK: ${data.ok}`}
                    />
                  </div>
                  <div className="bar-chart__label">{id}</div>
                  <div className="bar-chart__total">{total}건</div>
                </div>
              );
            })}
          </div>
          <div className="bar-chart__legend">
            <span className="legend-dot legend-dot--ok" /> 정상(OK)
            <span className="legend-dot legend-dot--ng" /> 불량(NG)
          </div>
        </div>

        {/* 최근 불량 로그 */}
        <div className="dashboard-panel dashboard-panel--logs">
          <h2 className="text-xl font-bold mb-2">최근 불량품 로그</h2>
          <p className="admin-header__subtitle">가장 최근 NG 판정 3건</p>
          <ul className="recent-logs__list">
            {recentDefects.slice(0, 3).map(defect => (
              <li key={defect.log_id}>
                <button
                  type="button"
                  className="recent-log-link"
                  onClick={() => openDetailModal(defect.log_id)}
                >
                  {defect.log_id}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 각 호기별 시계열 그래프 (시간 vs 불량률) */}
      <section className="admin-card timeseries-section">
        {['1호기', '2호기', '3호기'].map((id) => {
          const series = perDetectorSeries[id] || [];
          return (
            <div key={id} className="timeseries-card">
              <h2 className="text-lg font-bold mb-2">{id}</h2>
              {series.length === 0 ? (
                <div className="empty-state small">데이터가 없습니다.</div>
              ) : (
                <div className="line-chart">
                  <div className="line-chart__ylabel">불량률(%)</div>
                  <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                    <path
                      d={renderLinePath(series)}
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="line-chart__axis">
                    <span>{series[0].label}</span>
                    <span>{series[Math.max(series.length - 1, 0)].label}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* 검사 상세 팝업 */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <p className="admin-header__subtitle">검사 상세 정보</p>
                <h2>{selectedLog?.log_id || '상세보기'}</h2>
              </div>
              <button type="button" className="pill-btn pill-btn--danger" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="modal__body">
              {detailLoading && <div className="loading-state">로딩 중...</div>}
              {!detailLoading && selectedLog && (
                <div className="modal-detail-grid">
                  <div className="modal-image-wrapper">
                    {selectedLog.image_url ? (
                      <img
                        src={selectedLog.image_url}
                        alt={selectedLog.log_id}
                        className="modal-image"
                      />
                    ) : (
                      <div className="empty-state">이미지 정보가 없습니다.</div>
                    )}
                  </div>
                  <div className="modal-detail-info">
                    <div className="detail-row">
                      <span className="detail-label">검사 장비</span>
                      <span className="detail-value">{selectedLog.detector_id}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">판정 결과</span>
                      <span className="detail-value">{selectedLog.final_verdict}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">신뢰도</span>
                      <span className="detail-value">
                        {(selectedLog.confidence_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">검사 시각</span>
                      <span className="detail-value">
                        {new Date(selectedLog.timestamp).toLocaleString('ko-KR')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </Shell>
  );
};

export default DashboardPage;
