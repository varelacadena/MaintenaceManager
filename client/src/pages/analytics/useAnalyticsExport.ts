import { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { downloadAnalyticsExport } from "@/lib/analyticsExportDownload";

export function useAnalyticsExport(dataType: string, getQueryString: () => string) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(
    async (format: string) => {
      if (format !== "pdf" && format !== "xlsx") return;
      setIsExporting(true);
      try {
        await downloadAnalyticsExport(dataType, format, getQueryString());
      } catch (error) {
        const message = error instanceof Error ? error.message : "Export failed";
        toast({
          title: "Could not download report",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsExporting(false);
      }
    },
    [dataType, getQueryString, toast],
  );

  return { handleExport, isExporting };
}
