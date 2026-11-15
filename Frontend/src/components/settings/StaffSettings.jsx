import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { useSelector } from "react-redux";
import { createStaff, getStaff, updateStaff } from "../../https";

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] text-[var(--text-color)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--border-color)]";
const EMPTY = { name: "", email: "", phone: "", password: "", pin: "", role: "Waiter" };
const FIELDS = [
  ["name", "Name", "text", true],
  ["phone", "Phone (10 digits)", "tel", true],
  ["pin", "PIN (4-6 digits)", "password", false],
  ["email", "Email (optional)", "email", false],
  ["password", "Password (with email)", "password", false],
];

const StaffSettings = () => {
  const queryClient = useQueryClient();
  const me = useSelector((state) => state.user);
  const [form, setForm] = useState(EMPTY);
  const { data, isLoading } = useQuery({ queryKey: ["staff"], queryFn: getStaff });
  const staff = data?.data?.data || [];
  const roles = data?.data?.roles || [];

  const onError = (error) =>
    enqueueSnackbar(error.response?.data?.message || "Something went wrong", { variant: "error" });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["staff"] });

  const createMutation = useMutation({
    mutationFn: createStaff,
    onSuccess: () => {
      enqueueSnackbar("Staff member added", { variant: "success" });
      setForm(EMPTY);
      refresh();
    },
    onError,
  });
  const updateMutation = useMutation({
    mutationFn: updateStaff,
    onSuccess: (res) => {
      enqueueSnackbar(res.data.message, { variant: "success" });
      refresh();
    },
    onError,
  });

  const resetPassword = (member) => {
    const password = window.prompt(`New password for ${member.name} (min 6 characters):`);
    if (password) updateMutation.mutate({ id: member._id, password });
  };
  const setPin = (member) => {
    const pin = window.prompt(`New PIN for ${member.name} (4-6 digits):`);
    if (pin) updateMutation.mutate({ id: member._id, pin });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Send only what was filled in: a PIN-only person has no email or password.
          createMutation.mutate(Object.fromEntries(Object.entries(form).filter(([, v]) => v !== "")));
        }}
        className="bg-[var(--card-bg)] rounded-lg p-6 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
      >
        <p className="md:col-span-4 text-xs text-[#ababab]">
          Give a PIN for staff who only use the restaurant&apos;s devices. Add an email and password for anyone who signs in from elsewhere.
        </p>
        {FIELDS.map(([key, label, type, required]) => (
          <label key={key} className="space-y-1 block">
            <span className="block text-[#ababab] text-xs font-medium">{label}</span>
            <input
              type={type}
              required={required}
              inputMode={key === "pin" ? "numeric" : undefined}
              autoComplete={type === "password" ? "new-password" : undefined}
              className={inputClass}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </label>
        ))}
        <label className="space-y-1 block">
          <span className="block text-[#ababab] text-xs font-medium">Role</span>
          <select
            className={inputClass}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {roles.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="bg-[#F6b100] text-white rounded-lg px-4 py-2 hover:bg-[#F6b100]/90 disabled:opacity-60"
        >
          Add staff
        </button>
      </form>

      <div className="bg-[var(--card-bg)] rounded-lg overflow-x-auto">
        <table className="w-full text-left text-[var(--text-color)] text-sm">
          <thead className="text-[#ababab]">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="p-3" colSpan={6}>Loading…</td>
              </tr>
            )}
            {staff.map((member) => {
              const isMe = member._id === me._id;
              return (
                <tr key={member._id} className="border-t border-[var(--border-color)]">
                  <td className="p-3">{member.name}{isMe && " (you)"}</td>
                  <td className="p-3">
                    {member.email || <span className="text-[#ababab]">PIN only</span>}
                    {member.hasPin && member.email && <span className="ml-2 text-xs text-[#ababab]">· PIN</span>}
                  </td>
                  <td className="p-3">{member.phone}</td>
                  <td className="p-3">
                    <select
                      className={inputClass}
                      value={member.role}
                      disabled={isMe}
                      onChange={(e) => updateMutation.mutate({ id: member._id, role: e.target.value })}
                    >
                      {roles.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <button
                      disabled={isMe}
                      onClick={() => updateMutation.mutate({ id: member._id, active: !member.active })}
                      className={`px-3 py-1 rounded-full text-xs text-white disabled:opacity-60 ${
                        member.active ? "bg-green-600" : "bg-gray-500"
                      }`}
                    >
                      {member.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="p-3 space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => setPin(member)}
                      className="text-xs underline text-[#ababab] hover:text-[var(--text-color)]"
                    >
                      {member.hasPin ? "Reset PIN" : "Set PIN"}
                    </button>
                    {member.email && (
                      <button
                        onClick={() => resetPassword(member)}
                        className="text-xs underline text-[#ababab] hover:text-[var(--text-color)]"
                      >
                        Reset password
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffSettings;
