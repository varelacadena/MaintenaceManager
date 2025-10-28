import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UrgencyBadge from "./UrgencyBadge";
import { X, Play, StopCircle, Clock, Upload, Plus } from "lucide-react";

interface TaskDetailPanelProps {
  task: {
    id: string;
    title: string;
    category: string;
    urgency: "low" | "medium" | "high";
    status: string;
    description: string;
    assignedTo?: string;
    dueDate: string;
  };
  onClose?: () => void;
}

export default function TaskDetailPanel({ task, onClose }: TaskDetailPanelProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState("0:00:00");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState(task.status);
  const [holdReason, setHoldReason] = useState("");
  const [partName, setPartName] = useState("");
  const [partQuantity, setPartQuantity] = useState("");
  const [parts, setParts] = useState<Array<{ name: string; quantity: string }>>([]);

  const handleStartStop = () => {
    setIsTracking(!isTracking);
    console.log(isTracking ? 'Stopped tracking' : 'Started tracking');
  };

  const handleAddPart = () => {
    if (partName && partQuantity) {
      setParts([...parts, { name: partName, quantity: partQuantity }]);
      setPartName("");
      setPartQuantity("");
      console.log('Part added:', { name: partName, quantity: partQuantity });
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-background border-l shadow-lg overflow-y-auto z-50">
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold" data-testid="text-task-detail-title">{task.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">#{task.id}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-panel">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Urgency:</span>
            <UrgencyBadge level={task.urgency} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Category:</span>
            <Badge variant="outline">{task.category}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Due Date:</span>
            <span className="text-sm text-muted-foreground">{task.dueDate}</span>
          </div>
        </div>

        <Card className="p-4">
          <h3 className="font-medium mb-2">Description</h3>
          <p className="text-sm text-muted-foreground">{task.description}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Time Tracking</h3>
            <div className="flex items-center gap-2 text-sm font-mono">
              <Clock className="w-4 h-4" />
              <span data-testid="text-time-elapsed">{timeElapsed}</span>
            </div>
          </div>
          <Button
            onClick={handleStartStop}
            className="w-full"
            variant={isTracking ? "destructive" : "default"}
            data-testid="button-time-tracking"
          >
            {isTracking ? (
              <>
                <StopCircle className="w-4 h-4 mr-2" />
                Stop Work
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Work
              </>
            )}
          </Button>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-3">Status Update</h3>
          <div className="space-y-3">
            <div>
              <Label>Current Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {status === "on_hold" && (
              <div>
                <Label>Reason for Hold</Label>
                <Textarea
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder="Explain why this task is on hold..."
                  className="resize-none"
                  data-testid="input-hold-reason"
                />
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-3">Parts Used</h3>
          <div className="space-y-3">
            {parts.map((part, idx) => (
              <div key={idx} className="flex justify-between text-sm p-2 bg-muted rounded-md">
                <span>{part.name}</span>
                <span className="text-muted-foreground">Qty: {part.quantity}</span>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="Part name"
                data-testid="input-part-name"
              />
              <Input
                value={partQuantity}
                onChange={(e) => setPartQuantity(e.target.value)}
                placeholder="Quantity"
                type="number"
                data-testid="input-part-quantity"
              />
            </div>
            <Button onClick={handleAddPart} variant="outline" className="w-full" data-testid="button-add-part">
              <Plus className="w-4 h-4 mr-2" />
              Add Part
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-3">Notes & Photos</h3>
          <div className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about the work performed..."
              className="resize-none min-h-24"
              data-testid="input-notes"
            />
            <Button variant="outline" className="w-full" data-testid="button-upload-photo">
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
            </Button>
          </div>
        </Card>

        <Button className="w-full" data-testid="button-save-changes">Save Changes</Button>
      </div>
    </div>
  );
}
