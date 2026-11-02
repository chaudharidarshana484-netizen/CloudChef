import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { PageTitle } from "./components/brand/PageTitle";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { lazy, Suspense } from "react";
import { PageLoader } from "./components/ui/Skeleton";

// Pages — Admin Auth
import Login from "./pages/auth/Login";

// Pages — Customer Auth
const CustomerLogin = lazy(() => import("./pages/customer/CustomerLogin"));

// Pages — Customer Portal (public + authenticated customer)
const CustomerStorefront = lazy(() => import("./pages/customer/CustomerStorefront"));
const OrderTracking      = lazy(() => import("./pages/customer/OrderTracking"));
const MyOrders           = lazy(() => import("./pages/customer/MyOrders"));

// Pages — Main Admin
const Dashboard     = lazy(() => import("./pages/Dashboard"));
const Orders        = lazy(() => import("./pages/Orders"));
const Menu          = lazy(() => import("./pages/Menu"));
const Inventory     = lazy(() => import("./pages/Inventory"));
const Customers     = lazy(() => import("./pages/Customers"));
const Suppliers     = lazy(() => import("./pages/Suppliers"));
const KitchenOps    = lazy(() => import("./pages/KitchenOps"));
const Reports       = lazy(() => import("./pages/Reports"));
const Profitability = lazy(() => import("./pages/Profitability"));
const Research      = lazy(() => import("./pages/Research"));
const Settings      = lazy(() => import("./pages/Settings"));

// Pages — AI
const DemandForecast  = lazy(() => import("./pages/ai/DemandForecast"));
const InventoryAI     = lazy(() => import("./pages/ai/InventoryAI"));
const WastePredictor  = lazy(() => import("./pages/ai/WastePredictor"));
const DynamicPricing  = lazy(() => import("./pages/ai/DynamicPricing"));
const Recommendations = lazy(() => import("./pages/ai/Recommendations"));
const NotFound        = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          1000 * 60 * 3,
      gcTime:             1000 * 60 * 10,
      retry:              1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageSuspense({ children }) {
  return (
    <Suspense fallback={<PageLoader message="Loading page..." />}>
      {children}
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <PageTitle />
          <Routes>

            {/* ─── Customer Storefront (public access) ─── */}
            <Route path="/order"              element={<PageSuspense><CustomerStorefront /></PageSuspense>} />
            <Route path="/track"              element={<PageSuspense><OrderTracking /></PageSuspense>} />
            <Route path="/track/:orderNumber" element={<PageSuspense><OrderTracking /></PageSuspense>} />

            {/* ─── Customer Auth Pages ─── */}
            <Route path="/customer/login"    element={<Navigate to="/login?role=customer" replace />} />
            <Route path="/customer/register" element={<Navigate to="/login?role=customer" replace />} />

            {/* ─── Customer Portal (requires customer login OR works as guest) ─── */}
            <Route path="/my-orders"        element={<PageSuspense><MyOrders /></PageSuspense>} />
            <Route path="/customer/orders" element={<Navigate to="/my-orders" replace />} />

            {/* ─── Admin Auth ─── */}
            <Route path="/login" element={<Login />} />

            {/* ─── Protected Admin + Kitchen Management ─── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                <Route path="/dashboard"     element={<PageSuspense><Dashboard /></PageSuspense>} />
                <Route path="/orders"        element={<PageSuspense><Orders /></PageSuspense>} />
                <Route path="/menu"          element={<PageSuspense><Menu /></PageSuspense>} />
                <Route path="/inventory"     element={<PageSuspense><Inventory /></PageSuspense>} />
                <Route path="/customers"     element={<PageSuspense><Customers /></PageSuspense>} />
                <Route path="/suppliers"     element={<PageSuspense><Suppliers /></PageSuspense>} />
                <Route path="/kitchen"       element={<PageSuspense><KitchenOps /></PageSuspense>} />
                <Route path="/reports"       element={<PageSuspense><Reports /></PageSuspense>} />
                <Route path="/profitability" element={<PageSuspense><Profitability /></PageSuspense>} />
                <Route path="/research"      element={<PageSuspense><Research /></PageSuspense>} />
                <Route path="/settings"      element={<PageSuspense><Settings /></PageSuspense>} />

                {/* AI Routes */}
                <Route path="/ai/demand"          element={<PageSuspense><DemandForecast /></PageSuspense>} />
                <Route path="/ai/inventory"       element={<PageSuspense><InventoryAI /></PageSuspense>} />
                <Route path="/ai/waste"           element={<PageSuspense><WastePredictor /></PageSuspense>} />
                <Route path="/ai/pricing"         element={<PageSuspense><DynamicPricing /></PageSuspense>} />
                <Route path="/ai/recommendations" element={<PageSuspense><Recommendations /></PageSuspense>} />
              </Route>
            </Route>

            {/* ─── 404 ─── */}
            <Route path="*" element={<PageSuspense><NotFound /></PageSuspense>} />
          </Routes>

          <Toaster
            position="bottom-right"
            gutter={8}
            toastOptions={{
              duration: 4000,
              style: {
                background: "#1a1a26",
                color: "#f3f4f6",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px",
                fontSize: "13px",
                fontWeight: "500",
                padding: "12px 16px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                maxWidth: "380px",
              },
              success: {
                iconTheme: { primary: "#22c55e", secondary: "#1a1a26" },
                style: { borderColor: "rgba(34,197,94,0.2)", background: "#0f1f17" },
              },
              error: {
                iconTheme: { primary: "#ef4444", secondary: "#1a1a26" },
                style: { borderColor: "rgba(239,68,68,0.2)", background: "#1f0f0f" },
                duration: 5000,
              },
              loading: {
                iconTheme: { primary: "#f97316", secondary: "#1a1a26" },
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
