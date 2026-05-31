import { useState } from "react";
import PatientQueue from "../components/PatientQueue";
import ConsultationWorkspace from "../components/ConsultationWorkspace";

function DoctorPanel() {
  const [selectedPatient, setSelectedPatient] = useState(null);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">🩺 Doctor Workspace</h1>
        <p className="page-subtitle">Manage consultations, queue, and patient workflow</p>
      </div>

      <div className="grid-doctor-panel">
        <PatientQueue
          setSelectedPatient={setSelectedPatient}
          selectedPatient={selectedPatient}
        />
        <ConsultationWorkspace patient={selectedPatient} />
      </div>
    </div>
  );
}

export default DoctorPanel;