import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  fetchHistoricalTelemetry, 
  fetchAnalyticsSummary, 
  fetchEnergyInsights,
  fetchApplianceRanking, 
  exportToCSV 
} from '../services/api';

export default function ReportDownloads({ tariff }) {
  const [reportRange, setReportRange] = useState('today');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingCsv, setIsGeneratingCsv] = useState(false);

  // Generate and download full Executive Energy Audit & PDF Bill
  async function handleDownloadPDF() {
    setIsGeneratingPdf(true);
    try {
      const [summary, insights, ranking] = await Promise.all([
        fetchAnalyticsSummary(tariff).catch(() => null),
        fetchEnergyInsights(tariff, 0.82).catch(() => null),
        fetchApplianceRanking(tariff, 0.82).catch(() => null)
      ]);

      const doc = new jsPDF();

      // Header Banner
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 38, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('SMART SWITCHBOARD ENERGY AUDIT & INVOICE', 14, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text('IoT-Enabled Real-Time Energy Monitoring & Smart Optimization System', 14, 25);
      doc.text('Device ID: esp32_switchboard_01 | Location: Node #1 | Baseline Grid EF: 0.82 kg CO2/kWh', 14, 31);

      // Metadata Section
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('AUDIT SUMMARY & BILLING DETAILS', 14, 46);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Billing Period Filter: ${reportRange.toUpperCase()}`, 14, 53);
      doc.text(`Generated On: ${new Date().toLocaleString()}`, 14, 59);
      doc.text(`Configured Tariff: INR ${tariff.toFixed(2)} / kWh`, 14, 65);
      doc.text(`Top Consumer (#1): ${ranking?.highest_consuming_appliance || 'Air Conditioner'} (${ranking?.highest_consuming_share_pct || 0}% share)`, 14, 71);

      // Summary Cost Box
      const totalUnits = summary?.total_energy_kwh || 0;
      const totalCost = totalUnits * tariff;
      const monthlyProjCost = insights?.summary?.total_monthly_projected_cost || (totalCost * 30);
      const monthlyCo2 = insights?.summary?.total_monthly_projected_co2_kg || (totalUnits * 0.82 * 30);
      const savedMonthlyCost = insights?.summary?.potential_monthly_savings_cost || 0;

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(125, 42, 72, 33, 3, 3, 'F');
      
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('PROJECTED MONTHLY BILL', 130, 49);
      
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`INR ${monthlyProjCost.toFixed(2)}`, 130, 56);

      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Potential Monthly Savings: INR ${savedMonthlyCost.toFixed(2)}`, 130, 64);
      doc.text(`Monthly Carbon: ${monthlyCo2.toFixed(2)} kg CO2`, 130, 70);

      // Section 1: Appliance Ranking & Consumption Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('1. APPLIANCE ENERGY RANKING & LOAD BREAKDOWN', 14, 82);

      const tableData = (ranking?.appliances || []).map(item => [
        `#${item.rank}`,
        `Ch ${item.channel_id}`,
        item.appliance,
        item.category || 'General',
        `${item.current_power_w} W`,
        `${item.daily_kwh?.toFixed(3) || 0} kWh`,
        `${item.monthly_kwh?.toFixed(2) || 0} kWh`,
        `${item.contribution_percent}%`,
        `INR ${item.monthly_cost?.toFixed(2) || 0}`,
        item.status
      ]);

      autoTable(doc, {
        startY: 86,
        head: [['Rank', 'Ch', 'Appliance', 'Category', 'Power', 'Daily kWh', 'Monthly kWh', 'Share %', 'Monthly Cost', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        styles: { fontSize: 7.5, cellPadding: 3 },
        columnStyles: {
          8: { halign: 'right', fontStyle: 'bold' }
        }
      });

      let nextY = doc.lastAutoTable.finalY + 10;

      // Section 2: Top Recommendations
      if (insights?.recommendations && insights.recommendations.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('2. TOP ENERGY OPTIMIZATION RECOMMENDATIONS', 14, nextY);

        const recData = insights.recommendations.slice(0, 4).map(r => [
          r.severity,
          `Score: ${r.priority_score}`,
          r.appliance,
          r.title,
          r.action_item,
          `INR ${r.estimated_saving_cost.toFixed(2)}/mo`
        ]);

        autoTable(doc, {
          startY: nextY + 4,
          head: [['Severity', 'Priority', 'Appliance', 'Insight', 'Actionable Recommendation', 'Monthly Savings']],
          body: recData,
          theme: 'striped',
          headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
          styles: { fontSize: 7, cellPadding: 3 },
          columnStyles: {
            5: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] }
          }
        });

        nextY = doc.lastAutoTable.finalY + 10;
      }

      // Disclaimer
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text(
        'Note: This document is an automated energy intelligence audit and electricity invoice generated by the Smart Switchboard system.',
        14,
        nextY
      );
      doc.text(
        'Calculations: Energy = Power (W) x Time / 1000 | Cost = Energy x Tariff | CO2 = Energy x 0.82 kg/kWh CEA baseline.',
        14,
        nextY + 4
      );

      // Save PDF
      doc.save(`smart_switchboard_audit_${reportRange}_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Error generating PDF report. Please ensure data is loaded.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  // Generate and download full CSV dataset
  async function handleDownloadCSV() {
    setIsGeneratingCsv(true);
    try {
      const records = await fetchHistoricalTelemetry(reportRange, 'all');
      exportToCSV(records, `smart_switchboard_telemetry_${reportRange}_${Date.now()}.csv`);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Error exporting CSV dataset.');
    } finally {
      setIsGeneratingCsv(false);
    }
  }

  return (
    <div className="page-container">
      {/* Standardized Page Header Card */}
      <div className="page-header-card">
        <div className="page-header-title-group">
          <h2 className="page-header-title">
            <FileSpreadsheet size={22} color="#818cf8" />
            Smart Energy Audit &amp; Telemetry Reports
          </h2>
          <p className="page-header-subtitle">
            Generate formatted PDF energy audit invoices with appliance rankings &amp; recommendations, or export raw timestamped CSV telemetry logs
          </p>
        </div>

        {/* Range Selector */}
        <div className="page-header-actions">
          <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: 3, border: '1px solid var(--border-subtle)' }}>
            {['today', 'yesterday', '7d', '30d', 'all'].map(r => (
              <button
                key={r}
                onClick={() => setReportRange(r)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-xs)',
                  border: 'none',
                  background: reportRange === r ? 'var(--accent-indigo)' : 'transparent',
                  color: reportRange === r ? '#fff' : 'var(--text-secondary)',
                  fontWeight: reportRange === r ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s'
                }}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="grid-responsive-2">
        {/* PDF Invoice Export Card */}
        <div className="glass-card highlight-emerald" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12
            }}>
              <FileText size={22} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>
              Executive Energy Audit &amp; Bill (PDF)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Executive audit report with appliance ranking leaderboard, highest energy consumer, projected monthly cost, carbon footprint, tree offset equivalent, and actionable savings recommendations.
            </p>
          </div>

          <button
            className="btn-primary"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            style={{ width: '100%', padding: '10px 16px' }}
          >
            <Download size={16} />
            <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Executive Audit Report'}</span>
          </button>
        </div>

        {/* CSV Data Export Card */}
        <div className="glass-card highlight-cyan" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12
            }}>
              <FileSpreadsheet size={22} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>
              Timestamped Telemetry Dataset (CSV)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Raw granular time-series dataset including Voltage (V), Current (A), Active Power (W), Cumulative Energy (kWh), Frequency (Hz), and Power Factor (PF).
            </p>
          </div>

          <button
            className="btn-secondary"
            onClick={handleDownloadCSV}
            disabled={isGeneratingCsv}
            style={{ width: '100%', padding: '10px 16px' }}
          >
            <Download size={16} />
            <span>{isGeneratingCsv ? 'Exporting CSV...' : 'Download CSV Dataset'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
