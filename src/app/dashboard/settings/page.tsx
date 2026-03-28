"use client";
import { useState, useEffect } from "react";
import { getMyShop, createShop, updateShop } from "@/lib/api";
import type { Shop, BusinessHours } from "@/types";

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;
const DAY_LABELS: Record<string, string> = { monday:"Monday",tuesday:"Tuesday",wednesday:"Wednesday",thursday:"Thursday",friday:"Friday",saturday:"Saturday",sunday:"Sunday" };
const TIME_OPTIONS = ["6:00 AM","6:30 AM","7:00 AM","7:30 AM","8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM","6:00 PM","6:30 PM","7:00 PM","7:30 PM","8:00 PM","8:30 PM","9:00 PM"];
const DEFAULT_HOURS: BusinessHours = { monday:{open:"8:00 AM",close:"5:00 PM",closed:false},tuesday:{open:"8:00 AM",close:"5:00 PM",closed:false},wednesday:{open:"8:00 AM",close:"5:00 PM",closed:false},thursday:{open:"8:00 AM",close:"5:00 PM",closed:false},friday:{open:"8:00 AM",close:"5:00 PM",closed:false},saturday:{open:"9:00 AM",close:"2:00 PM",closed:false},sunday:{open:"9:00 AM",close:"2:00 PM",closed:true} };

export default function SettingsPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [greeting, setGreeting] = useState("");
  const [hours, setHours] = useState<BusinessHours>({});
  const [services, setServices] = useState<Array<{ name: string; price: string }>>([]);

  useEffect(() => {
    getMyShop()
      .then((s) => {
        setShop(s);
        setName(s.name || "");
        setAddress(s.address || "");
        setPhoneDisplay(s.phone_display || "");
        setGreeting(s.greeting || "");
        setHours(s.business_hours || DEFAULT_HOURS);
        const parsed = (s.services || []).map((svc: string) => {
          const match = svc.match(/^(.+?)\s+\$?([\d.]+)$/);
          if (match) return { name: match[1].trim(), price: match[2] };
          return { name: svc, price: "" };
        });
        setServices(parsed.length > 0 ? parsed : [{ name: "", price: "" }]);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load settings.";
        if (msg === "Shop not found") {
          setServices([{ name: "", price: "" }]);
          setHours(DEFAULT_HOURS);
        } else {
          setError(msg);
        }
        setLoading(false);
      });
  }, []);

  function updateHours(day: string, field: string, value: string | boolean) {
    setHours((prev) => ({ ...prev, [day]: { ...(prev[day as keyof BusinessHours] || {}), [field]: value } }));
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Shop name is required.");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    const servicesList = services
      .filter((s) => s.name.trim())
      .map((s) => (s.price ? `${s.name.trim()} $${s.price.trim()}` : s.name.trim()));
    try {
      const payload = { name: name.trim(), address, phone_display: phoneDisplay, greeting, services: servicesList, business_hours: hours };
      const updated = shop ? await updateShop(payload) : await createShop(payload);
      setShop(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Update your shop info â changes sync to your AI receptionist automatically.</p>
      </div>

      {!shop && !error && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-4 py-3 mb-6 text-orange-300 text-sm">
          Welcome! Fill in your shop details below to get started.
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">{error}</div>
      )}
      {saved && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 mb-6 text-green-400 text-sm">
          Saved! Your AI receptionist has been updated.
        </div>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-5">
        <h2 className="text-base font-semibold text-white mb-5">Shop Info</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Shop Name <span className="text-orange-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); if (error === "Shop name is required.") setError(""); }}
              className="input-style"
              placeholder="Mike's Auto Repair"
            />
          </div>
          {[
            { label: "Address", value: address, setter: setAddress, placeholder: "123 Main St, Nashville, TN" },
            { label: "Your Real Phone Number", value: phoneDisplay, setter: setPhoneDisplay, placeholder: "(615) 555-0100" },
            { label: "AI Opening Greeting", value: greeting, setter: setGreeting, placeholder: `Thanks for calling ${name || "the shop"}, what can we do for you?` },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
              <input value={value} onChange={(e) => setter(e.target.value)} className="input-style" placeholder={placeholder} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-5">
        <h2 className="text-base font-semibold text-white mb-5">Business Hours</h2>
        <div className="space-y-3">
          {DAYS.map((day) => {
            const h = hours[day] || { open: "9:00 AM", close: "5:00 PM", closed: false };
            return (
              <div key={day} className="flex items-center gap-3">
                <div className="w-24 text-sm font-medium text-gray-300">{DAY_LABELS[day]}</div>
                <div
                  onClick={() => updateHours(day, "closed", !h.closed)}
                  className={`w-10 h-5 rounded-full transition cursor-pointer ${h.closed ? "bg-gray-600" : "bg-orange-500"} relative flex items-center`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform absolute ${h.closed ? "translate-x-0.5" : "translate-x-5"}`} />
                </div>
                <span className="text-sm text-gray-400 w-12">{h.closed ? "Closed" : "Open"}</span>
                {!h.closed && (<>
                  <select value={h.open} onChange={(e) => updateHours(day, "open", e.target.value)} className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500">
                    {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <span className="text-gray-500 text-sm">to</span>
                  <select value={h.close} onChange={(e) => updateHours(day, "close", e.target.value)} className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500">
                    {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </>)}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-white mb-5">Services</h2>
        <div className="space-y-3">
          {services.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={s.name}
                onChange={(e) => setServices((prev) => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                placeholder="e.g. Oil Change"
                className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm transition"
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  value={s.price}
                  onChange={(e) => setServices((prev) => prev.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                  placeholder="49.99"
                  className="w-28 bg-gray-900 border border-gray-600 rounded-lg pl-7 pr-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm transition"
                />
              </div>
              {services.length > 1 && (
                <button onClick={() => setServices((prev) => prev.filter((_, j) => j !== i))} className="p-2.5 text-gray-500 hover:text-red-400 transition">Ã</button>
              )}
            </div>
          ))}
          <button
            onClick={() => setServices((prev) => [...prev, { name: "", price: "" }])}
            className="w-full border border-dashed border-gray-600 hover:border-orange-500 rounded-lg py-2.5 text-gray-400 hover:text-orange-400 text-sm transition"
          >
            + Add Service
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3.5 transition"
      >
        {saving ? "Saving & updating AI..." : "Save Changes"}
      </button>

      {shop?.phone_number && (
        <div className="mt-6 bg-gray-800 border border-gray-700 rounded-2xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Your AI Phone Number</p>
          <p className="text-xl font-bold text-white">{shop.phone_number}</p>
        </div>
      )}
    </div>
  );
}
