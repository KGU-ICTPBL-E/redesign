import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AdminPage.css';

const MyPage: React.FC = () => {
  const { user, logout, checkApprovalStatus } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState(user?.email || '');
  const [affiliation, setAffiliation] = useState(user?.affiliation || '');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword && newPassword !== newPasswordConfirm) {
      alert('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    try {
      setSaving(true);
      const payload: { new_email?: string; new_affiliation?: string; new_password?: string } = {};

      if (email && email !== user.email) {
        payload.new_email = email;
      }
      if ((affiliation || '') !== (user.affiliation || '')) {
        payload.new_affiliation = affiliation;
      }
      if (newPassword) {
        payload.new_password = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        alert('변경된 내용이 없습니다.');
        return;
      }

      await import('../services/api').then(({ authAPI }) => authAPI.updateProfile(payload));
      await checkApprovalStatus(); // 최신 프로필 재조회
      alert('프로필이 수정되었습니다.');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (error) {
      console.error('Failed to update profile', error);
      alert('프로필 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-navbar">
        <div className="admin-navbar__logo">Smart QC Platform</div>
        <nav className="admin-navbar__links">
          <Link to="/main">대시보드</Link>
          <Link to="/history">검사 이력</Link>
          <Link to="/inspection">수동 검사</Link>
          <Link to="/mypage" className="active">
            마이페이지
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
            <p className="admin-header__subtitle">내 계정 정보</p>
            <h1>마이페이지</h1>
          </div>
        </div>

        <section className="admin-card">
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">아이디</label>
                <input className="form-input" value={user?.username || ''} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">이름</label>
                <input className="form-input" value={user?.name || ''} disabled />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">역할</label>
                <input className="form-input" value={user?.role === 'admin' ? '관리자' : '사용자'} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">소속</label>
                <input
                  className="form-input"
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  placeholder="소속을 입력하세요"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">이메일</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">새 비밀번호</label>
                <input
                  className="form-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="변경 시에만 입력"
                />
              </div>
              <div className="form-group">
                <label className="form-label">새 비밀번호 확인</label>
                <input
                  className="form-input"
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="비밀번호를 다시 입력"
                />
              </div>
            </div>

            <div className="button-group" style={{ marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

export default MyPage;


