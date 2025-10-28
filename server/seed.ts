import { storage } from "./storage";

const defaultAreas = [
  { name: "Grounds & Landscaping", description: "Outdoor maintenance and landscaping services" },
  { name: "Staff Housing", description: "Residential maintenance for staff housing facilities" },
  { name: "Water Treatment", description: "Water systems and treatment plant maintenance" },
  { name: "Renovations", description: "Building renovation and construction projects" },
  { name: "Building Cleaning", description: "Cleaning and janitorial services" },
  { name: "Auto Shop", description: "Vehicle maintenance and fleet management" },
  { name: "Kitchen Appliances", description: "Cafeteria and kitchen equipment maintenance" },
  { name: "Other", description: "Miscellaneous maintenance requests" },
];

export async function seedDatabase() {
  try {
    const existingAreas = await storage.getAreas();
    
    if (existingAreas.length === 0) {
      console.log("Seeding default areas...");
      for (const area of defaultAreas) {
        await storage.createArea(area);
      }
      console.log("Default areas created successfully");
    } else {
      console.log("Areas already exist, skipping seed");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
