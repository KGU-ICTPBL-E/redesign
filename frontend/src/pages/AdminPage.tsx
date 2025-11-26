import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReportsSection from '../components/admin/ReportsSection';
import { adminAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './AdminPage.css';

const AdminPage: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'reports'>('users');
  const { user, logout, checkApprovalStatus } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [pendingRes, usersRes] = await Promise.all([
        adminAPI.getPendingUsers(),
        adminAPI.getAllUsers(),
      ]);

      setPendingUsers(pendingRes.data);
      setAllUsers(usersRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (userId: number) => {
    try {
      await adminAPI.approveUser(userId);
      alert('사용자가 승인되었습니다.');
      fetchData();
    } catch (error) {
      alert('승인 실패');
    }
  };

  const handleReject = async (userId: number) => {
    if (!confirm('정말 거절하시겠습니까?')) return;

    try {
      await adminAPI.rejectUser(userId);
      alert('사용자가 거절되었습니다.');
      fetchData();
    } catch (error) {
      alert('거절 실패');
    }
  };

  const handleRoleChange = async (userId: number, targetRole: 'user' | 'admin') => {
    if (!confirm(`해당 사용자의 권한을 ${targetRole === 'admin' ? '관리자' : '사용자'}로 변경하시겠습니까?`)) {
      return;
    }

    try {
      await adminAPI.changeUserRole(userId, targetRole);
      alert('권한이 변경되었습니다.');
      fetchData();
      if (user?.id === userId) {
        await checkApprovalStatus();
        if (targetRole === 'user') {
          navigate('/main');
        }
      }
    } catch (error) {
      alert('권한 변경 실패');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('정말로 해당 사용자를 삭제하시겠습니까?')) return;

    try {
      await adminAPI.deleteUser(userId);
      alert('사용자가 삭제되었습니다.');
      fetchData();
    } catch (error) {
      alert('삭제 실패');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderPendingUsers = () => (
    <section className="admin-card">
      <div className="admin-section-header">
        <div>
          <h2>승인 대기 중인 사용자</h2>
          <p>{pendingUsers.length}명</p>
        </div>
      </div>

      {pendingUsers.length === 0 ? (
        <p className="empty-state">승인 대기 중인 사용자가 없습니다.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>아이디</th>
                <th>이름</th>
                <th>이메일</th>
                <th>소속</th>
                <th>가입일</th>
                <th className="center">작업</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((pending) => (
                <tr key={pending.id}>
                  <td>{pending.username}</td>
                  <td>{pending.name}</td>
                  <td>{pending.email}</td>
                  <td>{pending.affiliation || '-'}</td>
                  <td>{new Date(pending.created_at).toLocaleDateString('ko-KR')}</td>
                  <td className="center actions">
                    <button onClick={() => handleApprove(pending.id)} className="pill-btn pill-btn--approve">
                      승인
                    </button>
                    <button onClick={() => handleReject(pending.id)} className="pill-btn pill-btn--reject">
                      거절
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  const renderAllUsers = () => (
    <section className="admin-card">
      <div className="admin-section-header">
        <div>
          <h2>전체 사용자</h2>
          <p>{allUsers.length}명</p>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>아이디</th>
              <th>이름</th>
              <th>역할</th>
              <th>승인 상태</th>
              <th className="center">권한 변경</th>
              <th className="center">삭제</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map((usr) => {
              const isSuperAdmin =
                usr.name?.toLowerCase() === 'administrator' || usr.username?.toLowerCase() === 'administrator';
              const canDelete = usr.role === 'user' && !isSuperAdmin;

              return (
                <tr key={usr.id}>
                  <td>{usr.username}</td>
                  <td>{usr.name}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        usr.role === 'admin' ? 'status-badge--admin' : 'status-badge--user'
                      }`}
                    >
                      {usr.role === 'admin' ? '관리자' : '사용자'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        usr.is_approved ? 'status-badge--approved' : 'status-badge--pending'
                      }`}
                    >
                      {usr.is_approved ? '승인됨' : '대기중'}
                    </span>
                  </td>
                  <td className="center actions">
                    {isSuperAdmin ? (
                      <span className="action-note">고정 관리자</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`pill-btn pill-btn--outline ${usr.role === 'admin' ? 'is-selected' : ''}`}
                          onClick={() => handleRoleChange(usr.id, 'admin')}
                        >
                          관리자
                        </button>
                        <button
                          type="button"
                          className={`pill-btn pill-btn--outline ${usr.role === 'user' ? 'is-selected' : ''}`}
                          onClick={() => handleRoleChange(usr.id, 'user')}
                        >
                          사용자
                        </button>
                      </>
                    )}
                  </td>
                  <td className="center">
                    {canDelete ? (
                      <button
                        onClick={() => handleDeleteUser(usr.id)}
                        className="pill-btn pill-btn--danger"
                        title="사용자 삭제"
                      >
                        ×
                      </button>
                    ) : (
                      <span className="action-note">{isSuperAdmin ? '삭제 불가' : '관리자'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="admin-card">
          <div className="loading-state">로딩 중...</div>
        </div>
      );
    }

    if (activeTab === 'reports') {
      return (
        <section className="admin-card">
          <ReportsSection />
        </section>
      );
    }

    return (
      <>
        {renderPendingUsers()}
        {renderAllUsers()}
      </>
    );
  };

  return (
    <div className="admin-page">
      <header className="admin-navbar">
        <div className="admin-navbar__logo">Smart QC Platform</div>
          <nav className="admin-navbar__links">
            <Link to="/main">대시보드</Link>
            <Link to="/history">검사 이력</Link>
            <Link to="/inspection">수동 검사</Link>
            <Link to="/admin" className="active">
              관리자 페이지
            </Link>
          </nav>
        <div className="admin-navbar__right">
          
          <div className="admin-navbar__profile">
            <span className="admin-navbar__user">{user?.name || user?.username || '사용자'}</span>
            <button onClick={handleLogout}>로그아웃</button>
          </div>
        </div>
      </header>

      <main className="admin-content">
        <div className="admin-header">
          <div>
            <p className="admin-header__subtitle">운영 관리 도구</p>
            <h1>관리자 페이지</h1>
          </div>
          <div className="admin-header__tabs">
            <button
              className={`pill ${activeTab === 'users' ? 'pill--active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              사용자 관리
            </button>
            <button
              className={`pill ${activeTab === 'reports' ? 'pill--active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              리포트
            </button>
          </div>
        </div>

        {renderContent()}
      </main>
    </div>
  );
};

export default AdminPage;
