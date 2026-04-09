import {
  Wind,
  Zap,
  Droplets,
  Wrench,
  BookOpen,
  Sparkles,
  Building2,
  Info,
  Video,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
} from "lucide-react";

export const urgencyColors = {
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  high: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
};

export const statusColors: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
  needs_estimate: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
  waiting_approval: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  ready: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
};

export const quoteStatusColors: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
  approved: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
  rejected: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
};

export const EQUIPMENT_CATEGORY_ICONS: Record<string, any> = {
  hvac: Wind,
  electrical: Zap,
  plumbing: Droplets,
  mechanical: Wrench,
  appliances: Wrench,
  grounds: BookOpen,
  janitorial: Sparkles,
  structural: Building2,
  water_treatment: Droplets,
  general: Info,
};

export const EQUIPMENT_CATEGORY_LABELS: Record<string, string> = {
  hvac: "HVAC", electrical: "Electrical", plumbing: "Plumbing",
  mechanical: "Mechanical", appliances: "Appliances", grounds: "Grounds",
  janitorial: "Janitorial", structural: "Structural", water_treatment: "Water Treatment", general: "General",
};

export const RESOURCE_TYPE_ICONS: Record<string, any> = {
  video: Video,
  document: FileText,
  image: ImageIcon,
  link: LinkIcon,
};

export const CONDITION_COLORS: Record<string, string> = {
  good: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  fair: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  poor: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  "needs replacement": "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};
