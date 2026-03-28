"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Supabase sends the token in the URL hash; the client handles it automatically
  // We just need to call updateUser once the user submits the new password
  useEffect(() => {
    // If no session after a moment, the link may be invalid/expired
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError("This reset link is invalid or has expired. Please request a new one.");
      }
    };
    // Small delay to let Supabase exchange the token from the URL hash
    const t = setTimeout(check, 1500);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2500);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <p className="text-gray-400 text-sm">ShopDesk AI</p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          <h1 className="text-2xl font-bold text-white mb-6">Set new password</h1>
          {done ? (
            <div className="text-center">
              <p className="text-white font-medium mb-2">Password updated!</p>
              <p className="text-gray-400 text-sm mb-6">
                Redirecting you to the dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-5 text-red-400 text-sm">
                  {error}
                  {error.includes("invalid or has expired") && (
                    <span>
                      {" "}
                      <Link href="/forgot-password" className="underline">
                        Request a new link
                      </Link>
                    </span>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className="input-style"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your new password"
                  required
                  className="input-style"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-3 mt-2 transition-colors"
              >
                {loading ? "Updating..." : "Update password"}
              </button>
              <p className="text-center text-sm text-gray-400 mt-4">
                <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
