import React from "react";
import galaLogo from "@/assets/gala-logo.png";
import avatarMale from "@/assets/avatar-male.png";

const AdminHomeTopBar: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-black/95 backdrop-blur-sm z-40 border-b border-zinc-800">
      <div className="max-w-[448px] mx-auto px-4 py-3 flex items-center justify-between" dir="rtl">
        <div className="flex items-center gap-3">
          <img
            className="w-10 h-10 rounded-full object-cover"
            src={galaLogo}
            alt="شعار غلا لايف"
          />
          <h1 className="text-lg font-bold text-emerald-500">GhalaLive</h1>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" className="relative p-2">
            <i className="fa-solid fa-bell text-xl text-zinc-400" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
          </button>
          <img
            src={avatarMale}
            className="w-9 h-9 rounded-full object-cover"
            alt="صورة حساب الأدمن"
          />
        </div>
      </div>
    </header>
  );
};

export default AdminHomeTopBar;
