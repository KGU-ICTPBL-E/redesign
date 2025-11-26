# Redesign
## 1. 핵심 기능
### 1.1. 사용자 인증 및 접근 제어
- 로그인 페이지 (`/login`): 사용자 인증 및 역할(일반/관리자) 확인
- 회원가입 페이지 (`/signup`): 가입 요청 및 관리자 승인 대기 처리
### 1.2. 모니터링
- 대시보드 페이지 (`/main`): 실시간 검사 현황, 시스템 상태 표시 및 결함 알림 제공
- 불량품 상세 정보 제공 페이지 (`/defect`): 특정 불량 로그의 상세 정보 제공
### 1.3. 운영 및 시스템 관리
- 관리자 페이지 (`/admin`): 회원가입 승인, 사용자 권한 관리, 기간별 리포트 생성 기능 제공

## 2. 환경
- os: windows (wsl2)
- db host: localhost:5432
- react (tsx)
- nodejs (expressjs)
- postgresql

## 3. 설명
1. 사용자/시스템 관리 기능
	1. 로그인 및 인증
		- 등록된 사용자(작업자, 관리자)의 ID/PW를 통한 접근 인증
		- 실패 시 에러 메시지 출력
	2. 회원가입 요청
		- 신규 사용자가 ID, 이름, 역할을 입력하여 가입 요청
		- 가입 완료 후 관리자 승인 대기 상태 표시
	3. 회원 관리(admin만)
		- 관리자 페이지에서 신규 회원 가입 요청 목록 확인 및 승인/반려 기능
		- 관리자 페이지에서 접근
2. 메인 대시보드 및 모니터링 기능
	1. 실시간 검사 모니터링
		- 현재 공정에서 인입되는 xray 검사 이미지와 판정 결과를 주기적으로 자동 업데이트하여 표시
		- 3~5초 간격으로 이미지 및 결과 갱신
	2. 결함 발생 알림
		- 모델이 defect를 감지했을 때, 대시보드 상단/측면에 시각적 경고 알림(토스트 팝업 등) 제공
		- 경고 팝업 내 결함 이미지 포함
	3. 결함 시각화(bounding box)
		- 모델이 탐지한 defect 영역에 bounding box를 표시하여 원본 이미지와 함께 제공
	4. 핵심 성과 지표(KPI)
		- 당일/누적 총 검사 수, 정상/불량 건수, 불량률(%) 등을 위젯 형태로 요약 표시
		- Pie Chart 또는 Gauge 형태 사용
3. AI 모델 통합 및 판정 로직
	1. 모델에 요청
		- 웹앱에서 입력 이미지를 모델 API에 전송
		- input: Image File
		- output: JSON 형식의 탐지 결과(클래스, 좌표, 신뢰도)
	2. 최종 판정 로직
		- AI 모델의 탐지 결과를 기반으로 제품의 최종 품질 판정
	3. 개별 테스트 검사
		- 사용자가 로컬 이미지를 직접 업로드하여 AI 모델의 실시간 탐지 결과 확인
4. 관리자 도구 및 리포트 기능
	1. 검사 이력 조회
		- 날짜 및 설비 호기별 모든 검사 이력 리스트 출력
	2. 리포트 생성 및 다운로드
		- 설정된 기간(일간, 주간, 월간) 동안의 상세 검사 통계(불량 빈도, 주요 불량 발생 시간대 등)를 분석하여 출력
	3. 오탐 피드백 기능
		- 불량으로 기록된 이력 중 관리자가 수동으로 오탐으로 판단한 경우, 해당 이력에 태그를 지정하여 저장
	4. 원본 데이터 확인
		- 불량 판정 이력에 대해 AI 모델이 출력한 원본 JSON/XML 결과 파일 확인
			- 특이사항: 후순위

