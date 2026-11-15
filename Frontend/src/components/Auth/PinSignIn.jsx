import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import PinPad from "../ui/PinPad";
import { forgetDevice, pinClock, pinLogin } from "../../https";
import { setUser } from "../../redux/slices/userSlice";

const time = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// The locked screen on a restaurant device: pick your name, type your PIN, then sign in or clock in/out.
const PinSignIn = ({ users, onUsePassword }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState(null);

  const call = async (fn, done) => {
    setBusy(true);
    try {
      done(await fn());
    } catch (e) {
      enqueueSnackbar(e.response?.data?.message || "Something went wrong", { variant: "error" });
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const signIn = (user, pin) =>
    call(() => pinLogin({ userId: user._id, pin }), (res) => {
      const { _id, name, email, phone, role, permissions } = res.data.data;
      queryClient.clear();
      dispatch(setUser({ _id, name, email, phone, role, permissions }));
      navigate("/");
    });

  const clock = (user, pin) =>
    call(() => pinClock({ userId: user._id, pin }), (res) => {
      const { action, name, entry } = res.data.data;
      enqueueSnackbar(
        action === "in" ? `${name} clocked in at ${time(entry.clockIn)}` : `${name} clocked out at ${time(entry.clockOut)}`,
        { variant: "success", autoHideDuration: 6000 }
      );
    });

  const forget = async () => {
    if (!window.confirm("Stop offering PIN sign-in on this device? Someone will need to sign in with a password to turn it back on.")) return;
    await forgetDevice().catch(() => {});
    onUsePassword(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--main-bg)]">
      <div className="w-full max-w-md bg-[var(--card-bg)] rounded-2xl shadow-xl p-6 border border-[var(--border-color)] space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--text-color)]">RestOS</h1>
          <p className="text-sm text-[#ababab]">{picked ? "Type your PIN" : "Tap your name"}</p>
        </div>
        <PinPad
          users={users}
          emptyText="Nobody has a PIN yet."
          busy={busy}
          onPick={setPicked}
          actions={[
            { label: "Sign in", run: signIn },
            { label: "Clock in / out", run: clock },
          ]}
        />
        <div className="flex justify-between text-xs">
          <button type="button" className="underline text-[var(--text-color)]" onClick={() => onUsePassword(false)}>
            Sign in with email and password
          </button>
          <button type="button" className="underline text-[#ababab]" onClick={forget}>
            Forget this device
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinSignIn;
