"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getMyShop, getCalls, getCallStats, updateShop } from "@/lib/api";
import type { Shop, Call, CallStats } from "@/types";

function formatDuration(seconds?: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

function formatPhone(num?: string): string {
  if (!num) return "—";
  const d = num.replace(/\D/g, "");
  if (d.length === 11) return `+1 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  return num;
}

export default function DashboardPage() {
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingAgent, setTogglingAgent] = useState(false);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [shopData, callsData, statsData] = await Promise.all([getMyShop(), getCalls(20), getCallStats()]);
      setShop(shopData); setCalls(callsData.calls); setStats(statsData);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("not found")) router.replace("/setup");
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  async function toggleAgent() {
    if (!shop) return;
    setTogglingAgent(true);
    try { const updated = await updateShop({ agent_active: !shop.agent_active }); setShop(updated); }
    catch { /* swallow */ }
    finally { setTogglingAgent(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!shop) return null;

  const agentActive = shop.agent_active !== false;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{shop.name}</h1>
        <p className="text-gray-400 text-sm mt-0.5">{shop.address || "No address set"} · AI Receptionist Dashboard</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Calls", value: stats?.total_calls?.toString() ?? "0" },
          { label: "Appointments Booked", value: stats?.appointments_booked?.toString() ?? "0" },
          { label: "Booking Rate", value: stats ? `${stats.conversion_rate}%` : "0%" },
          { label: "Avg Call Duration", value: formatDuration(stats?.avg_duration_seconds) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
            <p className="text-sm text-gray-400 mb-3">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">AI Receptionist</h2>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${agentActive ? "bg-green-400" : "bg-gray-500"}`} />
              <span className={`text-sm ${agentActive ? "text-green-400" : "text-gray-400"}`}>{agentActive ? "Active — answering calls" : "Inactive"}</span>
            </div>
          </div>
          <button onClick={toggleAgent} disabled={togglingAgent}
            className={`relative w-14 h-7 rounded-full transition-colors duration-200 focus:outline-none ${agentActive ? "bg-orange-500" : "bg-gray-600"} ${togglingAgent ? "opacity-60 cursor-not-allowed" : ""}`}>
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${agentActive ? "translate-x-7" : "translate-x-0.5"}`} />
          </button>
        </div>
        <div className="mt-5 pt-5 border-t border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Your AI Phone Number</p>
            <p className="text-2xl font-bold text-white tracking-wide">{formatPhone(shop.phone_number)}</p>
            {!shop.phone_number && <p className="text-xs text-yellow-400 mt-1">Phone number not yet assigned. Contact support.</p>}
          </div>
          {shop.phone_number && (
            <a href={`tel:${shop.phone_number}`} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-5 py-3 transition">
              Test My Agent
            </a>
          )}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Calls</h2>
          <span className="text-xs text-gray-400">{calls.length} shown</span>
        </div>
        {calls.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 text-sm">No calls yet. Share your AI number to start!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {calls.map((call) => (
              <div key={call.id}>
                <div className="px-6 py-4 hover:bg-gray-700/40 transition cursor-pointer" onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${call.appointment_booked ? "bg-green-400" : "bg-gray-500"}`} />
                      <div>
                        <p className="text-white text-sm font-medium">{call.caller_number ? formatPhone(call.caller_number) : "Unknown caller"}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{formatTime(call.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-300">{formatDuration(call.duration_seconds)}</p>
                        <p className="text-xs text-gray-500">duration</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${call.appointment_booked ? "bg-green-500/15 text-green-400" : "bg-gray-600/50 text-gray-400"}`}>
                        {call.appointment_booked ? "Booked" : "No booking"}
                      </span>
                    </div>
                  </div>
                </div>
                {expandedCall === call.id && (call.summary || call.transcript) && (
                  <div className="px-6 pb-4 pt-0 bg-gray-700/20">
                    {call.summary && <div className="mb-3"><p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Summary</p><p className="text-sm text-gray-300">{call.summary}</p></div>}
                    {call.transcript && <div><p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Transcript</p><p className="text-xs text-gray-400 font-mono leading-relaxed whitespace-pre-wrap">{call.transcript.slice(0, 600)}{call.transcript.length > 600 ? "…" : ""}</p></div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
