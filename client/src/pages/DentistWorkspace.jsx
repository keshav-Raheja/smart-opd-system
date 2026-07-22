import { useState, useEffect, useCallback, useRef } from "react";
import api from "../services/api";
import DentalChart from "../components/DentalChart";
import { useToast } from "../context/ToastContext";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const GENDERS = ["Male", "Female", "Other"];

const STATUS_STYLE = {
  Scheduled:        { badge: "status-scheduled",  bg: "#fef3c7", color: "#92400e" },
  "Checked-In":     { badge: "status-checked-in",  bg: "#dbeafe", color: "#1e40af" },
  "In Consultation":{ badge: "status-consulting",   bg: "#ede9fe", color: "#5b21b6" },
  Completed:        { badge: "status-completed",   bg: "#d1fae5", color: "#065f46" },
  Cancelled:        { badge: "status-cancelled",   bg: "#fee2e2", color: "#991b1b" },
};

const TABS = [
  { id: "emr", label: "📋 Clinical EMR & Charting" },
  { id: "history", label: "📜 Patient Clinical History" },
  { id: "planner", label: "📅 Visit & Treatment Planner" },
  { id: "scheduler", label: "⏰ Visual Scheduler" }
];

export default function DentistWorkspace() {
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Patients sidebar states
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [sidebarLoading, setSidebarLoading] = useState(true);

  // Patient registration inline form state
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: "", age: "", gender: "Male", phone: "", blood_group: "O+", address: ""
  });

  // Main tabs state
  const [activeTab, setActiveTab] = useState("emr");

  // Tab 1: EMR states
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [dentalChart, setDentalChart] = useState({});
  const [diagSuggestions, setDiagSuggestions] = useState([]);
  const [showDiagSuggestions, setShowDiagSuggestions] = useState(false);
  const [medSuggestions, setMedSuggestions] = useState([]);
  const [showMedSuggestions, setShowMedSuggestions] = useState(false);
  const [activeMedIndex, setActiveMedIndex] = useState(null);
  
  // Visit history & Summary
  const [visits, setVisits] = useState([]);
  const [summary, setSummary] = useState(null);

  // Tab 2: Planner states
  const [bulkPlannerVisits, setBulkPlannerVisits] = useState([
    { date: "", time: "", duration: 30, reason: "RCT Visit 1" }
  ]);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerError, setPlannerError] = useState("");
  const [plannerSuccess, setPlannerSuccess] = useState("");

  // Tab 3: Billing states (inline inside EMR)
  const [globalBill, setGlobalBill] = useState(null);
  const [billTotalCost, setBillTotalCost] = useState("");
  const [billInitialPayment, setBillInitialPayment] = useState("");
  const [billPaymentMethod, setBillPaymentMethod] = useState("Cash");
  const [billNotes, setBillNotes] = useState("");
  const [billLoading, setBillLoading] = useState(false);

  // Encounter-integrated payment states (Orchestrator Pattern)
  const [encounterPaidAmount, setEncounterPaidAmount] = useState("");
  const [encounterPaymentMethod, setEncounterPaymentMethod] = useState("Cash");

  // Edit bill states
  const [isEditingBill, setIsEditingBill] = useState(false);
  const [editTotalCost, setEditTotalCost] = useState("");
  const [editAmountPaidNow, setEditAmountPaidNow] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("Cash");
  const [editNotes, setEditNotes] = useState("");

  // Installment collection
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [installmentMethod, setInstallmentMethod] = useState("Cash");
  const [installmentNotes, setInstallmentNotes] = useState("");
  const [instLoading, setInstLoading] = useState(false);

  // Tab 4: Visual Scheduler state
  const [schedulerStartDate, setSchedulerStartDate] = useState(new Date());
  const [allAppointments, setAllAppointments] = useState([]);
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const [currentTimeMins, setCurrentTimeMins] = useState(0);

  // Refs for closing autocompletes
  const diagRef = useRef(null);
  const medRef = useRef(null);
  const timelineScrollRef = useRef(null);

  // Fetch all patients for the sidebar list
  const fetchPatients = async () => {
    try {
      const res = await api.get("/patients/");
      setPatients(res.data || []);
    } catch (e) {
      toast.error("Error", "Failed to load patients list");
    } finally {
      setSidebarLoading(false);
    }
  };

  // Fetch all appointments for the Visual Scheduler tab
  const fetchAppointments = async () => {
    setSchedulerLoading(true);
    try {
      const res = await api.get("/appointments/");
      setAllAppointments(res.data || []);
    } catch (e) {
      console.error("Error loading appointments", e);
    } finally {
      setSchedulerLoading(false);
    }
  };

  // Update current time mins for red line indicator
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeMins(now.getHours() * 60 + now.getMinutes());
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch specific patient detailed summary, visits, and global bill
  const loadPatientData = useCallback(async (pId) => {
    if (!pId) return;
    setPatientLoading(true);
    try {
      const [patientRes, visitsRes, summaryRes, billRes] = await Promise.all([
        api.get(`/patients/${pId}`),
        api.get(`/visits/patient/${pId}`),
        api.get(`/visits/summary/${pId}`),
        api.get(`/billing/?patient_id=${pId}`)
      ]);
      
      const patData = patientRes.data;
      setSelectedPatient(patData);
      setVisits(visitsRes.data || []);
      setSummary(summaryRes.data || null);

      // Initialize dental chart from patient data, filtering out completed treatments
      const histChart = patData?.historical_dental_chart || {};
      const activeChart = {};
      for (const [toothId, toothData] of Object.entries(histChart)) {
        if (toothData && toothData.status !== "completed") {
          activeChart[toothId] = toothData;
        }
      }
      setDentalChart(activeChart);
 
      // Find if there is an active bill
      const patientBills = billRes.data || [];
      const treatmentBill = patientBills.find(b => b.payment_status !== "Waived");
      setGlobalBill(treatmentBill || null);
      setIsEditingBill(false);
      if (treatmentBill) {
        setBillTotalCost(treatmentBill.total_amount || "");
      } else {
        setBillTotalCost("");
        setBillInitialPayment("");
      }
    } catch (e) {
      toast.error("Error", "Failed to load patient clinical profile");
    } finally {
      setPatientLoading(false);
    }
  }, [toast]);

  // Auto-activate today's appointment when selected patient changes
  useEffect(() => {
    if (!selectedPatient) {
      setActiveAppointment(null);
      return;
    }
    const todayStr = new Date().toISOString().split("T")[0];
    const pId = selectedPatient.patient_id || selectedPatient._id;
    const patAppts = allAppointments.filter(a =>
      (a.patient_id === pId || a.patient_id === selectedPatient._id) &&
      a.status !== "Cancelled" &&
      a.status !== "Completed"
    );
    const todayAppt = patAppts.find(a => a.appointment_date === todayStr);
    if (todayAppt) {
      setActiveAppointment(todayAppt);
    } else {
      setActiveAppointment(null);
    }
  }, [selectedPatient, allAppointments]);

  useEffect(() => {
    fetchPatients();
    fetchAppointments();
  }, []);

  // Handle outside clicks for suggestions
  useEffect(() => {
    function handleClickOutside(event) {
      if (diagRef.current && !diagRef.current.contains(event.target)) {
        setShowDiagSuggestions(false);
      }
      if (medRef.current && !medRef.current.contains(event.target)) {
        setShowMedSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter patients based on search
  const filteredPatients = patients.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone?.includes(searchQuery)
  );

  // Handle patient registration submission
  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    if (!registerForm.name.trim() || !registerForm.phone.trim() || !registerForm.age) {
      toast.warning("Validation Error", "Please fill in patient Name, Age, and Phone.");
      return;
    }
    try {
      const payload = {
        ...registerForm,
        age: parseInt(registerForm.age),
        is_historical: false
      };
      const res = await api.post("/patients/", payload);
      toast.success("Patient Registered", `${registerForm.name} added successfully.`);
      
      // Reset form
      setRegisterForm({
        name: "", age: "", gender: "Male", phone: "", blood_group: "O+", address: ""
      });
      setRegisterOpen(false);

      // Refresh list and select the newly created patient
      await fetchPatients();
      const newPatientId = res.data?.id || res.data?._id;
      if (newPatientId) {
        loadPatientData(newPatientId);
        setActiveTab("emr");
      }
    } catch (err) {
      toast.error("Registration Failed", err.response?.data?.message || "Could not add patient");
    }
  };

  // Auto-complete Diagnosis search
  const handleDiagnosisChange = async (e) => {
    const val = e.target.value;
    setDiagnosis(val);
    if (val.trim().length < 2) {
      setDiagSuggestions([]);
      return;
    }
    try {
      const res = await api.get(`/visits/diagnoses/search?query=${val}`);
      setDiagSuggestions(res.data || []);
      setShowDiagSuggestions(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-complete Medicine search
  const handleMedicineSearch = async (val, index) => {
    setActiveMedIndex(index);
    const updatedMeds = [...medicines];
    updatedMeds[index].name = val;
    setMedicines(updatedMeds);

    if (val.trim().length < 2) {
      setMedSuggestions([]);
      return;
    }
    try {
      const res = await api.get(`/medicines/search?query=${val}`);
      setMedSuggestions(res.data || []);
      setShowMedSuggestions(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Add/Remove medicine row
  const addMedicineRow = () => {
    setMedicines([...medicines, { name: "", dosage: "", frequency: "Once daily", duration: "5 days", instructions: "After food" }]);
  };

  const removeMedicineRow = (index) => {
    setMedicines(medicines.filter((_, idx) => idx !== index));
  };

  const updateMedicineField = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  // Save clinical encounter
  const handleSaveConsultation = async () => {
    if (!selectedPatient) return;
    if (!symptoms.trim() && Object.keys(dentalChart).length === 0) {
      toast.warning("Validation Error", "Please provide symptoms/clinical notes or update the dental chart.");
      return;
    }

    try {
      const patientId = selectedPatient.patient_id || selectedPatient._id;
      const res = await api.post("/visits/orchestrate", {
        patient_id: patientId,
        patient_name: selectedPatient.name,
        appointment_id: activeAppointment?._id || undefined,
        doctor_name: user?.name || "Doctor",
        symptoms,
        diagnosis,
        notes,
        prescription: medicines.filter(m => m.name.trim()),
        dental_chart: dentalChart,
        amount_paid_now: encounterPaidAmount || 0,
        payment_method: encounterPaymentMethod,
      });

      toast.success("Encounter Saved & Orchestrated", "Clinical details, automated pricing, queue update, and follow-ups processed.");
      
      // Reset encounter inputs
      setSymptoms("");
      setDiagnosis("");
      setNotes("");
      setMedicines([]);
      setEncounterPaidAmount("");
      setEncounterPaymentMethod("Cash");
      setActiveAppointment(null);

      // Reload patient profile data & appointments
      loadPatientData(selectedPatient._id);
      fetchAppointments();
    } catch (err) {
      toast.error("Save Encounter Failed", err.response?.data?.message || "Error saving clinical visit details");
    }
  };

  // Multi-visit planner methods
  const addPlannerVisitRow = () => {
    const lastVisit = bulkPlannerVisits[bulkPlannerVisits.length - 1];
    const defaultReason = lastVisit ? lastVisit.reason : "RCT Visit 1";
    
    // Guess next visit title
    let nextReason = defaultReason;
    const match = defaultReason.match(/(.*Visit\s*)(\d+)/i);
    if (match) {
      nextReason = `${match[1]}${parseInt(match[2]) + 1}`;
    }

    // Default to +1 day from last visit date or today
    let nextDate = "";
    if (lastVisit && lastVisit.date) {
      const d = new Date(lastVisit.date);
      d.setDate(d.getDate() + 1);
      nextDate = d.toISOString().split("T")[0];
    }

    setBulkPlannerVisits([...bulkPlannerVisits, {
      date: nextDate,
      time: lastVisit ? lastVisit.time : "",
      duration: lastVisit ? lastVisit.duration : 30,
      reason: nextReason
    }]);
  };

  const removePlannerVisitRow = (index) => {
    if (bulkPlannerVisits.length === 1) return;
    setBulkPlannerVisits(bulkPlannerVisits.filter((_, i) => i !== index));
  };

  const updatePlannerVisitField = (index, field, value) => {
    const updated = [...bulkPlannerVisits];
    updated[index][field] = field === "duration" ? parseInt(value) || 30 : value;
    setBulkPlannerVisits(updated);
  };

  // Submit multi-visit planner
  const handleBulkSchedule = async () => {
    if (!selectedPatient) return;
    setPlannerLoading(true);
    setPlannerError("");
    setPlannerSuccess("");

    try {
      const patientId = selectedPatient.patient_id || selectedPatient._id;
      const payload = {
        patient_id: patientId,
        patient_name: selectedPatient.name,
        buffer_minutes: bufferMinutes,
        visits: bulkPlannerVisits
      };

      const res = await api.post("/appointments/bulk", payload);
      setPlannerSuccess(res.data.message || "Successfully scheduled all visits.");
      toast.success("Visits Scheduled", `Booked ${bulkPlannerVisits.length} appointments successfully.`);
      
      // Clear form
      setBulkPlannerVisits([{ date: "", time: "", duration: 30, reason: "RCT Visit 1" }]);
      
      // Refresh global appointments & patient profile
      fetchAppointments();
      loadPatientData(selectedPatient._id);
    } catch (err) {
      const errMsg = err.response?.data?.message || "Overlap detected or scheduling failed.";
      setPlannerError(errMsg);
      toast.error("Scheduling Conflict", "Some slots could not be booked due to time overlaps.");
    } finally {
      setPlannerLoading(false);
    }
  };

  // Configure Global treatment plan cost
  const handleCreateGlobalBill = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (!billTotalCost || parseFloat(billTotalCost) <= 0) {
      toast.warning("Validation Error", "Please provide a valid treatment cost.");
      return;
    }
    setBillLoading(true);
    try {
      const patientId = selectedPatient.patient_id || selectedPatient._id;
      const payload = {
        patient_id: patientId,
        patient_name: selectedPatient.name,
        doctor_name: user?.name || "Doctor",
        line_items: [
          {
            type: "other",
            description: "Dental Treatment Plan (Global Cost)",
            quantity: 1,
            unit_price: parseFloat(billTotalCost)
          }
        ],
        discount_type: "flat",
        discount_value: 0,
        tax_percent: 0,
        amount_paid: parseFloat(billInitialPayment) || 0,
        payment_method: billPaymentMethod,
        notes: billNotes
      };
      await api.post("/billing/", payload);
      toast.success("Bill Configured", "Global treatment cost set up successfully.");
      
      // Reload patient profile data
      loadPatientData(selectedPatient._id);
    } catch (err) {
      toast.error("Failed to Create Bill", err.response?.data?.message || "Billing configuration failed");
    } finally {
      setBillLoading(false);
    }
  };

  // Adjust/Edit Global treatment plan details
  const handleUpdateGlobalBill = async (e) => {
    e.preventDefault();
    if (!globalBill) return;
    if (!editTotalCost || parseFloat(editTotalCost) <= 0) {
      toast.warning("Validation Error", "Please provide a valid treatment cost.");
      return;
    }
    setBillLoading(true);
    try {
      const billId = globalBill._id || globalBill.id;
      const payload = {
        total_cost: parseFloat(editTotalCost) || 0,
        discount_value: 0,
        tax_percent: 0,
        notes: editNotes,
        amount_paid_now: parseFloat(editAmountPaidNow) || 0,
        payment_method: editPaymentMethod
      };
      await api.put(`/billing/${billId}`, payload);
      toast.success("Bill Adjusted", "Global treatment bill updated successfully.");
      setIsEditingBill(false);
      setEditAmountPaidNow("");
      
      // Reload patient profile data
      loadPatientData(selectedPatient._id);
    } catch (err) {
      toast.error("Failed to Update Bill", err.response?.data?.message || "Billing update failed");
    } finally {
      setBillLoading(false);
    }
  };

  // Record payment installment
  const handleRecordInstallment = async (e) => {
    e.preventDefault();
    if (!globalBill) return;
    if (!installmentAmount || parseFloat(installmentAmount) <= 0) {
      toast.warning("Validation Error", "Please provide a positive payment amount.");
      return;
    }
    setInstLoading(true);
    try {
      const billId = globalBill._id || globalBill.id;
      const payload = {
        amount: parseFloat(installmentAmount),
        payment_method: installmentMethod,
        notes: installmentNotes
      };
      await api.post(`/billing/${billId}/installment`, payload);
      toast.success("Payment Logged", `₹${installmentAmount} installment logged successfully.`);
      
      // Reset form
      setInstallmentAmount("");
      setInstallmentNotes("");
      
      // Reload patient profile data
      loadPatientData(selectedPatient._id);
    } catch (err) {
      toast.error("Installment Log Failed", err.response?.data?.message || "Could not record payment");
    } finally {
      setInstLoading(false);
    }
  };

  // Format date helper
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    });
  };

  // Helper to convert time "HH:MM" to minutes from midnight
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    try {
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    } catch (e) {
      return 0;
    }
  };

  // Helper to convert minutes from midnight to "HH:MM AM/PM"
  const minutesToTimeStr = (totalMins) => {
    const h24 = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    const ampm = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 || 12;
    return `${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  // Click empty scheduler slot action
  const handleTimelineSlotClick = (dateStr, hourStr) => {
    // If the planner is currently active, populate the last planner row
    const updatedVisits = [...bulkPlannerVisits];
    const lastRowIndex = updatedVisits.length - 1;
    updatedVisits[lastRowIndex].date = dateStr;
    updatedVisits[lastRowIndex].time = hourStr;
    setBulkPlannerVisits(updatedVisits);
    
    // Switch to planner tab to show the user
    setActiveTab("planner");
    toast.info("Slot Copied", `Copied Date: ${dateStr} and Time: ${hourStr} into the active Planner row.`);
  };

  const START_HOUR = 8;
  const END_HOUR = 20;
  const HOUR_HEIGHT = 70;
  const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  const get7Days = (startDate) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const formatDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handlePrev7Days = () => {
    const d = new Date(schedulerStartDate);
    d.setDate(d.getDate() - 7);
    setSchedulerStartDate(d);
  };

  const handleNext7Days = () => {
    const d = new Date(schedulerStartDate);
    d.setDate(d.getDate() + 7);
    setSchedulerStartDate(d);
  };

  const handleToday = () => {
    setSchedulerStartDate(new Date());
  };

  const COLUMN_TINTS = [
    { bg: "rgba(59, 130, 246, 0.02)", header: "rgba(59, 130, 246, 0.08)", border: "rgba(59, 130, 246, 0.15)" }, // Blue
    { bg: "rgba(16, 185, 129, 0.02)", header: "rgba(16, 185, 129, 0.08)", border: "rgba(16, 185, 129, 0.15)" }, // Green
    { bg: "rgba(139, 92, 246, 0.02)", header: "rgba(139, 92, 246, 0.08)", border: "rgba(139, 92, 246, 0.15)" }, // Purple
    { bg: "rgba(245, 158, 11, 0.02)", header: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.15)" }, // Amber
    { bg: "rgba(236, 72, 153, 0.02)", header: "rgba(236, 72, 153, 0.08)", border: "rgba(236, 72, 153, 0.15)" }, // Pink
    { bg: "rgba(20, 184, 166, 0.02)", header: "rgba(20, 184, 166, 0.08)", border: "rgba(20, 184, 166, 0.15)" }, // Teal
    { bg: "rgba(249, 115, 22, 0.02)", header: "rgba(249, 115, 22, 0.08)", border: "rgba(249, 115, 22, 0.15)" }, // Orange
  ];

  const DOC_THEMES = [
    { bg: "#eff6ff", color: "#1e40af", border: "#3b82f6" }, // Blue
    { bg: "#ecfdf5", color: "#065f46", border: "#10b981" }, // Emerald
    { bg: "#faf5ff", color: "#6b21a8", border: "#8b5cf6" }, // Purple
    { bg: "#fff7ed", color: "#c2410c", border: "#f97316" }, // Orange
    { bg: "#fdf2f8", color: "#9d174d", border: "#ec4899" }, // Pink
    { bg: "#f0fdfa", color: "#0f766e", border: "#14b8a6" }, // Teal
    { bg: "#fffbeb", color: "#b45309", border: "#f59e0b" }, // Amber
  ];

  const getDocTheme = (docName) => {
    if (!docName) return DOC_THEMES[0];
    let hash = 0;
    for (let i = 0; i < docName.length; i++) {
      hash = docName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % DOC_THEMES.length;
    return DOC_THEMES[idx];
  };

  const getApptStyle = (appt, dayAppts) => {
    const [h, m] = appt.appointment_time.split(":").map(Number);
    const startM = (h - START_HOUR) * 60 + m;
    const duration = appt.duration || 15;
    const endM = startM + duration;

    const overlaps = dayAppts.filter(other => {
      const [oh, om] = other.appointment_time.split(":").map(Number);
      const oStartM = (oh - START_HOUR) * 60 + om;
      const oDuration = other.duration || 15;
      const oEndM = oStartM + oDuration;
      return oStartM < endM && startM < oEndM;
    });

    overlaps.sort((a, b) => {
      if (a.appointment_time !== b.appointment_time) {
        return a.appointment_time.localeCompare(b.appointment_time);
      }
      return a._id.localeCompare(b._id);
    });

    const idx = overlaps.findIndex(o => o._id === appt._id);
    const count = overlaps.length || 1;

    const top = startM * (HOUR_HEIGHT / 60);
    const height = duration * (HOUR_HEIGHT / 60);
    const width = 100 / count;
    const left = idx * width;

    return {
      top: `${top}px`,
      height: `${height}px`,
      width: `${width}%`,
      left: `${left}%`,
    };
  };

  const handleApptClick = (appt) => {
    toast.info("Appointment Info", `${appt.patient_name} (${appt.duration} mins) — ${appt.reason || "General visit"}`);
    
    // Find patient in patients list to switch workspace
    const matchedPat = patients.find(p => p.patient_id === appt.patient_id || p._id === appt.patient_id);
    if (matchedPat) {
      loadPatientData(matchedPat._id);
      setActiveTab("emr");
      toast.success("Patient Selected", `Switched workspace to ${appt.patient_name}`);
    }
  };

  const patientAppointments = allAppointments.filter(a => {
    if (!selectedPatient) return false;
    const pId = selectedPatient.patient_id || selectedPatient._id;
    return (a.patient_id === pId || a.patient_id === selectedPatient._id) && a.status !== "Cancelled" && a.status !== "Completed";
  });

  return (
    <div className="dentist-workspace-container" style={{ display: "flex", height: "calc(100vh - var(--topbar-height))", overflow: "hidden", background: "var(--color-surface-2)" }}>
      
      {/* ─────────────────────────────────────────────────────────────
          LEFT COLUMN: Patient Sidebar List
          ───────────────────────────────────────────────────────────── */}
      <div className="patient-sidebar" style={{ width: 330, background: "var(--color-surface)", borderRight: "1px solid var(--color-border)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        
        {/* Sidebar Search Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-navy-900)", margin: 0 }}>👥 Clinical Queue</h2>
            <button
              onClick={() => setRegisterOpen(!registerOpen)}
              className="btn btn-primary"
              style={{ padding: "5px 12px", fontSize: 12, borderRadius: 8 }}
            >
              {registerOpen ? "✕ Close" : "+ New"}
            </button>
          </div>

          {!registerOpen && (
            <div className="search-wrapper" style={{ margin: 0 }}>
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search patient name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input search-input"
                style={{ padding: "8px 12px 8px 32px", fontSize: 13, borderRadius: 8 }}
              />
            </div>
          )}
        </div>

        {/* Sidebar Patient List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {registerOpen ? (
            <form onSubmit={handleRegisterPatient} className="animate-slide-down" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 4 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--color-accent)", margin: "0 0 6px 0" }}>Register Patient</h3>
              
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11, marginBottom: 3 }}>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Raghav Sharma"
                  value={registerForm.name}
                  onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="form-input"
                  style={{ padding: "7px 10px", fontSize: 13 }}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: 11, marginBottom: 3 }}>Age *</label>
                  <input
                    type="number"
                    placeholder="e.g. 34"
                    value={registerForm.age}
                    onChange={e => setRegisterForm({ ...registerForm, age: e.target.value })}
                    className="form-input"
                    style={{ padding: "7px 10px", fontSize: 13 }}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: 11, marginBottom: 3 }}>Gender *</label>
                  <select
                    value={registerForm.gender}
                    onChange={e => setRegisterForm({ ...registerForm, gender: e.target.value })}
                    className="form-input form-select"
                    style={{ padding: "7px 10px", fontSize: 13 }}
                  >
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: 11, marginBottom: 3 }}>Phone *</label>
                  <input
                    type="tel"
                    placeholder="10 digit number"
                    value={registerForm.phone}
                    onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })}
                    className="form-input"
                    style={{ padding: "7px 10px", fontSize: 13 }}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: 11, marginBottom: 3 }}>Blood Group</label>
                  <select
                    value={registerForm.blood_group}
                    onChange={e => setRegisterForm({ ...registerForm, blood_group: e.target.value })}
                    className="form-input form-select"
                    style={{ padding: "7px 10px", fontSize: 13 }}
                  >
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11, marginBottom: 3 }}>Address</label>
                <input
                  type="text"
                  placeholder="Optional address details"
                  value={registerForm.address}
                  onChange={e => setRegisterForm({ ...registerForm, address: e.target.value })}
                  className="form-input"
                  style={{ padding: "7px 10px", fontSize: 13 }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", padding: "9px", borderRadius: 8, fontWeight: 700, fontSize: 13, marginTop: 10 }}
              >
                Create Profile & Open Workspace
              </button>
            </form>
          ) : sidebarLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton" style={{ width: "100%", height: 60, borderRadius: 8 }} />
              ))}
            </div>
          ) : filteredPatients.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--color-text-muted)", fontSize: 13 }}>
              No clinical records matching "{searchQuery}"
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredPatients.map(p => {
                const isSelected = selectedPatient?._id === p._id;
                return (
                  <div
                    key={p._id}
                    onClick={() => {
                      if (!isSelected) loadPatientData(p._id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (isSelected) {
                        setSelectedPatient(null);
                        setGlobalBill(null);
                        setVisits([]);
                        setSummary(null);
                        toast.info("Patient Deselected", "Workspace cleared.");
                      }
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: `1.5px solid ${isSelected ? "var(--color-accent)" : "var(--color-border)"}`,
                      background: isSelected ? "var(--color-accent-glow)" : "var(--color-surface)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      position: "relative",
                      userSelect: "none"
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.borderColor = "var(--color-text-muted)";
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.borderColor = "var(--color-border)";
                    }}
                    title="Single-click to select, Double-click to deselect"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: isSelected ? "var(--color-navy-600)" : "var(--color-navy-900)" }}>
                        {p.name}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 600 }}>
                        {p.gender?.slice(0, 1)} / {p.age} yrs
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 11, color: "var(--color-text-secondary)" }}>
                      <span>📞 {p.phone}</span>
                      {p.blood_group && (
                        <span style={{ background: "rgba(239, 68, 68, 0.08)", color: "#dc2626", padding: "1px 6px", borderRadius: 4, fontWeight: 700, fontSize: 9 }}>
                          {p.blood_group}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT COLUMN: Main Clinical Panel & Workspace Tabs
          ───────────────────────────────────────────────────────────── */}
      <div className="clinical-workspace-main" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {patientLoading ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, padding: 24, overflowY: "auto" }}>
            <div className="skeleton" style={{ width: "60%", height: 32 }} />
            <div className="skeleton" style={{ width: "100%", height: 180, borderRadius: 12 }} />
            <div className="skeleton" style={{ width: "80%", height: 300, borderRadius: 12 }} />
          </div>
        ) : !selectedPatient ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
            <div style={{ textAlign: "center", maxWidth: 440, padding: 32, background: "var(--color-surface)", borderRadius: 20, boxShadow: "var(--shadow-md)", border: "1px solid var(--color-border)" }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>🦷</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--color-navy-900)", marginBottom: 8 }}>Dentist Clinical Workspace</h2>
              <p style={{ color: "var(--color-text-secondary)", fontSize: 13, lineHeight: 1.5 }}>
                Select a patient from the queue on the left to start their dental charting, treatment scheduling, clinical prescribing, and installment billing records. Double-click to deselect.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            
            {/* Top Row: Patient Info Header */}
            <div style={{ padding: "16px 24px", background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${selectedPatient.gender === "Female" ? "#ec4899, #8b5cf6" : "#3b82f6, #1d4ed8"})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 800, color: "white"
                }}>
                  {selectedPatient.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-navy-900)", margin: 0 }}>
                    {selectedPatient.name}
                  </h1>
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>
                    ID: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{selectedPatient.patient_id || selectedPatient._id?.slice(-6).toUpperCase()}</span> · {selectedPatient.gender} · {selectedPatient.age} yrs · Blood: {selectedPatient.blood_group || "Unknown"}
                  </p>
                </div>
              </div>

              {/* Billing Quick Metrics Summary */}
              {globalBill ? (
                <div style={{ display: "flex", gap: 14, background: "var(--color-surface-2)", padding: "10px 16px", borderRadius: 12, border: "1px solid var(--color-border)" }}>
                  <div style={{ fontSize: 12 }}>
                    <div style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Treatment Cost</div>
                    <div style={{ fontWeight: 800, color: "var(--color-navy-900)", fontSize: 14 }}>₹{globalBill.total_amount}</div>
                  </div>
                  <div style={{ width: 1, background: "var(--color-border)" }} />
                  <div style={{ fontSize: 12 }}>
                    <div style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Paid</div>
                    <div style={{ fontWeight: 800, color: "var(--color-success)", fontSize: 14 }}>₹{globalBill.amount_paid}</div>
                  </div>
                  <div style={{ width: 1, background: "var(--color-border)" }} />
                  <div style={{ fontSize: 12 }}>
                    <div style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Remaining Due</div>
                    <div style={{ fontWeight: 800, color: globalBill.amount_due > 0 ? "var(--color-danger)" : "var(--color-success)", fontSize: 14 }}>₹{globalBill.amount_due}</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", background: "var(--color-warning-light)", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--color-warning)" }}>
                  ⚠️ Global Treatment Bill not configured for this patient.
                </div>
              )}
            </div>

            {/* Tabs Selector Navigation */}
            <div style={{ background: "var(--color-surface-3)", padding: "6px 16px 0 16px", borderBottom: "1px solid var(--color-border)", display: "flex", gap: 4, overflowX: "auto" }}>
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: "10px 16px",
                      border: "none",
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8,
                      background: isActive ? "var(--color-surface)" : "transparent",
                      color: isActive ? "var(--color-navy-600)" : "var(--color-text-secondary)",
                      fontWeight: isActive ? 800 : 600,
                      fontSize: 13,
                      cursor: "pointer",
                      borderBottom: isActive ? "2px solid var(--color-surface)" : "none",
                      transition: "all 0.15s",
                      whiteSpace: "nowrap",
                      marginBottom: -1
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
              
              {/* ─────────────────────────────────────────────────────────────
                  TAB 1: CLINICAL EMR, CHARTING, AND BILLING
                  ───────────────────────────────────────────────────────────── */}
              {activeTab === "emr" && (
                <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  
                  {/* Dental Chart Card */}
                  <div className="card" style={{ padding: 20 }}>
                    <DentalChart
                      chart={dentalChart}
                      onChange={setDentalChart}
                      readOnly={false}
                      toothHistory={summary?.tooth_history || {}}
                    />
                  </div>

                  {/* Scheduled Visits / Active Visit Selector */}
                  {selectedPatient && patientAppointments.length > 0 && (
                    <div className="card" style={{ padding: 20, border: "1.5px solid var(--color-accent-glow)", background: "rgba(59, 130, 246, 0.02)" }}>
                      <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--color-navy-900)", margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: 6 }}>
                        📅 Scheduled Visits / Treatment Plans
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {patientAppointments.map(appt => {
                          const isActive = activeAppointment?._id === appt._id;
                          const isToday = appt.appointment_date === new Date().toISOString().split("T")[0];
                          return (
                            <div
                              key={appt._id}
                              onClick={() => setActiveAppointment(isActive ? null : appt)}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: `1.5px solid ${isActive ? "var(--color-accent)" : "var(--color-border)"}`,
                                background: isActive ? "var(--color-accent-glow)" : "var(--color-surface)",
                                cursor: "pointer",
                                transition: "all 0.2s"
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: isActive ? "var(--color-navy-900)" : "var(--color-text-primary)" }}>
                                  {appt.reason || "Scheduled Consultation"} {isToday && <span style={{ background: "var(--color-danger)", color: "white", padding: "1px 5px", borderRadius: 4, fontSize: 9, marginLeft: 6 }}>TODAY</span>}
                                </span>
                                <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                                  Date: {formatDateDisplay(appt.appointment_date)} · Time: {appt.appointment_time} ({appt.duration} mins) · Doctor: Dr. {appt.doctor_name}
                                </span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{
                                  fontSize: 10,
                                  background: isActive ? "var(--color-navy-600)" : "var(--color-surface-3)",
                                  color: isActive ? "white" : "var(--color-text-secondary)",
                                  padding: "4px 10px",
                                  borderRadius: 20,
                                  fontWeight: 700
                                }}>
                                  {isActive ? "Active Visit" : "Click to Activate"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* EMR Diagnosis & Prescriptions Entry block */}
                  <div className="card" style={{ padding: 20 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--color-navy-900)", marginBottom: 14, borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
                      📝 Today's Clinical Encounter Record
                    </h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      
                      <div className="form-group">
                        <label className="form-label">Patient Symptoms</label>
                        <textarea
                          className="form-input form-textarea"
                          placeholder="e.g. Pain in upper right back tooth, sensitive to hot fluids..."
                          value={symptoms}
                          onChange={e => setSymptoms(e.target.value)}
                          style={{ minHeight: "60px", padding: 10 }}
                        />
                      </div>

                      <div className="form-group" style={{ position: "relative" }} ref={diagRef}>
                        <label className="form-label">Diagnosis</label>
                        <input
                          type="text"
                          placeholder="Type diagnosis (e.g. Irreversible Pulpitis, Calculus...)"
                          value={diagnosis}
                          onChange={handleDiagnosisChange}
                          onFocus={() => { if (diagSuggestions.length > 0) setShowDiagSuggestions(true); }}
                          className="form-input"
                          autoComplete="off"
                        />
                        {showDiagSuggestions && diagSuggestions.length > 0 && (
                          <div style={{
                            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000,
                            background: "white", border: "1px solid var(--color-border)",
                            borderRadius: 8, boxShadow: "var(--shadow-lg)",
                            maxHeight: 180, overflowY: "auto", marginTop: 4, padding: 4
                          }}>
                            {diagSuggestions.map(diag => (
                              <div
                                key={diag}
                                onClick={() => {
                                  setDiagnosis(diag);
                                  setShowDiagSuggestions(false);
                                }}
                                style={{ padding: "8px 12px", cursor: "pointer", borderRadius: 6, fontSize: 13, color: "var(--color-text-primary)" }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-3)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                              >
                                {diag}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Prescribed Medications */}
                      <div className="form-group" style={{ position: "relative" }} ref={medRef}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <label className="form-label" style={{ margin: 0 }}>💊 Prescribed Medications</label>
                          <button
                            type="button"
                            onClick={addMedicineRow}
                            className="btn btn-secondary"
                            style={{ padding: "4px 10px", fontSize: 11, borderRadius: 6 }}
                          >
                            + Add Med Row
                          </button>
                        </div>

                        {medicines.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "16px", border: "1.5px dashed var(--color-border)", borderRadius: 10, color: "var(--color-text-muted)", fontSize: 12 }}>
                            No medicines prescribed yet for this visit. Click "+ Add Med Row".
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {medicines.map((med, index) => (
                              <div key={index} style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: 12, background: "var(--color-surface-2)", display: "flex", flexDirection: "column", gap: 8 }}>
                                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                  <div style={{ flex: 1, position: "relative" }}>
                                    <input
                                      type="text"
                                      placeholder="Search medicine name..."
                                      value={med.name}
                                      onChange={e => handleMedicineSearch(e.target.value, index)}
                                      className="form-input"
                                      style={{ padding: "6px 10px", fontSize: 13 }}
                                      autoComplete="off"
                                    />
                                    {showMedSuggestions && activeMedIndex === index && medSuggestions.length > 0 && (
                                      <div style={{
                                        position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000,
                                        background: "white", border: "1px solid var(--color-border)",
                                        borderRadius: 8, boxShadow: "var(--shadow-lg)",
                                        maxHeight: 180, overflowY: "auto", marginTop: 4, padding: 4
                                      }}>
                                        {medSuggestions.map(suggestion => (
                                          <div
                                            key={suggestion.id || suggestion.name}
                                            onClick={() => {
                                              updateMedicineField(index, "name", suggestion.name);
                                              setShowMedSuggestions(false);
                                            }}
                                            style={{ padding: "8px 12px", cursor: "pointer", borderRadius: 6, fontSize: 13, color: "var(--color-text-primary)" }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-3)"}
                                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                          >
                                            <span style={{ fontWeight: 600 }}>{suggestion.name}</span>
                                            {suggestion.therapeutic_class && <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginLeft: 6 }}>({suggestion.therapeutic_class})</span>}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeMedicineRow(index)}
                                    style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                                  >
                                    Remove
                                  </button>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                                  <input
                                    type="text"
                                    placeholder="Dosage (e.g. 500mg)"
                                    value={med.dosage}
                                    onChange={e => updateMedicineField(index, "dosage", e.target.value)}
                                    className="form-input"
                                    style={{ padding: "5px 8px", fontSize: 11 }}
                                  />
                                  <select
                                    value={med.frequency}
                                    onChange={e => updateMedicineField(index, "frequency", e.target.value)}
                                    className="form-input form-select"
                                    style={{ padding: "5px 8px", fontSize: 11 }}
                                  >
                                    <option value="Once daily">Once daily</option>
                                    <option value="Twice daily">Twice daily</option>
                                    <option value="Thrice daily">Thrice daily</option>
                                    <option value="Four times daily">Four times daily</option>
                                    <option value="As needed (PRN)">As needed (PRN)</option>
                                  </select>
                                  <input
                                    type="text"
                                    placeholder="Duration (e.g. 5 days)"
                                    value={med.duration}
                                    onChange={e => updateMedicineField(index, "duration", e.target.value)}
                                    className="form-input"
                                    style={{ padding: "5px 8px", fontSize: 11 }}
                                  />
                                  <select
                                    value={med.instructions}
                                    onChange={e => updateMedicineField(index, "instructions", e.target.value)}
                                    className="form-input form-select"
                                    style={{ padding: "5px 8px", fontSize: 11 }}
                                  >
                                    <option value="After food">After food</option>
                                    <option value="Before food">Before food</option>
                                    <option value="With food">With food</option>
                                    <option value="Empty stomach">Empty stomach</option>
                                  </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Clinical Treatment Notes</label>
                        <textarea
                          className="form-input form-textarea"
                          placeholder="Additional observations, planned procedures, lab requests..."
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          style={{ minHeight: "60px", padding: 10 }}
                        />
                      </div>

                      {/* Integrated payment details (Orchestrator Pattern) */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, background: "var(--color-surface-2)", padding: 14, borderRadius: 10, border: "1px solid var(--color-border)" }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: 11, fontWeight: 700, color: "var(--color-navy-900)" }}>Log Payment Received Now (₹)</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 5000"
                            value={encounterPaidAmount}
                            onChange={e => setEncounterPaidAmount(e.target.value)}
                            className="form-input"
                            style={{ padding: "6px 10px", fontSize: 13 }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: 11, fontWeight: 700, color: "var(--color-navy-900)" }}>Payment Method</label>
                          <select
                            value={encounterPaymentMethod}
                            onChange={e => setEncounterPaymentMethod(e.target.value)}
                            className="form-input form-select"
                            style={{ padding: "6px 10px", fontSize: 13 }}
                          >
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="UPI">UPI</option>
                            <option value="Insurance">Insurance</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveConsultation}
                        className="btn btn-primary"
                        style={{ width: "100%", padding: 12, fontWeight: 800, borderRadius: 10 }}
                      >
                        {activeAppointment ? `✅ Complete Visit (${activeAppointment.reason || "Scheduled"}) & Save Encounter` : "Save Clinical Encounter & Charting"}
                      </button>
                    </div>
                  </div>

                  {/* Integrated Billing & Payments (at the bottom of Tab 1) */}
                  <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--color-navy-900)", margin: 0 }}>
                        💳 Global Billing & Payments Ledger
                      </h3>
                      {globalBill && !isEditingBill && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingBill(true);
                            setEditTotalCost(globalBill.line_items?.[0]?.unit_price || globalBill.total_amount);
                            setEditNotes(globalBill.notes || "");
                            setEditAmountPaidNow("");
                            setEditPaymentMethod("Cash");
                          }}
                          className="btn btn-secondary"
                          style={{ padding: "4px 10px", fontSize: 11, borderRadius: 6 }}
                        >
                          ✏️ Adjust Plan / Add Items
                        </button>
                      )}
                    </div>

                    {!globalBill ? (
                      <form onSubmit={handleCreateGlobalBill} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ background: "var(--color-surface-2)", border: "1px dashed var(--color-border)", borderRadius: 10, padding: 14, fontSize: 13, color: "var(--color-text-secondary)" }}>
                          No global treatment bill is currently configured for this patient. You can specify a total cost manually below, or <strong>simply save the encounter above with dental chart procedures</strong> to auto-calculate the billing from the catalog.
                        </div>
                        <div className="grid-form-3" style={{ gap: 14 }}>
                          <div className="form-group">
                            <label className="form-label">Total Treatment Cost (₹) *</label>
                            <input
                              type="number"
                              min="1"
                              placeholder="e.g. 15000"
                              value={billTotalCost}
                              onChange={e => setBillTotalCost(e.target.value)}
                              className="form-input"
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Amount Paid Now (₹)</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="e.g. 5000"
                              value={billInitialPayment}
                              onChange={e => setBillInitialPayment(e.target.value)}
                              className="form-input"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Payment Method</label>
                            <select
                              value={billPaymentMethod}
                              onChange={e => setBillPaymentMethod(e.target.value)}
                              className="form-input form-select"
                            >
                              <option value="Cash">Cash</option>
                              <option value="Card">Card</option>
                              <option value="UPI">UPI</option>
                              <option value="Insurance">Insurance</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Invoice Notes</label>
                          <input
                            type="text"
                            placeholder="e.g. Complete RCT + Crown pack"
                            value={billNotes}
                            onChange={e => setBillNotes(e.target.value)}
                            className="form-input"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={billLoading}
                          className="btn btn-primary"
                          style={{ width: "100%", padding: 11, fontWeight: 700 }}
                        >
                          {billLoading ? "Configuring billing..." : "➕ Create Treatment Bill"}
                        </button>
                      </form>
                    ) : isEditingBill ? (
                      <form onSubmit={handleUpdateGlobalBill} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ background: "var(--color-surface-2)", border: "1.5px dashed var(--color-accent)", borderRadius: 10, padding: 14, fontSize: 13, color: "var(--color-text-secondary)" }}>
                          <strong>Adjusting Billing Details:</strong> You can modify the total cost of the treatment plan, record any new payment made now, or append notes. The system will recalculate the outstanding balance.
                        </div>
                        
                        <div className="grid-form-3" style={{ gap: 14 }}>
                          <div className="form-group">
                            <label className="form-label">Total Treatment Cost (₹) *</label>
                            <input
                              type="number"
                              min="1"
                              value={editTotalCost}
                              onChange={e => setEditTotalCost(e.target.value)}
                              className="form-input"
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Amount Paid Now (₹)</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="e.g. 2000"
                              value={editAmountPaidNow}
                              onChange={e => setEditAmountPaidNow(e.target.value)}
                              className="form-input"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Payment Method</label>
                            <select
                              value={editPaymentMethod}
                              onChange={e => setEditPaymentMethod(e.target.value)}
                              className="form-input form-select"
                            >
                              <option value="Cash">Cash</option>
                              <option value="Card">Card</option>
                              <option value="UPI">UPI</option>
                              <option value="Insurance">Insurance</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Invoice Notes</label>
                          <input
                            type="text"
                            placeholder="e.g. Added Scaling charges + RCT"
                            value={editNotes}
                            onChange={e => setEditNotes(e.target.value)}
                            className="form-input"
                          />
                        </div>

                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
                          <button
                            type="button"
                            onClick={() => setIsEditingBill(false)}
                            className="btn btn-secondary"
                            style={{ padding: "8px 16px" }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={billLoading}
                            className="btn btn-primary"
                            style={{ padding: "8px 16px", fontWeight: 700 }}
                          >
                            {billLoading ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {/* Billing stat cards */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                          <div style={{ padding: 12, background: "var(--color-surface-2)", borderRadius: 10, border: "1px solid var(--color-border)" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)" }}>Total Cost</span>
                            <h4 style={{ fontSize: 18, fontWeight: 800, margin: "2px 0 0 0" }}>₹{globalBill.total_amount}</h4>
                          </div>
                          <div style={{ padding: 12, background: "var(--color-surface-2)", borderRadius: 10, border: "1px solid var(--color-border)" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)" }}>Paid so far</span>
                            <h4 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-success)", margin: "2px 0 0 0" }}>₹{globalBill.amount_paid}</h4>
                          </div>
                          <div style={{ padding: 12, background: "var(--color-surface-2)", borderRadius: 10, border: "1px solid var(--color-border)" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)" }}>Outstanding Balance</span>
                            <h4 style={{ fontSize: 18, fontWeight: 800, color: globalBill.amount_due > 0 ? "var(--color-danger)" : "var(--color-success)", margin: "2px 0 0 0" }}>₹{globalBill.amount_due}</h4>
                          </div>
                          <div style={{ padding: 12, background: "var(--color-surface-2)", borderRadius: 10, border: "1px solid var(--color-border)" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)" }}>Status</span>
                            <div style={{ marginTop: 2 }}>
                              <span style={{
                                padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700,
                                background: globalBill.payment_status === "Paid" ? "var(--color-success-light)" : "var(--color-warning-light)",
                                color: globalBill.payment_status === "Paid" ? "var(--color-success)" : "var(--color-warning)",
                              }}>{globalBill.payment_status}</span>
                            </div>
                          </div>
                        </div>

                        {/* Record installment form */}
                        {globalBill.amount_due > 0 && (
                          <form onSubmit={handleRecordInstallment} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", borderTop: "1px solid var(--color-border)", paddingTop: 14 }}>
                            <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
                              <label className="form-label" style={{ fontSize: 11 }}>Collect Installment (₹) *</label>
                              <input
                                type="number"
                                min="1"
                                max={globalBill.amount_due}
                                value={installmentAmount}
                                onChange={e => setInstallmentAmount(e.target.value)}
                                className="form-input"
                                style={{ padding: "6px 10px", fontSize: 12 }}
                                required
                              />
                            </div>

                            <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                              <label className="form-label" style={{ fontSize: 11 }}>Method *</label>
                              <select
                                value={installmentMethod}
                                onChange={e => setInstallmentMethod(e.target.value)}
                                className="form-input form-select"
                                style={{ padding: "6px 10px", fontSize: 12 }}
                              >
                                <option value="Cash">Cash</option>
                                <option value="Card">Card</option>
                                <option value="UPI">UPI</option>
                                <option value="Insurance">Insurance</option>
                              </select>
                            </div>

                            <div className="form-group" style={{ flex: 2, minWidth: 160 }}>
                              <label className="form-label" style={{ fontSize: 11 }}>Reference Note</label>
                              <input
                                type="text"
                                placeholder="e.g. Paid during scaling"
                                value={installmentNotes}
                                onChange={e => setInstallmentNotes(e.target.value)}
                                className="form-input"
                                style={{ padding: "6px 10px", fontSize: 12 }}
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={instLoading}
                              className="btn btn-primary"
                              style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}
                            >
                              {instLoading ? "Saving..." : "Record Payment"}
                            </button>
                          </form>
                        )}

                        {/* Installment History Log */}
                        {globalBill.payment_history && globalBill.payment_history.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 6 }}>📜 INSTALLMENT LEDGER LOG:</div>
                            <div className="table-wrapper">
                              <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
                                <thead>
                                  <tr style={{ background: "var(--color-surface-3)" }}>
                                    <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 700 }}>Date & Time</th>
                                    <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 700 }}>Method</th>
                                    <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 700 }}>Note</th>
                                    <th style={{ textAlign: "right", padding: "6px 10px", fontWeight: 700 }}>Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {globalBill.payment_history.map((pay, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                                      <td style={{ padding: "6px 10px" }}>
                                        {new Date(pay.created_at || pay.date).toLocaleString("en-IN", {
                                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                                        })}
                                      </td>
                                      <td style={{ padding: "6px 10px" }}>
                                        <span style={{ background: "var(--color-accent-glow)", color: "var(--color-navy-600)", padding: "1px 6px", borderRadius: 6, fontSize: 10, fontWeight: 700 }}>
                                          {pay.payment_method}
                                        </span>
                                      </td>
                                      <td style={{ padding: "6px 10px", color: "var(--color-text-secondary)" }}>{pay.notes || "Initial Setup"}</td>
                                      <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 800, color: "var(--color-success)" }}>₹{pay.amount}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 2: DEDICATED PATIENT CLINICAL HISTORY
                  ───────────────────────────────────────────────────────────── */}
              {activeTab === "history" && (
                <div className="card animate-fade-in" style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-navy-900)", marginBottom: 14, borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
                    📜 Patient Visit History Timeline
                  </h3>

                  {visits.length === 0 ? (
                    <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
                      No clinical history recorded for this patient.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} ref={timelineScrollRef}>
                      {visits.map((visit, index) => (
                        <div key={visit._id || index} style={{ borderLeft: "3px solid var(--color-accent)", paddingLeft: 16, position: "relative" }}>
                          
                          {/* Timeline dot */}
                          <div style={{
                            position: "absolute", left: -7, top: 4, width: 11, height: 11,
                            borderRadius: "50%", background: "var(--color-accent)", border: "2.5px solid white"
                          }} />
                          
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--color-navy-600)" }}>
                              {formatDateDisplay(visit.created_at)}
                            </span>
                            <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600 }}>
                              Assigned: Dr. {visit.doctor_name || "Doctor"}
                            </span>
                          </div>

                          {visit.symptoms && (
                            <div style={{ fontSize: 13, marginTop: 6, color: "var(--color-text-secondary)" }}>
                              <strong style={{ color: "var(--color-text-primary)" }}>Symptoms:</strong> {visit.symptoms}
                            </div>
                          )}

                          {visit.diagnosis && (
                            <div style={{ fontSize: 13, marginTop: 4 }}>
                              <strong style={{ color: "var(--color-text-primary)" }}>Diagnosis:</strong> <span style={{ background: "var(--color-accent-glow)", color: "var(--color-navy-600)", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{visit.diagnosis}</span>
                            </div>
                          )}

                          {/* Treated Teeth from this visit */}
                          {visit.dental_chart && Object.keys(visit.dental_chart).length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                              {Object.entries(visit.dental_chart).map(([tooth, info]) => (
                                <span key={tooth} style={{ background: "#fee2e2", color: "#b91c1c", padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, border: "1px solid #fca5a5" }}>
                                  🦷 Tooth #{tooth}: {info.procedure} ({info.status})
                                </span>
                              ))}
                            </div>
                          )}

                          {visit.prescription && visit.prescription.length > 0 && (
                            <div style={{ marginTop: 10, background: "var(--color-surface-2)", padding: 12, borderRadius: 10, border: "1px solid var(--color-border)" }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)" }}>💊 PRESCRIBED MEDICINES:</span>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                                {visit.prescription.map((m, i) => (
                                  <div key={i} style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                                    • <strong style={{ color: "var(--color-text-primary)" }}>{m.name}</strong> - {m.dosage} ({m.frequency} x {m.duration})
                                    {m.instructions && <span style={{ fontStyle: "italic", color: "var(--color-text-muted)", marginLeft: 6 }}>({m.instructions})</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {visit.notes && (
                            <div style={{ fontSize: 12, marginTop: 6, color: "var(--color-text-muted)", fontStyle: "italic" }}>
                              Encounter Notes: {visit.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 3: VISIT & TREATMENT PLANNER
                  ───────────────────────────────────────────────────────────── */}
              {activeTab === "planner" && (
                <div className="card animate-fade-in" style={{ padding: 24, maxWidth: 850, margin: "0 auto" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-navy-900)", marginBottom: 6 }}>
                    📅 Schedule Multi-Visit Treatment Plan
                  </h3>
                  <p style={{ color: "var(--color-text-secondary)", fontSize: 13, marginBottom: 20 }}>
                    Dentists can schedule multiple subsequent visits at once (e.g. for RCT, orthodontic settings, or implant follow-ups). The system checks conflicts and warns you of existing schedules.
                  </p>

                  {plannerError && (
                    <div style={{ background: "var(--color-danger-light)", color: "var(--color-danger)", border: "1px solid #fca5a5", padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
                      ⚠️ {plannerError}
                    </div>
                  )}

                  {plannerSuccess && (
                    <div style={{ background: "var(--color-success-light)", color: "var(--color-success)", border: "1px solid #a7f3d0", padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
                      ✅ {plannerSuccess}
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {bulkPlannerVisits.map((visit, index) => (
                      <div key={index} style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: 16, background: "var(--color-surface-2)", position: "relative" }}>
                        
                        {/* Remove visit row button */}
                        {bulkPlannerVisits.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePlannerVisitRow(index)}
                            style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                          >
                            ✕ Remove Visit
                          </button>
                        )}

                        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--color-accent)", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
                          Visit #{index + 1}
                        </span>

                        <div className="grid-form-2" style={{ gap: 12 }}>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11 }}>Date *</label>
                            <input
                              type="date"
                              value={visit.date}
                              onChange={e => updatePlannerVisitField(index, "date", e.target.value)}
                              className="form-input"
                              style={{ padding: "8px 12px", fontSize: 13 }}
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11 }}>Time *</label>
                            <input
                              type="time"
                              value={visit.time}
                              onChange={e => updatePlannerVisitField(index, "time", e.target.value)}
                              className="form-input"
                              style={{ padding: "8px 12px", fontSize: 13 }}
                              required
                            />
                          </div>
                        </div>

                        <div className="grid-form-2" style={{ gap: 12, marginTop: 10 }}>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11 }}>Duration *</label>
                            <select
                              value={visit.duration}
                              onChange={e => updatePlannerVisitField(index, "duration", e.target.value)}
                              className="form-input form-select"
                              style={{ padding: "8px 12px", fontSize: 13 }}
                            >
                              <option value={15}>15 Mins</option>
                              <option value={30}>30 Mins</option>
                              <option value={45}>45 Mins</option>
                              <option value={60}>60 Mins</option>
                              <option value={90}>90 Mins</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11 }}>Treatment Reason / Procedure *</label>
                            <input
                              type="text"
                              value={visit.reason}
                              onChange={e => updatePlannerVisitField(index, "reason", e.target.value)}
                              placeholder="e.g. RCT Obturation, Crown fixation"
                              className="form-input"
                              style={{ padding: "8px 12px", fontSize: 13 }}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={addPlannerVisitRow}
                        className="btn btn-secondary"
                        style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}
                      >
                        ➕ Add Another Visit Row
                      </button>

                      {/* Buffer size options configuration */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--color-surface-3)", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)" }}>🛡️ Buffer Slots:</span>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                          <input
                            type="radio"
                            name="buffer_choice"
                            value={15}
                            checked={bufferMinutes === 15}
                            onChange={() => setBufferMinutes(15)}
                            style={{ cursor: "pointer" }}
                          />
                          15 Mins
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                          <input
                            type="radio"
                            name="buffer_choice"
                            value={30}
                            checked={bufferMinutes === 30}
                            onChange={() => setBufferMinutes(30)}
                            style={{ cursor: "pointer" }}
                          />
                          30 Mins
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={plannerLoading}
                      onClick={handleBulkSchedule}
                      className="btn btn-primary"
                      style={{ width: "100%", padding: 12, borderRadius: 10, fontWeight: 800, fontSize: 14, marginTop: 16 }}
                    >
                      {plannerLoading ? "Scheduling Treatment Plan..." : `✅ Book Treatment Plan (${bulkPlannerVisits.length} Visits)`}
                    </button>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 4: VISUAL SCHEDULER (Google Calendar Premium Daily View)
                  ───────────────────────────────────────────────────────────── */}
              {activeTab === "scheduler" && (
                <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  
                  {/* Calendar View Control Bar */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                    background: "var(--color-surface)",
                    padding: 16,
                    borderRadius: 12,
                    border: "1px solid var(--color-border)"
                  }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handlePrev7Days}
                        style={{ padding: "6px 12px", fontSize: 13, borderRadius: 8, fontWeight: 700 }}
                      >
                        ◀ Prev 7 Days
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleToday}
                        style={{ padding: "6px 12px", fontSize: 13, borderRadius: 8, fontWeight: 700 }}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleNext7Days}
                        style={{ padding: "6px 12px", fontSize: 13, borderRadius: 8, fontWeight: 700 }}
                      >
                        Next 7 Days ▶
                      </button>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--color-navy-900)" }}>
                      📅 {get7Days(schedulerStartDate)[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" — "}
                      {get7Days(schedulerStartDate)[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)" }}>Jump to Date:</label>
                      <input
                        type="date"
                        value={formatDateKey(schedulerStartDate)}
                        onChange={e => {
                          if (e.target.value) {
                            setSchedulerStartDate(new Date(e.target.value));
                          }
                        }}
                        className="form-input"
                        style={{ padding: "6px 12px", fontSize: 13, width: "auto" }}
                      />
                    </div>
                  </div>

                  {schedulerLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="skeleton" style={{ width: "100%", height: 50, borderRadius: 8 }} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ background: "var(--color-accent-glow)", color: "var(--color-navy-600)", padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                        💡 **Clinical 7-Day Scheduler**: Below is the weekly visual timeline. Scroll vertically for hours, and horizontally for columns. Click on any empty cell to copy that date & time to the Treatment Planner. Click an appointment to select the patient.
                      </div>

                      {/* Scheduler View Grid */}
                      <div className="card" style={{
                        padding: 0,
                        border: "1px solid var(--color-border)",
                        borderRadius: "16px",
                        background: "var(--color-surface)",
                        overflowX: "auto",
                        position: "relative",
                        maxHeight: "650px",
                        overflowY: "auto",
                        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)"
                      }}>
                        <div style={{ display: "flex", position: "relative" }}>
                          
                          {/* Time gutter on left */}
                          <div style={{
                            width: "70px",
                            flexShrink: 0,
                            marginTop: "50px",
                            position: "sticky",
                            left: 0,
                            background: "var(--color-surface)",
                            zIndex: 12,
                            borderRight: "1px solid var(--color-border-subtle)"
                          }}>
                            {HOURS.map((hour) => {
                              const displayHour = hour > 12 ? hour - 12 : hour;
                              const ampm = hour >= 12 ? "PM" : "AM";
                              return (
                                <div
                                  key={hour}
                                  style={{
                                    height: `${HOUR_HEIGHT}px`,
                                    fontSize: "11px",
                                    color: "var(--color-text-muted)",
                                    textAlign: "right",
                                    paddingRight: "10px",
                                    paddingTop: "4px",
                                    fontWeight: 600,
                                  }}
                                >
                                  {`${displayHour}:00 ${ampm}`}
                                </div>
                              );
                            })}
                          </div>

                          {/* Days columns container */}
                          <div style={{ display: "flex", flex: 1, minWidth: "1050px" }}>
                            {get7Days(schedulerStartDate).map((day, idx) => {
                              const dayKey = formatDateKey(day);
                              const dayAppts = allAppointments.filter(a => a.appointment_date === dayKey && a.status !== "Cancelled");
                              const isToday = formatDateKey(new Date()) === dayKey;
                              const tint = COLUMN_TINTS[idx % 7];

                              return (
                                <div key={dayKey} style={{ flex: 1, minWidth: "150px", borderRight: "1px solid var(--color-border-subtle)", position: "relative", background: tint.bg }}>
                                  
                                  {/* Header */}
                                  <div style={{
                                    height: "50px",
                                    borderBottom: `2px solid ${isToday ? "var(--color-accent)" : tint.border}`,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: isToday ? "rgba(59, 130, 246, 0.12)" : tint.header,
                                    position: "sticky",
                                    top: 0,
                                    zIndex: 10,
                                  }}>
                                    <span style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                                    </span>
                                    <span style={{ fontSize: "14px", fontWeight: 700, color: isToday ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                                      {day.toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                                    </span>
                                  </div>

                                  {/* Column body with lines and appts */}
                                  <div style={{ position: "relative", height: `${HOURS.length * HOUR_HEIGHT}px` }}>
                                    {/* Grid lines */}
                                    {HOURS.map((hour) => (
                                      <div
                                        key={hour}
                                        onClick={() => {
                                          const hr = hour.toString().padStart(2, "0");
                                          handleTimelineSlotClick(dayKey, `${hr}:00`);
                                        }}
                                        style={{
                                          height: `${HOUR_HEIGHT}px`,
                                          borderBottom: "1px solid var(--color-border-subtle)",
                                          cursor: "pointer",
                                          transition: "background 0.15s"
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = "var(--color-accent-glow)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                      />
                                    ))}

                                    {/* Current time horizontal indicator line */}
                                    {isToday && currentTimeMins >= START_HOUR * 60 && currentTimeMins <= END_HOUR * 60 && (
                                      <div style={{
                                        position: "absolute",
                                        top: (currentTimeMins - START_HOUR * 60) * (HOUR_HEIGHT / 60),
                                        left: 0,
                                        right: 0,
                                        height: 2,
                                        background: "var(--color-danger)",
                                        zIndex: 10,
                                        pointerEvents: "none"
                                      }}>
                                        <div style={{
                                          position: "absolute",
                                          left: -5,
                                          top: -4,
                                          width: 10,
                                          height: 10,
                                          borderRadius: "50%",
                                          background: "var(--color-danger)"
                                        }} />
                                      </div>
                                    )}

                                    {/* Appointments in this column */}
                                    {dayAppts.map((appt) => {
                                      const style = getApptStyle(appt, dayAppts);
                                      if (parseFloat(style.top) < 0 || parseFloat(style.top) >= HOURS.length * HOUR_HEIGHT) return null;
                                      const badgeStyle = STATUS_STYLE[appt.status] || STATUS_STYLE.Scheduled;
                                      const docTheme = getDocTheme(appt.doctor_name);
                                      const isShort = (appt.duration || 15) <= 15;

                                      return (
                                        <div
                                          key={appt._id}
                                          onClick={() => handleApptClick(appt)}
                                          style={{
                                            position: "absolute",
                                            top: style.top,
                                            height: style.height,
                                            left: style.left,
                                            width: style.width,
                                            padding: "2px 4px",
                                            zIndex: 2,
                                            cursor: "pointer",
                                          }}
                                        >
                                          <div style={{
                                            background: docTheme.bg,
                                            color: docTheme.color,
                                            borderLeft: `5px solid ${badgeStyle.color}`,
                                            borderRadius: "6px",
                                            height: "100%",
                                            padding: isShort ? "0 6px" : "4px 8px",
                                            fontSize: "11px",
                                            overflow: "hidden",
                                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.06)",
                                            display: "flex",
                                            flexDirection: isShort ? "row" : "column",
                                            alignItems: isShort ? "center" : "stretch",
                                            justifyContent: isShort ? "flex-start" : "space-between",
                                            transition: "all 0.15s ease-in-out",
                                            border: `1px solid ${docTheme.border}33`,
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = "scale(1.02)";
                                            e.currentTarget.style.boxShadow = "var(--shadow-md)";
                                            e.currentTarget.parentElement.style.zIndex = 5;
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = "none";
                                            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.06)";
                                            e.currentTarget.parentElement.style.zIndex = 2;
                                          }}
                                          >
                                            {isShort ? (
                                              <div style={{
                                                fontWeight: 700,
                                                fontSize: "9.5px",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                width: "100%"
                                              }}>
                                                👤 {appt.patient_name} ({appt.duration || 15}m) · {appt.appointment_time}
                                              </div>
                                            ) : (
                                              <>
                                                <div>
                                                  <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                    👤 {appt.patient_name} ({appt.duration || 15}m)
                                                  </div>
                                                  <div style={{ fontSize: "9px", opacity: 0.95, fontWeight: 600 }}>
                                                    Dr. {appt.doctor_name}
                                                  </div>
                                                </div>
                                                <div style={{ fontSize: "9px", opacity: 0.8, fontWeight: 500, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                  <span>🕒 {appt.appointment_time}</span>
                                                  <span style={{
                                                    background: badgeStyle.bg,
                                                    color: badgeStyle.color,
                                                    fontSize: "8px",
                                                    padding: "1px 4px",
                                                    borderRadius: "4px",
                                                    fontWeight: 700,
                                                    border: `1px solid ${badgeStyle.color}33`
                                                  }}>
                                                    {appt.status}
                                                  </span>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
