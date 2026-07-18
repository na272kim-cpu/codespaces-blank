import React, { useState, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';
import Header from './components/Header';
import Uploader from './components/Uploader';
import DataTable from './components/DataTable';
import { parseGeminiResponse, parseOcrTextToCardData, preprocessImageDataUrl } from './utils/ocrUtils';

export default function App() {
  // --- 테마 상태 ---
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // --- 비즈니스 상태 ---
  const [cardQueue, setCardQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sheetData, setSheetData] = useState([]);

  // 최신 대기열 추적용 Ref (비동기 이미지 로딩 시 Stale Closure 방어)
  const cardQueueRef = useRef(cardQueue);
  useEffect(() => {
    cardQueueRef.current = cardQueue;
  }, [cardQueue]);

  // --- 진행율 상태 ---
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  // --- UI 알림 상태 ---
  const [banner, setBanner] = useState({
    show: true,
    message: 'OCR 엔진이 준비되었습니다. 이제 명함 분석을 진행할 수 있습니다.',
    type: 'info' // 'info' | 'error' | 'warning'
  });

  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success' // 'success' | 'error'
  });

  // --- 테마 적용 ---
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // --- 안내 배너(info) 자동 소멸 타이머 (5초) ---
  useEffect(() => {
    if (banner.show && banner.type === 'info') {
      const timer = setTimeout(() => {
        setBanner(prev => ({ ...prev, show: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [banner.show, banner.type]);

  // --- 글로벌 에러 전면 대응 리스너 ---
  useEffect(() => {
    const handleError = (event) => {
      const msg = event.message || '알 수 없는 런타임 오류';
      setBanner({
        show: true,
        message: `오류 감지: ${msg}`,
        type: 'error'
      });
    };

    const handleRejection = (event) => {
      const msg = (event.reason && (event.reason.message || event.reason.toString())) || '비동기 작업 중 알 수 없는 에러';
      setBanner({
        show: true,
        message: `비동기 오류 감지: ${msg}`,
        type: 'error'
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // --- 토스트 알림 노출 트리거 ---
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // --- 다중 명함 업로드 및 파일 정제 ---
  const handleFilesSelected = (files) => {
    if (isProcessing) {
      showToast('명함 분석이 진행 중입니다. 완료될 때까지 기다려 주세요.', 'error');
      return;
    }

    const currentLen = cardQueue.length;
    const remainingSpace = 50 - currentLen;

    if (remainingSpace <= 0) {
      showToast('이미 최대 개수인 50개 명함이 목록에 가득 찼습니다.', 'error');
      return;
    }

    let addCount = 0;
    const filesToProcess = Array.from(files).slice(0, remainingSpace);
    const newCards = [];

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        showToast(`${file.name} 파일은 이미지 형식이 아니어서 제외되었습니다.`, 'error');
        return;
      }

      const id = Date.now() + Math.random();
      const cardObj = {
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending', // 'pending' | 'processing' | 'success' | 'error'
        imageUrl: null,
        base64: null
      };

      newCards.push(cardObj);
      addCount++;

      // 비동기 Base64 프리로드 및 OCR용 전처리
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const originalDataUrl = e.target.result;
          const processedDataUrl = await preprocessImageDataUrl(originalDataUrl, file.type);
          const processedMimeType = processedDataUrl.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';
          const processedBase64 = processedDataUrl.split(',')[1] || '';

          setCardQueue((prev) =>
            prev.map((c) =>
              c.id === id
                ? { ...c, imageUrl: originalDataUrl, type: processedMimeType, base64: processedBase64 }
                : c
            )
          );
        } catch (error) {
          setCardQueue((prev) =>
            prev.map((c) =>
              c.id === id
                ? { ...c, imageUrl: e.target.result, base64: e.target.result.split(',')[1] }
                : c
            )
          );
        }
      };
      reader.readAsDataURL(file);
    });

    if (addCount > 0) {
      setCardQueue((prev) => [...prev, ...newCards]);
      showToast(`${addCount}개의 명함이 대기열 목록에 추가되었습니다.`);
    }
  };

  // --- 개별 대기 명함 삭제 ---
  const handleRemoveQueueItem = (id) => {
    if (isProcessing) return;
    setCardQueue((prev) => prev.filter((c) => c.id !== id));
    showToast('선택하신 명함이 대기열에서 제거되었습니다.');
  };

  // --- 대기 대기열 완전 비우기 ---
  const handleClearQueue = () => {
    if (isProcessing) return;
    setCardQueue([]);
    showToast('대기 목록이 초기화되었습니다.');
  };

  // --- 지수 백오프 요청 네트워크 통신 모듈 ---
  const fetchWithRetry = async (url, options, retries = 5, delay = 1000) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const err = new Error(`HTTP Error Status: ${response.status}`);
        err.status = response.status;
        throw err;
      }
      return await response.json();
    } catch (error) {
      if (error.status === 404) {
        throw error;
      }
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      throw error;
    }
  };

  // --- Tesseract 로컬 파서 폴백 ---
  const processCardOCRLocal = async (base64Data, mimeType, onProgress) => {
    const dataUrl = `data:${mimeType};base64,${base64Data}`;
    const result = await Tesseract.recognize(dataUrl, 'kor+eng', {
      logger: (m) => {
        if (onProgress && m && m.status) {
          let statusText = m.status;
          if (m.status === 'loading tesseract core') statusText = 'OCR 엔진 코어 로드 중';
          else if (m.status === 'loaded tesseract core') statusText = 'OCR 엔진 코어 완료';
          else if (m.status === 'initializing api') statusText = 'OCR 언어 모델 설정 중';
          else if (m.status === 'initialized api') statusText = 'OCR 언어 모델 설정 완료';
          else if (m.status === 'recognizing text') {
            const percent = Math.round((m.progress || 0) * 100);
            statusText = `텍스트 판독 중 (${percent}%)`;
          }
          onProgress(statusText);
        }
      }
    });

    const text = (result?.data?.text || '').trim();
    if (!text) {
      throw new Error('로컬 OCR로 텍스트를 추출하지 못했습니다.');
    }

    return parseOcrTextToCardData(text);
  };

  // --- 단건 명함 OCR 처리 분기 허브 ---
  const processCardOCR = async (base64Data, mimeType, onProgress) => {
    if (onProgress) {
      onProgress('보안 AI 서버 분석 중...');
    }

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: base64Data, mimeType })
      });

      if (!response.ok) {
        const errRes = await response.json().catch(() => ({}));
        throw new Error(errRes.message || `서버 보안 필터 통신 오류 (${response.status})`);
      }

      const data = await response.json();

      // 서버 키가 미지정되었거나 호출 한도가 소진된 경우, 에러 중단 없이 클라이언트 로컬 Tesseract.js로 즉각 복원 전환! (완벽한 폴백)
      if (data.error === 'API_KEY_MISSING' || data.error === 'RATE_LIMITED') {
        setBanner({
          show: true,
          message: data.error === 'API_KEY_MISSING'
            ? "⚠️ 경고: 클라우드플레어 서버에 GEMINI_API_KEY 환경 변수가 등록되지 않아 [Tesseract 로컬 백업 엔진]으로 강제 스캔되었습니다. 이 모드에서는 사람이 명함에 수기로 적은 손글씨 메모(비고란) 판독이 불가능합니다. 완벽한 AI 명함 판독을 위해 대시보드 환경변수 설정을 마쳐주세요!"
            : "⚠️ 경고: API 요청 호출 한도가 일시적으로 가득 차 [Tesseract 로컬 백업 엔진]으로 우회 구동되었습니다. 손글씨 판독률이 한시적으로 제한됩니다.",
          type: 'warning'
        });
        if (onProgress) {
          onProgress('로컬 엔진 전환 분석 중...');
        }
        return processCardOCRLocal(base64Data, mimeType, onProgress);
      }

      return data;
    } catch (error) {
      setBanner({
        show: true,
        message: `⚠️ 경고: API 서버 통신 실패로 인해 [Tesseract 로컬 백업 엔진]으로 임시 긴급 가동되었습니다. (오류 사유: ${error.message || '네트워크 끊김'}). 손글씨 및 미세 폰트 판독이 불가능합니다.`,
        type: 'warning'
      });
      if (onProgress) {
        onProgress('서버 분석 실패, 로컬 OCR로 복구 중...');
      }
      return processCardOCRLocal(base64Data, mimeType, onProgress);
    }
  };

  // --- 대기 목록 일괄 OCR 스캔 가동 ---
  const handleStartBatch = async () => {
    if (isProcessing) return;

    const pendingCards = cardQueue.filter((c) => c.status === 'pending');
    if (pendingCards.length === 0) {
      showToast("현재 분석 가능한 '대기중'인 명함 이미지가 존재하지 않습니다.", 'error');
      return;
    }

    setIsProcessing(true);
    showToast(`총 ${pendingCards.length}개의 명함 일괄 분석을 가동합니다.`);

    let completedCount = 0;
    const totalCount = pendingCards.length;

    // 대기열 순회하며 순차 비동기 분석 수행
    for (const card of pendingCards) {
      setCardQueue((prev) => prev.map((c) => (c.id === card.id ? { ...c, status: 'processing' } : c)));

      // Ref로부터 항상 실시간 최신 카드 정보를 확보하여 이미지 유실 방지
      let currentCard = cardQueueRef.current.find((c) => c.id === card.id) || card;

      // Base64 로딩 지연 대응
      if (!currentCard.base64) {
        await new Promise((resolve) => {
          const checkBase = setInterval(() => {
            const latest = cardQueueRef.current.find((c) => c.id === card.id);
            if (latest && latest.base64) {
              clearInterval(checkBase);
              currentCard = latest;
              resolve();
            }
          }, 100);
        });
      }

      setProgressLabel(`진행 중: ${currentCard.name} 분석 중...`);

      try {
        const resultData = await processCardOCR(currentCard.base64, currentCard.type, (statusText) => {
          setProgressLabel(`진행 중: ${currentCard.name} (${statusText})`);
        });

        // 표 데이터 주입
        const sheetRow = {
          id: Date.now() + Math.random(),
          name: resultData.name || '',
          company: resultData.company || '',
          role: resultData.role || '',
          email: resultData.email || '',
          phone: resultData.phone || '',
          phone2: resultData.phone2 || '',
          country: resultData.country || '알수없음',
          address: resultData.address || '',
          website: resultData.website || '',
          notes: resultData.notes || '',
          imageUrl: currentCard.imageUrl
        };

        setSheetData((prev) => [...prev, sheetRow]);
        setCardQueue((prev) => prev.map((c) => (c.id === currentCard.id ? { ...c, status: 'success' } : c)));
        showToast(`✔ [${currentCard.name}] 판독 완료`);
      } catch (error) {
        console.error('OCR Exception: ', error);
        setCardQueue((prev) => prev.map((c) => (c.id === currentCard.id ? { ...c, status: 'error' } : c)));
        setBanner({
          show: true,
          message: `분석 실패: ${currentCard.name} - ${error.message || '알 수 없는 오류'}`,
          type: 'error'
        });
        showToast(`❌ [${currentCard.name}] 정보 추출 실패`, 'error');
      }

      completedCount++;
      const percentage = Math.round((completedCount / totalCount) * 100);
      setProgressPercent(percentage);
    }

    setIsProcessing(false);
    setProgressLabel('일괄 분석 완료!');
    showToast('모든 대기 명함 처리가 종료되었습니다.');
  };

  // --- 수동 빈 행 생성 ---
  const handleAddEmptyRow = () => {
    const emptyRow = {
      id: Date.now() + Math.random(),
      name: '새 이름',
      company: '새 회사',
      role: '',
      email: '',
      phone: '',
      phone2: '',
      country: '대한민국',
      address: '',
      website: '',
      notes: '',
      imageUrl: null
    };
    setSheetData((prev) => [...prev, emptyRow]);
    showToast('수동 작성을 위한 새로운 빈 행이 추가되었습니다.');
  };

  // --- 인라인 셀 변경 반영 양방향 처리 ---
  const handleUpdateCell = (rowId, field, val) => {
    setSheetData((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: val } : row))
    );
  };

  // --- 개별 데이터 행 삭제 ---
  const handleDeleteRow = (rowId) => {
    setSheetData((prev) => prev.filter((row) => row.id !== rowId));
    showToast('선택된 명함 데이터 행이 삭제되었습니다.');
  };

  // --- 표 전체 초기화 ---
  const handleClearAllRows = () => {
    if (sheetData.length === 0) return;
    setSheetData([]);
    showToast('시트 테이블 내 모든 데이터가 깨끗이 비워졌습니다.');
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      
      {/* 1. 상단 네비게이션 바 */}
      <Header theme={theme} toggleTheme={toggleTheme} />

      {/* 2. 에러 및 공지용 상태 배너 */}
      {banner.show && (
        <div
          className={`mx-4 mt-4 md:mx-6 lg:mx-8 rounded-2xl border px-4 py-3 text-sm font-medium transition-all ${
            banner.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400'
              : banner.type === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
          }`}
        >
          <i
            className={`fa-solid mr-2 ${
              banner.type === 'error'
                ? 'fa-triangle-exclamation'
                : banner.type === 'warning'
                ? 'fa-circle-exclamation'
                : 'fa-circle-info'
            }`}
          ></i>
          {banner.message}
        </div>
      )}

      {/* 3. 메인 콘텐츠 */}
      <main className="flex-grow max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        {/* 인트로 소개글 */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-black dark:text-white tracking-tight">
            대량 명함 이미지를 텍스트로
          </h1>
          <p className="text-blue-600 dark:text-blue-400 text-sm sm:text-base font-bold">
            Card 2 Sheet OCR 프로그램 (React)
          </p>
        </div>

        {/* 좌우 구조 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 왼쪽 컬럼 (4칸): 업로더 및 대기열 */}
          <div className="lg:col-span-4">
            <Uploader
              cardQueue={cardQueue}
              isProcessing={isProcessing}
              progressPercent={progressPercent}
              progressLabel={progressLabel}
              onFilesSelected={handleFilesSelected}
              onStartBatch={handleStartBatch}
              onClearQueue={handleClearQueue}
              onRemoveItem={handleRemoveQueueItem}
            />
          </div>

          {/* 오른쪽 컬럼 (8칸): 시트 데이터 그리드 */}
          <div className="lg:col-span-8">
            <DataTable
              sheetData={sheetData}
              onUpdateCell={handleUpdateCell}
              onAddEmptyRow={handleAddEmptyRow}
              onClearAllRows={handleClearAllRows}
              onDeleteRow={handleDeleteRow}
              showToast={showToast}
            />
          </div>
        </div>
      </main>

      {/* 4. 애니메이션 알림 토스트 */}
      <div
        id="toast"
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 z-50 ${
          toast.show ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        }`}
      >
        <span
          className={toast.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}
        >
          {toast.type === 'success' ? (
            <i className="fa-solid fa-circle-check text-base"></i>
          ) : (
            <i className="fa-solid fa-triangle-exclamation text-base"></i>
          )}
        </span>
        <span id="toastMsg">{toast.message}</span>
      </div>
    </div>
  );
}