import React, { useState } from "react";

const key = "py-3 rounded-lg bg-[var(--nav-bg)] text-[var(--text-color)]";

// Pick your name, type your PIN, press one of the actions. Used by Switch user and the PIN sign-in screen.
// actions: [{ label, run: (user, pin) => Promise, primary? }]; a failed run clears the PIN.
const PinPad = ({ users, emptyText, actions, busy, onPick }) => {
  const [picked, setPicked] = useState(null);
  const [pin, setPin] = useState("");
  const press = (d) => setPin((p) => (p.length < 6 ? p + d : p));
  const pick = (u) => {
    setPicked(u);
    setPin("");
    onPick?.(u);
  };
  const run = async (action) => {
    try {
      await action.run(picked, pin);
      setPicked(null);
      onPick?.(null);
    } catch {
      // the action already told the user what went wrong; stay on this person so they can retry
    } finally {
      setPin("");
    }
  };

  if (!picked) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {users.map((u) => (
          <button key={u._id} type="button" onClick={() => pick(u)} className="p-3 rounded-lg bg-[var(--nav-bg)] text-[var(--text-color)] text-left">
            <span className="font-semibold block">{u.name}</span>
            <span className="text-xs text-[#ababab]">{u.role}</span>
          </button>
        ))}
        {users.length === 0 && <p className="col-span-2 text-sm text-[#ababab]">{emptyText}</p>}
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(actions[0]);
      }}
    >
      <p className="text-center text-[var(--text-color)] font-semibold">PIN for {picked.name}</p>
      <input
        aria-label="PIN"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="w-full text-center text-3xl tracking-[0.5em] p-3 rounded-lg bg-[var(--input-bg)] text-[var(--text-color)] border border-[var(--border-color)]"
      />
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button type="button" key={d} onClick={() => press(d)} className={`${key} text-xl`}>{d}</button>
        ))}
        <button type="button" onClick={() => pick(null)} className={`${key} text-sm`}>Back</button>
        <button type="button" onClick={() => press("0")} className={`${key} text-xl`}>0</button>
        <button type="button" onClick={() => setPin((p) => p.slice(0, -1))} className={`${key} text-sm`}>Delete</button>
      </div>
      <div className={`grid gap-2 ${actions.length > 1 ? "grid-cols-2" : ""}`}>
        {actions.map((a, i) => (
          <button
            key={a.label}
            type={i === 0 ? "submit" : "button"}
            onClick={i === 0 ? undefined : () => run(a)}
            disabled={pin.length < 4 || busy}
            className={`w-full py-3 rounded-lg font-semibold disabled:opacity-60 ${i === 0 ? "bg-[#F6b100] text-white" : "bg-[var(--nav-bg)] text-[var(--text-color)]"}`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </form>
  );
};

export default PinPad;
