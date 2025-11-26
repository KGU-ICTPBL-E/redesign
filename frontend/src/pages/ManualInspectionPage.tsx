import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, Image as ImageIcon, AlertCircle, CheckCircle, Loader, History, Layers } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './ManualInspectionPage.css';

interface InspectionResult {
  log_id: string;
  detector_id: string;
  timestamp: string;
  final_verdict: 'OK' | 'NG';
  confidence_score: number;
  bbox_coords: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    class: string;
    confidence: number;
  }>;
  image_url: string;
  total_defects: number;
  processing_time_ms: number;
}

interface BatchResult {
  file: string;
  log_id: string;
  verdict: 'OK' | 'NG';
  defects: number;
  image_url?: string;
  error?: string;
}

interface RecentInspection {
  log_id: string;
  detector_id: string;
  final_verdict: 'OK' | 'NG';
  timestamp: string;
  confidence_score: number;
}

type InspectionMode = 'single' | 'batch';

const ManualInspectionPage: React.FC = () => {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  // Mode
  const [mode, setMode] = useState<InspectionMode>('single');

  // Common
  const [detectorId, setDetectorId] = useState<string>('1호기');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentInspections, setRecentInspections] = useState<RecentInspection[]>([]);

  // Single mode
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<InspectionResult | null>(null);

  // Batch mode
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [batchResults, setBatchResults] = useState<{
    total: number;
    successful: number;
    failed: number;
    results: BatchResult[];
  } | null>(null);
  const [batchProgress, setBatchProgress] = useState(0);

  useEffect(() => {
    fetchRecentInspections();
  }, []);

  const fetchRecentInspections = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/inspection/logs?limit=5', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecentInspections(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch recent inspections:', err);
    }
  };

  // Single Mode Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleSingleUpload = async () => {
    if (!selectedFile) {
      setError('이미지를 선택해주세요');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('detector_id', detectorId);

      const response = await fetch('http://localhost:5000/api/inspection/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('검사 요청 실패');
      }

      const data = await response.json();
      setResult(data.log);
      await fetchRecentInspections();
    } catch (err) {
      setError(err instanceof Error ? err.message : '검사 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // Batch Mode Handlers
  const handleMultipleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    setBatchResults(null);
    setError(null);
  };

  const handleBatchUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('이미지를 선택해주세요');
      return;
    }

    setLoading(true);
    setError(null);
    setBatchProgress(0);

    try {
      const results: BatchResult[] = [];
      let successful = 0;
      let failed = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        try {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('detector_id', detectorId);

          const response = await fetch('http://localhost:5000/api/inspection/upload', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            results.push({
              file: file.name,
              log_id: data.log.log_id,
              verdict: data.log.final_verdict,
              defects: data.log.total_defects,
              image_url: data.log.image_url,
            });
            successful++;
          } else {
            results.push({
              file: file.name,
              log_id: '',
              verdict: 'NG',
              defects: 0,
              error: '검사 실패',
            });
            failed++;
          }
        } catch (err) {
          results.push({
            file: file.name,
            log_id: '',
            verdict: 'NG',
            defects: 0,
            error: err instanceof Error ? err.message : '오류 발생',
          });
          failed++;
        }

        setBatchProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      }

      setBatchResults({
        total: selectedFiles.length,
        successful,
        failed,
        results,
      });

      await fetchRecentInspections();
    } catch (err) {
      setError(err instanceof Error ? err.message : '배치 검사 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setSelectedFiles([]);
    setPreviewUrl(null);
    setResult(null);
    setBatchResults(null);
    setError(null);
    setBatchProgress(0);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderRecentInspectionsCard = () => {
    if (recentInspections.length === 0) return null;

    return (
      <div className="inspection-card">
        <div className="section-header">
          <h2>
            <History className="section-header__icon" />
            최근 검사 이력
          </h2>
          <a href="/history" className="section-header__link">
            전체 보기 →
          </a>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>검사기</th>
                <th>판정</th>
                <th>신뢰도</th>
                <th>시간</th>
              </tr>
            </thead>
            <tbody>
              {recentInspections.map((inspection) => (
                <tr key={inspection.log_id}>
                  <td className="log-id">{inspection.log_id}</td>
                  <td>{inspection.detector_id}</td>
                  <td>
                    <span className={`verdict-tag verdict-tag--${inspection.final_verdict.toLowerCase()}`}>
                      {inspection.final_verdict}
                    </span>
                  </td>
                  <td>{(Number(inspection.confidence_score) * 100).toFixed(1)}%</td>
                  <td>{new Date(inspection.timestamp).toLocaleString('ko-KR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSingleMode = () => {
    // 결과가 나온 후에는 업로드 영역을 숨기고, 결과 카드만 세로로 보여준다.
    if (result) {
      return (
        <>
          <div className="single-result-grid">
            {/* Left - 불량 검출 이미지 */}
            <div className="result-card single-result-card">
            <div className="card-header">
              <h2>{result.final_verdict === 'NG' ? '불량 검출 이미지' : '검사 이미지'}</h2>
            </div>
            <div className="result-image">
              <img src={result.image_url} alt="Inspection Result" />
            </div>
            {result.final_verdict === 'NG' && (
              <p className="result-image__caption">빨간색 박스: 검출된 불량 위치</p>
            )}
          </div>

            {/* Right - 검사 결과 요약 */}
            <div className="result-card single-result-card">
              <div className="card-header">
                <h2>검사 결과</h2>
              </div>

              <div className={`verdict-badge verdict-badge--${result.final_verdict.toLowerCase()}`}>
                {result.final_verdict}
              </div>

              <div className="result-grid">
                <div className="result-item">
                  <div className="result-item__label">검사기</div>
                  <div className="result-item__value">{result.detector_id}</div>
                </div>
                <div className="result-item">
                  <div className="result-item__label">신뢰도</div>
                  <div className="result-item__value">{(Number(result.confidence_score) * 100).toFixed(1)}%</div>
                </div>
                <div className="result-item">
                  <div className="result-item__label">검출 불량</div>
                  <div className="result-item__value">{result.total_defects}개</div>
                </div>
                <div className="result-item">
                  <div className="result-item__label">처리 시간</div>
                  <div className="result-item__value">{result.processing_time_ms.toFixed(0)}ms</div>
                </div>
              </div>

              <div className="result-log-id">
                <div className="result-log-id__label">Log ID</div>
                <div className="result-log-id__value">{result.log_id}</div>
              </div>
            </div>
          </div>

          <div className="btn-grid">
            <button onClick={handleReset} className="btn btn--secondary">
              새로운 검사
            </button>
            <button onClick={() => window.location.href = '/history'} className="btn btn--outline">
              전체 이력 보기
            </button>
          </div>

          <div className="alert alert--success" style={{ marginTop: '1.5rem' }}>
            <CheckCircle className="alert__icon" />
            <span>검사 결과가 데이터베이스에 저장되었습니다</span>
          </div>
        </>
      );
    }

    // 아직 결과가 없을 때는 기존처럼 업로드(왼쪽) + 플레이스홀더(오른쪽)를 보여준다.
    return (
      <div className="inspection-grid">
        {/* Left Column - Upload */}
        <div>
          <div className="inspection-card">
            <div className="card-header">
              <h2>검사기 선택</h2>
            </div>
            <div className="form-group">
              <select
                value={detectorId}
                onChange={(e) => setDetectorId(e.target.value)}
                className="form-select"
              >
                <option value="1호기">1호기</option>
                <option value="2호기">2호기</option>
                <option value="3호기">3호기</option>
              </select>
            </div>
          </div>

          <div className="inspection-card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header">
              <h2>이미지 업로드</h2>
              <p>JPG, JPEG, PNG (최대 10MB)</p>
            </div>

            {!selectedFile ? (
              <div className="upload-zone" onClick={() => document.getElementById('file-upload')?.click()}>
                <Upload className="upload-zone__icon" />
                <p className="upload-zone__text">클릭하여 이미지 선택</p>
                <p className="upload-zone__subtext">또는 드래그 앤 드롭</p>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <>
                {previewUrl && (
                  <div className="file-preview">
                    <img src={previewUrl} alt="Preview" />
                  </div>
                )}
                <div className="file-info">
                  <div className="file-info__details">
                    <ImageIcon className="file-info__icon" />
                    <div>
                      <div className="file-info__name">{selectedFile.name}</div>
                      <div className="file-info__size">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                  </div>
                  <span className="file-info__remove" onClick={handleReset}>삭제</span>
                </div>
                <button
                  onClick={handleSingleUpload}
                  disabled={loading}
                  className="btn btn--primary btn--full"
                >
                  {loading ? (
                    <>
                      <Loader className="spinner" size={20} />
                      <span>검사 중...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      <span>검사 시작</span>
                    </>
                  )}
                </button>
              </>
            )}

            {error && (
              <div className="alert alert--error">
                <AlertCircle className="alert__icon" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Recent inspections (또는 플레이스홀더) */}
        <div>
          {recentInspections.length > 0 ? (
            renderRecentInspectionsCard()
          ) : (
            <div className="inspection-card">
              <div className="empty-state">
                <ImageIcon className="empty-state__icon" />
                <p className="empty-state__text">이미지를 업로드하고 검사를 시작하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBatchMode = () => (
    <div>
      <div className="inspection-grid">
        {/* Upload Section */}
        <div>
          <div className="inspection-card">
            <div className="card-header">
              <h2>검사기 선택</h2>
            </div>
            <div className="form-group">
              <select
                value={detectorId}
                onChange={(e) => setDetectorId(e.target.value)}
                className="form-select"
              >
                <option value="1호기">1호기</option>
                <option value="2호기">2호기</option>
                <option value="3호기">3호기</option>
              </select>
            </div>
          </div>

          <div className="inspection-card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header">
              <h2>이미지 업로드</h2>
              <p>여러 이미지 선택 가능</p>
            </div>

            {selectedFiles.length === 0 ? (
              <div className="upload-zone" onClick={() => document.getElementById('batch-file-upload')?.click()}>
                <Layers className="upload-zone__icon" />
                <p className="upload-zone__text">클릭하여 여러 이미지 선택</p>
                <p className="upload-zone__subtext">JPG, JPEG, PNG (최대 10MB)</p>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleMultipleFilesSelect}
                  className="hidden"
                  id="batch-file-upload"
                  multiple
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <>
                <div className="file-info">
                  <div className="file-info__details">
                    <Layers className="file-info__icon" />
                    <div>
                      <div className="file-info__name">{selectedFiles.length}개 이미지 선택됨</div>
                      <div className="file-info__size">
                        {(selectedFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <span className="file-info__remove" onClick={handleReset}>삭제</span>
                </div>

                {loading && (
                  <div className="batch-progress">
                    <div className="progress-bar">
                      <div className="progress-bar__fill" style={{ width: `${batchProgress}%` }} />
                    </div>
                    <div className="progress-text">{batchProgress}% 완료</div>
                  </div>
                )}

                <button
                  onClick={handleBatchUpload}
                  disabled={loading}
                  className="btn btn--primary btn--full"
                >
                  {loading ? (
                    <>
                      <Loader className="spinner" size={20} />
                      <span>배치 검사 중... ({batchProgress}%)</span>
                    </>
                  ) : (
                    <>
                      <Layers size={20} />
                      <span>배치 검사 시작</span>
                    </>
                  )}
                </button>
              </>
            )}

            {error && (
              <div className="alert alert--error">
                <AlertCircle className="alert__icon" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div>
          {batchResults ? (
            <>
              {/* 배치 이미지 결과 */}
              <div className="result-card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h2>검사 이미지</h2>
                  <p>{batchResults.results.filter(r => r.image_url).length}개 이미지</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                  {batchResults.results
                    .filter(r => r.image_url)
                    .map((r, i) => (
                      <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                        <img src={r.image_url} alt={r.file} style={{ width: '100%', height: 'auto', display: 'block' }} />
                        <div style={{ padding: '0.75rem', background: '#f8fafc' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>{r.file}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className={`verdict-tag verdict-tag--${r.verdict.toLowerCase()}`}>{r.verdict}</span>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{r.defects}개 불량</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* 배치 검사 결과 요약 */}
              <div className="result-card">
                <div className="card-header">
                  <h2>배치 검사 결과</h2>
                </div>

                <div className="batch-summary">
                  <div className="summary-item summary-item--total">
                    <div className="summary-item__label">전체</div>
                    <div className="summary-item__value">{batchResults.total}</div>
                  </div>
                  <div className="summary-item summary-item--ok">
                    <div className="summary-item__label">정상(OK)</div>
                    <div className="summary-item__value">{batchResults.successful - batchResults.results.filter(r => r.verdict === 'NG' && !r.error).length}</div>
                  </div>
                  <div className="summary-item summary-item--ng">
                    <div className="summary-item__label">불량(NG)</div>
                    <div className="summary-item__value">{batchResults.results.filter(r => r.verdict === 'NG' && !r.error).length}</div>
                  </div>
                </div>

                <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>파일명</th>
                      <th>Log ID</th>
                      <th>판정</th>
                      <th>불량 수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResults.results.map((r, i) => (
                      <tr key={i}>
                        <td>{r.file}</td>
                        <td className="log-id">{r.log_id || '-'}</td>
                        <td>
                          {r.error ? (
                            <span className="verdict-tag" style={{ background: '#fef2f2', color: '#b91c1c' }}>ERROR</span>
                          ) : (
                            <span className={`verdict-tag verdict-tag--${r.verdict.toLowerCase()}`}>{r.verdict}</span>
                          )}
                        </td>
                        <td>{r.error ? r.error : `${r.defects}개`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

                <div className="btn-grid" style={{ marginTop: '1.5rem' }}>
                  <button onClick={handleReset} className="btn btn--secondary">
                    새로운 배치 검사
                  </button>
                  <button onClick={() => window.location.href = '/history'} className="btn btn--outline">
                    전체 이력 보기
                  </button>
                </div>

                <div className="alert alert--success" style={{ marginTop: '1.5rem' }}>
                  <CheckCircle className="alert__icon" />
                  <span>모든 검사 결과가 데이터베이스에 저장되었습니다</span>
                </div>
              </div>
            </>
          ) : (
            <div className="inspection-card">
              <div className="empty-state">
                <Layers className="empty-state__icon" />
                <p className="empty-state__text">여러 이미지를 선택하고 배치 검사를 시작하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="inspection-page">
      <header className="admin-navbar">
        <div className="admin-navbar__logo">Smart QC Platform</div>
        <nav className="admin-navbar__links">
          <Link to="/main">대시보드</Link>
          <Link to="/history">검사 이력</Link>
          <Link to="/inspection" className="active">
            수동 검사
          </Link>
          {user?.role === 'admin' ? (
            <Link to="/admin">관리자 페이지</Link>
          ) : (
            <Link to="/mypage">마이페이지</Link>
          )}
        </nav>
        <div className="admin-navbar__right">
          <div className="admin-navbar__profile">
            <span className="admin-navbar__user">{user?.name || user?.username || '사용자'}</span>
            <button onClick={handleLogout}>로그아웃</button>
          </div>
        </div>
      </header>

      <main className="inspection-content">
        <div className="inspection-container">
          {/* Header */}
          <div className="inspection-header">
            <p className="inspection-header__subtitle">AI 기반 불량 검사 시스템</p>
            <h1>수동 검사</h1>
          </div>

          {/* Mode Tabs */}
          <div className="mode-tabs">
            <button
              className={`tab ${mode === 'single' ? 'tab--active' : ''}`}
              onClick={() => { setMode('single'); handleReset(); }}
            >
              단일 검사
            </button>
            <button
              className={`tab ${mode === 'batch' ? 'tab--active' : ''}`}
              onClick={() => { setMode('batch'); handleReset(); }}
            >
              배치 검사
            </button>
          </div>

          {/* Content */}
          {mode === 'single' ? renderSingleMode() : renderBatchMode()}

          {/* Recent Inspections - 단일 검사 결과 화면일 때는 아래에, 그 외에는 필요 시 위에서 표시 */}
          {mode === 'single' && result && recentInspections.length > 0 && (
            <div className="recent-inspections">
              {renderRecentInspectionsCard()}
            </div>
          )}
          {mode === 'batch' && recentInspections.length > 0 && (
            <div className="recent-inspections">
              {renderRecentInspectionsCard()}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ManualInspectionPage;
