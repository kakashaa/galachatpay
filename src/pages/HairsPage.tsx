import React from "react";
import MobileLayout from "@/components/MobileLayout";
import { Scissors } from "lucide-react";

const HairsPage: React.FC = () => {
  return (
    <MobileLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Scissors className="w-5 h-5 text-amber-400" />
          <h1 className="text-lg font-bold text-foreground">شعرات</h1>
        </div>
        <div className="text-center py-20 text-muted-foreground">
          <Scissors className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">قريباً... معرض الشعرات</p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default HairsPage;
