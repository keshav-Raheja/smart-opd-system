/**
 * useFeeConfig.js
 * ───────────────
 * Reusable hook that fetches the fee catalogue once and
 * exposes helpers to look up fees by category or code.
 *
 * Usage:
 *   const { byCategory, findByCode, loading } = useFeeConfig();
 *   const consultTypes = byCategory("consultation_type");
 */

import { useState, useEffect, useCallback } from "react";
import { getFeeConfig } from "../services/billingService";

export function useFeeConfig({ activeOnly = true } = {}) {
  const [allFees, setAllFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFeeConfig({ active_only: activeOnly });
      setAllFees(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => { fetch(); }, [fetch]);

  /** All fees in a category */
  const byCategory = (cat) => allFees.filter((f) => f.category === cat);

  /** Lookup single fee by code */
  const findByCode = (code) => allFees.find((f) => f.code === code) ?? null;

  /** Group all fees into { consultation_type: [], diagnosis_category: [], … } */
  const grouped = allFees.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});

  return { allFees, grouped, byCategory, findByCode, loading, error, refetch: fetch };
}
