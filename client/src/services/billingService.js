/**
 * billingService.js
 * ─────────────────
 * Centralised API layer for all billing operations.
 * Every component imports from here — never calls api directly.
 * This ensures a single point of change if the backend URL/schema changes.
 */

import api from "./api";

// ── Fee Configuration ─────────────────────────────────────────────────────────

/** Fetch fee catalogue visible to the current user (global + own for doctors). */
export const getFeeConfig = (params = {}) =>
  api.get("/fee-config/", { params }).then((r) => r.data);

/** Fetch ONLY this doctor's personal fee items (for the manage-my-fees page). */
export const getMyFees = (params = {}) =>
  api.get("/fee-config/mine", { params }).then((r) => r.data);

/** Create a new fee item */
export const createFeeConfig = (payload) =>
  api.post("/fee-config/", payload).then((r) => r.data);

/** Update fee item by id */
export const updateFeeConfig = (id, payload) =>
  api.put(`/fee-config/${id}`, payload).then((r) => r.data);

/** Soft-delete (deactivate) fee item */
export const deleteFeeConfig = (id) =>
  api.delete(`/fee-config/${id}`).then((r) => r.data);


// ── Bills ─────────────────────────────────────────────────────────────────────

/** Create a new bill */
export const createBill = (payload) =>
  api.post("/billing/", payload).then((r) => r.data);

/** List bills — pass { patient_id, status, from, to, limit } as params */
export const getBills = (params = {}) =>
  api.get("/billing/", { params }).then((r) => r.data);

/** Fetch a single bill by id */
export const getBill = (id) =>
  api.get(`/billing/${id}`).then((r) => r.data);

/** Record or update payment on a bill */
export const updatePayment = (id, payload) =>
  api.put(`/billing/${id}/payment`, payload).then((r) => r.data);

/** Revenue stats for dashboard */
export const getRevenueStats = () =>
  api.get("/billing/stats/revenue").then((r) => r.data);
