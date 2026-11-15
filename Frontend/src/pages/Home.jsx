import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { BarChart3, ChefHat, ClipboardList, LayoutGrid, Package, Settings, Users, Wallet } from "lucide-react";
import Greetings from "../components/home/Greetings";
import RecentOders from "../components/home/RecentOders";
import BottomNav from "../components/ui/BottomNav";
import { can } from "../utils";

// The start screen: one big, labelled button per job, only the ones this person is allowed to do.
const JOBS = [
  { to: "/tables", label: "Tables", hint: "Take an order or bill a table", icon: LayoutGrid, perm: "orders.view" },
  { to: "/orders", label: "Orders", hint: "Open orders and payments", icon: ClipboardList, perm: "orders.view" },
  { to: "/kitchen", label: "Kitchen", hint: "Tickets to cook", icon: ChefHat, perm: "kitchen.manage" },
  { to: "/inventory", label: "Stock", hint: "Stock in, waste, usage", icon: Package, perm: ["inventory.manage", "inventory.waste"] },
  { to: "/team", label: "Staff", hint: "Clock in, shifts, leave", icon: Users },
  { to: "/accounting", label: "Money", hint: "Expenses and cash close", icon: Wallet, perm: "accounting.manage" },
  { to: "/dashboard", label: "Sales", hint: "Today's sales and reports", icon: BarChart3, perm: "dashboard.view" },
  { to: "/settings", label: "Settings", hint: "Menu, staff, restaurant", icon: Settings, perm: ["settings.manage", "staff.manage"] },
];

const Home = () => {
  useEffect(() => {
    document.title = "RestOS | Home";
  }, []);
  const user = useSelector((state) => state.user);
  const jobs = JOBS.filter((j) => !j.perm || [].concat(j.perm).some((p) => can(user, p)));

  return (
    <div className="flex flex-col">
      {/* Phone: greeting, jobs, orders. Wide screen: greeting and orders on the left, jobs on the right. */}
      <section className="bg-[var(--main-bg)] min-h-screen pb-24 grid grid-cols-1 md:grid-cols-5 md:content-start">
        <div className="md:col-span-3">
          <Greetings />
        </div>
        <div className="md:col-span-2 md:col-start-4 md:row-start-1 md:row-span-2 px-4 md:pl-0 md:pr-8 mt-2 md:mt-6">
          <h2 className="text-[var(--text-color)] text-lg md:text-xl font-semibold mb-3">What do you want to do?</h2>
          <div className="grid grid-cols-2 gap-3">
            {jobs.map(({ to, label, hint, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-4 flex flex-col gap-2 text-[var(--text-color)] hover:border-[#F6b100]"
              >
                <Icon size={28} className="text-[#F6b100]" aria-hidden="true" />
                <span className="font-semibold text-base">{label}</span>
                <span className="text-xs text-[#ababab]">{hint}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="md:col-span-3">
          <RecentOders />
        </div>
      </section>
      <div className="fixed bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </div>
  );
};

export default Home;
