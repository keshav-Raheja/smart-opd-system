import { useState } from "react";

import api from "../services/api";

function PrescriptionForm({
  patientId,
  fetchVisits
}) {

  const [query, setQuery] =
    useState("");

  const [suggestions,
    setSuggestions] =
    useState([]);

  const [selectedMedicines,
    setSelectedMedicines] =
    useState([]);

  const [symptoms,
    setSymptoms] =
    useState("");

  const [diagnosis,
    setDiagnosis] =
    useState("");

  const [notes,
    setNotes] =
    useState("");

  const searchMedicines =
    async (value) => {

      setQuery(value);

      if (
        value.trim().length < 2
      ) {

        setSuggestions([]);

        return;
      }

      try {

        const response =
          await api.get(

            `/medicines/search?query=${value}`
          );

        console.log(
          response.data
        );

        setSuggestions(
          response.data
        );

      } catch (error) {

        console.log(error);
      }
    };

  const addMedicine =
    (medicine) => {

      const alreadyExists =
        selectedMedicines.find(
          (item) =>
            item.name ===
            medicine.name
        );

      if (alreadyExists) {

        setQuery("");

        setSuggestions([]);

        return;
      }

      setSelectedMedicines([
        ...selectedMedicines,
        {
          name: medicine.name,
          dosage: ""
        }
      ]);

      setQuery("");

      setSuggestions([]);
    };

  const updateDosage =
    (index, value) => {

      const updated =
        [...selectedMedicines];

      updated[index].dosage =
        value;

      setSelectedMedicines(
        updated
      );
    };

  const removeMedicine =
    (index) => {

      const updated =
        [...selectedMedicines];

      updated.splice(index, 1);

      setSelectedMedicines(
        updated
      );
    };

  const submitPrescription =
    async () => {

      try {

        await api.post(
          "/visits/",
          {
            patient_id:
              patientId,

            symptoms,

            diagnosis,

            medicines:
              selectedMedicines,

            notes,

            follow_up_date: ""
          }
        );

        alert(
          "Prescription Added"
        );

        setSymptoms("");

        setDiagnosis("");

        setNotes("");

        setSelectedMedicines([]);

        setQuery("");

        setSuggestions([]);

        fetchVisits();

      } catch (error) {

        console.log(error);

        alert(
          "Error saving prescription"
        );
      }
    };

  return (

    <div className="bg-white p-6 rounded-2xl shadow mb-6">

      <h2 className="text-3xl font-bold mb-6">
        Add Prescription
      </h2>

      <div className="flex flex-col gap-5">

        <input
          type="text"
          placeholder="Symptoms"
          value={symptoms}
          onChange={(e) =>
            setSymptoms(
              e.target.value
            )
          }
          className="border p-3 rounded-xl"
        />

        <input
          type="text"
          placeholder="Diagnosis"
          value={diagnosis}
          onChange={(e) =>
            setDiagnosis(
              e.target.value
            )
          }
          className="border p-3 rounded-xl"
        />

        <div className="relative">

          <input
            type="text"
            placeholder="Search Medicine"
            value={query}
            onChange={(e) =>
              searchMedicines(
                e.target.value
              )
            }
            className="border p-3 rounded-xl w-full"
          />

          {
            suggestions.length > 0 && (

              <div className="absolute top-full left-0 w-full bg-white border rounded-xl shadow-lg max-h-60 overflow-y-auto z-50 mt-2">

                {
                  suggestions.map(
                    (medicine) => (

                      <div
                        key={medicine.id}
                        onClick={() =>
                          addMedicine(
                            medicine
                          )
                        }
                        className="p-3 hover:bg-blue-50 cursor-pointer border-b"
                      >

                        <p className="font-semibold">
                          {medicine.name}
                        </p>

                        {
                          medicine.therapeutic_class && (

                            <p className="text-sm text-gray-500">

                              {
                                medicine.therapeutic_class
                              }

                            </p>
                          )
                        }

                      </div>
                    )
                  )
                }

              </div>
            )
          }

        </div>

        {
          selectedMedicines.length > 0 && (

            <div className="flex flex-col gap-4">

              {
                selectedMedicines.map(
                  (
                    medicine,
                    index
                  ) => (

                    <div
                      key={index}
                      className="border rounded-2xl p-4 bg-gray-50"
                    >

                      <div className="flex justify-between items-center mb-3">

                        <p className="font-semibold text-lg">
                          {
                            medicine.name
                          }
                        </p>

                        <button
                          onClick={() =>
                            removeMedicine(
                              index
                            )
                          }
                          className="text-red-500 font-medium"
                        >
                          Remove
                        </button>

                      </div>

                      <input
                        type="text"
                        placeholder="Dosage"
                        value={
                          medicine.dosage
                        }
                        onChange={(e) =>
                          updateDosage(
                            index,
                            e.target.value
                          )
                        }
                        className="border p-3 rounded-xl w-full"
                      />

                    </div>
                  )
                )
              }

            </div>
          )
        }

        <textarea
          placeholder="Notes"
          value={notes}
          onChange={(e) =>
            setNotes(
              e.target.value
            )
          }
          className="border p-3 rounded-xl"
          rows="4"
        />

        <button
          onClick={
            submitPrescription
          }
          className="bg-blue-900 hover:bg-blue-800 text-white p-3 rounded-xl font-semibold transition"
        >
          Save Prescription
        </button>

      </div>

    </div>
  );
}

export default PrescriptionForm;