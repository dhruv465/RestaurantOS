import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { QRCodeSVG } from "qrcode.react";
import Modal from "../ui/Modal";
import { getSettings, newGuestCode, rotateTableQr } from "../../https";
import { printHtml } from "../../utils/print";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Staff hand a party the table code; the printed QR stays on the table.
const GuestAccessModal = ({ table, canManageTables, onClose }) => {
  const [access, setAccess] = useState(null); // { code, qrToken, tableNo }
  const { data } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const base = data?.data?.data?.publicBaseUrl || window.location.origin;
  const url = access ? `${base}/order/${access.qrToken}` : "";

  const onError = (e) => enqueueSnackbar(e.response?.data?.message || "Could not do that", { variant: "error" });
  const codeMutation = useMutation({ mutationFn: () => newGuestCode(table.id), onSuccess: (res) => setAccess(res.data.data), onError });
  const rotateMutation = useMutation({
    mutationFn: () => rotateTableQr(table.id),
    onSuccess: () => {
      enqueueSnackbar("Old QR stopped working. Print the new one.", { variant: "success" });
      codeMutation.mutate();
    },
    onError,
  });

  const printQr = () => {
    const svg = document.getElementById("table-qr")?.outerHTML || "";
    printHtml(
      `Table ${access.tableNo} QR`,
      `<div style="text-align:center;font-family:sans-serif;padding:24px">
        <h1>Table ${esc(access.tableNo)}</h1>
        <p>Scan to see the menu and order</p>
        ${svg}
        <p style="font-size:12px">${esc(url)}</p>
      </div>`
    );
  };

  return (
    <Modal isOpen onClose={onClose} title={`Table ${table.tableNo}: guest ordering`}>
      {!access ? (
        <div className="space-y-3 text-[var(--text-color)]">
          <p className="text-sm">
            Make a code for the party at this table. They scan the table QR and type the code to order from their phone.
            A new code ends ordering for the previous party. Paying the bill also ends it.
          </p>
          <button
            disabled={codeMutation.isPending}
            onClick={() => codeMutation.mutate()}
            className="w-full py-3 rounded-lg bg-[#F6b100] text-white font-semibold disabled:opacity-60"
          >
            Make table code
          </button>
        </div>
      ) : (
        <div className="space-y-4 text-center text-[var(--text-color)]">
          <div>
            <p className="text-sm text-[#ababab]">Table code</p>
            <p className="text-4xl font-mono font-bold tracking-[0.3em]">{access.code}</p>
          </div>
          <div className="inline-block bg-white p-3 rounded-lg">
            <QRCodeSVG id="table-qr" value={url} size={180} />
          </div>
          <p className="text-xs break-all text-[#ababab]">{url}</p>
          {base.includes("localhost") && (
            <p className="text-xs text-red-500">
              Phones cannot open localhost. Set the guest menu address in Settings → General.
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={printQr} className="flex-1 py-2 rounded-lg bg-[var(--nav-bg)] font-semibold">
              Print QR
            </button>
            {canManageTables && (
              <button
                disabled={rotateMutation.isPending}
                onClick={() => window.confirm("Replace this table's QR? Printed copies will stop working.") && rotateMutation.mutate()}
                className="flex-1 py-2 rounded-lg bg-[var(--nav-bg)] font-semibold disabled:opacity-60"
              >
                New QR
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default GuestAccessModal;
