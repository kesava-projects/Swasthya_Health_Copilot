import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { getT } from '../utils/i18n.js';
import { Globe, Shield, User, Menu, X } from 'lucide-react';
import { Language } from '../types/index.js';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, language, setLanguage } = useAuth();
  const t = getT(language);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                {t.appName}
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  ABDM Ready
                </span>
              </span>
              <p className="text-xs text-slate-500 hidden sm:block">{t.tagline}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Language Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1 border border-slate-200">
            <Globe className="w-4 h-4 text-slate-500 ml-1.5" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-xs font-medium text-slate-700 pr-2 py-0.5 outline-none cursor-pointer"
            >
              <option value="en">English (EN)</option>
              <option value="te">తెలుగు (TE)</option>
              <option value="hi">हिंदी (HI)</option>
            </select>
          </div>

          {/* User Account / Mock ABHA Info */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs border border-slate-300">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">{user.name}</p>
                <p className="text-[10px] text-emerald-600 font-mono tracking-tight font-medium">
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
