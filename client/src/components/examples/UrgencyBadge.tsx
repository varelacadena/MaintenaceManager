import UrgencyBadge from '../UrgencyBadge';

export default function UrgencyBadgeExample() {
  return (
    <div className="flex gap-2 p-6">
      <UrgencyBadge level="low" />
      <UrgencyBadge level="medium" />
      <UrgencyBadge level="high" />
    </div>
  );
}