## 4. 데이터 스키마
1. `users` 테이블 (사용자 인증 및 권한 관리)
컬럼명,데이터 타입,제약 조건,설명
id,SERIAL,PRIMARY KEY,사용자 고유 ID
username,VARCHAR(50),"UNIQUE, NOT NULL",로그인 ID (Express.js에서 인증에 사용)
password_hash,VARCHAR(255),NOT NULL,비밀번호 해시값 (보안 필수)
email,VARCHAR(100),"UNIQUE, NOT NULL",연락처 및 고유 식별자
name,VARCHAR(100),NOT NULL,사용자 이름
affiliation,VARCHAR(100),,소속/부서
role,VARCHAR(10),"NOT NULL, DEFAULT 'user'",역할 ('user' 또는 'admin')
is_approved,BOOLEAN,"NOT NULL, DEFAULT FALSE",관리자 승인 대기 로직의 핵심
created_at,TIMESTAMP WITH TIME ZONE,DEFAULT CURRENT_TIMESTAMP,계정 생성 시간
2. `inspection_logs` 테이블 (AI 검사 이력 및 품질 데이터)
컬럼명,데이터 타입,제약 조건,설명
log_id,VARCHAR(50),PRIMARY KEY,검사 로그 고유 ID (예: ERR100)
detector_id,VARCHAR(10),NOT NULL,"검사를 수행한 설비 호기 (예: '1호기', '2호기')"
timestamp,TIMESTAMP WITH TIME ZONE,DEFAULT CURRENT_TIMESTAMP,검사 발생 시각 (시뮬레이션 시간)
final_verdict,VARCHAR(10),NOT NULL,최종 판정 결과 ('OK' 또는 'NG')
confidence_score,"NUMERIC(4, 3)",,AI 탐지 신뢰도 점수 (0.000 ~ 1.000)
bbox_coords,JSONB,,AI 모델이 출력한 바운딩 박스 좌표 배열 (유연한 JSON 저장)
image_url,VARCHAR(255),,탐지 이미지가 저장된 경로 (웹 접근용)
is_false_positive,BOOLEAN,DEFAULT FALSE,관리자의 오탐(False Positive) 피드백 기록
admin_feedback_user_id,INTEGER,REFERENCES users(id),피드백을 기록한 관리자 ID (외래 키)
3. `detector_status` 테이블 (실시간 시스템 상태 관리)
컬럼명,데이터 타입,제약 조건,설명
detector_id,VARCHAR(10),PRIMARY KEY,호기 ID (예: '1호기')
current_status,VARCHAR(10),"NOT NULL, DEFAULT 'Normal'","시스템 상태 ('Normal', 'Warning', 'Offline')"
last_updated,TIMESTAMP WITH TIME ZONE,DEFAULT CURRENT_TIMESTAMP,최종 상태 업데이트 시간

## 5. API 명세서
express.js
### 1. 사용자 인증 및 접근 제어 (Authentication & Access Control)
---
- `/api/auth/register` : 신규 사용자 회원가입 요청
	- `POST`
	- 요청
		- `id`, `password`, `email`, `name`, `affiliation`
	- 응답
		- 202 Accepted: 승인 대기
		- 400 Bad Request: 필수값 누락
- `/api/auth/login` : 사용자 인증 및 토큰 발급
	- `POST`
	- 요청
		- `id`, `password`
	- 응답
		- 200 OK: 로그인 성공
			- `{"token": "JWT_TOKEN", "role": "admin" or "user"}`
		- 401 Unauthorized: PW 오류
- `/api/auth/status` : 관리자 승인 상태 확인 및 초기 권한 부여
	- `GET`
	- 요청
		- x, 토큰 기반 인증
	- 응답
		- 200 OK: 승인됨
			- `{"approved": true, "role": "user"}`
		- 403 Forbidden: 미승인
			- `{"approved":: false, "message": "관리자 승인 대기중입니다."}`
- `/api/auth/profile` : 사용자 정보 수정 (소속, PW)
	- `PUT`
	- 요청
		- `new_password` (optional), `new_affiliation` (optional)
	- 응답
		- 200 OK: 수정 성공
		- 401 Unauthorized: 토큰 만료
1. 회원가입: `/register` 요청 성공 시, DB에 `is_approved: false`로 저장되고, 프론트엔드에는 "관리자 승인 대기 팝업"을 띄운 후 `/login`으로 이동시킴
2. 미승인 로그인: `/login` 성공 후 백엔드는 유저의 토큰과 역할을 응답하지만, 유저가 `/main`으로 가기 전에 프론트엔드는 `/api/auth/status`를 호출하여 `approved`상태를 확인함. `403 Forbidden`응답이 오면 "관리자 승인 대기 팝업"을 띄우고 다시 `/login`으로 리다이렉트시킴
### 2. 대시보드 및 모니터링 (Monitoring & QC)
---
- `/api/feed/latest` : 대시보드 실시간 업데이트용 최신 검사 결과(시뮬레이션 포함)
	- `GET`
	- 요청
		- `detector_id` (optional): 특정 호기 필터링
	- 응답
		- 200 OK
			- `{"status": "Warning" or "Normal", "system_time": "...", "latest_log": {...}}`
	- n초마다 프론트에서 호출
- `/api/stats/summary` : 대시보드 KPI 요약 정보
	- `GET`
	- 요청
		- `duration` (`today`, `week`, `month` 등)
	- 응답
		- 200 OK
			- `{"total_scans": 100, "defects": 2, "defect_rate": 0.02, "cumulative_usage": 1000}`
	- 통계 카드 데이터
- `/api/log/defect/:id` : 특정 불량 로그의 상세 정보
	- `GET`
	- 요청
		- `:id` (불량 로그 ID, 예: ERR100)
	- 응답
		- 200 OK
			- `{"log_id": "ERR100", "detector_name": 1호기", "confidence_score": 0.99, "bbox_coords": [...]}`
	- 불량품 상세 페이지
### 3. 운영 및 시스템 관리 (Admin Tools)
---
- `/api/admin/users/pending` : 회원가입 승인 대기 사용자 목록 조회
	- `GET`
	- 요청
		- x
	- 응답
		- 200 OK
			- `[{"id": "userA", "name": "...", "role": "user"}]`
	- 관리자 페이지
