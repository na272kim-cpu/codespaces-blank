import React from 'react';

export default function Header({ theme, toggleTheme, onShowPremium }) {
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 hover:opacity-85 transition-opacity">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
            <i className="fa-solid fa-address-card text-lg"></i>
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              OCR<span className="text-primary-600">.GOOD</span>
            </span>
            <span className="text-xs block text-slate-500 dark:text-slate-400">
              Multi Business Card Scanner
            </span>
          </div>
        </a>

        <div className="flex items-center gap-3">
          {/* 테마 스위처 */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
            title="테마 변경"
          >
            {theme === 'dark' ? (
              <i className="fa-solid fa-sun text-lg"></i>
            ) : (
              <i className="fa-solid fa-moon text-lg"></i>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}