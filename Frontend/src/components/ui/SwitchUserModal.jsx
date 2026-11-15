import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import Modal from "./Modal";
import PinPad from "./PinPad";
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
  const [busy, setBusy] = useState(false);

  const switchTo = async (user, pin) => {
    setBusy(true);
    try {
      const res = await pinSwitch({ userId: user._id, pin });
      const { _id, name, email, phone, role, permissions } = res.data.data;
      dispatch(removeCustomer());
      dispatch(removeAllItems());
      dispatch(setUser({ _id, name, email, phone, role, permissions }));
      queryClient.clear();
      enqueueSnackbar(`Now using RestOS as ${name}`, { variant: "success" });
      onClose();
      navigate("/");
    } catch (e) {
      enqueueSnackbar(e.response?.data?.message || "Could not switch", { variant: "error" });
      throw e;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Switch user">
      <PinPad
        users={data?.data?.data || []}
        emptyText="Nobody has a PIN yet. Set them in Settings → Staff, or each person under Team → My time."
        actions={[{ label: "Switch", run: switchTo }]}
        busy={busy}
      />
    </Modal>
  );
};

export default SwitchUserModal;
