import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Filter as FilterIcon } from 'lucide-react';
import DateRangePicker from '../components/admin/DateRangePicker';
import { monitoringAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './AdminPage.css';
import '../components/admin/ReportsSection.css';

/**
 * InspectionHistoryPage - 검사 이력 조회 페이지
 *
 * 기능:
 * - 날짜, 장비, 판정 결과별 필터링
 * - 페이지네이션
 * - 상세 페이지로 이동
 */
const InspectionHistoryPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState<{
    detector_id?: string;
    start_date?: string;
    end_date?: string;
    verdict?: string;
  }>({});

  // UI 입력값 (적용 버튼을 눌렀을 때 filters로 반영)
  const [uiFilters, setUiFilters] = useState<{
    detector_id?: string;
    start_date?: string;
    end_date?: string;
    verdict?: string;
  }>({});

  // 상세 팝업 상태
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const fetchHistory = async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await monitoringAPI.getHistory({
        ...filters,
        page,
        limit: pagination.limit,
      });

      setLogs(response.data.logs);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, [filters]);

  const handleFilterReset = () => {
    setUiFilters({});
    setFilters({});
  };

  const handlePageChange = (newPage: number) => {
    fetchHistory(newPage);
  };

  const applyFilters = () => {
    const cleaned: any = {};
    if (uiFilters.detector_id) cleaned.detector_id = uiFilters.detector_id;
    if (uiFilters.start_date) cleaned.start_date = uiFilters.start_date;
    if (uiFilters.end_date) cleaned.end_date = uiFilters.end_date;
    if (uiFilters.verdict) cleaned.verdict = uiFilters.verdict;
    setFilters(cleaned);
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

  const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="admin-page">
      <header className="admin-navbar">
        <div className="admin-navbar__logo">Smart QC Platform</div>
        <nav className="admin-navbar__links">
          <Link to="/main">대시보드</Link>
          <Link to="/history" className="active">
            검사 이력
          </Link>
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
          <p className="admin-header__subtitle">검사 이력 조회</p>
          <h1>검사 이력</h1>
        </div>
      </div>

      {/* 필터 + 요약 (ReportsSection 스타일 참고) */}
      <section className="admin-card">
        <div className="report-card">
          <div className="card-header">
            <FilterIcon size={20} />
            <h2>검사 이력 필터</h2>
          </div>
          <p className="card-subtitle">기간, 장비, 판정 결과를 선택해 이력을 조회하세요</p>

          <DateRangePicker
            startDate={uiFilters.start_date || ''}
            endDate={uiFilters.end_date || ''}
            onStartDateChange={(date) =>
              setUiFilters((prev) => ({ ...prev, start_date: date || undefined }))
            }
            onEndDateChange={(date) =>
              setUiFilters((prev) => ({ ...prev, end_date: date || undefined }))
            }
            onQuickSelect={() => {
              // DateRangePicker가 start/end를 이미 세팅하므로 여기서는 특별한 추가 작업 없이 상태만 동기화
              // 필터는 사용자가 '적용'을 눌렀을 때 반영
            }}
          />

          <div className="form-group" style={{ marginTop: '1.25rem' }}>
            <label className="form-label">검사 장비 (선택)</label>
            <select
              value={uiFilters.detector_id || ''}
              onChange={(e) =>
                setUiFilters((prev) => ({
                  ...prev,
                  detector_id: e.target.value || undefined,
                }))
              }
              className="form-select"
            >
              <option value="">전체</option>
              <option value="1호기">1호기</option>
              <option value="2호기">2호기</option>
              <option value="3호기">3호기</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">판정 결과 (선택)</label>
            <select
              value={uiFilters.verdict || ''}
              onChange={(e) =>
                setUiFilters((prev) => ({
                  ...prev,
                  verdict: e.target.value || undefined,
                }))
              }
              className="form-select"
            >
              <option value="">전체</option>
              <option value="OK">OK</option>
              <option value="NG">NG</option>
            </select>
          </div>

          <div className="button-group">
            <button onClick={applyFilters} className="btn btn--primary">
              필터 적용
            </button>
            <button onClick={handleFilterReset} className="btn">
              초기화
            </button>
          </div>

          <div className="mt-4">
            <p className="text-gray-600">
              총 <span className="font-bold text-blue-600">{pagination.total}</span>개의 검사 이력
            </p>
          </div>
        </div>
      </section>

      {/* 이력 테이블 */}
      <section className="admin-card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>로그 ID</th>
                <th>검사 장비</th>
                <th>판정 결과</th>
                <th>신뢰도</th>
                <th>검사 시각</th>
                <th>오탐 여부</th>
                <th className="center">작업</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">
                    검사 이력이 없습니다.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.log_id}>
                    <td>{log.log_id}</td>
                    <td>{log.detector_id}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          log.final_verdict === 'OK'
                            ? 'status-badge--approved'
                            : 'status-badge--ng'
                        }`}
                      >
                        {log.final_verdict}
                      </span>
                    </td>
                    <td>{(log.confidence_score * 100).toFixed(1)}%</td>
                    <td>{new Date(log.timestamp).toLocaleString('ko-KR')}</td>
                    <td>
                      {log.is_false_positive && (
                        <span className="status-badge status-badge--pending">오탐</span>
                      )}
                    </td>
                    <td className="center">
                      <button
                        type="button"
                        className="pill-btn pill-btn--outline"
                        onClick={() => openDetailModal(log.log_id)}
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 페이지네이션 */}
      {pagination.totalPages > 1 && (
        <section className="admin-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">
                <span className="font-medium">{pagination.page}</span> /{' '}
                <span className="font-medium">{pagination.totalPages}</span> 페이지
              </p>
            </div>
            <div>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="pill-btn pill-btn--outline"
              >
                이전
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="pill-btn pill-btn--outline"
                style={{ marginLeft: '0.5rem' }}
              >
                다음
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 상세 팝업 */}
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

export default InspectionHistoryPage;
