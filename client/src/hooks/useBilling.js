/**
 * useBilling.js
 * ─────────────
 * Reusable hook encapsulating all billing state management.
 * Components just call { bills, createBill, payBill, loading } —
 * no need to manage axios calls or loading states inside each page.
 */

import { useState, useCallback } from "react";
import {
  getBills,
  createBill as apiCreate,
  updatePayment as apiPay,
  getBill as apiGetOne,
} from "../services/billingService";

export function useBilling() {
  const [bills,   setBills]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchBills = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBills(params);
      setBills(data);
      return data;
    } catch (e) {
      setError(e.response?.data?.message || e.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createBill = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const created = await apiCreate(payload);
      setBills((prev) => [created, ...prev]);
      return { ok: true, data: created };
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const payBill = useCallback(async (billId, payload) => {
    setLoading(true);
    try {
      const updated = await apiPay(billId, payload);
      setBills((prev) =>
        prev.map((b) => (b._id === billId ? updated : b))
      );
      return { ok: true, data: updated };
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOneBill = useCallback(async (id) => {
    try {
      return await apiGetOne(id);
    } catch {
      return null;
    }
  }, []);

  return {
    bills,
    loading,
    error,
    fetchBills,
    createBill,
    payBill,
    fetchOneBill,
  };
}
