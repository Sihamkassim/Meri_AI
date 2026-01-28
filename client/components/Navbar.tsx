"use client";

import React, { useState } from "react";
import { AppRoute } from "../types";
import { Menu, X, MapPin, Sparkles } from "lucide-react";

interface NavbarProps {
  onNavigate: (route: AppRoute) => void;
  currentRoute: string;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentRoute }) => {
  const [isOpen, setIsOpen] = useState(false);

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
        </div>
      </div>
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