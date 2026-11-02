import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useCustomerStore = create(
  persist(
    (set, get) => ({
      customer: null,
      token: null,
      isAuthenticated: false,

      login: (customer, token) =>
        set({ customer, token, isAuthenticated: true }),

      logout: () =>
        set({ customer: null, token: null, isAuthenticated: false }),

      updateCustomer: (updates) =>
        set((state) => ({ customer: { ...state.customer, ...updates } })),

      getToken: () => get().token,
    }),
    { name: "cloudchef-customer-auth" }
  )
);
