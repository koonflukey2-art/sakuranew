import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Export to Excel
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

// Export to PDF
export function exportToPDF(
  data: any[],
  columns: { header: string; dataKey: string }[],
  filename: string,
  title?: string
) {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const doc = new jsPDF();

  // Add title if provided
  if (title) {
    doc.setFontSize(18);
    doc.text(title, 14, 20);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('th-TH')}`, 14, 28);
  }

  // Add table
  autoTable(doc, {
    head: [columns.map((col) => col.header)],
    body: data.map((row) =>
      columns.map((col) => {
        const value = row[col.dataKey];
        if (value === null || value === undefined) return "-";
        if (typeof value === "number") return value.toLocaleString("th-TH");
        if (value instanceof Date) return value.toLocaleDateString("th-TH");
        return String(value);
      })
    ),
    startY: title ? 35 : 10,
    styles: {
      font: "helvetica",
      fontSize: 9,
    },
    headStyles: {
      fillColor: [51, 65, 85], // slate-700
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249], // slate-100
    },
  });

  doc.save(`${filename}.pdf`);
}

// Export to CSV
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Helper: Format data for export
export function formatDataForExport<T extends Record<string, any>>(
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
      if (value === null || value === undefined) {
        formatted[header] = "-";
      } else if (typeof value === "number") {
        formatted[header] = value;
      } else if (value instanceof Date) {
        formatted[header] = value.toLocaleDateString("th-TH");
      } else {
        formatted[header] = String(value);
      }
    });
    return formatted;
  });
}
