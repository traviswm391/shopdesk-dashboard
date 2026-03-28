"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getMyShop, getCalls, getCallStats, updateShop } from "@/lib/api";
import type { Shop, Call, CallStats } from "@/types";

const PAGE_SIZE = 10;
type DateRange = "all" | "today" | "week" | "month";

function formatDuration(seconds?: number): string {
  if (!seconds) return "â";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}
function formatPhone(num?: string): string {
  if (!num) return "â";
  const d = num.replace(/\D/g, "");
  if (d.length === 11) return `+1 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  return num;
}
function getDateRangeStart(range: DateRange): Date | null {
  const now = new Date();
  if (range === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
  if (range === "month") { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
  return null;
}
function computeStats(calls: Call[]): CallStats {
  const total = calls.length;
  const booked = calls.filter(c => c.appointment_booked).length;
  const withDur = calls.filter(c => c.duration_seconds && c.duration_seconds > 0);
  const avgDur = withDur.length > 0 ? Math.round(withDur.reduce((s, c) => s + (c.duration_seconds || 0), 0) / withDur.length) : 0;
  return { total_calls: total, appointments_booked: booked, conversion_rate: total > 0 ? Math.round((booked / total) * 100) : 0, avg_duration_seconds: avgDur };
}

function StatSkeleton() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 animate-pulse">
      <div className="h-3 bg-gray-700 rounded w-24 mb-4" />
      <div className="h-8 bg-gray-700 rounded w-16" />
    </div>
  );
}
function CallRowSkeleton() {
  return (
    <div className="px-6 py-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 bg-gray-700 rounded-full" />
          <div>
            <div className="h-3 bg-gray-700 rounded w-32 mb-2" />
            <div className="h-2 bg-gray-700 rounded w-20" />
          </div>
        </div>
        <div className="h-5 bg-gray-700 rounded w-20" />
      </div>
    </div>
  );
}

function CheckIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
        <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  return <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0" />;
}

export default function DashboardPage() {
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [allCalls, setAllCalls] = useState<Call[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingAgent, setTogglingAgent] = useState(false);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [showGreeting, setShowGreeting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [search, setSearch] = useState("");
  const [bookingFilter, setBookingFilter] = useState<"all" | "booked" | "none">("all");
  const [page, setPage] = useState(1);
  const [agentTested, setAgentTested] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(false);

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [shopData, callsData, statsData] = await Promise.all([
        getMyShop(), getCalls(200), getCallStats(),
      ]);
      setShop(shopData);
      setAllCalls(callsData.calls);
      setStats(statsData);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("not found")) {
        router.replace("/setup");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
    try {
      setAgentTested(localStorage.getItem("shopdesk_agent_tested") === "1");
      setChecklistDismissed(localStorage.getItem("shopdesk_checklist_dismissed") === "1");
    } catch { /* ignore */ }
  }, [loadData]);

  const filteredCalls = useMemo(() => {
    let result = allCalls;
    const rangeStart = getDateRangeStart(dateRange);
    if (rangeStart) result = result.filter(c => new Date(c.created_at) >= rangeStart);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c => (c.caller_number || "").includes(q) || (c.summary || "").toLowerCase().includes(q));
    }
    if (bookingFilter === "booked") result = result.filter(c => c.appointment_booked);
    if (bookingFilter === "none") result = result.filter(c => !c.appointment_booked);
    return result;
  }, [allCalls, dateRange, search, bookingFilter]);

  const displayStats = useMemo(() => {
    if (dateRange === "all" && !search && bookingFilter === "all") return stats;
    return computeStats(filteredCalls);
  }, [dateRange, search, bookingFilter, filteredCalls, stats]);

  useEffect(() => { setPage(1); }, [search, bookingFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filteredCalls.length / PAGE_SIZE));
  const pagedCalls = filteredCalls.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function toggleAgent() {
    if (!shop) return;
    setTogglingAgent(true);
    try {
      const updated = await updateShop({ agent_active: !shop.agent_active });
      setShop(updated);
    } catch { /* swallow */ } finally { setTogglingAgent(false); }
  }

  function markAgentTested() {
    try { localStorage.setItem("shopdesk_agent_tested", "1"); } catch { /* ignore */ }
    setAgentTested(true);
  }

  function dismissChecklist() {
    try { localStorage.setItem("shopdesk_checklist_dismissed", "1"); } catch { /* ignore */ }
    setChecklistDismissed(true);
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-5xl">
        <div className="mb-8 animate-pulse">
          <div className="h-7 bg-gray-700 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-700 rounded w-64" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <StatSkeleton key={i} />)}
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-6 animate-pulse">
          <div className="h-5 bg-gray-700 rounded w-36 mb-4" />
          <div className="h-8 bg-gray-700 rounded w-48" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 animate-pulse">
            <div className="h-5 bg-gray-700 rounded w-32" />
          </div>
          {[1,2,3].map(i => <div key={i} className="border-b border-gray-700 last:border-0"><CallRowSkeleton /></div>)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-5xl flex flex-col items-center justify-center min-h[60vh]">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-10 text-center max-w-md w-full">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Couldn&apos;t load dashboard</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button onClick={() => { setLoading(true); loadData(); }} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg px-6 py-2.5 transition">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!shop) return null;

  const agentActive = shop.agent_active !== false;

  const checklistItems = [
    { label: "Shop created", done: true },
    { label: "AI phone number active", done: !!shop.phone_number, href: undefined },
    { label: "Services added", done: shop.services.length > 0, href: "/dashboard/settings" },
    { label: "Test your agent", done: agentTested, href: undefined },
    { label: "Received your first call", done: (stats?.total_calls ?? 0) > 0, href: undefined },
  ];
  const completedCount = checklistItems.filter(i => i.done).length;
  const allChecklistDone = completedCount === checklistItems.length;
  const showChecklist = !allChecklistDone && !checklistDismissed;

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{shop.name}</h1>
        <p className="text-gray-400 text-sm mt-0.5">{shop.address || "No address set"} Â· AI Receptionist Dashboard</p>
      </div>

      {showChecklist && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Getting Started</h2>
              <p className="text-xs text-gray-400 mt-0.5">{completedCount} of {checklistItems.length} complete</p>
            </div>
            <button onClick={dismissChecklist} className="text-gray-500 hover:text-gray-300 transition text-xs">
              Dismiss
            </button>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5 mb-4">
            <div
              className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / checklistItems.length) * 100}%` }}
            />
          </div>
          <div className="space-y-2.5">
            {checklistItems.map(({ label, done, href }) => (
              <div key={label} className="flex items-center gap-3">
                <CheckIcon done={done} />
                {href && !done ? (
                  <a href={href} className="text-sm text-orange-400 hover:text-orange-300 transition">{label}</a>
                ) : (
                  <span className={`text-sm ${done ? "text-gray-400 line-through" : "text-gray-200"}`}>{label}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-5 bg-gray-800 border border-gray-700 rounded-xl p-1 w-fit">
        {(["all", "today", "week", "month"] as DateRange[]).map((r) => (
          <button key={r} onClick={() => setDateRange(r)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${dateRange === r ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"}`}>
            {r === "all" ? "All Time" : r === "today" ? "Today" : r === "week" ? "7 Days" : "30 Days"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Calls", value: displayStats?.total_calls?.toString() ?? "0" },
          { label: "Appointments Booked", value: displayStats?.appointments_booked?.toString() ?? "0" },
          { label: "Booking Rate", value: displayStats ? `${displayStats.conversion_rate}%` : "0%" },
          { label: "Avg Call Duration", value: formatDuration(displayStats?.avg_duration_seconds) },
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
              <span className={`text-sm ${agentActive ? "text-green-400" : "text-gray-400"}`}>
                {agentActive ? "Active â answering calls" : "Inactive"}
              </span>
            </div>
          </div>
          <button
            onClick={toggleAgent}
            disabled={togglingAgent}
            className={`relative w-14 h-7 rounded-full transition-colors duration-200 focus:outline-none ${agentActive ? "bg-orange-500" : "bg-gray-600"} ${togglingAgent ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${agentActive ? "translate-x-7" : "translate-x-0.5"}`} />
          </button>
        </div>
        <div className="mt-5 pt-5 border-t border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Your AI Phone Number</p>
            <p className="text-2xl font-bold text-white tracking-wide">{formatPhone(shop.phone_number)}</p>
            {!shop.phone_number && <p className="text-xs text-yellow-400 mt-1">Phone number not yet assigned. Contact support.</p>}
          </div>
          {shop.phone_number && (
            <div className="relative">
              <button
                onClick={() => { setShowGreeting(!showGreeting); if (!showGreeting) markAgentTested(); }}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-5 py-3 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Test My Agent
              </button>
              {showGreeting && (
                <div className="absolute right-0 top-14 z-10 w-72 bg-gray-700 border border-gray-600 rounded-xl p-4 shadow-xl">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Your AI will answer:</p>
                  <p className="text-sm text-white italic mb-3">
                    &ldquo;{shop.greeting || `Thanks for calling ${shop.name}, what can we do for you?`}&rdquo;
                  </p>
                  <a
                    href={`tel:${shop.phone_number}`}
                    onClick={() => { setShowGreeting(false); markAgentTested(); }}
                    className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg py-2 transition"
                  >
                    Call {formatPhone(shop.phone_number)}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h2 className="text-lg font-semibold text-white flex-1">Recent Calls</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search caller or summaryâ¦"
                className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 w-44"
              />
              <select
                value={bookingFilter}
                onChange={(e) => setBookingFilter(e.target.value as "all" | "booked" | "none")}
                className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-orange-500"
              >
                <option value="all">All</option>
                <option value="booked">Booked</option>
                <option value="none">No booking</option>
              </select>
            </div>
          </div>
        </div>
        {filteredCalls.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 text-sm">
              {allCalls.length === 0 ? "No calls yet. Share your AI number to start!" : "No calls match your filters."}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-700">
              {pagedCalls.map((call) => (
                <div key={call.id}>
                  <div
                    className="px-4 sm:px-6 py-4 hover:bg-gray-700/40 transition cursor-pointer"
                    onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                  >
                    <div className="flex items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 sm:mt-0 ${call.appointment_booked ? "bg-green-400" : "bg-gray-500"}`} />
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {call.caller_number ? formatPhone(call.caller_number) : "Unknown caller"}
                          </p>
                          <p className="text-gray-400 text-xs mt-0.5">{formatTime(call.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm text-gray-300">{formatDuration(call.duration_seconds)}</p>
                          <p className="text-xs text-gray-500">duration</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${call.appointment_booked ? "bg-green-500/15 text-green-400" : "bg-gray-600/50 text-gray-400"}`}>
                          {call.appointment_booked ? "Booked" : "No booking"}
                        </span>
                        <span className="text-xs text-gray-500 sm:hidden">{formatDuration(call.duration_seconds)}</span>
                      </div>
                    </div>
                  </div>
                  {expandedCall === call.id && (call.summary || call.transcript) && (
                    <div className="px-4 sm:px-6 pb-4 pt-0 bg-gray-700/20">
                      {call.summary && <div className="mb-3"><p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Summary</p><p className="text-sm text-gray-300">{call.summary}</p></div>}
                      {call.transcript && <div><p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Transcript</p><p className="text-xs text-gray-400 font-mono leading-relaxed whitespace-pre-wrap">{call.transcript.slice(0, 600)}{call.transcript.length > 600 ? "â¦" : ""}</p></div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
                <p className="text-xs text-gray-400">{filteredCalls.length} calls Â· page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-sm rounded-lg transition">
                    â Prev
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-sm rounded-lg transition">
                    Next â
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
