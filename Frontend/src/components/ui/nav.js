import { BarChart3, Bike, CalendarDays, ChefHat, ClipboardList, Contact, FileBarChart, Home, LayoutGrid, Package, Settings, Users, Wallet } from "lucide-react";
import { can } from "../../utils";

// Every staff page, grouped by job. `perm`: one permission, or a list where any one is enough; none = everyone.
export const NAV = [
  { to: "/", label: "Home", hint: "What needs doing now", icon: Home, perm: "orders.view", group: "" },
  { to: "/my-deliveries", label: "My deliveries", hint: "Orders to take out", icon: Bike, perm: "delivery.rider", group: "" },
  { to: "/tables", label: "Tables", hint: "Take an order or bill a table", icon: LayoutGrid, perm: "orders.view", group: "Service" },
  { to: "/orders", label: "Orders", hint: "Open orders and payments", icon: ClipboardList, perm: "orders.view", group: "Service" },
  { to: "/kitchen", label: "Kitchen", hint: "Tickets to cook", icon: ChefHat, perm: "kitchen.manage", group: "Service" },
  { to: "/deliveries", label: "Deliveries", hint: "Riders and delivery zones", icon: Bike, perm: "delivery.manage", group: "Service" },
  { to: "/reservations", label: "Reservations", hint: "Bookings and waitlist", icon: CalendarDays, perm: "orders.manage", group: "Service" },
  { to: "/customers", label: "Customers", hint: "Guests and loyalty points", icon: Contact, perm: "orders.view", group: "Service" },
  { to: "/dashboard", label: "Sales", hint: "Today's sales and the menu", icon: BarChart3, perm: "dashboard.view", group: "Back office" },
  { to: "/reports", label: "Reports", hint: "Sales for any dates", icon: FileBarChart, perm: "dashboard.view", group: "Back office" },
  { to: "/inventory", label: "Stock", hint: "Stock in, waste, usage", icon: Package, perm: ["inventory.manage", "inventory.waste"], group: "Back office" },
  { to: "/accounting", label: "Money", hint: "Expenses and cash close", icon: Wallet, perm: "accounting.manage", group: "Back office" },
  { to: "/team", label: "Staff", hint: "Clock in, shifts, leave", icon: Users, group: "Back office" },
  // The page opens for everyone (read-only general info), but it is only worth a menu slot for those who can change something there.
  { to: "/settings", label: "Settings", hint: "Restaurant, menu add-ons, staff", icon: Settings, perm: ["settings.manage", "staff.manage", "menu.manage", "audit.view"], group: "Back office" },
];

export const allowed = (user, perm) => !perm || [].concat(perm).some((p) => can(user, p));
export const navFor = (user) => NAV.filter((n) => allowed(user, n.perm));

// Phone bottom bar: the few pages this person opens most, in this order.
export const mobilePicks = (user) => {
  const order = can(user, "dashboard.view")
    ? ["/", "/orders", "/tables", "/dashboard"]
    : ["/", "/kitchen", "/my-deliveries", "/orders", "/tables", "/team"];
  const mine = navFor(user);
  return order.map((to) => mine.find((n) => n.to === to)).filter(Boolean);
};
