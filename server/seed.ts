import { storage } from "./storage";
import bcrypt from "bcryptjs";

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
    // Seed areas
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

    // Check if any users exist
    const users = await storage.getAllUsers();
    if (users.length === 0) {
      console.log("\n⚠️  No users found in database");
      console.log("🔐 First login attempt will create the initial admin account");
      console.log("💡 Simply log in with your desired username and password\n");
    } else {
      console.log(`\n✅ System has ${users.length} user(s) registered\n`);
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}