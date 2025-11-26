import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, checkApprovalStatus, user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      const approved = await checkApprovalStatus();

      if (!approved) {
        setError('관리자 승인 대기중입니다.');
        setLoading(false);
        return;
      }

      setTimeout(() => {
        setLoading(false);
      }, 100);
    } catch (err: any) {
      setError(err.response?.data?.message || '로그인 실패');
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (user && !loading) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/main');
      }
    }
  }, [user, loading, navigate]);

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <div>
            <p className="login-card__subtitle">Smart QC Platform</p>
            <h2 className="login-card__title">로그인</h2>
          </div>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-field">
            <label>아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              required
            />
          </div>

          <div className="form-field">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="login-button">
            {loading ? '로그인 중...' : '로그인'}
          </button>
          <button type="button" className="signup-button" onClick={() => navigate('/signup')}>
            회원가입
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
