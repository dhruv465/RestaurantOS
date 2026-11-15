import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { enqueueSnackbar } from "notistack";
import BackButton from "../components/ui/BackButton";
import {
  addAttendance, clockIn, clockOut, decideLeave, deletePayrollRun, deleteShift, editAttendance, getAttendance, getLeave,
  getMyAttendance, getPayProfiles, getSettings, getPayrollRuns, getShifts, getHrStaff, createPayrollRun, payrollRunAction, requestLeave,
  savePayProfile, saveShift, setOwnPin,
} from "../https";
import { can, formatDateAndTime } from "../utils";
import { printHtml } from "../utils/print";

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] text-[var(--text-color)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--border-color)]";
const btn = "px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-60";
const primary = `${btn} bg-[#F6b100] text-white`;
const secondary = `${btn} bg-[var(--nav-bg)] text-[var(--text-color)]`;
const card = "bg-[var(--card-bg)] rounded-lg p-4 text-[var(--text-color)]";
const rupees = (paise) => `₹${((paise || 0) / 100).toFixed(2)}`;
const hours = (min) => `${Math.floor((min || 0) / 60)}h ${String((min || 0) % 60).padStart(2, "0")}m`;
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysFrom = (n) => isoDay(new Date(Date.now() + n * 86400000));
// datetime-local value in the browser's own time zone
const localInput = (d) => (d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const worked = (a) => (a.clockOut ? Math.max(0, Math.round((new Date(a.clockOut) - new Date(a.clockIn)) / 60000) - (a.breakMinutes || 0)) : null);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const errorText = (e) => e.response?.data?.message || "Could not save";

const useAct = (fn, keys, done = "Saved", after) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      enqueueSnackbar(done, { variant: "success" });
      keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      after?.(res);
    },
    onError: (e) => enqueueSnackbar(errorText(e), { variant: "error" }),
  });
};

