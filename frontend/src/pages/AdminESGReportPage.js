import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { admin } from "../utils/api";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
const AdminESGReportPage = () => {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await admin.getDepartments();
      setDepartments(res.data.map(d => d.department));
    } catch {
      toast.error("Failed to load departments");
    }
  };

  const handleGenerate = async () => {
  if (!department || !startDate || !endDate) {
    toast.error("Please select all fields");
    return;
  }

  setLoading(true);
  try {
    const res = await admin.getCustomESGReport(department, startDate, endDate);

    console.log("ESG REPORT RESPONSE:", res.data);

    const users = res.data?.users || [];
    setReport(users);

    if (users.length === 0) {
      toast.error("No data found for selected range");
      return;
    }

    toast.success("ESG report generated");
  } catch (err) {
    toast.error("Failed to generate report");
  } finally {
    setLoading(false);
  }
};

  const totalTokens = report.reduce((sum, r) => sum + r.tokens_used, 0);
  const totalCo2 = report.reduce((sum, r) => sum + r.co2_emitted, 0);
  const totalSaved = report.reduce((sum, r) => sum + r.co2_saved, 0);
  const totalPrompts = report.reduce((sum, r) => sum + r.prompt_count, 0);
  const downloadPDF = () => {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("ESG Report", 14, 15);

  doc.setFontSize(10);
  doc.text(`Department: ${department}`, 14, 25);
  doc.text(`From: ${startDate}  To: ${endDate}`, 14, 32);

  doc.text(`Total Tokens: ${totalTokens}`, 14, 42);
  doc.text(`Total CO2 Emitted: ${totalCo2.toFixed(2)} g`, 14, 48);
  doc.text(`Total CO2 Saved: ${totalSaved.toFixed(2)} g`, 14, 54);
  doc.text(`Total Prompts: ${totalPrompts}`, 14, 60);

  autoTable(doc, {
    startY: 70,
    head: [["User", "Tokens", "CO2 Emitted (g)", "CO2 Saved (g)", "Prompts"]],
    body: report.map(r => [
      r.user_email,
      r.tokens_used,
      r.co2_emitted,
      r.co2_saved,
      r.prompt_count
    ])
  });

  doc.save(`ESG_Report_${department}.pdf`);
};



  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background" />

      <header className="relative z-10 p-6 flex items-center border-b border-white/10">
        <button onClick={() => navigate("/admin/dashboard")} className="mr-4">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <FileText className="w-6 h-6 text-primary mr-2" />
        <h1 className="text-2xl font-heading font-bold gradient-text">
          Generate ESG Report
        </h1>
      </header>

      <main className="relative z-10 p-6 max-w-6xl mx-auto space-y-6">

        {/* Controls */}
        <div className="glass p-6 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={department}
            onChange={e => setDepartment(e.target.value)}
            className="bg-black text-white border border-white/10 rounded-lg px-4 py-2"
          >
           <option value="" className="bg-black text-white">Select Department</option>
              {departments.map(d => (
                <option key={d} value={d} className="bg-black text-white">
                  {d}
                </option>
              ))}

          </select>

          <div className="flex flex-col">
            <label className="text-sm mb-1 text-muted-foreground">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-black text-white border border-white/10 rounded-lg px-4 py-2"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm mb-1 text-muted-foreground">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-black text-white border border-white/10 rounded-lg px-4 py-2"
            />
          </div>


          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-primary text-primary-foreground font-semibold rounded-lg"
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>

        {/* Table */}
                    {report.length > 0 && (
            <>
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass p-4 rounded-xl">
                    <p className="text-sm">Total Tokens</p>
                    <p className="text-2xl font-bold text-primary">{totalTokens}</p>
                </div>
                <div className="glass p-4 rounded-xl">
                    <p className="text-sm">CO2 Emitted</p>
                    <p className="text-2xl font-bold">{totalCo2.toFixed(2)} g</p>
                </div>
                <div className="glass p-4 rounded-xl">
                    <p className="text-sm">CO2 Saved</p>
                    <p className="text-2xl font-bold text-primary">{totalSaved.toFixed(2)} g</p>
                </div>
                <div className="glass p-4 rounded-xl">
                    <p className="text-sm">Prompts</p>
                    <p className="text-2xl font-bold">{totalPrompts}</p>
                </div>
                </div>

                {/* Table + Download */}
                <div className="glass p-6 rounded-2xl">
                <div className="flex justify-between mb-4">
                    <h2 className="text-lg font-semibold">User-wise Report</h2>
                    <button
                    onClick={downloadPDF}
                    className="flex items-center space-x-2 bg-secondary/20 border border-secondary/30 px-4 py-2 rounded-lg"
                    >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                    </button>
                </div>

                <table className="w-full">
                    <thead>
                    <tr className="border-b border-white/10">
                        <th>User</th>
                        <th className="text-right">Tokens</th>
                        <th className="text-right">CO2</th>
                        <th className="text-right">Saved</th>
                        <th className="text-right">Prompts</th>
                    </tr>
                    </thead>
                    <tbody>
                    {report.map((r, i) => (
                        <tr key={i} className="border-b border-white/5">
                        <td>{r.user_email}</td>
                        <td className="text-right">{r.tokens_used}</td>
                        <td className="text-right">{r.co2_emitted}g</td>
                        <td className="text-right text-primary">{r.co2_saved}g</td>
                        <td className="text-right">{r.prompt_count}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </>
            )}
      </main>
    </div>
  );
};
export default AdminESGReportPage;
