'use client';

import React, { useState } from 'react';
import { AppRoute } from '../types';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onNavigate: (route: AppRoute) => void;
  currentRoute: string;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentRoute }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleNavigate = (route: AppRoute) => {
    onNavigate(route);
    setIsOpen(false);
  };

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo Section */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNavigate(AppRoute.HOME)}>
            <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight whitespace-nowrap">ASTU Route AI</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-10">
            <NavItem label="Home" active={currentRoute === AppRoute.HOME} onClick={() => handleNavigate(AppRoute.HOME)} />
            <NavItem label="Campus Map" active={currentRoute === AppRoute.MAP} onClick={() => handleNavigate(AppRoute.MAP)} />
            <NavItem label="Directory" active={currentRoute === AppRoute.DIRECTORY} onClick={() => handleNavigate(AppRoute.DIRECTORY)} />
            <NavItem label="Assistant" active={currentRoute === AppRoute.ASSISTANT} onClick={() => handleNavigate(AppRoute.ASSISTANT)} />
          </div>

          {/* Desktop Action Button & Mobile Menu Toggle */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex">
              <button
                onClick={() => handleNavigate(AppRoute.MAP)}
                className="text-sm font-bold px-6 py-2.5 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors active:scale-95"
              >
                Launch System
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className="md:hidden p-2 text-slate-500 hover:text-slate-900 transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out bg-white border-b border-slate-100 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
          }`}
      >
        <div className="px-6 py-4 flex flex-col gap-4">
          <MobileNavItem label="Home" active={currentRoute === AppRoute.HOME} onClick={() => handleNavigate(AppRoute.HOME)} />
          <MobileNavItem label="Campus Map" active={currentRoute === AppRoute.MAP} onClick={() => handleNavigate(AppRoute.MAP)} />
          <MobileNavItem label="Directory" active={currentRoute === AppRoute.DIRECTORY} onClick={() => handleNavigate(AppRoute.DIRECTORY)} />
          <MobileNavItem label="Assistant" active={currentRoute === AppRoute.ASSISTANT} onClick={() => handleNavigate(AppRoute.ASSISTANT)} />

          <button
            onClick={() => handleNavigate(AppRoute.MAP)}
            className="w-full mt-2 text-sm font-bold py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors active:scale-[0.98] shadow-lg shadow-emerald-600/10"
          >
            Launch System
          </button>
        </div>
      </div>
    </nav>
  );
};

const NavItem: React.FC<{ label: string, active: boolean, onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`relative text-sm font-semibold tracking-wide transition-colors py-2 ${active ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-900'
      }`}
  >
    {label}
    {active && (
      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-full" />
    )}
  </button>
);

const MobileNavItem: React.FC<{ label: string, active: boolean, onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`text-left px-4 py-3 rounded-xl text-base font-semibold transition-all ${active
        ? 'bg-emerald-50 text-emerald-600'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
  >
    {label}
  </button>
);

export default Navbar;
