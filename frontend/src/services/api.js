import axios from "axios";
import { useAuthStore } from "../stores/authStore";
import { useCustomerStore } from "../stores/customerStore";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const AI_BASE  = import.meta.env.VITE_AI_URL  || "http://localhost:8000/api";

// ─── Main API instance ────────────────────────────────────────────────────────
export const api = axios.create({ baseURL: API_BASE });

// Helper to determine if current path is a Customer Portal route (Storefront, My Orders, Track)
const isCustomerPortalRoute = (pathname) => {
  return (
    pathname.startsWith("/customer") ||
    pathname.startsWith("/my-orders") ||
    pathname === "/order" ||
    pathname.startsWith("/order/") ||
    pathname === "/track" ||
    pathname.startsWith("/track/")
  );
};

api.interceptors.request.use((config) => {
  // If authorization header is already set explicitly, don't overwrite
  if (!config.headers.Authorization) {
    const path = window.location.pathname;
    const isCustomer = isCustomerPortalRoute(path);

    const customerToken = useCustomerStore.getState().token;
    const adminToken = useAuthStore.getState().token;

    if (isCustomer) {
      if (customerToken) {
        config.headers.Authorization = `Bearer ${customerToken}`;
      }
    } else {
      // Kitchen / Admin portal (/orders, /dashboard, /menu, /inventory, etc.)
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
      }
      // Never fall back to customerToken on admin routes to prevent 403 Forbidden errors
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const path = window.location.pathname;
    const isCustomer = isCustomerPortalRoute(path);

    if (err.response?.status === 401) {
      if (isCustomer) {
        useCustomerStore.getState().logout();
        if (path.startsWith("/my-orders")) {
          window.location.href = "/customer/login";
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// ─── AI Service instance ──────────────────────────────────────────────────────
export const aiApi = axios.create({ baseURL: AI_BASE });

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authService = {
  login:            (data) => api.post("/auth/login", data),
  customerRegister: (data) => api.post("/auth/customer/register", data),
  customerLogin:    (data) => api.post("/auth/customer/login", data),
  me:               ()     => api.get("/auth/me"),
  logout:           ()     => api.post("/auth/logout"),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardService = {
  getStats:          () => api.get("/dashboard/stats"),
  getRevenue:        (params) => api.get("/dashboard/revenue", { params }),
  getPeakHours:      () => api.get("/dashboard/peak-hours"),
  getTopDishes:      () => api.get("/dashboard/top-dishes"),
  getProfitability:  () => api.get("/dashboard/profitability"),
  updatePlatformSettings: (data) => api.post("/dashboard/platform-settings", data),
  getReportData:     (params) => api.get("/dashboard/reports", { params }),
};

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orderService = {
  getAll:         (params) => api.get("/orders", { params }),
  getById:        (id)     => api.get(`/orders/${id}`),
  create:         (data)   => api.post("/orders", data),
  updateStatus:   (id, status, reason) => api.patch(`/orders/${id}/status`, { status, cancellationReason: reason }),
  cancel:         (id, reason) => api.patch(`/orders/${id}/cancel`, { reason }),
  getLiveQueue:   ()       => api.get("/orders/live-queue"),
  track:          (orderNumber) => api.get(`/orders/track/${orderNumber}`),
  submitFeedback: (id, data) => api.post(`/orders/${id}/feedback`, data),
};

// ─── Menu ─────────────────────────────────────────────────────────────────────
export const menuService = {
  getAll:         (params) => api.get("/menu", { params }),
  getById:        (id)     => api.get(`/menu/${id}`),
  create:         (data)   => api.post("/menu", data),
  update:         (id, data) => api.put(`/menu/${id}`, data),
  delete:         (id)     => api.delete(`/menu/${id}`),
  toggleAvail:    (id)     => api.patch(`/menu/${id}/availability`),
  getRecipes:     ()       => api.get("/menu/recipes"),
  saveRecipe:     (data)   => api.post("/menu/recipes", data),
};

// ─── Inventory ────────────────────────────────────────────────────────────────
export const inventoryService = {
  getAll:          (params) => api.get("/inventory", { params }),
  getById:         (id)     => api.get(`/inventory/${id}`),
  create:          (data)   => api.post("/inventory", data),
  update:          (id, data) => api.put(`/inventory/${id}`, data),
  delete:          (id)     => api.delete(`/inventory/${id}`),
  addStock:        (id, data) => api.post(`/inventory/${id}/stock`, data),
  getLowStock:     ()       => api.get("/inventory/low-stock"),
  logWaste:        (data)   => api.post("/inventory/waste-log", data),
  getWasteAnalytics: ()     => api.get("/inventory/waste-analytics"),
  getWasteSimulation: ()    => api.get("/inventory/waste-simulation"),
  getTransactions: (params) => api.get("/inventory/transactions", { params }),
};

// ─── Research ─────────────────────────────────────────────────────────────────
export const researchService = {
  getEvaluation: () => api.get("/research/evaluation"),
};

// ─── Customers ────────────────────────────────────────────────────────────────
export const customerService = {
  getAll:     (params) => api.get("/customers", { params }),
  getById:    (id)     => api.get(`/customers/${id}`),
  getOrders:  (id, params) => api.get(`/customers/${id}/orders`, { params }),
  create:     (data)   => api.post("/customers", data),
  update:     (id, data) => api.put(`/customers/${id}`, data),
  delete:     (id)     => api.delete(`/customers/${id}`),
};

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const supplierService = {
  getAll:    (params) => api.get("/suppliers", { params }),
  getById:   (id)     => api.get(`/suppliers/${id}`),
  create:    (data)   => api.post("/suppliers", data),
  update:    (id, data) => api.put(`/suppliers/${id}`, data),
  delete:    (id)     => api.delete(`/suppliers/${id}`),
};

// ─── AI Services ──────────────────────────────────────────────────────────────
export const aiService = {
  // Demand Forecasting
  forecastDemand:    (params) => aiApi.post("/forecast/demand", params),
  compareModels:     ()       => aiApi.post("/models/compare"),
  retrainModels:     ()       => aiApi.post("/models/retrain"),

  // Inventory AI
  forecastInventory: (params) => aiApi.post("/forecast/inventory", params),

  // Waste Prediction
  predictWaste:      ()       => aiApi.post("/forecast/waste"),

  // Dynamic Pricing
  getPricingSuggestions: ()   => aiApi.post("/pricing/suggest"),

  // Recommendations
  getRecommendations: (customerId) => aiApi.get(`/recommend/dishes/${customerId || 'guest'}`),
  getPairedItems:     (dishName)   => aiApi.get(`/recommend/paired/${encodeURIComponent(dishName)}`),

  // Analytics
  getPeakHours:      ()       => aiApi.get("/analytics/peak-hours"),

  // Explainability
  explainForecast:   ()       => aiApi.post("/explain/forecast"),
};
