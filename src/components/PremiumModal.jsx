import React, { useState, useEffect } from 'react';
import { X, Check, Crown, Sprout, Star, Zap } from 'lucide-react';

const plans = [
  { id: 'free', name: 'Free', price: 'Free', icon: Sprout },
  { id: 'pro', name: 'Pro', price: '$15/월', icon: Star },
  { id: 'event', name: 'Event Pass', price: '$29/회', icon: Zap },
];

export default function PremiumModal({ show, isOpen, onClose, showToast, activePlan, setActivePlan }) {
  const [selectedPlan, setSelectedPlan] = useState('pro');

  const isVisible = show || isOpen;

  useEffect(() => {
    if (activePlan) {
      const lower = activePlan.toLowerCase();
      setSelectedPlan(lower === 'free' ? 'pro' : lower);
    }
  }, [activePlan, show, isOpen]);

  if (!isVisible) return null;

  const getBenefits = () => {
    switch (selectedPlan.toUpperCase()) {
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
    const uppercasePlan = selectedPlan.toUpperCase();
    if (setActivePlan) {
      setActivePlan(uppercasePlan);
    }
    
    let planName = 'Free';
    if (uppercasePlan === 'PRO') planName = 'Pro ($15/월)';
    if (uppercasePlan === 'EVENT') planName = 'Event Pass ($29/일회성)';
    
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
      className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative border border-slate-100 dark:border-slate-700 transition-colors duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X size={24} />
        </button>

        {/* 헤더 섹션 */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-amber-100 dark:bg-amber-950/40 p-3 rounded-full mb-4">
            <Crown size={32} className="text-amber-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Card2Sheet 요금제 안내</h2>
          <p className="text-slate-500 dark:text-slate-300 mt-1">이 기능을 사용하려면 요금제를 업그레이드하세요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-8">
          {/* 혜택 리스트 */}
          <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/60 flex flex-col justify-center">
            <h3 className="font-bold text-slate-400 mb-4 text-sm uppercase tracking-wider">혜택</h3>
            <ul className="space-y-4">
              {getBenefits().map((benefit, i) => (
                <li key={i} className="flex items-start text-slate-700 dark:text-slate-200 font-semibold text-sm leading-relaxed">
                  {benefit.enabled ? (
                    <Check size={20} className="text-emerald-500 mr-3 flex-shrink-0 mt-0.5" />
                  ) : (
                    <X size={20} className="text-rose-500 mr-3 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{benefit.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 요금제 선택 영역 */}
          <div className="space-y-3.5">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`border-2 rounded-2xl p-4 cursor-pointer transition-all flex items-center justify-between ${
                  selectedPlan === plan.id 
                  ? 'border-blue-500 bg-blue-50/25 dark:bg-blue-950/20 shadow-md shadow-blue-500/5' 
                  : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center">
                  <input 
                    type="radio" 
                    checked={selectedPlan === plan.id} 
                    onChange={() => {}}
                    className="mr-4 accent-blue-600 w-5 h-5 cursor-pointer"
                  />
                  <div className={`p-2 rounded-xl mr-3.5 transition-colors ${selectedPlan === plan.id ? 'bg-white dark:bg-slate-700' : 'bg-slate-50 dark:bg-slate-900'}`}>
                    <plan.icon size={22} className={selectedPlan === plan.id ? 'text-blue-500 dark:text-blue-400' : 'text-slate-500'} />
                  </div>
                  <span className="font-extrabold text-slate-900 dark:text-white text-lg">{plan.name}</span>
                </div>
                <span className="font-extrabold text-blue-600 dark:text-blue-400 text-lg whitespace-nowrap pr-1">{plan.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-8 mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
          {/* 왼쪽: 닫기 버튼 */}
          <div className="flex justify-start">
            <button 
              onClick={onClose} 
              className="w-full md:w-auto md:px-10 py-3 font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition active:scale-95 transition-transform"
            >
              닫기
            </button>
          </div>
          
          {/* 오른쪽: 구독하기 버튼 */}
          <div>
            <button 
              onClick={handleApplyPlan}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-200 active:scale-95 transition-transform"
            >
              구독하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}