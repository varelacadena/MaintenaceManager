import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportOptions {
  title: string;
  chartContainerId?: string;
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
  };
  filters?: Record<string, string>;
}

export async function exportToPdfWithCharts(options: ExportOptions): Promise<void> {
  const { title, chartContainerId, tableData, filters } = options;
  
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
  yPosition += 8;

  if (filters && Object.keys(filters).length > 0) {
    const filterText = Object.entries(filters)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join("  |  ");
    
    if (filterText) {
      doc.text(`Filters: ${filterText}`, margin, yPosition);
      yPosition += 8;
    }
  }

  doc.setTextColor(0, 0, 0);
  yPosition += 5;

  if (chartContainerId) {
    const chartContainer = document.getElementById(chartContainerId);
    if (chartContainer) {
      try {
        const charts = chartContainer.querySelectorAll('[class*="recharts-wrapper"]');
        
        if (charts.length > 0) {
          const chartsPerRow = 2;
          const chartWidth = (pageWidth - margin * 2 - 10) / chartsPerRow;
          const chartHeight = 60;
          let chartX = margin;
          let chartY = yPosition;
          let chartCount = 0;

          for (const chart of Array.from(charts)) {
            const canvas = await html2canvas(chart as HTMLElement, {
              scale: 2,
              backgroundColor: "#ffffff",
              logging: false,
              useCORS: true,
            });

            const imgData = canvas.toDataURL("image/png");
            
            if (chartCount > 0 && chartCount % chartsPerRow === 0) {
              chartX = margin;
              chartY += chartHeight + 5;
              
              if (chartY + chartHeight > pageHeight - margin) {
                doc.addPage();
                chartY = margin;
              }
            }

            doc.addImage(imgData, "PNG", chartX, chartY, chartWidth - 5, chartHeight);
            chartX += chartWidth;
            chartCount++;
          }

          yPosition = chartY + chartHeight + 10;
        }
      } catch (error) {
        console.error("Error capturing charts:", error);
      }
    }
  }

  if (tableData && tableData.headers.length > 0) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }

    autoTable(doc, {
      head: [tableData.headers],
      body: tableData.rows.map(row => row.map(cell => String(cell))),
      startY: yPosition,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
    });
  }

  doc.save(`${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.pdf`);
}

export async function captureChartAsImage(containerId: string): Promise<string | null> {
  const container = document.getElementById(containerId);
  if (!container) return null;

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true,
    });
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Error capturing chart:", error);
    return null;
  }
}