// ---------- My time ----------
const MyTime = () => {
  const { data } = useQuery({ queryKey: ["myAttendance"], queryFn: getMyAttendance });
  const { data: leaveData } = useQuery({ queryKey: ["leave"], queryFn: getLeave });
  const me = data?.data?.data;
  const [breakMinutes, setBreakMinutes] = useState("");
  const [pinForm, setPinForm] = useState({ pin: "", password: "" });
  const [leave, setLeave] = useState({ from: daysFrom(1), to: daysFrom(1), type: "paid", reason: "" });
  const user = useSelector((s) => s.user);

  const inMutation = useAct(clockIn, ["myAttendance"], "Clocked in");
  const outMutation = useAct(() => clockOut({ breakMinutes: Number(breakMinutes) || 0 }), ["myAttendance"], "Clocked out", () => setBreakMinutes(""));
  const pinMutation = useAct(() => setOwnPin(pinForm), [], "PIN saved", () => setPinForm({ pin: "", password: "" }));
  const leaveMutation = useAct(() => requestLeave(leave), ["leave"], "Leave requested");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className={card}>
        <h2 className="font-semibold mb-3">Clock</h2>
        {me?.open ? (
          <div className="space-y-2">
            <p>Clocked in since {formatDateAndTime(me.open.clockIn)}</p>
            <label className="text-xs text-[#ababab] block">
              Break taken (minutes)
              <input type="number" min="0" className={inputClass} value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} />
            </label>
            <button className={primary} disabled={outMutation.isPending} onClick={() => outMutation.mutate()}>Clock out</button>
          </div>
        ) : (
          <button className={primary} disabled={inMutation.isPending} onClick={() => inMutation.mutate()}>Clock in</button>
        )}
        <ul className="mt-4 text-sm space-y-1">
          {(me?.recent || []).map((a) => (
            <li key={a._id} className="flex justify-between border-b border-[var(--border-color)] py-1">
              <span>{formatDateAndTime(a.clockIn)}</span>
              <span>{a.clockOut ? hours(worked(a)) : "open"}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="space-y-4">
        <form className={`${card} space-y-2`} onSubmit={(e) => { e.preventDefault(); pinMutation.mutate(); }}>
          <h2 className="font-semibold">My PIN ({user.name})</h2>
          <p className="text-xs text-[#ababab]">Used to switch to you on a shared till (Header → Switch user).</p>
          <input aria-label="New PIN" type="password" inputMode="numeric" autoComplete="new-password" placeholder="4–6 digits" className={inputClass} value={pinForm.pin} onChange={(e) => setPinForm({ ...pinForm, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
          <input aria-label="Your password" type="password" autoComplete="current-password" placeholder="Your password" className={inputClass} value={pinForm.password} onChange={(e) => setPinForm({ ...pinForm, password: e.target.value })} />
          <button className={primary} disabled={pinForm.pin.length < 4 || !pinForm.password || pinMutation.isPending}>Save PIN</button>
        </form>

        <form className={`${card} space-y-2`} onSubmit={(e) => { e.preventDefault(); leaveMutation.mutate(); }}>
          <h2 className="font-semibold">Ask for leave</h2>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-[#ababab]">From<input type="date" className={inputClass} value={leave.from} onChange={(e) => setLeave({ ...leave, from: e.target.value })} /></label>
            <label className="text-xs text-[#ababab]">To<input type="date" className={inputClass} value={leave.to} min={leave.from} onChange={(e) => setLeave({ ...leave, to: e.target.value })} /></label>
            <label className="text-xs text-[#ababab]">Type
              <select className={inputClass} value={leave.type} onChange={(e) => setLeave({ ...leave, type: e.target.value })}>
                <option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="sick">Sick</option>
              </select>
            </label>
          </div>
          <input aria-label="Reason" placeholder="Reason (optional)" className={inputClass} value={leave.reason} onChange={(e) => setLeave({ ...leave, reason: e.target.value })} />
          <button className={primary} disabled={leaveMutation.isPending}>Request</button>
          <ul className="text-sm space-y-1 pt-2">
            {(leaveData?.data?.data || []).filter((l) => l.user?._id === user._id).map((l) => (
              <li key={l._id}>{l.from} → {l.to} · {l.type} · <span className="font-semibold">{l.status}</span></li>
            ))}
          </ul>
        </form>
      </div>
    </div>
  );
};

// ---------- Attendance (managers) ----------
const AttendanceTab = () => {
  const [from, setFrom] = useState(daysFrom(-6));
  const [to, setTo] = useState(daysFrom(0));
  const { data } = useQuery({ queryKey: ["attendance", from, to], queryFn: () => getAttendance({ from, to }) });
  const { data: staffData } = useQuery({ queryKey: ["hrStaff"], queryFn: getHrStaff });
  const list = data?.data?.data || [];
  const staff = staffData?.data?.data || [];
  const [editing, setEditing] = useState(null); // { _id?, user, clockIn, clockOut, breakMinutes, note }
  const save = useAct(
    () => {
      const body = { clockIn: new Date(editing.clockIn).toISOString(), clockOut: editing.clockOut ? new Date(editing.clockOut).toISOString() : null, breakMinutes: Number(editing.breakMinutes) || 0, note: editing.note };
      return editing._id ? editAttendance(editing._id, body) : addAttendance({ ...body, user: editing.user });
    },
    ["attendance"],
    "Saved",
    () => setEditing(null)
  );
  const totals = list.reduce((m, a) => ({ ...m, [a.user?.name]: (m[a.user?.name] || 0) + (worked(a) || 0) }), {});

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs text-[#ababab]">From<input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-xs text-[#ababab]">To<input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button className={primary} onClick={() => setEditing({ user: staff[0]?._id, clockIn: "", clockOut: "", breakMinutes: 0, note: "" })}>Add missed entry</button>
      </div>
      <div className={card}>
        <p className="text-sm mb-2">{Object.entries(totals).map(([n, m]) => `${n}: ${hours(m)}`).join(" · ") || "No entries."}</p>
        <table className="w-full text-sm">
          <thead className="text-left text-[#ababab]"><tr><th className="p-1">Who</th><th className="p-1">In</th><th className="p-1">Out</th><th className="p-1">Break</th><th className="p-1">Worked</th><th className="p-1">Note</th><th /></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a._id} className="border-t border-[var(--border-color)]">
                <td className="p-1">{a.user?.name}</td>
                <td className="p-1">{formatDateAndTime(a.clockIn)}</td>
                <td className="p-1">{a.clockOut ? formatDateAndTime(a.clockOut) : "open"}</td>
                <td className="p-1">{a.breakMinutes}m</td>
                <td className="p-1">{a.clockOut ? hours(worked(a)) : "—"}</td>
                <td className="p-1 text-xs text-[#ababab]">{[a.note, a.editedBy && `by ${a.editedBy.name}`].filter(Boolean).join(" · ")}</td>
                <td className="p-1"><button className={secondary} onClick={() => setEditing({ _id: a._id, clockIn: localInput(a.clockIn), clockOut: localInput(a.clockOut), breakMinutes: a.breakMinutes, note: "" })}>Fix</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <form className={`${card} space-y-2 max-w-lg`} onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <h3 className="font-semibold">{editing._id ? "Fix entry" : "Add missed entry"}</h3>
          {!editing._id && (
            <select aria-label="Staff member" className={inputClass} value={editing.user} onChange={(e) => setEditing({ ...editing, user: e.target.value })}>
              {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          )}
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-[#ababab]">In<input type="datetime-local" className={inputClass} value={editing.clockIn} onChange={(e) => setEditing({ ...editing, clockIn: e.target.value })} /></label>
            <label className="text-xs text-[#ababab]">Out<input type="datetime-local" className={inputClass} value={editing.clockOut} onChange={(e) => setEditing({ ...editing, clockOut: e.target.value })} /></label>
            <label className="text-xs text-[#ababab]">Break (min)<input type="number" min="0" className={inputClass} value={editing.breakMinutes} onChange={(e) => setEditing({ ...editing, breakMinutes: e.target.value })} /></label>
          </div>
          <input aria-label="Reason" placeholder="Reason (required)" className={inputClass} value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
          <div className="flex gap-2">
            <button className={primary} disabled={save.isPending}>Save</button>
            <button type="button" className={secondary} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
};

// ---------- Rota ----------
const RotaTab = ({ canEdit }) => {
  const [weekStart, setWeekStart] = useState(daysFrom(0));
  const weekEnd = isoDay(new Date(new Date(`${weekStart}T00:00:00`).getTime() + 6 * 86400000));
  const { data } = useQuery({ queryKey: ["shifts", weekStart], queryFn: () => getShifts({ from: weekStart, to: weekEnd }) });
  const { data: staffData } = useQuery({ queryKey: ["hrStaff"], queryFn: getHrStaff, enabled: canEdit });
  const shifts = data?.data?.data || [];
  const staff = staffData?.data?.data || [];
  const days = Array.from({ length: 7 }, (_, i) => isoDay(new Date(new Date(`${weekStart}T00:00:00`).getTime() + i * 86400000)));
  const [form, setForm] = useState({ user: "", day: weekStart, start: "09:00", end: "17:00", note: "" });
  const save = useAct(
    () => {
      const start = new Date(`${form.day}T${form.start}`);
      let end = new Date(`${form.day}T${form.end}`);
      if (end <= start) end = new Date(end.getTime() + 86400000); // past midnight
      return saveShift(null, { user: form.user || staff[0]?._id, start: start.toISOString(), end: end.toISOString(), note: form.note });
    },
    ["shifts"],
    "Shift added"
  );
  const remove = useAct((id) => deleteShift(id), ["shifts"], "Shift removed");
  const time = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-end">
        <label className="text-xs text-[#ababab]">Week from<input type="date" className={inputClass} value={weekStart} onChange={(e) => setWeekStart(e.target.value)} /></label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {days.map((d) => (
          <section key={d} className={`${card} p-2`}>
            <h3 className="text-sm font-semibold">{new Date(`${d}T00:00:00`).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}</h3>
            <ul className="space-y-1 mt-1">
              {shifts.filter((s) => isoDay(new Date(s.start)) === d).map((s) => (
                <li key={s._id} className="text-xs bg-[var(--nav-bg)] rounded p-1">
                  <span className="font-semibold">{s.user?.name}</span> {time(s.start)}–{time(s.end)}
                  {s.note && <span className="block text-[#ababab]">{s.note}</span>}
                  {canEdit && <button className="text-red-500 ml-1" aria-label={`Remove ${s.user?.name}'s shift`} onClick={() => remove.mutate(s._id)}>×</button>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {canEdit && (
        <form className={`${card} grid grid-cols-2 md:grid-cols-6 gap-2 items-end`} onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <label className="text-xs text-[#ababab]">Who
            <select className={inputClass} value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })}>
              {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-[#ababab]">Day
            <select className={inputClass} value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
              {days.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="text-xs text-[#ababab]">Start<input type="time" className={inputClass} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></label>
          <label className="text-xs text-[#ababab]">End<input type="time" className={inputClass} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></label>
          <label className="text-xs text-[#ababab]">Note<input className={inputClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          <button className={primary} disabled={save.isPending}>Add shift</button>
        </form>
      )}
    </div>
  );
};

// ---------- Leave (managers) ----------
const LeaveTab = () => {
  const { data } = useQuery({ queryKey: ["leave"], queryFn: getLeave });
  const decide = useAct(({ id, status }) => decideLeave(id, { status }), ["leave"], "Done");
  return (
    <ul className={`${card} space-y-2 text-sm`}>
      {(data?.data?.data || []).map((l) => (
        <li key={l._id} className="flex flex-wrap justify-between gap-2 border-b border-[var(--border-color)] pb-2">
          <span>
            <span className="font-semibold">{l.user?.name}</span> · {l.from} → {l.to} · {l.type}
            {l.reason && <span className="block text-xs text-[#ababab]">{l.reason}</span>}
          </span>
          {l.status === "Pending" ? (
            <span className="flex gap-2">
              <button className={secondary} onClick={() => decide.mutate({ id: l._id, status: "Rejected" })}>Reject</button>
              <button className={primary} onClick={() => decide.mutate({ id: l._id, status: "Approved" })}>Approve</button>
            </span>
          ) : (
            <span>{l.status}{l.decidedBy && ` by ${l.decidedBy.name}`}</span>
          )}
        </li>
      ))}
      {!data?.data?.data?.length && <li className="text-[#ababab]">No leave requests.</li>}
    </ul>
  );
};

// ---------- Payroll (admin) ----------
const PayrollTab = () => {
  const { data: profData } = useQuery({ queryKey: ["payProfiles"], queryFn: getPayProfiles });
  const { data: runData } = useQuery({ queryKey: ["payrollRuns"], queryFn: getPayrollRuns });
  const settings = useQuery({ queryKey: ["settings"], queryFn: getSettings }).data?.data?.data;
  const [editing, setEditing] = useState(null); // { userId, name, type, hourly, monthly, otHours, otMult, tipPool }
  const [range, setRange] = useState({ from: daysFrom(-14), to: daysFrom(-1) });
  const saveProfile = useAct(
    () => savePayProfile(editing.userId, {
      type: editing.type,
      hourlyRatePaise: Math.round(Number(editing.hourly || 0) * 100),
      monthlySalaryPaise: Math.round(Number(editing.monthly || 0) * 100),
      overtimeAfterMinutes: Math.round(Number(editing.otHours || 0) * 60),
      overtimeMultiplier: Number(editing.otMult) || 1.5,
      tipPool: editing.tipPool,
    }),
    ["payProfiles"],
    "Pay saved",
    () => setEditing(null)
  );
  const createRun = useAct(() => createPayrollRun(range), ["payrollRuns"], "Draft payroll created");
  const act = useAct(({ id, action }) => payrollRunAction(id, action), ["payrollRuns"], "Updated");
  const remove = useAct((id) => deletePayrollRun(id), ["payrollRuns"], "Draft deleted");

  const payslip = (run, l) =>
    printHtml(
      `Payslip ${l.name}`,
      `<div style="font-family:sans-serif;max-width:420px;padding:16px">
        <h2>${esc(settings?.restaurantName || "Payslip")}</h2>
        <p>Payslip for <b>${esc(l.name)}</b><br/>${esc(run.from)} to ${esc(run.to)} · ${esc(run.status)}</p>
        <table style="width:100%">
          <tr><td>Hours worked</td><td style="text-align:right">${esc(hours(l.minutes))}</td></tr>
          <tr><td>Overtime hours</td><td style="text-align:right">${esc(hours(l.overtimeMinutes))}</td></tr>
          <tr><td>Base pay</td><td style="text-align:right">${esc(rupees(l.basePaise))}</td></tr>
          <tr><td>Overtime pay</td><td style="text-align:right">${esc(rupees(l.overtimePaise))}</td></tr>
          <tr><td>Tips</td><td style="text-align:right">${esc(rupees(l.tipsPaise))}</td></tr>
          <tr><td>Unpaid leave (${esc(l.unpaidLeaveDays)} days)</td><td style="text-align:right">− ${esc(rupees(l.deductionsPaise))}</td></tr>
          <tr><td><b>Total</b></td><td style="text-align:right"><b>${esc(rupees(l.totalPaise))}</b></td></tr>
        </table>
      </div>`
    );
  const csv = (run) => {
    const rows = [["Name", "Pay type", "Hours", "Overtime hours", "Base", "Overtime", "Tips", "Deductions", "Total"], ...run.lines.map((l) => [l.name, l.payType, (l.minutes / 60).toFixed(2), (l.overtimeMinutes / 60).toFixed(2), l.basePaise / 100, l.overtimePaise / 100, l.tipsPaise / 100, l.deductionsPaise / 100, l.totalPaise / 100])];
    const cell = (v) => {
      const s = String(v ?? "");
      return /^[=+@]/.test(s) || (/^-/.test(s) && Number.isNaN(Number(s))) ? `'${s}` : /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: `payroll-${run.from}-to-${run.to}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <section className={card}>
        <h2 className="font-semibold mb-2">Pay rates</h2>
        <table className="w-full text-sm">
          <tbody>
            {(profData?.data?.data || []).map(({ user, profile }) => (
              <tr key={user._id} className="border-t border-[var(--border-color)]">
                <td className="p-1 font-semibold">{user.name} <span className="text-xs text-[#ababab]">{user.role}</span></td>
                <td className="p-1">
                  {!profile ? "Not set" : profile.type === "hourly"
                    ? `${rupees(profile.hourlyRatePaise)}/h${profile.overtimeAfterMinutes ? ` · OT after ${profile.overtimeAfterMinutes / 60}h ×${profile.overtimeMultiplier}` : ""}`
                    : `${rupees(profile.monthlySalaryPaise)}/month`}
                  {profile && !profile.tipPool && " · no tips"}
                </td>
                <td className="p-1 text-right">
                  <button
                    className={secondary}
                    onClick={() => setEditing({
                      userId: user._id, name: user.name, type: profile?.type || "hourly",
                      hourly: profile ? profile.hourlyRatePaise / 100 : "", monthly: profile ? profile.monthlySalaryPaise / 100 : "",
                      otHours: profile ? profile.overtimeAfterMinutes / 60 : 9, otMult: profile?.overtimeMultiplier || 1.5, tipPool: profile?.tipPool !== false,
                    })}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {editing && (
          <form className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end mt-3" onSubmit={(e) => { e.preventDefault(); saveProfile.mutate(); }}>
            <span className="md:col-span-6 font-semibold">{editing.name}</span>
            <label className="text-xs text-[#ababab]">Paid
              <select className={inputClass} value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                <option value="hourly">Hourly</option><option value="monthly">Monthly</option>
              </select>
            </label>
            {editing.type === "hourly" ? (
              <>
                <label className="text-xs text-[#ababab]">₹ per hour<input type="number" min="0" step="0.01" className={inputClass} value={editing.hourly} onChange={(e) => setEditing({ ...editing, hourly: e.target.value })} /></label>
                <label className="text-xs text-[#ababab]">Overtime after (h/day, 0 = none)<input type="number" min="0" step="0.5" className={inputClass} value={editing.otHours} onChange={(e) => setEditing({ ...editing, otHours: e.target.value })} /></label>
                <label className="text-xs text-[#ababab]">Overtime ×<input type="number" min="1" max="3" step="0.25" className={inputClass} value={editing.otMult} onChange={(e) => setEditing({ ...editing, otMult: e.target.value })} /></label>
              </>
            ) : (
              <label className="text-xs text-[#ababab]">₹ per month<input type="number" min="0" step="1" className={inputClass} value={editing.monthly} onChange={(e) => setEditing({ ...editing, monthly: e.target.value })} /></label>
            )}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.tipPool} onChange={(e) => setEditing({ ...editing, tipPool: e.target.checked })} /> Shares tips</label>
            <button className={primary} disabled={saveProfile.isPending}>Save</button>
          </form>
        )}
      </section>

      <section className={card}>
        <h2 className="font-semibold mb-2">Payroll runs</h2>
        <div className="flex flex-wrap gap-2 items-end mb-3">
          <label className="text-xs text-[#ababab]">From<input type="date" className={inputClass} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
          <label className="text-xs text-[#ababab]">To<input type="date" className={inputClass} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
          <button className={primary} disabled={createRun.isPending} onClick={() => createRun.mutate()}>Calculate draft</button>
        </div>
        <p className="text-xs text-[#ababab] mb-3">Hours come from clocked attendance; tips from paid orders, shared by hours worked; monthly pay counts a month as 30 days.</p>
        <div className="space-y-3">
          {(runData?.data?.data || []).map((run) => (
            <div key={run._id} className="border border-[var(--border-color)] rounded-lg p-3">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-semibold">{run.from} → {run.to} · {run.status} · {rupees(run.totalPaise)} (tips {rupees(run.tipsPaise)})</span>
                <span className="flex flex-wrap gap-2">
                  {run.status === "Draft" && <button className={secondary} onClick={() => act.mutate({ id: run._id, action: "recalculate" })}>Recalculate</button>}
                  {run.status === "Draft" && <button className={secondary} onClick={() => window.confirm("Delete this draft?") && remove.mutate(run._id)}>Delete</button>}
                  {run.status === "Draft" && <button className={primary} onClick={() => window.confirm("Finalize? Numbers are locked after this.") && act.mutate({ id: run._id, action: "finalize" })}>Finalize</button>}
                  {run.status === "Finalized" && <button className={primary} onClick={() => act.mutate({ id: run._id, action: "paid" })}>Mark paid</button>}
                  <button className={secondary} onClick={() => csv(run)}>CSV</button>
                </span>
              </div>
              <table className="w-full text-sm mt-2">
                <tbody>
                  {run.lines.map((l) => (
                    <tr key={String(l.user)} className="border-t border-[var(--border-color)]">
                      <td className="p-1">{l.name}</td>
                      <td className="p-1">{hours(l.minutes)}{l.overtimeMinutes > 0 && ` (${hours(l.overtimeMinutes)} OT)`}</td>
                      <td className="p-1">{rupees(l.basePaise + l.overtimePaise)}</td>
                      <td className="p-1">tips {rupees(l.tipsPaise)}</td>
                      <td className="p-1">{l.deductionsPaise > 0 && `− ${rupees(l.deductionsPaise)}`}</td>
                      <td className="p-1 font-semibold">{rupees(l.totalPaise)}</td>
                      <td className="p-1"><button className={secondary} onClick={() => payslip(run, l)}>Payslip</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const Team = () => {
  const user = useSelector((state) => state.user);
  const tabs = [
    ["me", "My time", true],
    ["rota", "Rota", can(user, "orders.view")],
    ["attendance", "Attendance", can(user, "hr.manage")],
    ["leave", "Leave", can(user, "hr.manage")],
    ["payroll", "Payroll", can(user, "payroll.manage")],
  ].filter((t) => t[2]);
  const [tab, setTab] = useState("me");

  useEffect(() => {
    document.title = "RestOS | Team";
  }, []);

  return (
    <div className="bg-[var(--main-bg)] min-h-screen px-2 sm:px-4 md:px-6 pb-8">
      <div className="flex items-center gap-4 py-4">
        <BackButton />
        <h1 className="text-lg sm:text-xl md:text-2xl text-[var(--text-color)] tracking-wider font-bold">Team</h1>
      </div>
      <div className="flex flex-wrap gap-1 mb-4 w-full md:w-fit p-1 bg-[var(--card-bg)] rounded-lg" role="tablist">
        {tabs.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`py-2 px-4 rounded-md text-sm ${tab === key ? "bg-[var(--nav-bg)] text-[var(--text-color)] font-semibold" : "text-[#ababab]"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "me" && <MyTime />}
      {tab === "rota" && <RotaTab canEdit={can(user, "hr.manage")} />}
      {tab === "attendance" && <AttendanceTab />}
      {tab === "leave" && <LeaveTab />}
      {tab === "payroll" && <PayrollTab />}
    </div>
  );
};

export default Team;
