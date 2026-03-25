import React, { useState } from "react";
import { 
  ClipboardList, 
  MapPin, 
  Calendar as CalendarIcon, 
  Users, 
  ListChecks, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Plus, 
  X, 
  Clock, 
  Building2, 
  Wrench, 
  Car, 
  AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

const STEPS = [
  { id: 1, title: "Task Details", icon: ClipboardList },
  { id: 2, title: "Location & Schedule", icon: MapPin },
  { id: 3, title: "Assignment", icon: Users },
  { id: 4, title: "Extras", icon: ListChecks },
];

export function StepperWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form State
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [taskType, setTaskType] = useState("one-time");
  const [projectId, setProjectId] = useState("none");
  
  const [propertyId, setPropertyId] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [equipmentId, setEquipmentId] = useState("none");
  const [vehicleId, setVehicleId] = useState("none");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("weekly");
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");
  const [recurrenceEnd, setRecurrenceEnd] = useState("");

  const [assigneeType, setAssigneeType] = useState("technician");
  const [assigneeId, setAssigneeId] = useState("");
  const [studentHelpers, setStudentHelpers] = useState<string[]>([]);
  const [contactType, setContactType] = useState("requester");
  
  const [subtasks, setSubtasks] = useState<{id: string, name: string}[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [selectedChecklists, setSelectedChecklists] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [requiresEstimate, setRequiresEstimate] = useState(false);

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, { id: Math.random().toString(), name: newSubtask.trim() }]);
      setNewSubtask("");
    }
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const toggleStudentHelper = (id: string) => {
    setStudentHelpers(prev => 
      prev.includes(id) ? prev.filter(studentId => studentId !== id) : [...prev, id]
    );
  };

  const toggleChecklist = (id: string) => {
    setSelectedChecklists(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const filteredSpaces = spaces.filter(s => s.propertyId === propertyId);
  const showSpaces = propertyId && filteredSpaces.length > 0;
  const filteredEquipment = propertyId ? equipment.filter(e => e.propertyId === propertyId) : equipment;

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10 rounded-full"></div>
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
        ></div>
        
        {STEPS.map((step) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="flex flex-col items-center gap-2">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border-2 ${
                  isCompleted 
                    ? "bg-primary border-primary text-primary-foreground" 
                    : isCurrent 
                      ? "bg-background border-primary text-primary" 
                      : "bg-background border-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={`text-sm font-medium ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Create New Task</h1>
          <p className="text-muted-foreground mt-1">Fill out the details below to generate a new maintenance task.</p>
        </div>

        {renderStepIndicator()}

        <Card className="shadow-sm border-muted/60">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex items-center gap-3">
              {STEPS.find(s => s.id === currentStep)?.icon && React.createElement(STEPS.find(s => s.id === currentStep)!.icon, { className: "w-6 h-6 text-primary" })}
              <div>
                <CardTitle className="text-xl">{STEPS.find(s => s.id === currentStep)?.title}</CardTitle>
                <CardDescription>Step {currentStep} of {STEPS.length}</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 md:p-8">
            {/* STEP 1: Task Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="task-name" className="text-sm font-semibold">Task Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="task-name" 
                    placeholder="e.g. Fix leaking faucet in men's restroom" 
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Provide detailed information about the issue..." 
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Priority</Label>
                    <RadioGroup value={priority} onValueChange={setPriority} className="flex gap-4">
                      <div className="flex items-center space-x-2 border rounded-md p-3 flex-1 bg-card hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="low" id="prio-low" />
                        <Label htmlFor="prio-low" className="flex items-center gap-2 cursor-pointer w-full">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                          Low
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-md p-3 flex-1 bg-card hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="medium" id="prio-medium" />
                        <Label htmlFor="prio-medium" className="flex items-center gap-2 cursor-pointer w-full">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                          Medium
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-md p-3 flex-1 bg-card hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="high" id="prio-high" />
                        <Label htmlFor="prio-high" className="flex items-center gap-2 cursor-pointer w-full">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                          High
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Task Type</Label>
                    <Select value={taskType} onValueChange={setTaskType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one-time">One-Time Task</SelectItem>
                        <SelectItem value="recurring">Recurring Maintenance</SelectItem>
                        <SelectItem value="reminder">Reminder / Check</SelectItem>
                        <SelectItem value="project">Project Work</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="project-link" className="text-sm font-semibold">Link to Project (Optional)</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger id="project-link">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- No Project --</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* STEP 2: Location & Schedule */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="bg-muted/30 p-4 rounded-lg border border-muted space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    Location Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="property">Property / Building</Label>
                      <Select value={propertyId} onValueChange={(val) => { setPropertyId(val); setSpaceId(""); }}>
                        <SelectTrigger id="property">
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {showSpaces && (
                      <div className="space-y-2">
                        <Label htmlFor="space">Specific Space (Optional)</Label>
                        <Select value={spaceId} onValueChange={setSpaceId}>
                          <SelectTrigger id="space">
                            <SelectValue placeholder="Select space" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- General Building --</SelectItem>
                            {filteredSpaces.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name} ({s.floor})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="equipment">Related Equipment</Label>
                      <Select value={equipmentId} onValueChange={setEquipmentId}>
                        <SelectTrigger id="equipment">
                          <SelectValue placeholder="Select equipment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- No Equipment --</SelectItem>
                          {filteredEquipment.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vehicle">Related Vehicle</Label>
                      <Select value={vehicleId} onValueChange={setVehicleId}>
                        <SelectTrigger id="vehicle">
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- No Vehicle --</SelectItem>
                          {vehicles.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.year} {v.make} {v.model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg border border-muted space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    Scheduling
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input 
                        type="date" 
                        id="start-date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due-date">Due Date</Label>
                      <Input 
                        type="date" 
                        id="due-date" 
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduled-time">Scheduled Time (Opt)</Label>
                      <Input 
                        type="time" 
                        id="scheduled-time" 
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                  </div>

                  {taskType === "recurring" && (
                    <div className="pt-4 border-t mt-4 space-y-4">
                      <h4 className="text-sm font-medium text-foreground">Recurrence Rules</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Select value={recurrenceFrequency} onValueChange={setRecurrenceFrequency}>
                            <SelectTrigger>
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
                        <div className="space-y-2">
                          <Label>Interval (Every X {recurrenceFrequency.replace("ly", "s")})</Label>
                          <Input 
                            type="number" 
                            min="1" 
                            value={recurrenceInterval} 
                            onChange={(e) => setRecurrenceInterval(e.target.value)} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Date</Label>
                          <Input 
                            type="date" 
                            value={recurrenceEnd} 
                            onChange={(e) => setRecurrenceEnd(e.target.value)} 
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Assignment */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Primary Assignee</h3>
                  
                  <div className="space-y-4">
                    <Label className="text-sm">Assign To Type</Label>
                    <RadioGroup 
                      value={assigneeType} 
                      onValueChange={(val) => { setAssigneeType(val); setAssigneeId(""); }} 
                      className="grid grid-cols-3 gap-4"
                    >
                      <div>
                        <RadioGroupItem value="technician" id="assign-tech" className="peer sr-only" />
                        <Label 
                          htmlFor="assign-tech" 
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <Wrench className="mb-2 h-6 w-6" />
                          Staff Technician
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="student" id="assign-student" className="peer sr-only" />
                        <Label 
                          htmlFor="assign-student" 
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <Users className="mb-2 h-6 w-6" />
                          Student Worker
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="vendor" id="assign-vendor" className="peer sr-only" />
                        <Label 
                          htmlFor="assign-vendor" 
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <Building2 className="mb-2 h-6 w-6" />
                          External Vendor
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label htmlFor="assignee">Select {assigneeType === 'technician' ? 'Technician' : assigneeType === 'student' ? 'Student' : 'Vendor'}</Label>
                    <Select value={assigneeId} onValueChange={setAssigneeId}>
                      <SelectTrigger id="assignee" className="h-12">
                        <SelectValue placeholder="Choose person..." />
                      </SelectTrigger>
                      <SelectContent>
                        {assigneeType === 'technician' && technicians.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name} ({t.role})</SelectItem>
                        ))}
                        {assigneeType === 'student' && students.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                        {assigneeType === 'vendor' && vendors.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name} - {v.contactPerson}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Additional Helpers</h3>
                  <p className="text-sm text-muted-foreground">Add student workers to assist with this task.</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {students.map(student => {
                      const isSelected = studentHelpers.includes(student.id);
                      return (
                        <Badge 
                          key={student.id} 
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer px-3 py-1.5 text-sm font-normal ${isSelected ? "bg-primary" : "hover:bg-muted"}`}
                          onClick={() => toggleStudentHelper(student.id)}
                        >
                          {isSelected && <Check className="w-3 h-3 mr-1.5" />}
                          {student.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t bg-muted/20 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-muted-foreground" />
                    Contact Information
                  </h3>
                  
                  <RadioGroup value={contactType} onValueChange={setContactType} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="requester" id="contact-requester" />
                      <Label htmlFor="contact-requester">Contact original requester</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="staff" id="contact-staff" />
                      <Label htmlFor="contact-staff">Contact specific staff member</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="none" id="contact-none" />
                      <Label htmlFor="contact-none">No contact required</Label>
                    </div>
                  </RadioGroup>

                  {contactType === 'staff' && (
                    <div className="mt-3 ml-6">
                      <Input placeholder="Enter staff name or email" className="max-w-md" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: Extras */}
            {currentStep === 4 && (
              <div className="space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Subtasks & Instructions */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Sub-tasks</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="e.g. Turn off water main" 
                          value={newSubtask}
                          onChange={(e) => setNewSubtask(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                        />
                        <Button type="button" onClick={addSubtask} variant="secondary">
                          <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                      </div>
                      
                      {subtasks.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {subtasks.map((st, index) => (
                            <div key={st.id} className="flex items-center justify-between bg-muted/40 p-2 px-3 rounded-md border">
                              <span className="text-sm">
                                <span className="text-muted-foreground mr-2">{index + 1}.</span> 
                                {st.name}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => removeSubtask(st.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instructions" className="text-base font-semibold">Special Instructions</Label>
                      <Textarea 
                        id="instructions" 
                        placeholder="Any safety notes, codes, or specific tools needed..." 
                        rows={5}
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Right Column: Checklists & Toggles */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Apply Checklist Templates</Label>
                      <div className="space-y-2">
                        {checklistTemplates.map(template => {
                          const isSelected = selectedChecklists.includes(template.id);
                          return (
                            <div 
                              key={template.id} 
                              className={`flex items-start space-x-3 p-3 rounded-md border cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                              onClick={() => toggleChecklist(template.id)}
                            >
                              <Checkbox 
                                id={`chk-${template.id}`} 
                                checked={isSelected}
                                onCheckedChange={() => toggleChecklist(template.id)}
                                className="mt-0.5"
                              />
                              <div className="grid gap-1.5 leading-none">
                                <label 
                                  htmlFor={`chk-${template.id}`}
                                  className="text-sm font-medium leading-none cursor-pointer"
                                >
                                  {template.name}
                                </label>
                                <p className="text-xs text-muted-foreground">
                                  {template.items.length} items
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                      <Label className="text-base font-semibold">Requirements</Label>
                      
                      <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
                        <div className="space-y-0.5">
                          <Label className="text-base">Require Photos</Label>
                          <p className="text-sm text-muted-foreground">
                            Assignee must upload photos before closing task
                          </p>
                        </div>
                        <Switch 
                          checked={requiresPhoto}
                          onCheckedChange={setRequiresPhoto}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
                        <div className="space-y-0.5">
                          <Label className="text-base">Require Estimate</Label>
                          <p className="text-sm text-muted-foreground">
                            Task needs cost/time estimate approval first
                          </p>
                        </div>
                        <Switch 
                          checked={requiresEstimate}
                          onCheckedChange={setRequiresEstimate}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="border-t bg-muted/10 p-6 flex justify-between">
            <Button 
              variant="outline" 
              onClick={prevStep} 
              disabled={currentStep === 1}
              className="w-24"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            {currentStep < STEPS.length ? (
              <Button onClick={nextStep} className="w-24">
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={() => alert("Task created!")} className="w-32 bg-primary text-primary-foreground hover:bg-primary/90">
                <Check className="w-4 h-4 mr-2" />
                Submit Task
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
