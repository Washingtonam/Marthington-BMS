const SchoolDashboard = () => {
  return (
    <div className="page-shell p-6 bg-slate-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">School Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">
          A premium overview for schools, letting you monitor students, tuition, and schedules.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase text-slate-400 tracking-[0.2em]">Total Students enrolled</p>
          <p className="mt-4 text-4xl font-bold text-slate-900">1,248</p>
          <p className="mt-2 text-sm text-slate-500">Enrolled across all active programs.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-indigo-600 to-sky-500 p-6 text-white shadow-lg">
          <p className="text-sm uppercase tracking-[0.2em] opacity-80">Pending Tuition fees</p>
          <p className="mt-4 text-4xl font-semibold">$24,600</p>
          <p className="mt-2 text-sm opacity-90">Payments awaiting collection this month.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase text-slate-400 tracking-[0.2em]">Attendance</p>
          <p className="mt-4 text-4xl font-bold text-slate-900">92%</p>
          <p className="mt-2 text-sm text-slate-500">Today's average student attendance rate.</p>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Today's Class Schedule</h2>
            <p className="text-sm text-slate-500">A clean placeholder for the schedule of classes.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600">
            8 classes
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Room</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">08:00 AM</td>
                <td className="px-4 py-4">Mathematics</td>
                <td className="px-4 py-4">Mrs. Adisa</td>
                <td className="px-4 py-4">Room 12</td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">09:30 AM</td>
                <td className="px-4 py-4">Physics</td>
                <td className="px-4 py-4">Mr. Chukwu</td>
                <td className="px-4 py-4">Lab 2</td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">11:00 AM</td>
                <td className="px-4 py-4">English Literature</td>
                <td className="px-4 py-4">Ms. Osei</td>
                <td className="px-4 py-4">Room 4</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-4">01:00 PM</td>
                <td className="px-4 py-4">Computer Science</td>
                <td className="px-4 py-4">Mrs. Peters</td>
                <td className="px-4 py-4">Lab 1</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default SchoolDashboard;
