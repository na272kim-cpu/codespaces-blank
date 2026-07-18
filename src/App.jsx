import React, { useState, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';
import Header from './components/Header';
import Uploader from './components/Uploader';
import DataTable from './components/DataTable';
import { parseOcrTextToCardData } from './utils/ocrUtils';

export default function App() {
  // --- 테마 상태 ---
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // --- API Key 및 클라이언트 구동 상태 ---
  const [apiKey, setApiKey] = useState('');
  const [apiType, setApiType] = useState(''); // 'openai' | 'gemini'

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

  // --- API Key 자동 탐색 및 주입 ---
  useEffect(() => {
    const candidates = [
      window.__openaiApiKey,
      window.OPENAI_API_KEY,
      window.openaiApiKey,
      window.__geminiApiKey,
      window.GEMINI_API_KEY,
      window.geminiApiKey,
      localStorage.getItem('openaiApiKey'),
      localStorage.getItem('geminiApiKey'),
      localStorage.getItem('apiKey'),
      new URLSearchParams(window.location.search).get('openaiApiKey'),
      new URLSearchParams(window.location.search).get('geminiApiKey'),
      new URLSearchParams(window.location.search).get('apiKey')
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim()) {
        const trimmed = value.trim();
        setApiKey(trimmed);
        
        // 키 종류 자동 감별 (OpenAI는 sk-로 시작하고, Gemini는 AIzaSy로 시작함)
        if (trimmed.startsWith('sk-')) {
          setApiType('openai');
        } else if (trimmed.startsWith('AIzaSy')) {
          setApiType('gemini');
        } else {
          setApiType('gemini'); // 그 외 기본값은 gemini로 설정
        }
        break;
      }
    }
  }, []);

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

      // 비동기 Base64 프리로드
      const reader = new FileReader();
      reader.onload = (e) => {
        setCardQueue((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, imageUrl: e.target.result, base64: e.target.result.split(',')[1] }
              : c
          )
        );
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
    // 1) 클라이언트 사이드 API Key 직접 주입 모드
    if (apiKey) {
      const promptText = `
        역할: 아주 지능적인 명함 스캐너 전문 엔진.
        임무: 첨부된 명함 이미지 속에 기재되어 있는 텍스트 정보를 완벽히 분석해서 정확한 형식의 JSON 정보로 추출하라.
        
        스키마 규격:
        - name: 이름 (만약 없으면 빈 문자열 "")
        - company: 회사명 혹은 로고 이름 (만약 없으면 빈 문자열 "")
        - role: 직급, 직책 또는 소속 부서 (만약 없으면 빈 문자열 "")
        - email: 대표 이메일 주소 (만약 없으면 빈 문자열 "")
        - phone: 첫 번째 연락처 (휴대폰 번호 우선 기입, 휴대폰이 없다면 유선 전화번호 또는 회사 대표 번호 기입, 만약 없으면 빈 문자열 "")
        - phone2: 두 번째 연락처 (명함 내에 전화번호가 2개 이상 기재되어 있는 경우, 첫 번째 기입한 번호 외의 보조 휴대전화, 회사 직통 전화, 또는 팩스 번호 등을 여기에 순차적으로 나누어 기입, 없으면 빈 문자열 "")
        - country: 국가명 (이메일 도메인(예: .uk -> 영국, .hk -> 홍콩, .sg -> 싱가포르 등), 전화 국가코드(예: +44 -> 영국, +852 -> 홍콩, +65 -> 싱가포르), 주소 지명(예: England/London -> 영국, Hong Kong -> 홍콩 등)을 최우선적으로 정밀 유추하여 한글 국가명(예: 대한민국, 영국, 홍콩, 미국, 일본, 중국, 싱가포르 등)으로 기재하며, 도저히 유추 불가시에는 기본값 '알수없음'으로 기재하라.)
        - address: 우편주소 또는 지번 주소 (만약 없으면 빈 문자열 "")
        - website: 웹사이트 주소 또는 SNS 채널 (만약 없으면 빈 문자열 "")
        - notes: 명함에 기재된 기타 비고/참고사항 및 명함 위나 주변에 볼펜/연필 등으로 직접 적은 손글씨 메모가 있다면 이를 최대한 정확하게 판독하여 기재하라.
          손글씨 판독 시 필수 준수 사항:
          1) 절대 "[손글씨]"라는 접두사(prefix)나 임의의 라벨을 기입하지 말고 순수한 메모 내용만 단정하게 기재할 것.
          2) 흘려 쓴 한글 서체는 오독하기 매우 쉬우므로(예: '여자두분'을 자모 획 모양 왜곡으로 인해 '여기부부' 등으로 잘못 해석하는 등), 글자의 물리적인 획 구조를 한국어 어법 및 명함 맥락과 결합하여 이중으로 신중하게 검증하고 자연스러운 단어로 최종 판정할 것.
          3) 손글씨가 없거나 도저히 판독할 수 없는 경우, 영어명, 소셜 링크, 슬로건 등 다른 특이사항을 기재하거나 그것도 없다면 빈 문자열 ""을 반환할 것.
      `;

      // =========================================================================
      // [직접 가동 루트 A] OpenAI 직접 호출 구동
      // =========================================================================
      if (apiType === 'openai') {
        if (onProgress) {
          onProgress('OpenAI GPT-4o 직접 분석 중...');
        }

        const endpointUrl = "https://api.openai.com/v1/chat/completions";
        const openaiPayload = {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: promptText
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Data}`
                  }
                }
              ]
            }
          ],
          // Structured Outputs를 명시하여 오차 없는 데이터 반환률 보장 (엄격 스키마)
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "business_card_data",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  company: { type: "string" },
                  role: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  phone2: { type: "string" },
                  country: { type: "string" },
                  address: { type: "string" },
                  website: { type: "string" },
                  notes: { type: "string" }
                },
                required: ["name", "company", "role", "email", "phone", "phone2", "country", "address", "website", "notes"],
                additionalProperties: false
              }
            }
          }
        };

        const response = await fetchWithRetry(endpointUrl, {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(openaiPayload)
        });

        const data = await response.json();
        const parsedText = data.choices?.[0]?.message?.content;
        if (!parsedText) {
          throw new Error('OpenAI 응답 내부에 반환 텍스트가 부재합니다.');
        }

        return JSON.parse(parsedText);
      }

      // =========================================================================
      // [직접 가동 루트 B] Gemini 직접 호출 구동
      // =========================================================================
      if (onProgress) {
        onProgress('Gemini AI 직접 분석 중...');
      }

      const models = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-1.5-flash'];
      const payload = {
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              company: { type: 'STRING' },
              role: { type: 'STRING' },
              email: { type: 'STRING' },
              phone: { type: 'STRING' },
              phone2: { type: 'STRING' },
              country: { type: 'STRING' },
              address: { type: 'STRING' },
              website: { type: 'STRING' },
              notes: { type: 'STRING' }
            },
            required: ['name', 'company', 'role', 'email', 'phone', 'phone2', 'country', 'address', 'website', 'notes']
          }
        }
      };

      let response = null;
      let lastError = null;

      for (const model of models) {
        const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        try {
          response = await fetchWithRetry(endpointUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          break;
        } catch (error) {
          if (error.status === 404) {
            lastError = `모델 ${model} 지원 불가 (404)`;
            continue;
          }
          throw error;
        }
      }

      if (!response) {
        throw new Error(`Gemini API 호출 전체 실패: ${lastError || '모든 적합 모델 응답 없음'}`);
      }

      const parsedText = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!parsedText) {
        throw new Error('API 응답 내부에 반환 텍스트가 부재합니다.');
      }

      return JSON.parse(parsedText);
    } else {
      // 2) 서버리스 에지 백엔드 프록시 호출 모드
      if (onProgress) {
        onProgress('보안 AI 서버 분석 중...');
      }

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
        if (onProgress) {
          onProgress('로컬 엔진 전환 분석 중...');
        }
        return processCardOCRLocal(base64Data, mimeType, onProgress);
      }

      return data;
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
      <Header theme={theme} toggleTheme={toggleTheme} apiKey={apiKey} apiType={apiType} />

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