import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

function DashboardCharts({ stats }) {

  const data = [
    {
      name: "Patients",
      value: stats.total_patients
    },
    {
      name: "Visits",
      value: stats.total_visits
    },
    {
      name: "Reports",
      value: stats.total_reports
    },
    {
      name: "Revenue",
      value: stats.total_revenue
    }
  ];

  return (

    <div className="bg-white p-6 rounded shadow mt-8">

      <h2 className="text-2xl font-bold mb-6">
        Analytics Overview
      </h2>

      <ResponsiveContainer
        width="100%"
        height={400}
      >

        <BarChart data={data}>

          <XAxis dataKey="name" />

          <YAxis />

          <Tooltip />

          <Bar dataKey="value" />

        </BarChart>

      </ResponsiveContainer>

    </div>

  );
}

export default DashboardCharts;