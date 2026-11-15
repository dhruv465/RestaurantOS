import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { getSettings } from "../https";
import { onDisplayMessage } from "../utils/display";

const rupees = (paise) => `₹${((paise || 0) / 100).toFixed(2)}`;

// Faces the guest at the counter. Open it from the menu on the till and drag the window to the second screen.
const CustomerDisplay = () => {
  const { data } = useQuery({ queryKey: ["settings"], queryFn: getSettings, retry: false });
  const name = data?.data?.data?.restaurantName || "Welcome";
  const [screen, setScreen] = useState({ type: "idle" });

  useEffect(() => {
    document.title = "Customer display";
    // An empty cart right after payment must not cut the thank-you short.
    return onDisplayMessage((msg) => setScreen((cur) => (cur.type === "thanks" && msg.type === "idle" ? cur : msg)));
  }, []);
  // Thank-you goes back to idle on its own.
  useEffect(() => {
    if (screen.type !== "thanks") return;
    const t = setTimeout(() => setScreen({ type: "idle" }), 8000);
    return () => clearTimeout(t);
  }, [screen]);

  return (
    <main className="bg-[var(--main-bg)] text-[var(--text-color)] min-h-screen flex items-center justify-center p-8">
      {screen.type === "idle" && (
        <h1 className="text-5xl font-bold text-center">{name}</h1>
      )}
      {screen.type === "cart" && (
        <div className="w-full max-w-2xl">
          <ul className="space-y-3 text-2xl">
            {screen.items.map((i, n) => (
              <li key={n} className="flex justify-between gap-4">
                <span>
                  {i.quantity}× {i.name}
                  {i.modifiers?.length > 0 && <span className="block text-base text-[#ababab]">{i.modifiers.join(", ")}</span>}
                </span>
                <span>{rupees(i.pricePaise)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 pt-4 border-t border-[var(--border-color)] text-2xl space-y-1">
            <div className="flex justify-between"><span>Tax</span><span>{rupees(screen.taxPaise)}</span></div>
            <div className="flex justify-between text-4xl font-bold"><span>Total</span><span>{rupees(screen.totalPaise)}</span></div>
          </div>
        </div>
      )}
      {screen.type === "pay" && (
        <div className="text-center space-y-6">
          <p className="text-3xl">Amount to pay</p>
          <p className="text-6xl font-bold">{rupees(screen.amountPaise)}</p>
          {screen.upiUri && (
            <div className="inline-block bg-white p-4 rounded-xl">
              <QRCodeSVG value={screen.upiUri} size={280} aria-label="UPI QR code" />
              <p className="text-gray-700 mt-2">Scan with any UPI app</p>
            </div>
          )}
        </div>
      )}
      {screen.type === "thanks" && (
        <div className="text-center space-y-4">
          <p className="text-6xl font-bold">Thank you!</p>
        </div>
      )}
    </main>
  );
};

export default CustomerDisplay;
