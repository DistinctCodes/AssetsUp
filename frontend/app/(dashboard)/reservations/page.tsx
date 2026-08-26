"use client";

import { useState } from "react";
import { Calendar, Plus, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Reservation {
  id: string;
  assetName: string;
  assetId: string;
  purpose: string;
  startsAt: string;
  endsAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  requester: string;
}

const MOCK: Reservation[] = [
  { id: "r1", assetName: "Projector A", assetId: "a-1", purpose: "Client demo", startsAt: "2026-08-26T09:00:00Z", endsAt: "2026-08-26T17:00:00Z", status: "PENDING", requester: "Alex" },
  { id: "r2", assetName: "Test Vehicle", assetId: "a-2", purpose: "Field audit", startsAt: "2026-08-27T08:00:00Z", endsAt: "2026-08-27T18:00:00Z", status: "CONFIRMED", requester: "Sam" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  COMPLETED: "bg-blue-100 text-blue-700",
};

type Tab = "my" | "pending";

export default function ReservationsPage() {
  const [tab, setTab] = useState<Tab>("my");
  const [reservations, setReservations] = useState<Reservation[]>(MOCK);
  const [showBooking, setShowBooking] = useState(false);

  const myReservations = reservations;
  const pendingConfirmations = reservations.filter((r) => r.status === "PENDING");
  const currentList = tab === "my" ? myReservations : pendingConfirmations;

  const handleConfirm = (id: string) => {
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, status: "CONFIRMED" as const } : r));
  };

  const handleCancel = (id: string) => {
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, status: "CANCELLED" as const } : r));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="text-sm text-gray-500 mt-1">Book shared equipment and manage reservations</p>
        </div>
        <Button onClick={() => setShowBooking(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Reservation
        </Button>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab("my")} className={`px-4 py-2 rounded-md text-sm font-medium ${
          tab === "my" ? "bg-white shadow text-gray-900" : "text-gray-500"
        }`}>My Reservations</button>
        <button onClick={() => setTab("pending")} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${
          tab === "pending" ? "bg-white shadow text-gray-900" : "text-gray-500"
        }`}>
          Pending Confirmation
          {pendingConfirmations.length > 0 && (
            <span className="bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pendingConfirmations.length}</span>
          )}
        </button>
      </div>

      <div className="space-y-3">
        {currentList.length === 0 ? (
          <div className="bg-white border rounded-xl p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No reservations</p>
          </div>
        ) : (
          currentList.map((r) => (
            <div key={r.id} className="bg-white border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{r.assetName}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                  </div>
                  <p className="text-sm text-gray-500">{r.purpose}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(r.startsAt).toLocaleDateString()} {new Date(r.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" — "}
                    {new Date(r.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" · "}Requested by {r.requester}
                  </p>
                </div>
                <div className="flex gap-2">
                  {tab === "pending" && r.status === "PENDING" && (
                    <>
                      <Button size="sm" onClick={() => handleConfirm(r.id)}><Check className="w-3 h-3 mr-1" /> Confirm</Button>
                      <Button variant="outline" size="sm" onClick={() => handleCancel(r.id)}><X className="w-3 h-3 mr-1" /> Reject</Button>
                    </>
                  )}
                  {tab === "my" && r.status === "PENDING" && (
                    <Button variant="outline" size="sm" onClick={() => handleCancel(r.id)}>Cancel</Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBooking(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-semibold mb-4">New Reservation</h3>
            <div className="space-y-3">
              <Input placeholder="Asset ID" />
              <Input placeholder="Purpose" />
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500">Start</label><Input type="datetime-local" /></div>
                <div><label className="text-xs text-gray-500">End</label><Input type="datetime-local" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowBooking(false)}>Cancel</Button>
              <Button onClick={() => setShowBooking(false)}>Submit Request</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
