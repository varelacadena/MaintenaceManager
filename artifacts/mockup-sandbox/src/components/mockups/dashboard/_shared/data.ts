export const kpis = {
  openTasks: 124,
  highPriority: 18,
  overdue: 11,
  dueToday: 15,
  completedToday: 8,
  unassigned: 6,
};

export const weeklyTrend = [
  { day: "Mon", tasks: 22 },
  { day: "Tue", tasks: 18 },
  { day: "Wed", tasks: 25 },
  { day: "Thu", tasks: 20 },
  { day: "Fri", tasks: 15 },
  { day: "Sat", tasks: 8 },
  { day: "Sun", tasks: 5 },
];

export const technicians = [
  { name: "Mike Rodriguez", initials: "MR", completed: 4, total: 6, inProgress: 1, currentTask: "HVAC Filter Replacement — Building C", color: "bg-blue-500", strokeColor: "stroke-blue-500" },
  { name: "Sarah Chen", initials: "SC", completed: 3, total: 5, inProgress: 2, currentTask: "Electrical Panel Inspection — Dorm A", color: "bg-emerald-500", strokeColor: "stroke-emerald-500" },
  { name: "James Wilson", initials: "JW", completed: 5, total: 5, inProgress: 0, currentTask: null, color: "bg-violet-500", strokeColor: "stroke-violet-500" },
  { name: "Alex Thompson", initials: "AT", completed: 1, total: 4, inProgress: 1, currentTask: "Plumbing Repair — Admin Office", color: "bg-amber-500", strokeColor: "stroke-amber-500" },
  { name: "Maria Garcia", initials: "MG", completed: 2, total: 3, inProgress: 1, currentTask: "Fire Extinguisher Check — Library", color: "bg-rose-500", strokeColor: "stroke-rose-500" },
];

export const projects = [
  { name: "HVAC System Upgrade", status: "in_progress", progress: 72, budget: 45000, priority: "high" },
  { name: "Parking Lot Resurfacing", status: "in_progress", progress: 35, budget: 28000, priority: "medium" },
  { name: "Fire Alarm Modernization", status: "planning", progress: 10, budget: 62000, priority: "critical" },
];

export const aiRecommendations = {
  pending: 5,
  approved: 12,
  autoApplied: 8,
  acceptanceRate: 78,
  suggestions: [
    { text: "Suggest PM for 3 Trucks: Save 8 hours", type: "scheduling" },
    { text: "Technician B rerouting: Reduce Travel by 15%", type: "optimization" },
    { text: "Reschedule PM on Lift 2 due to parts delay", type: "scheduling" },
  ],
};

export const recentRequests = [
  { id: 1, title: "Broken window in Dorm B, Room 204", status: "pending", date: "Today", priority: "high" },
  { id: 2, title: "Water leak in Admin Building bathroom", status: "under_review", date: "Today", priority: "medium" },
  { id: 3, title: "Parking lot light out — Section C", status: "converted_to_task", date: "Yesterday", priority: "low" },
  { id: 4, title: "AC not working in Library 2nd floor", status: "pending", date: "Yesterday", priority: "high" },
];

export const vehicleReservations = {
  totalActive: 4,
  checkinsToday: 3,
  checkoutsToday: 5,
  upcoming: [
    { vehicle: "Ford F-150 #12", user: "Mike R.", time: "2:00 PM", type: "checkout" },
    { vehicle: "Chevy Express #5", user: "Sarah C.", time: "3:30 PM", type: "checkin" },
    { vehicle: "Toyota Tacoma #8", user: "Alex T.", time: "4:00 PM", type: "checkout" },
  ],
};

export const taskBoard = {
  todo: [
    { id: 1, title: "Replace ceiling tiles — Lecture Hall B", priority: "medium", assignee: "Mike R." },
    { id: 2, title: "Fix door lock — Science Lab 101", priority: "high", assignee: "Alex T." },
    { id: 9, title: "Repaint stairwell — Dorm C", priority: "low", assignee: "Maria G." },
    { id: 10, title: "Replace broken window — Cafeteria", priority: "high", assignee: "James W." },
    { id: 11, title: "Fix leaking faucet — Faculty Lounge", priority: "medium", assignee: "Mike R." },
    { id: 12, title: "Install handrail — North Entrance", priority: "critical", assignee: "Alex T." },
    { id: 13, title: "Patch drywall — Room 204", priority: "low", assignee: "Sarah C." },
  ],
  inProgress: [
    { id: 3, title: "HVAC Filter Replacement — Building C", priority: "medium", assignee: "Mike R." },
    { id: 4, title: "Electrical Panel Inspection — Dorm A", priority: "high", assignee: "Sarah C." },
    { id: 5, title: "Fire Extinguisher Check — Library", priority: "low", assignee: "Maria G." },
    { id: 14, title: "Rewire outlets — Computer Lab", priority: "high", assignee: "Alex T." },
    { id: 15, title: "Replace carpet — Admin Office", priority: "medium", assignee: "James W." },
    { id: 16, title: "Fix AC unit — Lecture Hall A", priority: "critical", assignee: "Mike R." },
  ],
  completed: [
    { id: 6, title: "Plumbing fix — Admin restroom", priority: "medium", assignee: "James W." },
    { id: 7, title: "Light replacement — Gym", priority: "low", assignee: "James W." },
    { id: 17, title: "Door hinge repair — Library", priority: "low", assignee: "Maria G." },
    { id: 18, title: "Smoke detector test — Dorm B", priority: "high", assignee: "Sarah C." },
    { id: 19, title: "Gutter cleaning — Main Building", priority: "medium", assignee: "Mike R." },
  ],
  blocked: [
    { id: 8, title: "Elevator repair — Main Hall", priority: "critical", assignee: "Unassigned", reason: "Waiting for parts" },
    { id: 20, title: "Boiler replacement — Heating Plant", priority: "critical", assignee: "Alex T.", reason: "Budget approval pending" },
    { id: 21, title: "Roof patch — Science Wing", priority: "high", assignee: "James W.", reason: "Weather delay" },
  ],
};
