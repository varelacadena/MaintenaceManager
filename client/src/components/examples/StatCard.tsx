import StatCard from '../StatCard';
import { ClipboardList } from 'lucide-react';

export default function StatCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      <StatCard icon={ClipboardList} label="Active Requests" value={23} trend="+12% from last week" trendUp={true} />
      <StatCard icon={ClipboardList} label="Completed" value={156} trend="+8% from last week" trendUp={true} />
    </div>
  );
}
