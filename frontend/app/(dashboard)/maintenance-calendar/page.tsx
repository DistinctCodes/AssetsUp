"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Wrench } from "lucide-react";

interface MaintenanceEvent {
  id: string;
  day: number;
  asset: string;
  type: string;
  assignee: string;
}

const EVENTS: MaintenanceEvent[] = [
  {
    id: "1",
    day: 5,
    asset: "Dell Laptop #3",
    type: "Repair",
    assignee: "Tech Team",
  },
  {
    id: "2",
    day: 12,
    asset: "HVAC Unit",
    type: "Service",
    assignee: "Facilities",
  },
  {
    id: "3",
    day: 18,
    asset: "Server Rack A",
    type: "Inspection",
    assignee: "IT Ops",
  },
  {
    id: "4",
    day: 25,
    asset: "Printer MFP-02",
    type: "Repair",
    assignee: "Tech Team",
  },
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MaintenanceCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month).toLocaleString("default", {
    month: "long",
  });

  const prev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const next = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1,
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Maintenance Calendar
        </h1>
        <p className="text-sm text-gray-500 mt-1">Month schedule display</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prev} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {monthName} {year}
          </h2>
          <button onClick={next} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
          {DAYS_OF_WEEK.map((d) => (
            <div
              key={d}
              className="bg-gray-50 text-center text-xs font-medium text-gray-500 py-2"
            >
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            const events = day ? EVENTS.filter((e) => e.day === day) : [];
            return (
              <div key={i} className="bg-white min-h-[80px] p-1.5">
                {day && <span className="text-xs font-medium">{day}</span>}
                {events.map((e) => (
                  <div
                    key={e.id}
                    className="mt-1 text-xs bg-blue-50 text-blue-700 rounded px-1 py-0.5 truncate flex items-center gap-0.5"
                  >
                    <Wrench size={10} />
                    {e.asset}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
