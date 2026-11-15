import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Home, Auth, Orders, Tables, Menu, NotFound, Dashboard, Settings, Kitchen, Reservations, GuestOrder, Customers, CustomerDisplay, Reports, Inventory, Team, Accounting, Deliveries, MyDeliveries } from "./pages";
import AppShell from "./components/ui/AppShell";
import { ThemeProvider } from "./context/ThemeContext";
import { useSelector } from "react-redux";
import useLoadData from "./hooks/useLoadData";
import Loader from "./components/ui/Loader";
import useRealtime from "./hooks/useRealtime";
import { can } from "./utils";

function Layout() {
  const location = useLocation();
  const isLoading = useLoadData();
  const { isAuth } = useSelector((state) => state.user);
  useRealtime(isAuth);

  if (isLoading) return <Loader />;

  const routes = (
      <Routes>
        <Route path="/menu/:id" element={<Menu />} />
        
        <Route path="*" element={<NotFound />} />
        <Route
          path="/"
          element={
            <ProtectedRoutes>
              <HomeOrRider />
            </ProtectedRoutes>
          }
        />
        <Route path="/auth" element={isAuth ? <Navigate to="/" /> : <Auth />} />
        <Route
          path="/orders"
          element={
            <ProtectedRoutes permission="orders.view">
              <Orders />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/tables"
          element={
            <ProtectedRoutes permission="orders.view">
              <Tables />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/menu"
          element={
            <ProtectedRoutes permission="orders.manage">
              <Menu />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoutes permission="dashboard.view">
              <Dashboard />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/reservations"
          element={
            <ProtectedRoutes permission="orders.manage">
              <Reservations />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoutes permission={["inventory.manage", "inventory.waste"]}>
              <Inventory />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/team"
          element={
            <ProtectedRoutes>
              <Team />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/accounting"
          element={
            <ProtectedRoutes permission="accounting.manage">
              <Accounting />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/deliveries"
          element={
            <ProtectedRoutes permission="delivery.manage">
              <Deliveries />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/my-deliveries"
          element={
            <ProtectedRoutes permission="delivery.rider">
              <MyDeliveries />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoutes permission="dashboard.view">
              <Reports />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoutes permission="orders.view">
              <Customers />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/kitchen"
          element={
            <ProtectedRoutes permission="kitchen.manage">
              <Kitchen />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoutes>
              <Settings />
            </ProtectedRoutes>
          }
        />
      </Routes>
  );
  // Signed-in staff get the sidebar / bottom bar; the sign-in screen stays bare.
  return isAuth && location.pathname !== "/auth" ? <AppShell>{routes}</AppShell> : routes;
}

// Riders have no POS screens; their home is their delivery list.
function HomeOrRider() {
  const user = useSelector((state) => state.user);
  return !can(user, "orders.view") && can(user, "delivery.rider") ? <Navigate to="/my-deliveries" /> : <Home />;
}

function ProtectedRoutes({ children, permission }) {
  const user = useSelector((state) => state.user);
  if (!user.isAuth) {
    return <Navigate to="/auth" />;
  }
  // permission: one name, or a list where any one is enough.
  if (permission && ![].concat(permission).some((p) => can(user, p))) {
    return <Navigate to="/" />;
  }

  return children;
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Guests' phones: no staff login, no header, no staff data loading. */}
          <Route path="/order/:qrToken" element={<GuestOrder />} />
          <Route path="/kiosk/:token" element={<GuestOrder kiosk />} />
          <Route path="/display" element={<CustomerDisplay />} />
          <Route path="/*" element={<Layout />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
