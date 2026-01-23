"use client";

import React, { useState, useEffect } from "react";
import { AppRoute } from "../types";
import { Menu, X, MapPin, Sparkles } from "lucide-react";

interface NavbarProps {
  onNavigate: (route: AppRoute) => void;
  currentRoute: string;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentRoute }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navBg =
    scrolled || isOpen
      ? "bg-white/75 backdrop-blur-xl border-b border-white/40 shadow-sm"
      : "bg-transparent";

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all ${navBg}`}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => onNavigate(AppRoute.HOME)}
          className="flex items-center gap-2 group"
        >
          <MapPin className="w-9 h-9 text-emerald-600 group-hover:-translate-y-0.5 transition-transform" />
          <div className="text-left">
            <div className="font-extrabold text-xl text-slate-900 leading-none">
              መሪ
            </div>
            <div className="text-[11px] tracking-widest uppercase text-emerald-600 font-bold">
              MengedAI
            </div>
          </div>
        </button>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {["HOME", "MAP", "DIRECTORY", "ASSISTANT"].map((key) => {
            const route = AppRoute[key as keyof typeof AppRoute];
            const active = currentRoute === route;

            return (
              <button
                key={key}
                onClick={() => onNavigate(route)}
                className={`relative font-semibold text-sm transition-colors ${
                  active
                    ? "text-emerald-600"
                    : "text-slate-600 hover:text-emerald-600"
                }`}
              >
                {key.toLowerCase()}
                <span
                  className={`absolute -bottom-1 left-0 h-0.5 bg-emerald-600 transition-all ${
                    active ? "w-full" : "w-0"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate(AppRoute.MAP)}
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full bg-slate-900 text-white hover:bg-emerald-600 transition shadow-lg"
          >
            <Sparkles size={16} className="text-amber-300" />
            Find Route
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-slate-700"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all ${
          isOpen ? "max-h-96" : "max-h-0"
        } bg-white/90 backdrop-blur-xl`}
      >
        <div className="px-6 py-4 space-y-2">
          {Object.values(AppRoute).map((route) => (
            <button
              key={route}
              onClick={() => {
                onNavigate(route);
                setIsOpen(false);
              }}
              className={`block w-full text-left px-4 py-3 rounded-xl font-semibold ${
                currentRoute === route
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {route.toLowerCase()}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
