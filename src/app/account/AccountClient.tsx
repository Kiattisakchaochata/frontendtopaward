"use client";

import { useEffect, useState } from "react";

type Me = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  avatar_url?: string | null;
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm font-medium text-white/90 mb-1">{children}</label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none
                placeholder:text-white/40 focus:ring-2 focus:ring-amber-400 disabled:opacity-70 disabled:cursor-not-allowed`}
  />
);

export default function AccountClient({ me }: { me: Me }) {
  // โปรไฟล์: อ่านอย่างเดียว
  const [name, setName] = useState(me?.name ?? "");
  const [email, setEmail] = useState(me?.email ?? "");

  // password
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [changing, setChanging] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdErr, setPwdErr] = useState<string | null>(null);

  useEffect(() => {
    setName(me?.name ?? "");
    setEmail(me?.email ?? "");
  }, [me?.name, me?.email]);

  async function changePassword() {
    setChanging(true);
    setPwdMsg(null);
    setPwdErr(null);
    try {
      const r = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ old_password: oldPwd, new_password: newPwd }),
      });
      const t = await r.text();
      let j: any = {};
      try { j = JSON.parse(t); } catch {}
      if (!r.ok) throw new Error(j?.message || t || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
      setPwdMsg(j?.message || "เปลี่ยนรหัสผ่านเรียบร้อย");
      setOldPwd("");
      setNewPwd("");
    } catch (e: any) {
      setPwdErr(e?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    } finally {
      setChanging(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile (view only) */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
        <h2 className="text-lg font-bold mb-4">โปรไฟล์</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>ชื่อที่แสดง</Label>
            <Input value={name} disabled />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} disabled />
          </div>
        </div>
        {/* ไม่มีปุ่มบันทึกโปรไฟล์ และไม่มี onChange ที่ input */}
      </section>

      {/* Password */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
        <h2 className="text-lg font-bold mb-4">เปลี่ยนรหัสผ่าน</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>รหัสผ่านเดิม</Label>
            <Input
              type="password"
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <Label>รหัสผ่านใหม่</Label>
            <Input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="อย่างน้อย 8 ตัว"
            />
          </div>
        </div>

        {pwdMsg && (
          <p className="mt-3 rounded-lg bg-emerald-500/15 text-emerald-200 px-3 py-2 text-sm">
            {pwdMsg}
          </p>
        )}
        {pwdErr && (
          <p className="mt-3 rounded-lg bg-rose-500/15 text-rose-200 px-3 py-2 text-sm">
            {pwdErr}
          </p>
        )}

        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={changePassword}
            disabled={changing || !oldPwd || !newPwd}
            className="rounded-lg bg-white px-4 py-2 text-slate-900 font-medium shadow hover:opacity-90 active:scale-[.98] disabled:opacity-60"
          >
            {changing ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
          </button>
        </div>
      </section>
    </div>
  );
}