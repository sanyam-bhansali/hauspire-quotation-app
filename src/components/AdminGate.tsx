"use client";
import { useEffect, useState } from "react";

// Lightweight admin gate for the Products & Terms pages. Set the password via
// NEXT_PUBLIC_ADMIN_PASSWORD in Vercel; defaults to "hauspire@123". Unlock lasts
// for the browser session. (This is a deterrent, not hard security.)
const PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "hauspire@123";
const KEY = "hauspire_admin_ok";

export default function AdminGate({ children, label = "admin" }: { children: React.ReactNode; label?: string }) {
  const [ok, setOk] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { try { if (sessionStorage.getItem(KEY) === "1") setOk(true); } catch { /* ignore */ } }, []);

  if (ok) return <>{children}</>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw === PW) { try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ } setOk(true); }
    else setErr("Incorrect password.");
  }

  return (
    <div className="mx-auto max-w-sm p-10">
      <div className="rounded-xl border border-brand-line bg-white p-6 text-center shadow-sm">
        <div className="mb-1 text-2xl">🔒</div>
        <div className="mb-1 text-lg font-bold text-brand">Admin area</div>
        <p className="mb-4 text-[12px] text-neutral-500">Enter the admin password to open the {label} settings.</p>
        <form onSubmit={submit} className="space-y-2">
          <input type="password" autoFocus className="input" placeholder="Password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} />
          <button className="btn w-full" type="submit">Unlock</button>
        </form>
        {err && <p className="mt-2 text-[12px] text-red-600">{err}</p>}
      </div>
    </div>
  );
}
