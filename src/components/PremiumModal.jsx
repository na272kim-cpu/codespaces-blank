import React, { useState, useEffect } from 'react';
import { X, Check, Crown, Sprout, Star, Zap, CreditCard } from 'lucide-react';

const plans = [
  { 
    id: 'free', 
    name: 'Free', 
    price: 'Free', 
    icon: Sprout,
    benefits: [
      "50개 명함 시트로 변환",
      "시트 수동 편집 지원",
      "필터 및 검색 지원"
    ]
  },
  { 
    id: 'pro', 
    name: 'Pro', 
    price: '$15/월', 
    icon: Star,
    benefits: [
      "월 1,000 크레딧 제공",
      "시트 수동 편집 지원",
      "필터 및 검색 지원",
      "Excel, CSV 다운로드"
    ]
  },
  { 
    id: 'event', 
    name: 'Event Pass', 
    price: '$29/회', 
    icon: Zap,
    benefits: [
      "3일간 무제한 사용",
      "시트 수동 편집 지원",
      "필터 및 검색 지원",
      "Excel, CSV 다운로드"
    ]
  },
];

export default function PremiumModal({ show, isOpen, onClose, showToast, activePlan, setActivePlan }) {
  const [selectedPlan, setSelectedPlan] = useState('pro');

  const isVisible = show || isOpen;

  useEffect(() => {
    if (activePlan) {
      const lower = activePlan.toLowerCase();
      setSelectedPlan(lower);
    }
  }, [activePlan, show, isOpen]);

  if (!isVisible) return null;

  // 현재 선택된 요금제의 상세 데이터를 가져옵니다.
  const activePlanData = plans.find(plan => plan.id === selectedPlan) || plans[1];

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
      className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity"
    >
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative border border-slate-100 dark:border-slate-700 transform transition-all duration-300">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 sm:top-6 sm:right-6 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-full transition-colors"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        {/* 헤더 섹션 */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-amber-100 dark:bg-amber-950/40 p-4 rounded-full mb-4 shadow-sm shadow-amber-200/50">
            <Crown size={36} className="text-amber-500" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Card2Sheet 요금제 안내</h2>
          <p className="text-slate-500 dark:text-slate-300 mt-2 text-sm sm:text-base">이 기능을 사용하려면 요금제를 업그레이드하세요.</p>
        </div>

        {/* 40:60 비율([2fr_3fr])로 혜택 박스는 가로 폭을 줄이고, 요금 버튼 영역을 더 넓힘 */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-8">
          
          {/* 혜택 리스트 - 선택된 요금제에 맞춰서 혜택 리스트가 변경됩니다. */}
          <div className="bg-slate-50/80 dark:bg-slate-900/30 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/60 h-full flex flex-col justify-between shadow-inner">
            <div>
              <h3 className="font-bold text-slate-400 dark:text-slate-500 mb-4 text-xs sm:text-sm uppercase tracking-wider">
                혜택
              </h3>
              <ul className="space-y-4">
                {activePlanData.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start text-slate-700 dark:text-slate-200 font-semibold text-sm leading-relaxed">
                    <Check size={18} className="text-emerald-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 요금제 선택 영역 */}
          <div className="space-y-3 flex flex-col justify-center">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`border-2 rounded-2xl p-4 cursor-pointer transition-all flex items-center justify-between group ${
                  selectedPlan === plan.id 
                  ? 'border-blue-500 bg-blue-50/25 dark:bg-blue-950/20 shadow-md shadow-blue-500/5' 
                  : 'border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                    selectedPlan === plan.id ? 'border-blue-600' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {selectedPlan === plan.id && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                  </div>
                  
                  <div className={`p-2 rounded-xl mr-3.5 transition-colors ${
                    selectedPlan === plan.id ? 'bg-white dark:bg-slate-700 shadow-sm' : 'bg-slate-100 dark:bg-slate-900 group-hover:bg-white dark:group-hover:bg-slate-700'
                  }`}>
                    <plan.icon size={22} className={selectedPlan === plan.id ? 'text-blue-500 dark:text-blue-400' : 'text-slate-500'} />
                  </div>
                  <span className={`font-extrabold text-lg whitespace-nowrap ${selectedPlan === plan.id ? 'text-blue-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                    {plan.name}
                  </span>
                </div>
                <span className={`font-extrabold text-lg whitespace-nowrap pr-1 ${selectedPlan === plan.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {plan.price}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 액션 버튼 (40:60 비율로 구독하기 버튼 너비가 요금제 카드와 정확히 정렬되도록 세팅) */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-8 mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 items-center">
          <div>
            <button 
              onClick={onClose} 
              className="w-full md:w-auto md:px-10 py-3 font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-xl transition active:scale-95 transition-transform text-sm sm:text-base"
            >
              닫기
            </button>
          </div>
          <button 
            onClick={handleApplyPlan}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center text-sm sm:text-base"
          >
            <CreditCard size={18} className="mr-2" />
            구독하기
          </button>
        </div>
      </div>
    </div>
  );
}