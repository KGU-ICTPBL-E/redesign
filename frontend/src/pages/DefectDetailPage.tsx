import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { monitoringAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const DefectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [log, setLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchLog = async () => {
    if (!id) return;

    try {
      const response = await monitoringAPI.getDefectDetail(id);
      setLog(response.data);
    } catch (error) {
      console.error('Failed to fetch log:', error);
      alert('로그를 불러올 수 없습니다.');
      navigate('/main');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLog();
  }, [id]);

  const handleFalsPositiveFeedback = async () => {
    if (!id || !window.confirm('이 로그를 오탐으로 표시하시겠습니까?')) return;

    try {
      await monitoringAPI.submitFeedback(id, 'false_positive');
      alert('오탐 피드백이 기록되었습니다.');
      fetchLog(); // Refresh the log
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('피드백 기록에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-xl">로딩 중...</div>
        </div>
      </Layout>
    );
  }

  if (!log) {
    return (
      <Layout>
        <div className="text-center">
          <p className="text-xl text-gray-600">로그를 찾을 수 없습니다.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">불량 로그 상세</h1>
          <button
            onClick={() => navigate('/main')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            돌아가기
          </button>
        </div>

        {/* Log Details */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">검사 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">로그 ID</p>
              <p className="font-semibold text-lg">{log.log_id}</p>
            </div>
            <div>
              <p className="text-gray-600">검사 장비</p>
              <p className="font-semibold text-lg">{log.detector_id}</p>
            </div>
            <div>
              <p className="text-gray-600">판정 결과</p>
              <p className={`font-semibold text-lg ${
                log.final_verdict === 'OK' ? 'text-green-600' : 'text-red-600'
              }`}>
                {log.final_verdict}
              </p>
            </div>
            <div>
              <p className="text-gray-600">신뢰도 점수</p>
              <p className="font-semibold text-lg">
                {(log.confidence_score * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-gray-600">검사 시각</p>
              <p className="font-semibold">
                {new Date(log.timestamp).toLocaleString('ko-KR')}
              </p>
            </div>
            <div>
              <p className="text-gray-600">오탐 여부</p>
              <p className={`font-semibold ${
                log.is_false_positive ? 'text-red-600' : 'text-gray-600'
              }`}>
                {log.is_false_positive ? '오탐으로 표시됨' : '정상'}
              </p>
            </div>
          </div>
        </div>

        {/* Bounding Box Information */}
        {log.bbox_coords && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">바운딩 박스 정보</h2>
            <div className="bg-gray-50 p-4 rounded">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(log.bbox_coords, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Image */}
        {log.image_url && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">검사 이미지</h2>
            <div className="flex justify-center">
              <img
                src={log.image_url}
                alt={`Inspection ${log.log_id}`}
                className="max-w-full h-auto rounded border"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                }}
              />
            </div>
          </div>
        )}

        {/* Admin Actions */}
        {user?.role === 'admin' && !log.is_false_positive && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">관리자 작업</h2>
            <button
              onClick={handleFalsPositiveFeedback}
              className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              오탐으로 표시
            </button>
            <p className="text-sm text-gray-600 mt-2">
              이 검사 결과가 잘못된 불량 판정(오탐)인 경우 표시합니다.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DefectDetailPage;
