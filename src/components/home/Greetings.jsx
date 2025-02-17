import React, { useState, useEffect } from "react";

const Greetings = () => {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[date.getMonth()]} ${String(date.getDate()).padStart(
      2,
      "0"
    )}, ${date.getFullYear()}`;
  };

  const formatTime = (date) =>
    `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
  return (
    <div className="flex flex-row justify-between items-center py-4 px-4 md:px-8">
      <div>
        <h1 className="text-[var(--text-color)] text-lg md:text-2xl font-semibold tracking-wide">
          Welcome to RestOS
        </h1>
        <p className="text-[var(--text-color)] text-xs md:text-sm opacity-80">
          Manage your restaurant with ease
        </p>
      </div>
      <div>
        <h1 className="text-[var(--text-color)] text-xl md:text-3xl font-bold tracking-wide text-right">
          {formatTime(dateTime)}
        </h1>
        <p className="text-[var(--text-color)] text-xs md:text-sm opacity-80 text-right">
          {formatDate(dateTime)}
        </p>
      </div>
    </div>
  );
};

export default Greetings;