- `/api/admin/users/approve` : 사용자 가입 승인
	- `POST`
	- 요청
		- `user_id`
	- 응답
		- 200 OK
	- 승인 (DB: `is_approved: true`로 업데이트)
- `/api/admin/users/reject` : 사용자 가입 반려(거절)
	- `POST`
	- 요청
		- `user_id`
	- 응답
		- 200 OK
	- 반려 (DB에서 사용자 삭제)
- `/api/admin/users/role` : 사용자 권한(역할) 변경
	- `PUT`
	- 요청
		- `user_id`, `new_role` (`"user" or "admin"`)
	- 응답
		- 200 OK
	- 유저 관리 페이지
- `/api/admin/reports` : 기간별 리포트 데이터 조회
	- `GET`
	- 요청
		- `start_date`, `end_date`, `detector_id`(필터링)
	- 응답
		- 200 OK
			- 리포트 데이터 (json, csv, pdf 등의 경로)
	- 기간 설정 버튼 기능
- `/api/log/feedback/:id` : 오탐(False Positive) 피드백 기록
	- `POST`
	- 요청
		- `:id` (로그 ID), `feedback_type ("false_positive")`
	- 응답
		- 200 OK
	- 불량품 상세 페이지의 "오탐 피드백" 버튼

## 6. 핵심 기능 및 컴포넌트
react + vite + ts
### 1. 공통 및 레이아웃 컴포넌트 (Shared & Layout)
---
모든 페이지에서 재사용되거나 전체 레이아웃 구성
- `Header.tsx` : 상단 내비게이션 및 시스템 상태 표시
	- props: `userName`, `systemStatus` (정상, 경고, 위험), `currentTime`, `onLogout`
	- state: x
	- 모든 페이지 상단
- `Layout.tsx` : 기본 페이지 구조 (Header, Body)
	- props: `children` (페이지 내용)
	- state: x
	- 전체 페이지 구조
- `StatCard.tsx` : 통계 요약 위젯 (블량품 수, 사용량)
	- props: `title`, `value`, `total`, `unit`
	- state: x
	- 대시보드, 관리자 페이지
- `AuthPopup.tsx` : 관리자 승인 대기 알림 팝업
	- props: `isOpen`, `message`, `onClose`
	- state: `isOpen` (팝업 표시 여부)
	- 회원가입 후, 미승인 상태 로그인 시
### 2. 사용자 인증 컴포넌트 (Authentication)
---
- `LoginForm.tsx` : 로그인 폼 입력 및 제출 처리
	- props: `onSubmit` (로그인 API 호출 함수)
	- state: `id`, `password` (입력 값)
	- 로그인 페이지 (`/login`)
- `SignupForm.tsx` : 회원가입 폼 입력 및 제출 처리
	- props: `onSubmit` (회원가입 API 호출 함수)
	- state: `email`, `id`, `password`, `name`, `affiliation` (입력값)
	- 회원가입 페이지 (`/signup`)
### 3. 모니터링 컴포넌트 (Monitoring)
---
- `DetectorStatus.tsx` : 1,2,3호기 상태 및 실시간 이미지 표시
	- props: `detectorId`, `status`, `liveImageUrl`
	- state: `errorLog` (최근 오류 메시지)
	- 대시보드 중앙
- `AlertList.tsx` : 최근 불량품 발생 로그 목록 표시
	- props: `logs` (최근 발생한 불량 로그 배열)
	- state: x
	- 대시보드 우측
- `DetectionPopup.tsx` : 결함 탐지 시 팝업으로 상세 이미지 표시
	- props: `isOpen`, `logData` (결함 상세 정보), `onClose`
	- state: `isOpen`
	- 결함 발생 시
- `LogDetail.tsx` : 특정 불량 로그의 상세 정보 표시
	- props: `logData` (API를 통해 가져온 상세 로그)
	- state: x
	- 불량품 상세 정보 페이지 (`/defect`)
### 4. 관리자 컴포넌트 (Admin Tools)
---
- `UserApprovalList.tsx` : 회원가입 승인 대기 목록 관리
	- props: `pendingUsers` (승인 대기 유저 배열), `onApprove`, `onReject`
	- state: x
	- 관리자 페이지 좌측
- `UserManagement.tsx` : 전체 유저 목록 및 권한 설정
	- props: `allUsers`, `onRoleChange`, `onAccessToggle`
	- state: `editingUser` (현재 권한 수정 중인 유저)
	- 관리자 페이지 2 (유저 관리 버튼 클릭 시)
- `DateRangePicker.tsx` : 기간 설정 달력 UI
	- props: `initialStart`, `initialEnd`, `onDateChange`
	- state: `startDate`, `endDate`
	- 관리자 페이지 상단
- `ReportView.tsx` : 기간별 통계 및 리포트 테이블 표시
	- props: `reportData` (기간 설정 후 가져온 데이터)
	- state: x
	- 관리자 페이지 중앙