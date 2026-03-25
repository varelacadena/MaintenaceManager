export const properties = [
  { id: "p1", name: "Hamilton Hall", type: "building" },
  { id: "p2", name: "Science Center", type: "building" },
  { id: "p3", name: "Student Union", type: "building" },
  { id: "p4", name: "Athletics Complex", type: "facility" },
  { id: "p5", name: "Library", type: "building" },
  { id: "p6", name: "Dining Hall", type: "building" },
];

export const spaces = [
  { id: "s1", name: "Room 101", floor: "1st Floor", propertyId: "p1" },
  { id: "s2", name: "Room 202", floor: "2nd Floor", propertyId: "p1" },
  { id: "s3", name: "Room 305", floor: "3rd Floor", propertyId: "p1" },
  { id: "s4", name: "Lab A", floor: "1st Floor", propertyId: "p2" },
  { id: "s5", name: "Conference Room B", floor: "2nd Floor", propertyId: "p3" },
];

export const equipment = [
  { id: "e1", name: "HVAC Unit #12", category: "hvac", propertyId: "p1" },
  { id: "e2", name: "Elevator A", category: "elevator", propertyId: "p1" },
  { id: "e3", name: "Boiler System", category: "plumbing", propertyId: "p2" },
  { id: "e4", name: "Fire Alarm Panel", category: "fire_safety", propertyId: "p3" },
];

export const vehicles = [
  { id: "v1", make: "Ford", model: "F-150", year: "2022", vehicleId: "VH-001" },
  { id: "v2", make: "Chevy", model: "Express", year: "2021", vehicleId: "VH-002" },
  { id: "v3", make: "John Deere", model: "Gator", year: "2023", vehicleId: "VH-003" },
];

export const technicians = [
  { id: "t1", name: "Mike Rodriguez", role: "technician" },
  { id: "t2", name: "Sarah Chen", role: "technician" },
  { id: "t3", name: "James Wilson", role: "technician" },
  { id: "t4", name: "Lisa Park", role: "admin" },
];

export const students = [
  { id: "st1", name: "Alex Johnson", role: "student" },
  { id: "st2", name: "Emma Davis", role: "student" },
  { id: "st3", name: "Tyler Brown", role: "student" },
];

export const vendors = [
  { id: "vn1", name: "ProElectric Services", contactPerson: "John Smith" },
  { id: "vn2", name: "Campus Plumbing Co.", contactPerson: "Maria Garcia" },
  { id: "vn3", name: "HVAC Masters LLC", contactPerson: "David Lee" },
];

export const projects = [
  { id: "pr1", name: "Summer Renovation 2026", status: "in_progress" },
  { id: "pr2", name: "Fire Safety Upgrade", status: "planning" },
  { id: "pr3", name: "Energy Efficiency Initiative", status: "in_progress" },
];

export const checklistTemplates = [
  { id: "ct1", name: "HVAC Inspection", items: ["Check filters", "Test thermostat", "Inspect ductwork", "Check refrigerant levels"] },
  { id: "ct2", name: "Plumbing Repair", items: ["Shut off water supply", "Inspect pipes", "Replace parts", "Test for leaks", "Restore water"] },
  { id: "ct3", name: "Electrical Safety", items: ["Test circuit breakers", "Inspect wiring", "Check ground fault", "Verify panel labels"] },
];
