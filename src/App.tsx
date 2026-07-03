import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { SpreadsheetMeta, SheetMeta, SheetData, ColumnAnalysis } from './types';
import { initAuth, googleSignIn, logout, googleSignInWithRedirect } from './lib/firebase';
import { fetchSpreadsheetMeta, fetchSheetData, analyzeColumns } from './lib/sheets';
import { GUEST_METADATA, GUEST_SHEETS_DATA } from './lib/guestData';
import SpreadsheetLoader from './components/SpreadsheetLoader';
import QACards from './components/QACards';
import { FileSpreadsheet, LogOut, Loader2, HelpCircle, AlertTriangle, Eye } from 'lucide-react';

const DEFAULT_SPREADSHEET_ID = '1tHl4qA_lV_ZiML-MFYk70a1gTsnV9qTZLrrMG0Df1Ls';

export default function App() {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPopupBlockedHelp, setShowPopupBlockedHelp] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  // Spreadsheet states
  const [spreadsheetId, setSpreadsheetId] = useState(DEFAULT_SPREADSHEET_ID);
  const [meta, setMeta] = useState<SpreadsheetMeta | null>(null);
  const [activeSheet, setActiveSheet] = useState<SheetMeta | null>(null);
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  
  // Loading & Error states
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  // Initialize auth state listener on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => {
      unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    setShowPopupBlockedHelp(false);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      if (err.code === 'auth/popup-blocked' || String(err).includes('popup-blocked')) {
        setShowPopupBlockedHelp(true);
      } else if (err.code === 'auth/unauthorized-domain') {
        setLoginError('Vercel 배포 도메인이 Firebase 승인된 도메인에 등록되지 않았습니다. Firebase 콘솔 설정을 확인해주세요.');
      } else {
        setLoginError(err.message || '로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRedirectLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    setShowPopupBlockedHelp(false);
    try {
      await googleSignInWithRedirect();
    } catch (err: any) {
      console.error('Redirect login failed:', err);
      setLoginError(err.message || '리디렉션 로그인 실패');
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (token !== 'guest_token') {
        await logout();
      }
      setUser(null);
      setToken(null);
      setMeta(null);
      setActiveSheet(null);
      setSheetData(null);
      setNeedsAuth(true);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleGuestLogin = () => {
    setNeedsAuth(false);
    setToken('guest_token');
    setUser({
      displayName: '체험용 계정 (Guest)',
      email: 'guest@example.com',
      photoURL: null,
    } as any);
  };

  // Fetch spreadsheet metadata when token or spreadsheetId changes
  const loadSpreadsheetMetadata = useCallback(async (accessToken: string, targetId: string, gidToLoad?: number | null) => {
    setIsLoadingMeta(true);
    setMetaError(null);
    try {
      if (accessToken === 'guest_token') {
        // Return GUEST_METADATA mock data after a brief realistic delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setMeta(GUEST_METADATA);
        if (GUEST_METADATA.sheets.length > 0) {
          const targetSheet = GUEST_METADATA.sheets[0];
          setActiveSheet(targetSheet);
        } else {
          setActiveSheet(null);
        }
        return;
      }
      const metadata = await fetchSpreadsheetMeta(accessToken, targetId);
      setMeta(metadata);
      if (metadata.sheets.length > 0) {
        // If gidToLoad is specified, find that sheet. Otherwise, fall back to default target gid 1630650989, or default to the first sheet.
        const targetGidValue = (gidToLoad !== undefined && gidToLoad !== null) ? gidToLoad : 1630650989;
        const targetSheet = metadata.sheets.find(s => s.sheetId === targetGidValue) || metadata.sheets[0];
        setActiveSheet(targetSheet);
      } else {
        setActiveSheet(null);
      }
    } catch (err: any) {
      console.error(err);
      setMetaError(err.message || 'Failed to load spreadsheet details. Please verify access permission.');
    } finally {
      setIsLoadingMeta(false);
    }
  }, []);

  // Fetch data of active sheet
  const loadSheetRows = useCallback(async (accessToken: string, targetId: string, sheetTitle: string) => {
    setIsLoadingData(true);
    setDataError(null);
    try {
      if (accessToken === 'guest_token') {
        // Return GUEST_SHEETS_DATA mock data after a brief realistic delay
        await new Promise(resolve => setTimeout(resolve, 400));
        const data = GUEST_SHEETS_DATA[sheetTitle] || {
          sheetTitle,
          columns: [],
          rows: [],
          rawValues: []
        };
        setSheetData(data);
        return;
      }
      const data = await fetchSheetData(accessToken, targetId, sheetTitle);
      setSheetData(data);
    } catch (err: any) {
      console.error(err);
      setDataError(err.message || `Failed to fetch data for sheet "${sheetTitle}"`);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // Sync spreadsheet metadata on token/spreadsheetId change
  useEffect(() => {
    if (token && spreadsheetId) {
      loadSpreadsheetMetadata(token, spreadsheetId, null);
    }
  }, [token, spreadsheetId, loadSpreadsheetMetadata]);

  // Sync sheet rows
  const activeSheetTitle = activeSheet?.title;
  useEffect(() => {
    if (token && spreadsheetId && activeSheetTitle) {
      loadSheetRows(token, spreadsheetId, activeSheetTitle);
    }
  }, [token, spreadsheetId, activeSheetTitle, loadSheetRows]);

  // Analyze active columns
  const columnAnalyses = useMemo<ColumnAnalysis[]>(() => {
    if (!sheetData || sheetData.rows.length === 0) return [];
    return analyzeColumns(sheetData.columns, sheetData.rows);
  }, [sheetData]);

  // Handle spreadsheet selection
  const handleLoadNewSpreadsheet = (newId: string, targetGid?: number | null) => {
    if (token === 'guest_token') {
      setMetaError('본인의 구글 스프레드시트를 연동하여 실시간으로 사용하시려면 구글 계정 로그인이 필요합니다. (체험하기 모드에서는 샘플 데이터만 제공됩니다)');
      return;
    }
    setSpreadsheetId(newId);
    if (token) {
      loadSpreadsheetMetadata(token, newId, targetGid);
    }
  };

  // Welcome state renderer
  if (needsAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4" id="welcome-container">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-100 shadow-xl space-y-8 text-center">
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-xs">
              <HelpCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
                Q&A Dashboard
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Google Spreadsheet에 작성된 예상 질문과 답변을 연동하여 실시간으로 확인하고 검색하는 대시보드 서비스입니다.
              </p>
            </div>
          </div>

          {/* Quick link detail */}
          <div className="bg-slate-50 p-4 rounded-2xl text-left border border-slate-100 flex items-start gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl mt-0.5 shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-700">실시간 연동형 대시보드</div>
              <div>질문과 답변이 포함된 Google 시트 주소를 넣으면 카드 형식으로 보기 쉽게 변환되며 시트 수정 시 자동으로 반영됩니다.</div>
            </div>
          </div>

          <div className="space-y-4">
            {loginError && (
              <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl text-left text-xs text-rose-600 font-medium leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full gsi-material-button flex justify-center items-center py-3 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs hover:border-slate-300 transition-all cursor-pointer disabled:opacity-75 disabled:cursor-wait"
            >
              <div className="gsi-material-button-content-wrapper flex items-center gap-3">
                <div className="gsi-material-button-icon w-5 h-5 flex items-center justify-center shrink-0">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                </div>
                <span>구글 로그인 (팝업창 방식)</span>
              </div>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-medium">또는</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              onClick={handleRedirectLogin}
              disabled={isLoggingIn}
              className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/50 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-75"
            >
              {isLoggingIn ? '화면 전환하는 중...' : '구글 로그인 (화면 전환방식 - 팝업차단 해결)'}
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-medium">로그인이 어려우신가요?</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              onClick={handleGuestLogin}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Eye className="w-4.5 h-4.5 shrink-0" />
              <span>로그인 없이 샘플 데이터로 체험하기</span>
            </button>

            <div className="pt-2">
              <button
                onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>구글 로그인 오류 (400, 403 등) 해결 가이드 {showTroubleshooting ? '▲' : '▼'}</span>
              </button>

              {showTroubleshooting && (
                <div className="mt-3 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-left text-xs text-slate-600 space-y-4 leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar shadow-xs">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      400 오류: redirect_uri_mismatch
                    </h4>
                    <p className="text-[11px] pl-3 text-slate-500">
                      Vercel 등의 커스텀 도메인 배포 후 로그인 시 Google의 승인 리디렉션 목록에 등록되지 않아 발생합니다.
                    </p>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-[11px] font-mono space-y-1 pl-3 text-slate-700">
                      <span className="font-bold text-indigo-600">해결방법:</span>
                      <ol className="list-decimal list-inside space-y-1 text-[10px] text-slate-600">
                        <li><a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Cloud Console</a>에 접속</li>
                        <li><b>API 및 서비스 &gt; 사용자 인증 정보</b>로 이동</li>
                        <li>OAuth 2.0 클라이언트 ID 아래의 <b>웹 클라이언트 (Web client)</b>를 편집</li>
                        <li><b>승인된 리디렉션 URI</b>에 아래 주소를 등록하고 저장:</li>
                        <code className="block bg-slate-100 p-1.5 rounded border border-slate-200 mt-1 select-all break-all text-[9.5px]">
                          https://for-our-digital-sprout.vercel.app/__/auth/handler
                        </code>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      403 오류: access_denied / 승인 완료하지 않음
                    </h4>
                    <p className="text-[11px] pl-3 text-slate-500">
                      구글 클라우드 콘솔의 OAuth 동의 화면이 '테스트(Testing)' 상태일 때, 등록되지 않은 이메일로 로그인하여 차단되는 현상입니다.
                    </p>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-[11px] font-mono space-y-1 pl-3 text-slate-700">
                      <span className="font-bold text-indigo-600">해결방법:</span>
                      <ul className="list-disc list-inside space-y-1 text-[10px] text-slate-600">
                        <li>Google Cloud Console의 <b>OAuth 동의 화면 (OAuth consent screen)</b> 메뉴로 이동</li>
                        <li><b>테스트 사용자 (Test users)</b> 탭에서 <b>[Add Users]</b>를 클릭</li>
                        <li>로그인하려는 구글 이메일(예: <code>lhy0614@gmail.com</code>)을 추가 및 저장</li>
                        <li>또는 앱 상태를 <b>[앱 게시 (Publish App)]</b>로 변경하여 프로덕션으로 전환</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      팝업창 로그인 오류 / 무반응
                    </h4>
                    <p className="text-[11px] pl-3 text-slate-500">
                      브라우저의 팝업 차단 기능 때문에 구글 팝업창이 차단되어 로그인 창이 열리지 않을 때 발생합니다.
                    </p>
                    <p className="text-[10px] pl-3 text-slate-700">
                      <b>해결방법:</b> 상단의 <b>"구글 로그인 (화면 전환방식)"</b> 버튼을 누르시면 전체 화면 전환으로 안전하게 로그인 가능합니다.
                    </p>
                  </div>

                  <div className="space-y-1 border-t border-slate-200/80 pt-2.5">
                    <h4 className="font-bold text-emerald-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      가장 빠르고 간편한 방법
                    </h4>
                    <p className="text-[10px] pl-3 text-slate-600">
                      아무런 복잡한 구글 설정 없이 즉시 대시보드를 둘러보시려면 바로 위 <b>'로그인 없이 샘플 데이터로 체험하기'</b> 버튼을 클릭해 보세요! 모든 대시보드 화면, 카테고리 필터, 상세 보기 팝업 및 검색 기능이 정상 동작합니다.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {showPopupBlockedHelp && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-left text-xs text-amber-800 space-y-3 leading-relaxed">
                <div className="flex gap-2 font-bold items-center text-amber-900">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>브라우저 팝업이 차단되었습니다!</span>
                </div>
                <p>
                  현재 브라우저에서 팝업이 차단되어 로그인 창이 열리지 않았습니다. 상단의 <b>화면 전환방식</b> 버튼을 사용하시거나, 브라우저 주소창 우측에서 팝업 허용을 설정해 주세요.
                </p>
                <div className="bg-white/60 p-2.5 rounded-xl border border-amber-100 text-[10px]">
                  <span className="font-bold block mb-1 text-amber-900">💡 배포 도메인 설정 안내:</span>
                  Vercel 배포 후 구글 로그인을 사용하려면 Firebase 콘솔의 <b>Authentication - Settings - Authorized domains</b>에 <code>for-our-digital-sprout.vercel.app</code> 도메인을 반드시 등록하셔야 합니다.
                </div>
              </div>
            )}

            <div className="text-[10px] text-slate-400">
              Only required scopes are requested: <b>spreadsheets.readonly</b>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard content
  return (
    <div className="h-screen bg-[#F9FAFB] flex overflow-hidden font-sans text-slate-900" id="app-root">
      {/* Left Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg font-display text-slate-950 font-sans">Q&A Board</span>
          </div>
          
          {/* Sign Out Trigger */}
          <button
            onClick={handleLogout}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-lg transition-all cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Spreadsheet loader inside sidebar */}
          <SpreadsheetLoader
            currentMeta={meta}
            activeSheet={activeSheet}
            onSelectSheet={setActiveSheet}
            onLoadSpreadsheet={handleLoadNewSpreadsheet}
            isLoading={isLoadingMeta}
            error={metaError}
            defaultId={DEFAULT_SPREADSHEET_ID}
          />
        </div>

        {/* User details at bottom of sidebar */}
        {user && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-3">
            {user.photoURL ? (
              <img
                referrerPolicy="no-referrer"
                src={user.photoURL}
                alt={user.displayName || 'Profile'}
                className="w-9 h-9 rounded-full border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs font-display">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800 truncate">{user.displayName || 'User'}</div>
              <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header of Main Area */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div>
            <h1 className="text-base font-bold font-display text-slate-900 font-sans">
              {meta ? meta.title : 'Q&A Dashboard'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeSheet ? `선택된 시트: ${activeSheet.title}` : '시트를 선택해주세요'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-xs font-bold text-indigo-600 font-mono hidden sm:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Google Sheets Live Sync
            </div>
            {sheetData && (
              <button
                onClick={() => {
                  const csvContent = [
                    sheetData.columns,
                    ...sheetData.rows.map(row => sheetData.columns.map(col => row[col] ?? ''))
                  ]
                    .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
                    .join('\n');

                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.setAttribute('href', url);
                  link.setAttribute('download', `${sheetData.sheetTitle}_export.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-950 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                CSV 내보내기
              </button>
            )}
          </div>
        </header>

        {/* Main Inner Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-8">
          {isLoadingData ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 flex flex-col items-center justify-center min-h-[450px] shadow-xs">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
              <p className="text-sm text-slate-500 font-bold">실시간 스프레드시트 데이터 불러오는 중...</p>
              <p className="text-xs text-slate-400 mt-1">Google APIs를 통해 동기화하는 중입니다</p>
            </div>
          ) : dataError ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 flex flex-col items-center justify-center min-h-[450px] text-center space-y-4 shadow-xs">
              <div className="p-4 bg-rose-50 text-rose-600 rounded-full">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="max-w-sm space-y-1">
                <h3 className="text-sm font-bold text-slate-900">시트 로드 실패</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{dataError}</p>
              </div>
              <button
                onClick={() => activeSheetTitle && loadSheetRows(token!, spreadsheetId, activeSheetTitle)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
              >
                다시 시도
              </button>
            </div>
          ) : sheetData ? (
            <div className="space-y-6">
              <QACards
                columns={sheetData.columns}
                rows={sheetData.rows}
                onRefresh={() => {
                  if (activeSheetTitle) {
                    loadSheetRows(token!, spreadsheetId, activeSheetTitle);
                  }
                }}
                isRefreshing={isLoadingData}
              />
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 flex flex-col items-center justify-center min-h-[450px] shadow-xs">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500 font-bold">활성화된 시트가 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1">왼쪽 사이드바에서 시트를 선택해주시면 실시간 카드가 연동됩니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
