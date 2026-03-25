import { useState } from "react";
import { 
  ClipboardList, 
  MapPin, 
  Calendar as CalendarIcon, 
  Users, 
  ListChecks, 
  Plus, 
  X, 
  Clock, 
  Building2, 
  Wrench, 
  Car, 
  FileText, 
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  properties,
  spaces,
  equipment,
  vehicles,
  technicians,
  students,
  vendors,
  projects,
  checklistTemplates
} from "./_shared/data";

interface Subtask {
  id: string;
  name: string;
  description: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface ChecklistGroup {
  id: string;
  name: string;
  items: ChecklistItem[];
}

export function TwoColumnForm() {
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  
  // Location state
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedSpace, setSelectedSpace] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");

  // Schedule state
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [timeHour, setTimeHour] = useState("");
  const [timeMinute, setTimeMinute] = useState("");
  const [timePeriod, setTimePeriod] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState("weekly");
  const [recurringEndDate, setRecurringEndDate] = useState<Date | undefined>(undefined);

  // Subtasks
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  
  // Checklists
  const [checklistGroups, setChecklistGroups] = useState<ChecklistGroup[]>([]);

  // Right column state
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskType, setTaskType] = useState("one_time");
  const [selectedProject, setSelectedProject] = useState("");
  
  const [assigneeType, setAssigneeType] = useState<"technician" | "student" | "vendor">("technician");
  const [assigneeId, setAssigneeId] = useState("");
  
  const [contactType, setContactType] = useState<"requester" | "staff" | "other">("requester");
  
  const [reqPhoto, setReqPhoto] = useState(false);
  const [reqEstimate, setReqEstimate] = useState(false);
  const [instructions, setInstructions] = useState("");

  // Helpers
  const addSubtask = () => {
    setSubtasks([...subtasks, { id: Math.random().toString(), name: "", description: "" }]);
  };

  const updateSubtask = (id: string, field: keyof Subtask, value: string) => {
    setSubtasks(subtasks.map(st => st.id === id ? { ...st, [field]: value } : st));
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const addChecklistGroup = () => {
    setChecklistGroups([...checklistGroups, { id: Math.random().toString(), name: "New Checklist", items: [] }]);
  };

  const addChecklistItem = (groupId: string) => {
    setChecklistGroups(checklistGroups.map(g => {
      if (g.id === groupId) {
        return { ...g, items: [...g.items, { id: Math.random().toString(), text: "", checked: false }] };
      }
      return g;
    }));
  };

  const updateChecklistItem = (groupId: string, itemId: string, text: string) => {
    setChecklistGroups(checklistGroups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          items: g.items.map(i => i.id === itemId ? { ...i, text } : i)
        };
      }
      return g;
    }));
  };

  const applyTemplate = (templateId: string) => {
    const template = checklistTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    setChecklistGroups([...checklistGroups, {
      id: Math.random().toString(),
      name: template.name,
      items: template.items.map(itemText => ({
        id: Math.random().toString(),
        text: itemText,
        checked: false
      }))
    }]);
  };

  const filteredSpaces = spaces.filter(s => s.propertyId === selectedProperty);

  return (
    <div className="min-h-screen bg-background p-6 font-sans">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span>Tasks</span>
              <span>/</span>
              <span>New</span>
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ClipboardList className="w-8 h-8 text-primary" />
              New Task
            </h1>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Cancel</Button>
            <Button>Create Task</Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* LEFT COLUMN: Main Form Area */}
          <div className="w-full lg:w-[65%] space-y-8 pb-12">
            
            {/* Section: Details */}
            <section className="border-b border-border/50 pb-8 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Details</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <Input 
                    placeholder="Task Name (e.g. Fix leaking pipe in Science Lab)" 
                    className="text-lg py-6 placeholder:text-muted-foreground/60"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground mb-1.5 block">Description</Label>
                  <Textarea 
                    placeholder="Provide detailed information about the issue..." 
                    className="min-h-[120px] resize-y"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Section: Location */}
            <section className="border-b border-border/50 pb-8 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Location & Equipment</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> Property
                  </Label>
                  <Select value={selectedProperty} onValueChange={(val) => { setSelectedProperty(val); setSelectedSpace(""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Space / Room</Label>
                  <Select value={selectedSpace} onValueChange={setSelectedSpace} disabled={!selectedProperty}>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedProperty ? "Select space" : "Select property first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSpaces.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.floor})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" /> Equipment
                  </Label>
                  <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipment.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5" /> Vehicle
                  </Label>
                  <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.year} {v.make} {v.model} ({v.vehicleId})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Section: Schedule */}
            <section className="border-b border-border/50 pb-8 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Schedule</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "MMM d, yyyy") : "Pick start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "MMM d, yyyy") : "Pick due date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Scheduled Time
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !timeHour && "text-muted-foreground"
                        )}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        {timeHour
                          ? `${parseInt(timeHour, 10)}:${timeMinute || "00"} ${timePeriod || "AM"}`
                          : "Pick time"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" align="start">
                      <div className="flex gap-2 items-center">
                        <Select value={timeHour} onValueChange={(val) => { setTimeHour(val); if (!timeMinute) setTimeMinute("00"); if (!timePeriod) setTimePeriod("AM"); }}>
                          <SelectTrigger className="w-20">
                            <SelectValue placeholder="HH" />
                          </SelectTrigger>
                          <SelectContent>
                            {["01","02","03","04","05","06","07","08","09","10","11","12"].map(h => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground font-medium">:</span>
                        <Select value={timeMinute} onValueChange={setTimeMinute}>
                          <SelectTrigger className="w-20">
                            <SelectValue placeholder="MM" />
                          </SelectTrigger>
                          <SelectContent>
                            {["00","05","10","15","20","25","30","35","40","45","50","55"].map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={timePeriod} onValueChange={setTimePeriod}>
                          <SelectTrigger className="w-20">
                            <SelectValue placeholder="AM/PM" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-dashed">
                <div className="flex items-center gap-2 mb-3 cursor-pointer w-fit" onClick={() => setIsRecurring(!isRecurring)}>
                  <Checkbox checked={isRecurring} onCheckedChange={(c) => setIsRecurring(!!c)} id="recurring" className="pointer-events-none" />
                  <Label className="font-medium cursor-pointer">Make this task recurring</Label>
                </div>
                
                {isRecurring && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/20 p-4 rounded-md">
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs">Frequency</Label>
                      <Select value={recurringFreq} onValueChange={setRecurringFreq}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs">Interval</Label>
                      <Input type="number" min="1" defaultValue="1" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs">End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-9",
                              !recurringEndDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                            {recurringEndDate ? format(recurringEndDate, "MMM d, yyyy") : "No end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={recurringEndDate}
                            onSelect={setRecurringEndDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Section: Sub-tasks */}
            <section className="border-b border-border/50 pb-8 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Sub-tasks</h2>
                </div>
                <Button variant="outline" size="sm" onClick={addSubtask} className="h-8 text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Sub-task
                </Button>
              </div>
              
              {subtasks.length === 0 ? (
                <div className="text-center py-6 bg-muted/10 rounded-md border border-dashed">
                  <p className="text-sm text-muted-foreground">No sub-tasks added. Break down complex tasks into smaller steps.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subtasks.map((st, index) => (
                    <div key={st.id} className="flex gap-3 items-start group">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0 mt-2">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <Input 
                          placeholder="Sub-task name" 
                          value={st.name} 
                          onChange={(e) => updateSubtask(st.id, 'name', e.target.value)} 
                          className="h-9"
                        />
                        <Input 
                          placeholder="Optional description" 
                          value={st.description} 
                          onChange={(e) => updateSubtask(st.id, 'description', e.target.value)}
                          className="h-8 text-sm bg-muted/10"
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 mt-1 text-muted-foreground hover:text-destructive" onClick={() => removeSubtask(st.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Section: Checklists */}
            <section className="pb-4 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Checklists</h2>
                </div>
                <div className="flex gap-2">
                  <Select onValueChange={applyTemplate}>
                    <SelectTrigger className="h-8 text-xs w-[160px]">
                      <SelectValue placeholder="Use Template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {checklistTemplates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={addChecklistGroup} className="h-8 text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Group
                  </Button>
                </div>
              </div>

              {checklistGroups.length === 0 ? (
                <div className="text-center py-6 bg-muted/10 rounded-md border border-dashed">
                  <p className="text-sm text-muted-foreground">Add checklists for required inspections or procedures.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {checklistGroups.map((group, gIdx) => (
                    <div key={group.id} className="bg-card border rounded-lg overflow-hidden">
                      <div className="bg-muted/30 px-4 py-2.5 flex items-center justify-between border-b">
                        <Input 
                          value={group.name} 
                          onChange={(e) => setChecklistGroups(checklistGroups.map(g => g.id === group.id ? { ...g, name: e.target.value } : g))}
                          className="h-7 text-sm font-medium border-transparent hover:border-input bg-transparent w-auto focus-visible:ring-0 px-1 -ml-1"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => setChecklistGroups(checklistGroups.filter(g => g.id !== group.id))}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="p-3 space-y-2">
                        {group.items.map(item => (
                          <div key={item.id} className="flex items-center gap-3">
                            <Checkbox disabled />
                            <Input 
                              value={item.text} 
                              onChange={(e) => updateChecklistItem(group.id, item.id, e.target.value)}
                              placeholder="Checklist item"
                              className="h-8 text-sm flex-1"
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-muted-foreground"
                              onClick={() => {
                                setChecklistGroups(checklistGroups.map(g => g.id === group.id ? {
                                  ...g,
                                  items: g.items.filter(i => i.id !== item.id)
                                } : g));
                              }}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => addChecklistItem(group.id)}>
                          <Plus className="w-3 h-3 mr-1" /> Add Item
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN: Sticky Sidebar */}
          <div className="w-full lg:w-[35%]">
            <div className="sticky top-6 space-y-6">
              <div className="bg-muted/30 border rounded-xl p-5 shadow-sm space-y-6">
                
                {/* Priority */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</Label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setPriority("low")}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors border ${
                        priority === "low" 
                          ? "bg-emerald-500 text-white border-emerald-600 shadow-sm" 
                          : "bg-background text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      }`}
                    >
                      Low
                    </button>
                    <button 
                      onClick={() => setPriority("medium")}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors border ${
                        priority === "medium" 
                          ? "bg-amber-500 text-white border-amber-600 shadow-sm" 
                          : "bg-background text-amber-600 border-amber-200 hover:bg-amber-50"
                      }`}
                    >
                      Medium
                    </button>
                    <button 
                      onClick={() => setPriority("high")}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors border ${
                        priority === "high" 
                          ? "bg-red-500 text-white border-red-600 shadow-sm" 
                          : "bg-background text-red-600 border-red-200 hover:bg-red-50"
                      }`}
                    >
                      High
                    </button>
                  </div>
                </div>

                {/* Task Type & Project */}
                <div className="space-y-4 pt-2 border-t border-border/50">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task Type</Label>
                    <Select value={taskType} onValueChange={setTaskType}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_time">One-Time Maintenance</SelectItem>
                        <SelectItem value="preventative">Preventative Maintenance</SelectItem>
                        <SelectItem value="reminder">Reminder / Check-in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Link to Project</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Assignment */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Assignment
                  </Label>
                  
                  <div className="flex bg-background border rounded-md p-0.5">
                    <button 
                      onClick={() => { setAssigneeType("technician"); setAssigneeId(""); }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-sm ${assigneeType === "technician" ? "bg-muted shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Tech
                    </button>
                    <button 
                      onClick={() => { setAssigneeType("student"); setAssigneeId(""); }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-sm ${assigneeType === "student" ? "bg-muted shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Student
                    </button>
                    <button 
                      onClick={() => { setAssigneeType("vendor"); setAssigneeId(""); }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-sm ${assigneeType === "vendor" ? "bg-muted shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Vendor
                    </button>
                  </div>

                  <Select value={assigneeId} onValueChange={setAssigneeId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={`Select ${assigneeType}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {assigneeType === "technician" && technicians.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                      {assigneeType === "student" && students.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                      {assigneeType === "vendor" && vendors.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name} ({v.contactPerson})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Student Helpers UI */}
                  {assigneeType === "technician" && (
                    <div className="pt-2">
                      <Label className="text-xs text-muted-foreground mb-2 block">Student Helpers (Optional)</Label>
                      <Select>
                        <SelectTrigger className="bg-background h-8 text-xs">
                          <SelectValue placeholder="Add student helper..." />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Contact */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</Label>
                  
                  <Select value={contactType} onValueChange={(val: "requester" | "staff" | "other") => setContactType(val)}>
                    <SelectTrigger className="bg-background h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="requester">Original Requester</SelectItem>
                      <SelectItem value="staff">Staff Member</SelectItem>
                      <SelectItem value="other">Other / External</SelectItem>
                    </SelectContent>
                  </Select>

                  {contactType === "other" && (
                    <div className="space-y-2">
                      <Input placeholder="Contact Name" className="bg-background h-9" />
                      <Input placeholder="Phone Number" className="bg-background h-9" />
                    </div>
                  )}
                </div>

                {/* Options */}
                <div className="space-y-3 pt-4 border-t border-border/50">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Options</Label>
                  
                  <div className="space-y-2.5">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="req-photo" checked={reqPhoto} onCheckedChange={(c) => setReqPhoto(!!c)} />
                      <label htmlFor="req-photo" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        Require completion photo
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="req-estimate" checked={reqEstimate} onCheckedChange={(c) => setReqEstimate(!!c)} />
                      <label htmlFor="req-estimate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        Require cost estimate before work
                      </label>
                    </div>
                  </div>
                </div>

                {/* Special Instructions */}
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Internal Notes</Label>
                  <Textarea 
                    placeholder="Notes visible only to staff..." 
                    className="h-20 resize-none bg-background text-sm"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
