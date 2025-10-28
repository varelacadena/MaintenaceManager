import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UrgencyBadge from "./UrgencyBadge";
import { Badge } from "@/components/ui/badge";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";

interface TableRow {
  id: string;
  title: string;
  category: string;
  status: string;
  urgency: "low" | "medium" | "high";
  assignedTo?: {
    name: string;
    initials: string;
    avatar?: string;
  };
  date: string;
}

interface DataTableProps {
  data: TableRow[];
  onViewRow?: (id: string) => void;
}

const statusConfig: Record<string, { className: string }> = {
  pending: { className: "bg-muted text-muted-foreground" },
  in_progress: { className: "bg-primary/10 text-primary border-primary/20" },
  on_hold: { className: "bg-urgency-medium/10 text-urgency-medium border-urgency-medium/20" },
  completed: { className: "bg-status-online/10 text-status-online border-status-online/20" },
};

export default function DataTable({ data, onViewRow }: DataTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const toggleRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleAll = () => {
    if (selectedRows.size === currentData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(currentData.map(row => row.id)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedRows.size === currentData.length && currentData.length > 0}
                  onCheckedChange={toggleAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((row) => (
              <TableRow key={row.id} data-testid={`row-task-${row.id}`}>
                <TableCell>
                  <Checkbox
                    checked={selectedRows.has(row.id)}
                    onCheckedChange={() => toggleRow(row.id)}
                    data-testid={`checkbox-row-${row.id}`}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">#{row.id}</TableCell>
                <TableCell className="font-medium">{row.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">{row.category}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusConfig[row.status]?.className}>
                    {row.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <UrgencyBadge level={row.urgency} />
                </TableCell>
                <TableCell>
                  {row.assignedTo && (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={row.assignedTo.avatar} />
                        <AvatarFallback className="text-xs">{row.assignedTo.initials}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{row.assignedTo.name}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.date}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onViewRow?.(row.id)}
                    data-testid={`button-view-row-${row.id}`}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} entries
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="w-8"
                data-testid={`button-page-${page}`}
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            data-testid="button-next-page"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
