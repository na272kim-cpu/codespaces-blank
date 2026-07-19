import React, { useState, useEffect } from 'react';

export default function PremiumModal({ show, onClose, showToast, activePlan, setActivePlan }) {
  const [selectedPlan, setSelectedPlan] = useState('PRO');

  useEffect(() => {
    if (activePlan) {
      setSelectedPlan(activePlan === 'FREE' ? 'PRO' : activePlan);
    }
  }, [activePlan, show]);

  if (!show) return null;

  const getBenefits = () => {
    switch (selectedPlan) {
      case 'FREE':
        return [
          { text: '명함 50장을 시트로 변환', enabled: true },
          { text: '검색 및 수동 편집 가능', enabled: true },
          { text: 'Excel, CSV 다운로드 불가', enabled: false }
        ];
      case 'PRO':
        return [
          { text: '월 1,000 크레딧', enabled: true },
          { text: '명함을 시트로 변환', enabled: true },
          { text: '검색 및 수동 편집 가능', enabled: true },
          { text: 'Excel, CSV 다운로드 가능', enabled: true }
        ];
      case 'EVENT':
        return [
          { text: '3일간 무제한 사용', enabled: true },
          { text: '명함을 시트로 변환', enabled: true },
          { text: '검색 및 수동 편집 가능', enabled: true },
          { text: 'Excel, CSV 다운로드 가능', enabled: true }
        ];
      default:
        return [];
    }
  };

  const handleApplyPlan = () => {
    if (setActivePlan) {
      setActivePlan(selectedPlan);
    }
    
    let planName = 'Free Plan';
    if (selectedPlan === 'PRO') planName = 'Pro Plan ($15/월)';
    if (selectedPlan === 'EVENT') planName = 'Event Pass ($29/일회성)';
    
    if (showToast) {
      showToast(`👑 ${planName} 적용이 완료되었습니다!`, 'success');
    }
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 animate-fadeIn"
    >
      <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 font-sans relative border border-slate-100 dark:border-slate-700 transition-colors duration-300">
        
        {/* 닫기 버튼 */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="닫기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 타이틀 */}
        <div className="text-center my-4">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/40 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="fa-solid fa-crown text-2xl text-amber-500 animate-bounce"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Card2Sheet 요금제 안내</h2>
          <p className="text-slate-500 dark:text-slate-300 text-sm mt-1">이 기능을 사용하려면 요금제를 업그레이드하세요.</p>
        </div>

        {/* 메인 콘텐츠 레이아웃 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          
          {/* 왼쪽: 혜택 (Benefits) */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">혜택</h3>
            <ul className="space-y-3">
              {getBenefits().map((benefit, index) => (
                <li key={index} className="flex items-start text-slate-700 dark:text-slate-200 text-xs">
                  {benefit.enabled ? (
                    <span className="text-emerald-500 mr-2 font-bold">✓</span>
                  ) : (
                    <span className="text-rose-500 mr-2 font-bold">✕</span>
                  )}
                  <span>{benefit.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 오른쪽: 요금제 선택 (Plans) */}
          <div className="space-y-3">
            
            {/* FREE PLAN */}
            <label 
              className={`flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all ${
                selectedPlan === 'FREE'
                  ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20'
                  : 'border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input 
                  type="radio" 
                  name="plan" 
                  value="FREE"
                  checked={selectedPlan === 'FREE'}
                  onChange={() => setSelectedPlan('FREE')}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <div className="bg-slate-100 dark:bg-slate-700 p-1.5 rounded-lg text-sm">🌱</div>
                <div className="text-left">
                  <div className="font-bold text-slate-800 dark:text-white text-xs">Free Plan</div>
                </div>
              </div>
              <div className="text-xs font-extrabold text-slate-600 dark:text-slate-300 whitespace-nowrap">Free</div>
            </label>

            {/* PRO PLAN */}
            <label 
              className={`flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all ${
                selectedPlan === 'PRO'
                  ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20'
                  : 'border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input 
                  type="radio" 
                  name="plan" 
                  value="PRO"
                  checked={selectedPlan === 'PRO'}
                  onChange={() => setSelectedPlan('PRO')}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <div className="bg-amber-100 dark:bg-amber-950/40 p-1.5 rounded-lg text-sm">⭐</div>
                <div className="text-left">
                  <div className="font-bold text-slate-800 dark:text-white text-xs">Pro Plan</div>
                </div>
              </div>
              <div className="text-xs font-extrabold text-blue-600 dark:text-blue-400 whitespace-nowrap">$15/월</div>
            </label>

            {/* EVENT PASS */}
            <label 
              className={`flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all ${
                selectedPlan === 'EVENT'
                  ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20'
                  : 'border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input 
                  type="radio" 
                  name="plan" 
                  value="EVENT"
                  checked={selectedPlan === 'EVENT'}
                  onChange={() => setSelectedPlan('EVENT')}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <div className="bg-orange-100 dark:bg-orange-950/40 p-1.5 rounded-lg text-sm">⚡</div>
                <div className="text-left">
                  <div className="font-bold text-slate-800 dark:text-white text-xs">Event Pass</div>
                </div>
              </div>
              <div className="text-xs font-extrabold text-orange-600 dark:text-orange-400 whitespace-nowrap">$29/회</div>
            </label>
          </div>
        </div>

        {/* 현재 이용 중인 요금제 배지 */}
        <div className="mt-4 px-3 py-2 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/60 dark:border-blue-950/30 rounded-xl flex justify-between items-center text-xs">
          <span className="text-slate-500 dark:text-slate-400">현재 적용 중인 요금제:</span>
          <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-100/40 dark:bg-blue-950/30 px-2.5 py-1 rounded-lg">
            {activePlan === 'FREE' ? 'Free Plan' : activePlan === 'PRO' ? 'Pro Plan ($15/월)' : 'Event Pass ($29/일회성)'}
          </span>
        </div>

        {/* 하단 버튼 영역 */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-150 dark:border-slate-700">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition"
          >
            닫기
          </button>
          <button 
            onClick={handleApplyPlan}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-primary-600/10"
          >
            요금제 변경 / 구독 신청
          </button>
        </div>
      </div>
    </div>
  );
}