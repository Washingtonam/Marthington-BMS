import { useEffect, useState } from "react";
import { getHospital, getPatients } from "../api/hospitals.js";

const HospitalDashboard = () => {
  const [hospital, setHospital] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [hospitalData, patientsData] = await Promise.all([
          getHospital(),
          getPatients()
        ]);

        setHospital(hospitalData);
        setPatients(Array.isArray(patientsData) ? patientsData : []);
      } catch (err) {
        setError(err.message || "Unable to load hospital data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const admittedPatients = patients.filter((p) => p.admissionStatus === "admitted").length;
  const availableDoctors = hospital?.availableDoctors ?? 42;
  const openBeds = Math.max((hospital?.totalBeds ?? 36) - admittedPatients, 0);

  if (loading) {
    return (
      <div className="page-shell p-6 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading hospital overview…</p>
      </div>
    );
  }

  return (
    <div className="page-shell p-6 bg-slate-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Hospital Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">
          View patient intake, doctor availability, and appointment flow.
        </p>
        {error && (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase text-slate-400 tracking-[0.2em]">Admitted Patients</p>
          <p className="mt-4 text-4xl font-bold text-slate-900">{admittedPatients}</p>
          <p className="mt-2 text-sm text-slate-500">Currently in care across all wards.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-500 p-6 text-white shadow-lg">
          <p className="text-sm uppercase tracking-[0.2em] opacity-80">Available Doctors</p>
          <p className="mt-4 text-4xl font-semibold">{availableDoctors}</p>
          <p className="mt-2 text-sm opacity-90">Ready for consultations today.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase text-slate-400 tracking-[0.2em]">Open Beds</p>
          <p className="mt-4 text-4xl font-bold text-slate-900">{openBeds}</p>
          <p className="mt-2 text-sm text-slate-500">Beds available for new admissions.</p>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Upcoming Appointments</h2>
            <p className="text-sm text-slate-500">A quick view of the next appointments in the clinic.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600">
            {hospital?.upcomingAppointments || 12} scheduled
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Department</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">09:00 AM</td>
                <td className="px-4 py-4">Amina Okonkwo</td>
                <td className="px-4 py-4">Dr. Musa</td>
                <td className="px-4 py-4">Cardiology</td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">10:30 AM</td>
                <td className="px-4 py-4">Tunde Adebayo</td>
                <td className="px-4 py-4">Dr. Arike</td>
                <td className="px-4 py-4">Pediatrics</td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">11:45 AM</td>
                <td className="px-4 py-4">Hassan Bello</td>
                <td className="px-4 py-4">Dr. Emeka</td>
                <td className="px-4 py-4">Orthopedics</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-4">02:00 PM</td>
                <td className="px-4 py-4">Patience Nnaji</td>
                <td className="px-4 py-4">Dr. Oladipo</td>
                <td className="px-4 py-4">Neurology</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default HospitalDashboard;
