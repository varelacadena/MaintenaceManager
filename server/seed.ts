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

const defaultUsers = [
  {
    username: "admin",
    password: "AdminSecure2025!",
    email: "admin@college.edu",
    firstName: "Admin",
    lastName: "User",
    role: "admin",
  },
  {
    username: "maintenance",
    password: "maint123",
    email: "maintenance@college.edu",
    firstName: "Maintenance",
    lastName: "Staff",
    role: "maintenance",
  },
  {
    username: "staff",
    password: "staff123",
    email: "staff@college.edu",
    firstName: "College",
    lastName: "Staff",
    role: "staff",
  },
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

    // Seed default users
    console.log("Checking for default users...");
    for (const userData of defaultUsers) {
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (!existingUser) {
        console.log(`Creating user: ${userData.username}`);
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        await storage.createUser({
          ...userData,
          password: hashedPassword,
        });
        console.log(`User ${userData.username} created with password: ${userData.password}`);
      } else {
        console.log(`User ${userData.username} already exists, skipping`);
      }
    }
    console.log("\nDefault credentials:");
    console.log("Admin - username: admin, password: AdminSecure2025!");
    console.log("Maintenance - username: maintenance, password: maint123");
    console.log("Staff - username: staff, password: staff123");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
