import type { Request, Response } from "express";
import type { User } from "@shared/schema";
import { isStudentSessionExpired, localDateString } from "@shared/studentPortal";
import * as studentStorage from "./storage/students";

export function stampStudentSessionDate(req: Request) {
  (req.session as any).studentSessionDate = localDateString();
}

export async function enforceStudentDailySession(
  req: Request,
  res: Response,
  user: User,
): Promise<boolean> {
  if (user.role !== "student") return true;

  const today = localDateString();
  const sessionDate = (req.session as any).studentSessionDate as string | undefined;

  if (!sessionDate) {
    stampStudentSessionDate(req);
    return true;
  }

  if (!isStudentSessionExpired(sessionDate, today)) {
    return true;
  }

  await studentStorage.closeOvernightOpenStudentShift(user.id);
  await new Promise<void>((resolve) => {
    req.session.destroy(() => resolve());
  });
  res.status(401).json({ message: "Sign in again to start today's shift" });
  return false;
}
