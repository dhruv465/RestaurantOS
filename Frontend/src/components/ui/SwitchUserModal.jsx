import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import Modal from "./Modal";
import { getPinUsers, pinSwitch } from "../../https";
import { setUser } from "../../redux/slices/userSlice";
import { removeAllItems } from "../../redux/slices/cartSlice";
import { removeCustomer } from "../../redux/slices/customerSlice";

// Shared till: the next person picks their name and types their PIN. Their own permissions apply from then on.
const SwitchUserModal = ({ onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["pinUsers"], queryFn: getPinUsers });
  const users = data?.data?.data || [];
  const [picked, setPicked] = useState(null);
  const [pin, setPin] = useState("");

  const switchMutation = useMutation({
    mutationFn: () => pinSwitch({ userId: picked._id, pin }),
    onSuccess: (res) => {
      const { _id, name, email, phone, role, permissions } = res.data.data;
      dispatch(removeCustomer());
      dispatch(removeAllItems());
      dispatch(setUser({ _id, name, email, phone, role, permissions }));
      queryClient.clear();
      enqueueSnackbar(`Now using RestOS as ${name}`, { variant: "success" });
      onClose();
      navigate("/");
    },
    onError: (e) => {
      setPin("");
      enqueueSnackbar(e.response?.data?.message || "Could not switch", { variant: "error" });
    },
  });

  const press = (d) => setPin((p) => (p.length < 6 ? p + d : p));

  return (
    <Modal isOpen onClose={onClose} title={picked ? `PIN for ${picked.name}` : "Switch user"}>
      {!picked ? (
        <div className="grid grid-cols-2 gap-2">
          {users.map((u) => (
            <button key={u._id} onClick={() => setPicked(u)} className="p-3 rounded-lg bg-[var(--nav-bg)] text-[var(--text-color)] text-left">
              <span className="font-semibold block">{u.name}</span>
              <span className="text-xs text-[#ababab]">{u.role}</span>
            </button>
          ))}
          {users.length === 0 && (
            <p className="col-span-2 text-sm text-[#ababab]">Nobody has a PIN yet. Each person sets one under Team → My time.</p>
          )}
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            switchMutation.mutate();
          }}
        >
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
              <button type="button" key={d} onClick={() => press(d)} className="py-3 rounded-lg bg-[var(--nav-bg)] text-[var(--text-color)] text-xl">
                {d}
              </button>
            ))}
            <button type="button" onClick={() => setPicked(null)} className="py-3 rounded-lg bg-[var(--nav-bg)] text-[var(--text-color)] text-sm">
              Back
            </button>
            <button type="button" onClick={() => press("0")} className="py-3 rounded-lg bg-[var(--nav-bg)] text-[var(--text-color)] text-xl">
              0
            </button>
            <button type="button" onClick={() => setPin((p) => p.slice(0, -1))} className="py-3 rounded-lg bg-[var(--nav-bg)] text-[var(--text-color)] text-sm">
              Delete
            </button>
          </div>
          <button disabled={pin.length < 4 || switchMutation.isPending} className="w-full py-3 rounded-lg bg-[#F6b100] text-white font-semibold disabled:opacity-60">
            Switch
          </button>
        </form>
      )}
    </Modal>
  );
};

export default SwitchUserModal;
