"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, File } from "lucide-react";
import { exportToExcel, exportToPDF, exportToCSV } from "@/lib/export";

interface ExportButtonProps {
  data: any[];
  filename: string;
  columns?: { header: string; dataKey: string }[];
  title?: string;
}

export function ExportButton({
  data,
  filename,
  columns,
  title,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: "excel" | "pdf" | "csv") => {
    setIsExporting(true);
    try {
      switch (type) {
        case "excel":
          exportToExcel(data, filename);
          break;
        case "pdf":
          if (!columns) {
            throw new Error("Columns required for PDF export");
          }
          exportToPDF(data, columns, filename, title);
          break;
        case "csv":
          exportToCSV(data, filename);
          break;
      }
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting || data.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? "กำลังส่งออก..." : "ส่งออกข้อมูล"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
        <DropdownMenuItem
          onClick={() => handleExport("excel")}
          className="cursor-pointer hover:bg-slate-700"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("pdf")}
          className="cursor-pointer hover:bg-slate-700"
          disabled={!columns}
        >
          <FileText className="w-4 h-4 mr-2" />
          PDF (.pdf)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("csv")}
          className="cursor-pointer hover:bg-slate-700"
        >
          <File className="w-4 h-4 mr-2" />
          CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
