/**
 * CockpitShell — IVC AI Cockpit navigation shell
 * Top bar + nav rail (desktop) / bottom tabs (mobile)
 * 4 tabs: Overview, Backlog, Health, Investment
 */
import { useState } from 'react';
import { useUser } from '../../AuthGate';
import CommandCenter from './CommandCenter';
import BacklogBoard from './BacklogBoard';
import HealthPanel from './HealthPanel';
import InvestmentPanel from './InvestmentPanel';

const NAV_ITEMS = [
  { id: 'command', label: 'Overview', badge: null,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  { id: 'backlog', label: 'Backlog', badge: null,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  { id: 'health', label: 'Health', badge: 'Soon',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  { id: 'investment', label: 'Investment', badge: 'Soon',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
];

export default function CockpitShell() {
  const [activeTab, setActiveTab] = useState('command');
  const user = useUser();

  const initials = (user?.display_name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── TOP BAR ── */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center px-5 z-30">
        {/* Left: company pill */}
        <span className="bg-gray-100 text-gray-900 font-semibold text-base px-3 py-1 rounded-lg">
          {user?.company_name || 'IVC'}
        </span>

        {/* Center: title */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <span className="text-xl font-semibold text-gray-900">
            {user?.company_name || 'IVC'} AI Platform
          </span>
        </div>

        {/* Right: avatar */}
        <div className="ml-auto w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
          {initials}
        </div>
      </header>

      {/* ── NAV RAIL (desktop) ── */}
      <nav className="hidden md:flex fixed left-0 top-16 bottom-0 w-20 bg-gray-50 border-r border-gray-200 flex-col items-center pt-4 gap-1 z-20">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex flex-col items-center py-3 gap-1 relative cursor-pointer transition-colors
              ${activeTab === item.id ? 'text-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {activeTab === item.id && (
              <div className="absolute inset-x-2 inset-y-0 bg-gray-200 rounded-lg -z-10" />
            )}
            {item.icon}
            <span className="text-[11px] font-medium">{item.label}</span>
            {item.badge && (
              <span className="absolute top-1 right-3 bg-orange-400 text-white text-[10px] px-1 rounded-full leading-tight">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* ── BOTTOM TAB BAR (mobile) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex justify-around items-center z-20">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors
              ${activeTab === item.id ? 'text-blue-500' : 'text-gray-400'}`}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className="md:ml-20 mt-16 md:mb-0 mb-16 min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1">
          {activeTab === 'command' && <CommandCenter />}
          {activeTab === 'backlog' && <BacklogBoard />}
          {activeTab === 'health' && <HealthPanel />}
          {activeTab === 'investment' && <InvestmentPanel />}
        </div>
        <footer className="mt-auto pt-8 pb-6 px-6 border-t border-gray-100 mt-12">
          <p className="text-xs text-gray-400 text-center">
            Powered by{' '}
            <span className="font-medium text-gray-500">Nouvia Intelligence Platform</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
