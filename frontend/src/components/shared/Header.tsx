import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">X-ray 품질 관리</h1>
          {isAuthenticated && (
            <span className="text-sm bg-blue-700 px-3 py-1 rounded">
              {user?.role === 'admin' ? '관리자' : '사용자'}
            </span>
          )}
        </div>

        {isAuthenticated && (
          <div className="flex items-center space-x-4">
            <span className="text-sm">{user?.name}</span>
            <button
              onClick={() => navigate('/main')}
              className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded transition"
            >
              대시보드
            </button>
            <button
              onClick={() => navigate('/history')}
              className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded transition"
            >
              검사 이력
            </button>
            <button
              onClick={() => navigate('/inspection')}
              className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded transition"
            >
              수동 검사
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded transition"
              >
                관리자
              </button>
            )}
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded transition"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
