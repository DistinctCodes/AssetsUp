"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  reservationsApiClient,
  type BusyWindow,
  type Reservation,
} from "@/lib/api/reservations";
import { useAuthStore } from "@/store/auth.store";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  COMPLETED: "bg-blue-100 text-blue-700",
};

type Tab = "my" | "pending";

export default function ReservationsPage() {
  const [tab, setTab] = useState<Tab>("my");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    // "My reservations" is GET /reservations?userId=<me>, so wait for the user.
    if (tab === "my" && !userId) return;
    setLoading(true);
    const request =
      tab === "my" && userId
        ? reservationsApiClient.listMine(userId)
        : reservationsApiClient.listAll();
    request
      .then(setReservations)
      .catch(() => setReservations([]))
      .finally(() => setLoading(false));
  }, [tab, userId]);

  const reload = () => {
    const request =
      tab === "my" && userId
        ? reservationsApiClient.listMine(userId)
        : reservationsApiClient.listAll();
    request.then(setReservations).catch(() => undefined);
  };

  const pendingConfirmations = reservations.filter((r) => r.status === "PENDING");
  const currentList = tab === "my" ? reservations : pendingConfirmations;

  const handleConfirm = async (id: string) => {
    try {
      await reservationsApiClient.confirm(id);
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status: "CONFIRMED" as const } : r)));
    } catch {
      // ignore on error
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await reservationsApiClient.cancel(id);
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status: "CANCELLED" as const } : r)));
    } catch {
      // ignore on error
    }
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
        {loading ? (
          <div className="bg-white border rounded-xl p-12 text-center">
            <p className="text-gray-400">Loading reservations...</p>
          </div>
        ) : currentList.length === 0 ? (
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
        <BookingModal
          onClose={() => setShowBooking(false)}
          onBooked={() => {
            setShowBooking(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

function BookingModal({ onClose, onBooked }: { onClose: () => void; onBooked: () => void }) {
  const [assetId, setAssetId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState<BusyWindow[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Show the busy windows for the asset and range as soon as all three are filled in.
  useEffect(() => {
    if (!assetId || !startsAt || !endsAt) {
      setBusy(null);
      return;
    }
    let cancelled = false;
    reservationsApiClient
      .getAvailability(assetId, new Date(startsAt).toISOString(), new Date(endsAt).toISOString())
      .then((result) => !cancelled && setBusy(result.busy))
      .catch(() => !cancelled && setBusy(null));
    return () => {
      cancelled = true;
    };
  }, [assetId, startsAt, endsAt]);

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      await reservationsApiClient.create({
        assetId,
        purpose,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      });
      onBooked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the reservation");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!assetId && !!startsAt && !!endsAt && !submitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="font-semibold mb-4">New Reservation</h3>
        <div className="space-y-3">
          <Input placeholder="Asset ID" value={assetId} onChange={(e) => setAssetId(e.target.value)} />
          <Input placeholder="Purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Start</label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">End</label>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
          {busy && (
            <div data-testid="availability" className="text-sm">
              {busy.length === 0 ? (
                <p className="text-green-700">Free for the whole period.</p>
              ) : (
                <>
                  <p className="text-gray-700">Already booked:</p>
                  <ul className="list-disc ml-5 text-gray-600">
                    {busy.map((window, index) => (
                      <li key={index}>
                        {new Date(window.startsAt).toLocaleString()} — {new Date(window.endsAt).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!canSubmit}>Submit Request</Button>
        </div>
      </div>
    </div>
  );
}
