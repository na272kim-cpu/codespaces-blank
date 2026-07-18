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
  onShowPremium
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

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
      // Reset value so same file can be uploaded again if removed
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* 명함 업로드 카드 */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <i className="fa-regular fa-images text-primary-500"></i> 대량 명함 업로드
          </span>
          <span className="text-xs bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-lg font-bold text-primary-600">
            {cardQueue.length} / 50
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
          </div>
        </div>

        {/* 배치 컨트롤 패널 */}
        {cardQueue.length > 0 && (
          <div className="mt-5 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            {/* 일괄 진행 바 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500 truncate max-w-[80%]">{progressLabel || '대기 중...'}</span>
                <span className="text-primary-600">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-900 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary-500 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onStartBatch}
                disabled={isProcessing}
                className="py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary-500/15"
              >
                <i className="fa-solid fa-play"></i> 일괄 분석 시작
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

      {/* 2개 초과 업로드 시 프리미엄 안내 배너 */}
      {cardQueue.length >= 3 && (
        <button
          onClick={onShowPremium}
          className="w-full p-4 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white font-extrabold text-sm shadow-md shadow-orange-500/10 hover:shadow-orange-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between gap-3 animate-fadeIn border border-amber-400"
        >
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white text-base flex-shrink-0 animate-pulse">
              <i className="fa-solid fa-crown"></i>
            </div>
            <div>
              <p className="font-black text-sm text-white">This mode is premium</p>
              <p className="text-[10px] text-white/95 font-semibold mt-0.5">업로드 3개째부터는 프리미엄 요금제가 필요합니다.</p>
            </div>
          </div>
          <span className="text-[10px] bg-white text-orange-600 font-black px-2.5 py-1.5 rounded-xl shadow-sm whitespace-nowrap">
            UPGRADE 👑
          </span>
        </button>
      )}

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
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-medium">
                    <i className="fa-solid fa-check"></i> 성공
                  </span>
                );
              } else if (card.status === 'error') {
                statusClass = 'border-rose-500 bg-rose-50/10';
                statusBadge = (
                  <span className="text-[10px] bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded font-medium">
                    <i className="fa-solid fa-triangle-exclamation"></i> 에러
                  </span>
                );
              } else {
                statusBadge = (
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 font-medium">
                    대기중
                  </span>
                );
              }

              return (
                <div
                  key={card.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all bg-slate-50 dark:bg-slate-900/60 ${statusClass}`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden max-w-[70%]">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                      <i className="fa-solid fa-address-card"></i>
                    </div>
                    <div className="truncate">
                      <p className="font-semibold text-slate-700 dark:text-slate-300 truncate text-[11px]">
                        {card.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {(card.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge}
                    {card.status === 'pending' && !isProcessing && (
                      <button
                        onClick={() => onRemoveItem(card.id)}
                        className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                        title="제거"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}