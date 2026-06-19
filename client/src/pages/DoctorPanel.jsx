import { useState } from "react";
import PatientQueue from "../components/PatientQueue";
import ConsultationWorkspace from "../components/ConsultationWorkspace";

function DoctorPanel() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [queue, setQueue] = useState([]);
  const [refreshQueueTrigger, setRefreshQueueTrigger] = useState(0);

  const handleWorkflowComplete = () => {
    // Determine the next patient in the queue
    const currentIndex = queue.findIndex(appt => appt._id === selectedPatient?._id);
    const remainingQueue = queue.filter(appt => appt._id !== selectedPatient?._id);
    
    if (remainingQueue.length > 0) {
      // Advance to next patient (or wraps around if index is out of bounds)
      const nextIndex = currentIndex < remainingQueue.length ? currentIndex : 0;
      setSelectedPatient(remainingQueue[nextIndex]);
    } else {
      setSelectedPatient(null);
    }

    // Refresh database sync in real-time
    setRefreshQueueTrigger(prev => prev + 1);
  };

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
          onQueueChange={setQueue}
          refreshTrigger={refreshQueueTrigger}
        />
        <ConsultationWorkspace 
          patient={selectedPatient} 
          onWorkflowComplete={handleWorkflowComplete}
        />
      </div>
    </div>
  );
}

export default DoctorPanel;