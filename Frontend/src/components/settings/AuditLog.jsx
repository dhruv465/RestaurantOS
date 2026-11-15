import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "../../https";

const ENTITIES = ["", "order", "table", "item", "category", "user", "settings"];

const AuditLog = () => {
  const [entity, setEntity] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["audit", entity],
    queryFn: () => getAuditLogs({ entity: entity || undefined, limit: 200 }),
  });
  const logs = data?.data?.data || [];

  return (
    <div className="space-y-4 max-w-5xl">
      <select
        value={entity}
        onChange={(e) => setEntity(e.target.value)}
        className="px-3 py-2 rounded-lg bg-[var(--input-bg)] text-[var(--text-color)] border border-[var(--border-color)]"
      >
        {ENTITIES.map((e) => (
          <option key={e} value={e}>
            {e || "All activity"}
          </option>
        ))}
      </select>

      <div className="bg-[var(--card-bg)] rounded-lg overflow-x-auto">
        <table className="w-full text-left text-[var(--text-color)] text-sm">
          <thead className="text-[#ababab]">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Who</th>
              <th className="p-3">Action</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="p-3" colSpan={4}>Loading…</td>
              </tr>
            )}
            {!isLoading && logs.length === 0 && (
              <tr>
                <td className="p-3" colSpan={4}>No activity yet.</td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log._id} className="border-t border-[var(--border-color)] align-top">
                <td className="p-3 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="p-3">{log.userName || "—"}</td>
                <td className="p-3 font-medium">{log.action}</td>
                <td className="p-3 text-xs text-[#ababab] break-all">
                  {log.data ? JSON.stringify(log.data) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLog;
