import React, { useState } from 'react';

export default function PremiumModal({ show, onClose, showToast }) {
  const [selectedPlan, setSelectedPlan] = useState('BASIC');

  if (!show) return null;

  const handleSubscribe = () => {
    if (showToast) {
      showToast(`👑 ${selectedPlan} 요금제 구독 신청이 완료되었습니다!`, 'success');
    }
    onClose();
  };

  // 모달 영역 밖을 클릭 시 닫기 위한 핸들러
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
          <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400">This mode is premium</h2>
          <p className="text-gray-500 dark:text-slate-300 mt-1">Please upgrade your plan to use this feature</p>
        </div>

        {/* 메인 콘텐츠 레이아웃 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          
          {/* 왼쪽: 혜택 (Benefits) */}
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-400 mb-4">benefits</h3>
            <ul className="space-y-3">
              <li className="flex items-start text-gray-700 dark:text-slate-200 text-sm">
                <span className="text-orange-500 mr-2 font-bold">✓</span>
                <span>10000 upload credit</span>
              </li>
              <li className="flex items-start text-gray-700 dark:text-slate-200 text-sm">
                <span className="text-orange-500 mr-2 font-bold">✓</span>
                <span>50 images per submission</span>
              </li>
              <li className="flex items-start text-gray-700 dark:text-slate-200 text-sm">
                <span className="text-orange-500 mr-2 font-bold">✓</span>
                <span>Image size up to 10 MB</span>
              </li>
              <li className="flex items-start text-gray-700 dark:text-slate-200 text-sm">
                <span className="text-orange-500 mr-2 font-bold">✓</span>
                <span>3x Faster conversion</span>
              </li>
              <li className="flex items-start text-gray-700 dark:text-slate-200 text-sm">
                <span className="text-orange-500 mr-2 font-bold">✓</span>
                <span>Extract Formatted Text</span>
              </li>
            </ul>
          </div>

          {/* 오른쪽: 요금제 선택 (Plans) */}
          <div className="space-y-3">
            
            {/* BASIC */}
            <label 
              className={`flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all ${
                selectedPlan === 'BASIC'
                  ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                  : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <input 
                  type="radio" 
                  name="plan" 
                  value="BASIC"
                  checked={selectedPlan === 'BASIC'}
                  onChange={() => setSelectedPlan('BASIC')}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <div className="bg-orange-50 dark:bg-orange-950/40 p-2 rounded-lg text-sm">⚡</div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm">BASIC</div>
                  <div className="text-[10px] text-gray-400 dark:text-slate-400">Basic Monthly</div>
                </div>
              </div>
              <div className="text-base font-bold text-gray-900 dark:text-white">$5</div>
            </label>

            {/* STANDARD */}
            <label 
              className={`flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all ${
                selectedPlan === 'STANDARD'
                  ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                  : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <input 
                  type="radio" 
                  name="plan" 
                  value="STANDARD"
                  checked={selectedPlan === 'STANDARD'}
                  onChange={() => setSelectedPlan('STANDARD')}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <div className="bg-orange-50 dark:bg-orange-950/40 p-2 rounded-lg text-sm">⭐</div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm">STANDARD</div>
                  <div className="text-[10px] text-gray-400 dark:text-slate-400">Standard Monthly</div>
                </div>
              </div>
              <div className="text-base font-bold text-gray-900 dark:text-white">$8</div>
            </label>

            {/* PREMIUM */}
            <label 
              className={`flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all ${
                selectedPlan === 'PREMIUM'
                  ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                  : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <input 
                  type="radio" 
                  name="plan" 
                  value="PREMIUM"
                  checked={selectedPlan === 'PREMIUM'}
                  onChange={() => setSelectedPlan('PREMIUM')}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <div className="bg-orange-50 dark:bg-orange-950/40 p-2 rounded-lg text-sm">👑</div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm">PREMIUM</div>
                  <div className="text-[10px] text-gray-400 dark:text-slate-400">Premium Monthly</div>
                </div>
              </div>
              <div className="text-base font-bold text-gray-900 dark:text-white">$18</div>
            </label>
          </div>
        </div>

        {/* 하단 버튼 영역 */}
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-100 dark:border-slate-700">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 text-sm font-medium rounded-xl transition"
          >
            Continue as Free
          </button>
          <button 
            onClick={handleSubscribe}
            className="px-5 py-2 bg-blue-900 hover:bg-blue-950 dark:bg-primary-600 dark:hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition shadow-md"
          >
            Subscribe Now
          </button>
        </div>
      </div>
    </div>
  );
}