import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, AlertCircle } from "lucide-react";
import type { EmergencyContact } from "@shared/schema";

export default function EmergencyContactBanner() {
  const { data: contact, isLoading } = useQuery<EmergencyContact | null>({
    queryKey: ["/api/emergency-contacts/active"],
  });

  if (isLoading || !contact) {
    return null;
  }

  return (
    <Card className="border-amber-500/50 bg-amber-500/5" data-testid="card-emergency-contact">
      <CardContent className="py-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium shrink-0">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">After-Hours Contact:</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
            <span className="font-semibold" data-testid="text-emergency-name">
              {contact.name}
              {contact.role && <span className="text-muted-foreground font-normal ml-1">({contact.role})</span>}
            </span>
            <div className="flex items-center gap-4">
              <a 
                href={`tel:${contact.phone}`} 
                className="flex items-center gap-1 text-primary hover:underline"
                data-testid="link-emergency-phone"
              >
                <Phone className="w-3.5 h-3.5" />
                {contact.phone}
              </a>
              {contact.email && (
                <a 
                  href={`mailto:${contact.email}`} 
                  className="flex items-center gap-1 text-primary hover:underline"
                  data-testid="link-emergency-email"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {contact.email}
                </a>
              )}
            </div>
          </div>
        </div>
        {contact.notes && (
          <p className="text-xs text-muted-foreground mt-2 pl-6" data-testid="text-emergency-notes">
            {contact.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
