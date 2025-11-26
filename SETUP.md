# 개발 환경 설정 가이드

## 프로젝트 구조

```
redesign/
├── frontend/          # React + TypeScript + Vite
├── backend/           # Express.js + TypeScript
├── README.md          # 프로젝트 명세서
├── CLAUDE.md          # Claude Code 가이드
└── SETUP.md           # 이 파일
```

## 사전 요구사항

- Node.js v22.16.0 (현재 설치됨)
- npm 10.9.2 (현재 설치됨)
- PostgreSQL 16.10 (현재 설치됨)

## 환경 설정 완료 항목

### ✅ Frontend (React + TypeScript + Vite)

**설치된 패키지:**
- react, react-dom
- react-router-dom (라우팅)
- axios (HTTP 클라이언트)
- TypeScript, Vite

**실행 방법:**
```bash
cd frontend
npm run dev
```

기본 실행 주소: `http://localhost:5173`

### ✅ Backend (Express.js + TypeScript)

**설치된 패키지:**
- express (웹 프레임워크)
- pg (PostgreSQL 클라이언트)
- jsonwebtoken (JWT 인증)
- bcrypt (비밀번호 해싱)
- cors (CORS 처리)
- dotenv (환경 변수 관리)

**개발 도구:**
- TypeScript
- ts-node (TypeScript 실행)
- nodemon (자동 재시작)

**실행 방법:**
```bash
cd backend
npm run dev
```

기본 실행 주소: `http://localhost:5000`

**API 엔드포인트:**
- Health check: `GET http://localhost:5000/health`
- Database test: `GET http://localhost:5000/api/db-test`

## 데이터베이스 설정

### PostgreSQL 데이터베이스 초기화

```bash
cd backend
./setup-db.sh
```

이 스크립트는 다음을 수행합니다:
1. `redesign` 데이터베이스 생성
2. 테이블 생성 (users, inspection_logs, detector_status)
3. 초기 데이터 삽입 (detector status)

### 수동 설정 (선택사항)

```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE redesign;

# redesign 데이터베이스로 전환
\c redesign

# SQL 스크립트 실행
\i backend/src/config/init-db.sql
```

### 환경 변수 설정

`backend/.env` 파일이 이미 생성되어 있습니다. 필요시 수정:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=redesign
DB_USER=postgres
DB_PASSWORD=postgres  # 실제 비밀번호로 변경
JWT_SECRET=dev_secret_key_change_in_production
```

## 개발 시작하기

### 1. 백엔드 실행

```bash
cd backend
npm run dev
```

### 2. 프론트엔드 실행 (새 터미널)

```bash
cd frontend
npm run dev
```

### 3. 데이터베이스 연결 테스트

브라우저에서 접속:
- Backend health: http://localhost:5000/health
- Database test: http://localhost:5000/api/db-test

## 다음 단계

1. **데이터베이스 초기화**: `cd backend && ./setup-db.sh` 실행
2. **백엔드 테스트**: `cd backend && npm run dev` 실행 후 http://localhost:5000/health 확인
3. **프론트엔드 개발 시작**: React 컴포넌트 및 페이지 구현
4. **API 라우트 구현**: README.md의 API 명세에 따라 엔드포인트 구현

## 빌드

### Frontend
```bash
cd frontend
npm run build
```
빌드 결과: `frontend/dist/`

### Backend
```bash
cd backend
npm run build
```
빌드 결과: `backend/dist/`

### Production 실행
```bash
cd backend
npm start
```

## 문제 해결

### PostgreSQL 연결 오류
- PostgreSQL 서비스 실행 확인: `sudo service postgresql status`
- 서비스 시작: `sudo service postgresql start`
- 비밀번호 확인: `backend/.env` 파일의 `DB_PASSWORD` 확인

### 포트 충돌
- Frontend (5173) 또는 Backend (5000) 포트가 사용 중인 경우
- `.env` 파일에서 포트 번호 변경
