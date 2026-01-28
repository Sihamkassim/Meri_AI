"use client";

import React, { useState } from "react";
import { AppRoute } from "../types";
import { Menu, X, MapPin, Sparkles, Info } from "lucide-react";

interface NavbarProps {
  onNavigate: (route: AppRoute) => void;
  currentRoute: string;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentRoute }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* LOGO */}
        <button
          onClick={() => onNavigate(AppRoute.HOME)}
          className="flex items-center gap-2 group"
        >
          {/* Plain MapPin Icon (No Background) */}
          <MapPin className="w-8 h-8 text-emerald-600 fill-emerald-50 group-hover:scale-110 transition-transform duration-300" />

          <div className="leading-none text-left">
            {/* Amharic Text - Styled Green like the image */}
            <div className="font-extrabold text-2xl text-emerald-700 -mb-1">
              መሪ AI
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Campus Navigator
            </div>
          </div>
        </button>

        {/* DESKTOP NAV */}
        <div className="hidden md:flex items-center gap-8">
          <NavItem
            label="Home"
            active={currentRoute === AppRoute.HOME}
            onClick={() => onNavigate(AppRoute.HOME)}
          />
          <NavItem
            label="Map"
            active={currentRoute === AppRoute.MAP}
            onClick={() => onNavigate(AppRoute.MAP)}
          />
          <NavItem
            label="Directory"
            active={currentRoute === AppRoute.DIRECTORY}
            onClick={() => onNavigate(AppRoute.DIRECTORY)}
          />
          <NavItem
            label="Assistant"
            active={currentRoute === AppRoute.ASSISTANT}
            onClick={() => onNavigate(AppRoute.ASSISTANT)}
          />
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          {/* About / Built-by icon */}
          <button
            onClick={() => setShowAbout(true)}
            title="About — Built by the Divas"
            className="hidden sm:inline-flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-500 via-emerald-400 to-emerald-600 text-white shadow-lg transform hover:scale-105 transition-all ring-2 ring-emerald-200 hover:ring-emerald-300 relative"
          >
            <span className="absolute -inset-0.5 rounded-full animate-ping opacity-30 bg-emerald-400" />
            <Info size={18} />
          </button>
          <button
            onClick={() => onNavigate(AppRoute.MAP)}
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow"
          >
            <Sparkles size={16} />
            Find Route
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-slate-700"
          >
            {isOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      <div
        className={`md:hidden transition-all overflow-hidden ${
          isOpen ? "max-h-96" : "max-h-0"
        } bg-white border-t border-slate-200`}
      >
        <div className="px-6 py-4 space-y-2">
          <MobileItem
            label="Home"
            active={currentRoute === AppRoute.HOME}
            onClick={() => onNavigate(AppRoute.HOME)}
          />
          <MobileItem
            label="Map"
            active={currentRoute === AppRoute.MAP}
            onClick={() => onNavigate(AppRoute.MAP)}
          />
          <MobileItem
            label="Directory"
            active={currentRoute === AppRoute.DIRECTORY}
            onClick={() => onNavigate(AppRoute.DIRECTORY)}
          />
          <MobileItem
            label="Assistant"
            active={currentRoute === AppRoute.ASSISTANT}
            onClick={() => onNavigate(AppRoute.ASSISTANT)}
          />
          <MobileItem
            label="About"
            active={false}
            onClick={() => { setIsOpen(false); setShowAbout(true); }}
          />
        </div>
      </div>
      
      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white max-w-xl w-full mx-4 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold">Built by the Divas</h3>
              <button onClick={() => setShowAbout(false)} className="text-slate-600 hover:text-slate-900">✕</button>
            </div>
            <div className="p-6 space-y-4 text-sm text-slate-700">
              <p className="font-medium">Full stack developers & agentic AI enthusiasts</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center text-white text-lg font-bold shadow">🧕</div>
                  <div>
                    <div className="font-semibold">Siham Kassim</div>
                    <a className="text-emerald-600 hover:underline text-xs" href="https://www.linkedin.com/in/siham-kassim1212121212/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-300 via-emerald-400 to-emerald-500 flex items-center justify-center text-white text-lg font-bold shadow">🧕</div>
                  <div>
                    <div className="font-semibold">Fetiya Yusuf</div>
                    <a className="text-emerald-600 hover:underline text-xs" href="https://www.linkedin.com/in/fetiya-yusuf" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-300 via-emerald-400 to-emerald-500 flex items-center justify-center text-white text-lg font-bold shadow">👩‍🦱</div>
                  <div>
                    <div className="font-semibold">Tsion Birhanu</div>
                    <a className="text-emerald-600 hover:underline text-xs" href="https://www.linkedin.com/in/tsion-birhanu-2847603a1?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-300 via-emerald-400 to-emerald-500 flex items-center justify-center text-white text-lg font-bold shadow">🧕</div>
                  <div>
                    <div className="font-semibold">Lelo Mohammed</div>
                    <a className="text-emerald-600 hover:underline text-xs" href="https://www.linkedin.com/in/lelo-mohamed-b6a592279?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-300 via-emerald-400 to-emerald-500 flex items-center justify-center text-white text-lg font-bold shadow">🧕</div>
                  <div>
                    <div className="font-semibold">Temkin Abdulmelik</div>
                    <a className="text-emerald-600 hover:underline text-xs" href="https://www.linkedin.com/in/temkin-abdulmelik-195582306?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500">Thanks for using the app — created by the Divas.💫</p>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setShowAbout(false)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

const NavItem = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`relative text-sm font-semibold transition ${
      active
        ? "text-emerald-600"
        : "text-slate-600 hover:text-emerald-600"
    }`}
  >
    {label}
    {active && (
      <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-emerald-600 rounded-full" />
    )}
  </button>
);

const MobileItem = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-3 rounded-xl font-semibold ${
      active
        ? "bg-emerald-50 text-emerald-700"
        : "text-slate-700 hover:bg-slate-100"
    }`}
  >
    {label}
  </button>
);

export default Navbar;