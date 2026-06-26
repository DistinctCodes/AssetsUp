"use client"

import { useState } from "react"
import { Plus, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Reservation { id: string; asset: string; reservedBy: string; from: string; to: string; status: "ACTIVE" | "UPCOMING" | "RETURNED" }

const MOCK: Reservation[] = [
  { id:"1", asset:"MacBook Pro #4", reservedBy:"Alice M.", from:"2024-01-22", to:"2024-01-26", status:"ACTIVE" },
  { id:"2", asset:"Canon Camera", reservedBy:"Bob K.", from:"2024-01-28", to:"2024-01-30", status:"UPCOMING" },
  { id:"3", asset:"Dell Monitor #2", reservedBy:"Carol S.", from:"2024-01-10", to:"2024-01-18", status:"RETURNED" },
]

const STATUS_STYLE: Record<string, string> = { ACTIVE:"bg-green-50 text-green-700", UPCOMING:"bg-blue-50 text-blue-700", RETURNED:"bg-gray-100 text-gray-600" }

export default function AssetBookingPage() {
  const [reservations] = useState<Reservation[]>(MOCK)
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Asset Booking</h1><p className="text-sm text-gray-500 mt-1">Reserve assets with due dates and return flow</p></div>
        <Button><Plus size={16} className="mr-1.5" />New Reservation</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 bg-gray-50">{["Asset","Reserved By","From","To","Status","Actions"].map(h=><th key={h} className="text-left px-4 py-3 font-medium text-gray-500">{h}</th>)}</tr></thead>
          <tbody>
            {reservations.map(r=>(
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.asset}</td>
                <td className="px-4 py-3 text-gray-600">{r.reservedBy}</td>
                <td className="px-4 py-3 text-gray-500 flex items-center gap-1"><Calendar size={13}/>{r.from}</td>
                <td className="px-4 py-3 text-gray-500"><span className="flex items-center gap-1"><Clock size={13}/>{r.to}</span></td>
                <td className="px-4 py-3"><span className={px-2 py-0.5 rounded-full text-xs font-medium }>{r.status}</span></td>
                <td className="px-4 py-3">{r.status === "ACTIVE" && <button className="text-xs text-blue-600 hover:underline">Return</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}