import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Home, Auth, Orders, Tables, Menu, NotFound, Dashboard, Settings, Kitchen, GuestOrder, Reports, Inventory, Team, Accounting } from "./pages";
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
              <Home />
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
          path="/reports"
          element={
            <ProtectedRoutes permission="dashboard.view">
              <Reports />
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
          <Route path="/*" element={<Layout />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
