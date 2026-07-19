import React, { useRef, useState } from 'react';

export default function Uploader({
  cardQueue,
  isProcessing,
  progressPercent,
  progressLabel,
  onFilesSelected,
  onStartBatch,
  onClearQueue,
  onRemoveItem,
  onShowPremium,
  activePlan = 'FREE',
  onAddCardDirectly
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [inputUrl, setInputUrl] = useState('');

  const handleDragEnter = (e) => {
    e.preventDefault();
    if (!isProcessing) setIsDragOver(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isProcessing) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  const handleClick = () => {
    if (!isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
  };

  // 이미지 URL 제출 처리 함수
  const handleUrlSubmit = () => {
    if (!inputUrl) return;

    // 간단한 URL 패턴 매칭 검증
    if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://') && !inputUrl.startsWith('data:')) {
      alert('올바른 이미지 URL 주소(http:// 또는 https://)를 입력해 주세요.');
      return;
    }

    // CORS 우회 및 캔버스를 통한 Base64 렌더링 파싱 시도
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const dataURL = canvas.toDataURL('image/png');
        const base64 = dataURL.split(',')[1];

        // 새로운 카드 오브젝트 조립
        const id = Date.now() + Math.random();
        const cardObj = {
          id,
          name: inputUrl.split('/').pop()?.split('?')[0] || 'url_image.png',
          size: Math.round(base64.length * 0.75),
          type: 'image/png',
          status: 'pending',
          imageUrl: dataURL,
          base64: base64
        };

        if (onAddCardDirectly) {
          onAddCardDirectly(cardObj);
        }
        setShowUrlModal(false);
        setInputUrl('');
      } catch (err) {
        alert('CORS 보안 제한이 걸려 있는 이미지 주소입니다. 다른 주소를 넣거나 로컬 파일 업로드를 이용해 주세요.');
      }
    };

    img.onerror = () => {
      alert('이미지를 로드하지 못했습니다. 정확한 이미지 URL인지 다시 한 번 확인해 주세요.');
    };

    img.src = inputUrl;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <i className="fa-regular fa-images text-primary-500"></i> 대량 명함 업로드
          </span>
          <span className="text-xs bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-lg font-bold text-primary-600">
            {cardQueue.length} / {activePlan === 'FREE' ? '50' : '1,000'}
          </span>
        </h2>

        {/* 드롭존 영역 */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all relative overflow-hidden group ${
            isDragOver
              ? 'border-primary-500 bg-primary-50/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 bg-slate-50 dark:bg-slate-900/30'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
            multiple
            disabled={isProcessing}
          />

          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-cloud-arrow-up text-2xl text-primary-500"></i>
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                명함 이미지들을 끌어서 넣거나 클릭하세요
              </p>
              <p className="text-xs text-slate-400 mt-1">
                PNG, JPG, WEBP 지원 · 단축키 (Ctrl+V) 붙여넣기 지원
              </p>
            </div>
            
            {/* 링크 아이콘 버튼 (URL 입력) */}
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // 드롭존 파일 선택 팝업 차단
                  if (!isProcessing) {
                    setShowUrlModal(true);
                  }
                }}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="이미지 URL 주소 입력"
              >
                <i className="fa-solid fa-link"></i>
                <span>Enter Image URL</span>
              </button>
            </div>
          </div>
        </div>

        {/* 배치 컨트롤 패널 */}
        {cardQueue.length > 0 && (
          <div className="mt-5 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onStartBatch}
                disabled={isProcessing}
                className="py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary-500/15"
              >
                <i className="fa-solid fa-play"></i> 변환하기
              </button>
              <button
                onClick={onClearQueue}
                disabled={isProcessing}
                className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <i className="fa-solid fa-arrow-rotate-left"></i> 대기목록 비우기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 등록 목록 */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          업로드 명함 리스트
        </h3>

        <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
          {cardQueue.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              <i className="fa-solid fa-folder-open text-2xl mb-2 block"></i>
              등록된 명함 이미지가 없습니다.
            </div>
          ) : (
            cardQueue.map((card) => {
              let statusClass = 'border-slate-200 dark:border-slate-800';
              let statusBadge = null;

              if (card.status === 'processing') {
                statusClass = 'border-primary-500 ring-1 ring-primary-500';
                statusBadge = (
                  <span className="text-[10px] bg-primary-100 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                    <i className="fa-solid fa-spinner animate-spin"></i> 분석 중
                  </span>
                );
              } else if (card.status === 'success') {
                statusClass = 'border-emerald-500 bg-emerald-50/10';
                statusBadge = (
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                    <i className="fa-solid fa-circle-check"></i> 성공
                  </span>
                );
              } else if (card.status === 'error') {
                statusClass = 'border-rose-500 bg-rose-50/10';
                statusBadge = (
                  <span className="text-[10px] bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                    <i className="fa-solid fa-circle-exclamation"></i> 실패
                  </span>
                );
              } else {
                statusBadge = (
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                    대기중
                  </span>
                );
              }

              return (
                <div
                  key={card.id}
                  className={`flex items-center justify-between p-3 border rounded-2xl transition-all bg-white dark:bg-slate-900/40 ${statusClass}`}
                >
                  <div className="flex items-center gap-3 truncate max-w-[70%]">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 flex-shrink-0 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                      {card.imageUrl ? (
                        <img
                          src={card.imageUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <i className="fa-regular fa-image text-slate-400"></i>
                      )}
                    </div>
                    <div className="truncate text-left">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {card.name}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {(card.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {statusBadge}
                    <button
                      onClick={() => onRemoveItem(card.id)}
                      disabled={isProcessing}
                      className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 disabled:opacity-50 transition-colors"
                      title="제거"
                    >
                      <i className="fa-regular fa-trash-can text-sm"></i>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 이미지 URL 주소 입력 모달 */}
      {showUrlModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowUrlModal(false)}
        >
          <div 
            className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-5 border border-slate-100 dark:border-slate-700 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
              <i className="fa-solid fa-link text-primary-500"></i> 이미지 URL 입력
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              분석할 명함 이미지의 웹 URL 주소를 정확하게 입력해 주세요.
            </p>
            
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://example.com/card-image.jpg"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl text-xs font-semibold focus:outline-none transition-all mb-4 text-slate-800 dark:text-white"
            />
            
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => {
                  setShowUrlModal(false);
                  setInputUrl('');
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition"
              >
                취소
              </button>
              <button
                onClick={handleUrlSubmit}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}