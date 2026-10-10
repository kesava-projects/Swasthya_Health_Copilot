import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { getT, SUPPORTED_LANGUAGES } from '../utils/i18n.js';
import { Globe, Shield, User, Menu, X, ChevronDown, Sparkles } from 'lucide-react';
import { Language } from '../types/index.js';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, language, setLanguage } = useAuth();
  const t = getT(language);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 ring-1 ring-emerald-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                  {t.appName}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  ABDM FHIR R4
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block font-medium">{t.tagline}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Multilingual Selector */}
          <div className="relative">
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-100/90 hover:bg-slate-200/80 rounded-xl border border-slate-200/80 text-xs font-semibold text-slate-700 transition-all shadow-2xs hover:shadow-xs"
              aria-label="Select Language"
            >
              <span className="text-sm">{currentLang.flag}</span>
              <span className="hidden sm:inline font-medium">{currentLang.nativeName}</span>
              <span className="sm:hidden uppercase">{currentLang.code}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {langDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setLangDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-50 animate-scale-in">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Select Language ({SUPPORTED_LANGUAGES.length})
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1">
                    {SUPPORTED_LANGUAGES.map((langItem) => (
                      <button
                        key={langItem.code}
                        onClick={() => {
                          setLanguage(langItem.code);
                          setLangDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                          language === langItem.code
                            ? 'bg-emerald-50/80 text-emerald-800 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{langItem.flag}</span>
                          <div className="text-left">
                            <span className="block leading-tight font-medium">{langItem.nativeName}</span>
                            <span className="text-[10px] text-slate-400 leading-tight">{langItem.label}</span>
                          </div>
                        </div>
                        {language === langItem.code && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Account / Mock ABHA Info */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-slate-800 truncate max-w-[130px] leading-tight">{user.name}</p>
                <p className="text-[10px] text-emerald-700 font-mono tracking-tight font-medium leading-tight">
                  {user.mockAbhaId || 'Patient'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
