"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createShop, getMyShop, provisionShop } from "@/lib/api";
import type { BusinessHours } from "@/types";

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;
const DAY_LABELS: Record<string, string> = { monday:"Monday",tuesday:"Tuesday",wednesday:"Wednesday",thursday:"Thursday",friday:"Friday",saturday:"Saturday",sunday:"Sunday" };
const TIME_OPTIONS = ["6:00 AM","6:30 AM","7:00 AM","7:30 AM","8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM","6:00 PM","6:30 PM","7:00 PM","7:30 PM","8:00 PM","8:30 PM","9:00 PM"];
const DEFAULT_HOURS: BusinessHours = { monday:{open:"8:00 AM",close:"5:00 PM",closed:false},tuesday:{open:"8:00 AM",close:"5:00 PM",closed:false},wednesday:{open:"8:00 AM",close:"5:00 PM",closed:false},thursday:{open:"8:00 AM",close:"5:00 PM",closed:false},friday:{open:"8:00 AM",close:"5:00 PM",closed:false},saturday:{open:"9:00 AM",close:"2:00 PM",closed:false},sunday:{open:"9:00 AM",close:"2:00 PM",closed:true} };

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [greeting, setGreeting] = useState("");
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [services, setServices] = useState([{ name: "", price: "" }]);

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace("/login"); return; }
      try { await getMyShop(); router.replace("/dashboard"); }
      catch { setChecking(false); }
    }
    check();
  }, [router]);

  function updateHours(day: string, field: string, value: string | boolean) {
    setHours((prev) => ({ ...prev, [day]: { ...(prev[day as keyof BusinessHours]||{}), [field]: value } }));
  }

  async function handleSubmit() {
    setLoading(true); setError("");
    const servicesList = services.filter((s) => s.name.trim()).map((s) => (s.price ? `${s.name.trim()} $${s.price.trim()}` : s.name.trim()));
    try {
      await createShop({ name: shopName, address, phone_display: phoneDisplay, greeting: greeting || `Thanks for calling ${shopName}, what can we do for you?`, services: servicesList, business_hours: hours });
      await provisionShop();
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Setup failed."); setLoading(false);
    }
  }

  if (checking) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">ShopDesk AI</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1,2,3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${step >= s ? "bg-orange-500 text-white" : "bg-gray-700 text-gray-400"}`}>{s}</div>
              {s < 3 && <div className={`w-16 h-0.5 ${step > s ? "bg-orange-500" : "bg-gray-700"}`} />}
            </div>
          ))}
        </div>
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">{error}</div>}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Tell us about your shop</h2>
              <p className="text-gray-400 text-sm mb-6">This is what your AI receptionist will tell callers.</p>
              <div className="space-y-4">
                {[
                  {label:"Shop Name *",value:shopName,setter:setShopName,placeholder:"e.g. Mike's Auto Repair"},
                  {label:"Address",value:address,setter:setAddress,placeholder:"e.g. 123 Main St, Nashville, TN"},
                  {label:"Your Real Phone Number",value:phoneDisplay,setter:setPhoneDisplay,placeholder:"e.g. (615) 555-0100"},
                  {label:"Opening Greeting (optional)",value:greeting,setter:setGreeting,placeholder:`Thanks for calling ${shopName||"the shop"}, what can we do for you?`},
                ].map(({ label, value, setter, placeholder }) => (
                  <div key={label}>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
                    <input value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" />
                  </div>
                ))}
              </div>
              <button onClick={() => { if (!shopName.trim()) { setError("Please enter your shop name."); return; } setError(""); setStep(2); }}
                className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg px-4 py-3 transition">
                Next: Business Hours →
              </button>
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Business Hours</h2>
              <p className="text-gray-400 text-sm mb-6">Your AI will tell callers when you&apos;re open.</p>
              <div className="space-y-3">
                {DAYS.map((day) => {
                  const h = hours[day] || { open: "9:00 AM", close: "5:00 PM", closed: false };
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <div className="w-24 text-sm font-medium text-gray-300">{DAY_LABELS[day]}</div>
                      <div onClick={() => updateHours(day, "closed", !h.closed)}
                        className={`w-10 h-5 rounded-full transition ${h.closed?"bg-gray-600":"bg-orange-500"} relative flex items-center cursor-pointer`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform absolute ${h.closed?"translate-x-0.5":"translate-x-5"}`} />
                      </div>
                      <span className="text-sm text-gray-400">{h.closed?"Closed":"Open"}</span>
                      {!h.closed && (<>
                        <select value={h.open} onChange={(e) => updateHours(day,"open",e.target.value)} className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
                          {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                        </select>
                        <span className="text-gray-500 text-sm">to</span>
                        <select value={h.close} onChange={(e) => updateHours(day,"close",e.target.value)} className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
                          {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                        </select>
                      </>)}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg px-4 py-3 transition">← Back</button>
                <button onClick={() => setStep(3)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg px-4 py-3 transition">Next: Services →</button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Services You Offer</h2>
              <p className="text-gray-400 text-sm mb-6">Add the services your shop provides. Price is optional.</p>
              <div className="space-y-3">
                {services.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={s.name} onChange={(e) => setServices((prev) => prev.map((x,j) => j===i?{...x,name:e.target.value}:x))} placeholder="e.g. Oil Change"
                      className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition" />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input value={s.price} onChange={(e) => setServices((prev) => prev.map((x,j) => j===i?{...x,price:e.target.value}:x))} placeholder="49.99"
                        className="w-28 bg-gray-900 border border-gray-600 rounded-lg pl-7 pr-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition" />
                    </div>
                    {services.length > 1 && <button onClick={() => setServices((prev) => prev.filter((_,j) => j!==i))} className="p-3 text-gray-400 hover:text-red-400 transition">✕</button>}
                  </div>
                ))}
                <button onClick={() => setServices((prev) => [...prev, { name: "", price: "" }])}
                  className="w-full border border-dashed border-gray-600 hover:border-orange-500 rounded-lg py-3 text-gray-400 hover:text-orange-400 text-sm transition">
                  + Add Service
                </button>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(2)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg px-4 py-3 transition">← Back</button>
                <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-3 transition flex items-center justify-center gap-2">
                  {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Setting up...</> : "Launch My AI Receptionist 🚀"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
