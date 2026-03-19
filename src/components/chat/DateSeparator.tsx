import React from "react";

const DateSeparator: React.FC<{ date: string }> = ({ date }) => {
  const today = new Date();
  const d = new Date(date);
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const label = isToday ? "اليوم" : isYesterday ? "أمس" : d.toLocaleDateString("ar-SA", { day: "numeric", month: "short" });

  return (
    <div className="flex justify-center my-3">
      <span className="text-[10px] text-muted-foreground px-4 py-1 rounded-full" style={{ background: "hsl(0 0% 100% / 0.04)" }}>
        {label}
      </span>
    </div>
  );
};

export default DateSeparator;
