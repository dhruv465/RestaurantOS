import React, { useState } from "react";
import Modal from "../ui/Modal";

// Pick add-ons for one menu item before it goes into the cart. Enforces each group's min/max.
const ModifierPicker = ({ item, groups, quantity, onClose, onConfirm }) => {
  const [picked, setPicked] = useState({}); // groupId -> [optionId]

  const toggle = (group, optionId) => {
    const current = picked[group._id] || [];
    let next;
    if (current.includes(optionId)) next = current.filter((id) => id !== optionId);
    else if (group.maxSelect === 1) next = [optionId];
    else if (current.length < group.maxSelect) next = [...current, optionId];
    else return;
    setPicked({ ...picked, [group._id]: next });
  };

  const missing = groups.find((g) => (picked[g._id] || []).length < g.minSelect);
  const chosen = groups.flatMap((g) =>
    (picked[g._id] || []).map((optionId) => {
      const option = g.options.find((o) => o._id === optionId);
      return { groupId: g._id, optionId, group: g.name, name: option.name, pricePaise: option.pricePaise };
    })
  );
  const unitPaise = Math.round(item.price * 100) + chosen.reduce((sum, m) => sum + m.pricePaise, 0);

  return (
    <Modal isOpen onClose={onClose} title={item.name}>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {groups.map((g) => (
          <fieldset key={g._id}>
            <legend className="text-[var(--text-color)] font-semibold mb-2">
              {g.name}{" "}
              <span className="text-xs text-[#ababab] font-normal">
                {g.minSelect > 0 ? `choose ${g.minSelect === g.maxSelect ? g.minSelect : `${g.minSelect}–${g.maxSelect}`}` : `optional, up to ${g.maxSelect}`}
              </span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {g.options.map((o) => {
                const on = (picked[g._id] || []).includes(o._id);
                return (
                  <button
                    key={o._id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(g, o._id)}
                    className={`p-2 rounded-lg text-sm text-left border ${
                      on ? "bg-[#F6b100] text-white border-[#F6b100]" : "bg-[var(--input-bg)] text-[var(--text-color)] border-[var(--border-color)]"
                    }`}
                  >
                    {o.name}
                    {o.pricePaise > 0 && <span className="block text-xs">+₹{(o.pricePaise / 100).toFixed(2)}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <button
        disabled={!!missing}
        onClick={() => onConfirm(chosen, unitPaise / 100)}
        className="w-full mt-4 py-3 rounded-lg bg-[#F6b100] text-white font-semibold disabled:opacity-60"
      >
        {missing ? `Choose ${missing.name}` : `Add ${quantity} · ₹${((unitPaise * quantity) / 100).toFixed(2)}`}
      </button>
    </Modal>
  );
};

export default ModifierPicker;
