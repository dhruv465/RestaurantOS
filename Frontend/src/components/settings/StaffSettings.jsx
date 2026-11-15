import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { useSelector } from "react-redux";
import { createStaff, getStaff, updateStaff } from "../../https";

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] text-[var(--text-color)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--border-color)]";
const EMPTY = { name: "", email: "", phone: "", password: "", role: "Waiter" };

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

  return (
    <div className="space-y-6 max-w-5xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate(form);
        }}
        className="bg-[var(--card-bg)] rounded-lg p-6 grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
      >
        {[
          ["name", "Name", "text"],
          ["email", "Email", "email"],
          ["phone", "Phone (10 digits)", "tel"],
          ["password", "Password", "password"],
        ].map(([key, label, type]) => (
          <label key={key} className="space-y-1 block">
            <span className="block text-[#ababab] text-xs font-medium">{label}</span>
            <input
              type={type}
              required
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
                  <td className="p-3">{member.email}</td>
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
                  <td className="p-3">
                    <button
                      onClick={() => resetPassword(member)}
                      className="text-xs underline text-[#ababab] hover:text-[var(--text-color)]"
                    >
                      Reset password
                    </button>
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
