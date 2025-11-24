import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToExcel(data: any[], filename: string) {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  
  // Auto-size columns
  const maxWidth = data.reduce((w, r) => Math.max(w, ...Object.keys(r).map(k => k.length)), 10);
  worksheet['!cols'] = Object.keys(data[0] || {}).map(() => ({ wch: maxWidth }));
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToPDF(
  data: any[],
  columns: { header: string; dataKey: string }[],
  filename: string,
  title: string
) {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString('th-TH')}`, 14, 28);

  // Add table
  autoTable(doc, {
    startY: 35,
    head: [columns.map((col) => col.header)],
    body: data.map((item) =>
      columns.map((col) => item[col.dataKey]?.toString() || "")
    ),
    styles: { 
      font: "helvetica",
      fontSize: 9,
    },
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249],
    },
  });

  doc.save(`${filename}.pdf`);
}

export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Helper function for analytics page
export function formatDataForExport<T>(
  data: T[] | undefined,
  columnMapping: Record<keyof T, string>
): any[] {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }

  return data.map((item) => {
    const formatted: Record<string, any> = {};
    Object.entries(columnMapping).forEach(([key, header]) => {
      const value = item[key as keyof T];
      formatted[header] = value !== undefined && value !== null ? value : "";
    });
    return formatted;
  });
}
