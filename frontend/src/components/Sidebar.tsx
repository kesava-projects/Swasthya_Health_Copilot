import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { getT } from '../utils/i18n.js';
import {
  LayoutDashboard,
  FileText,
  Activity,
  Calendar,
  User,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  ShieldCheck,
  Lock,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { language, logout } = useAuth();
  const t = getT(language);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t.nav.dashboard },
    { to: '/documents', icon: FileText, label: t.nav.documents },
    { to: '/observations', icon: Activity, label: t.nav.observations },
    { to: '/timeline', icon: Calendar, label: t.nav.timeline },
    { to: '/profile', icon: User, label: t.nav.profile },
    { to: '/chat', icon: MessageSquare, label: t.nav.chatbot },
    { to: '/reminders', icon: Bell, label: t.nav.reminders },
    { to: '/settings', icon: Settings, label: t.nav.settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden animate-fade-in"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white/95 backdrop-blur-md border-r border-slate-200/90 transform transition-transform duration-200 ease-in-out md:translate-x-0 flex flex-col justify-between shadow-2xs ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3.5 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50/80 text-emerald-900 shadow-2xs border border-emerald-200/80 ring-1 ring-emerald-400/20'
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.to === '/chat' && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        AI
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer with logout and privacy badge */}
        <div className="p-3.5 border-t border-slate-200/80 space-y-3">
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 p-3 rounded-xl border border-slate-200/90 text-[11px] text-slate-600 shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Medical Safety First</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              All documents are cryptographically protected and strictly isolated to your account.
            </p>
          </div>

          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.nav.logout}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
