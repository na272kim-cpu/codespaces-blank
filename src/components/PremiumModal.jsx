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
    
    let planName = 'Free';
    if (selectedPlan === 'PRO') planName = 'Pro ($15/월)';
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
      <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 font-sans relative border border-slate-150/50 dark:border-slate-700/80 transition-colors duration-300">
        
        {/* 닫기 버튼 */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="닫기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 타이틀 */}
        <div className="text-center my-5">
          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/40 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
            <i className="fa-solid fa-crown text-2xl text-amber-500 animate-bounce"></i>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Card2Sheet 요금제 안내</h2>
          <p className="text-slate-500 dark:text-slate-300 text-sm mt-2">이 기능을 사용하려면 요금제를 업그레이드하세요.</p>
        </div>

        {/* 메인 콘텐츠 레이아웃 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          
          {/* 왼쪽: 혜택 (Benefits) */}
          <div className="bg-slate-50/75 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex flex-col justify-center shadow-inner">
            <h3 className="text-sm font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">혜택</h3>
            <ul className="space-y-4">
              {getBenefits().map((benefit, index) => (
                <li key={index} className="flex items-start text-slate-700 dark:text-slate-200 text-sm font-semibold leading-relaxed">
                  {benefit.enabled ? (
                    <span className="text-emerald-500 mr-2.5 text-base font-extrabold">✓</span>
                  ) : (
                    <span className="text-rose-500 mr-2.5 text-base font-extrabold">✕</span>
                  )}
                  <span>{benefit.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 오른쪽: 요금제 선택 (Plans) */}
          <div className="space-y-3.5">
            
            {/* FREE PLAN */}
            <label 
              className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                selectedPlan === 'FREE'
                  ? 'border-blue-500 bg-blue-50/25 dark:bg-blue-950/20 shadow-md shadow-blue-500/5'
                  : 'border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <input 
                  type="radio" 
                  name="plan" 
                  value="FREE"
                  checked={selectedPlan === 'FREE'}
                  onChange={() => setSelectedPlan('FREE')}
                  className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-xl text-lg">🌱</div>
                <div className="text-left">
                  <div className="font-extrabold text-slate-800 dark:text-white text-lg tracking-tight">Free</div>
                </div>
              </div>
              <div className="text-lg font-extrabold text-slate-600 dark:text-slate-300 whitespace-nowrap pr-1">Free</div>
            </label>

            {/* PRO PLAN */}
            <label 
              className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                selectedPlan === 'PRO'
                  ? 'border-blue-500 bg-blue-50/25 dark:bg-blue-950/20 shadow-md shadow-blue-500/5'
                  : 'border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <input 
                  type="radio" 
                  name="plan" 
                  value="PRO"
                  checked={selectedPlan === 'PRO'}
                  onChange={() => setSelectedPlan('PRO')}
                  className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <div className="bg-amber-100 dark:bg-amber-950/40 p-2 rounded-xl text-lg">⭐</div>
                <div className="text-left">
                  <div className="font-extrabold text-slate-800 dark:text-white text-lg tracking-tight">Pro</div>
                </div>
              </div>
              <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400 whitespace-nowrap pr-1">$15/월</div>
            </label>

            {/* EVENT PASS */}
            <label 
              className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                selectedPlan === 'EVENT'
                  ? 'border-blue-500 bg-blue-50/25 dark:bg-blue-950/20 shadow-md shadow-blue-500/5'
                  : 'border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <input 
                  type="radio" 
                  name="plan" 
                  value="EVENT"
                  checked={selectedPlan === 'EVENT'}
                  onChange={() => setSelectedPlan('EVENT')}
                  className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <div className="bg-orange-100 dark:bg-orange-950/40 p-2 rounded-xl text-lg">⚡</div>
                <div className="text-left">
                  <div className="font-extrabold text-slate-800 dark:text-white text-lg tracking-tight">Event Pass</div>
                </div>
              </div>
              <div className="text-lg font-extrabold text-orange-600 dark:text-orange-400 whitespace-nowrap pr-1">$29/회</div>
            </label>
          </div>
        </div>

        {/* 하단 버튼 영역 */}
        <div className="flex justify-between items-center mt-8 pt-5 border-t border-slate-150 dark:border-slate-700">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl transition-all active:scale-95"
          >
            닫기
          </button>
          <button 
            onClick={handleApplyPlan}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30"
          >
            구독하기
          </button>
        </div>
      </div>
    </div>
  );
}