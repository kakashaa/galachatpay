import React from "react";
import avatarMale from "@/assets/avatar-male.png";
import avatarFemale from "@/assets/avatar-female.png";

type QuickChat = {
  label: string;
  image: string;
  online?: boolean;
  hasAlert?: boolean;
};

const quickChats: QuickChat[] = [
  { label: "الدعم", image: avatarFemale, online: true },
  { label: "الإدارة", image: avatarMale, hasAlert: true },
  { label: "الوكالات", image: avatarFemale },
  { label: "المطورين", image: avatarMale },
  { label: "التسويق", image: avatarFemale },
];

const AdminQuickChats: React.FC = () => {
  return (
    <section>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" dir="rtl">
        {quickChats.map((chat) => (
          <div key={chat.label} className="flex flex-col items-center gap-1 min-w-fit">
            <div className="relative">
              <img
                src={chat.image}
                className={`w-14 h-14 rounded-full object-cover border-2 ${chat.online ? "border-admin-emerald" : "border-admin-surface-soft"}`}
                alt={`صورة ${chat.label}`}
                loading="lazy"
              />
              {chat.online && <span className="absolute -bottom-0.5 left-0 w-2 h-2 bg-admin-emerald rounded-full" />}
              {chat.hasAlert && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-admin-rose rounded-full" />}
            </div>
            <span className="text-xs text-admin-muted">{chat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AdminQuickChats;
