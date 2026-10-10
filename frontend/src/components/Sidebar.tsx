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
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out md:translate-x-0 flex flex-col justify-between ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-2xs border border-emerald-100'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{item.label}</span>
                </div>
                {item.to === '/chat' && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    AI
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer with logout and privacy badge */}
        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700 block mb-0.5">Privacy First</span>
            Synthetic / user-scoped records only. All documents private.
          </div>

          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t.nav.logout}
          </button>
        </div>
      </aside>
    </>
  );
};
