import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
} from "lucide-react";
import type { RequestDetailHookReturn } from "./useRequestDetail";
import { getUserDisplayName } from "@/utils/taskUtils";

type RequestDetailSidebarProps = Pick<
  RequestDetailHookReturn,
  | "request"
  | "requester"
  | "property"
  | "space"
>;

export function RequestDetailSidebar({
  request,
  requester,
  property,
  space,
}: RequestDetailSidebarProps) {
  if (!request) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Request Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm font-medium" data-testid="text-created-at">
                {new Date(request.createdAt!).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {property && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Property</p>
                <p className="text-sm font-medium" data-testid="text-property">
                  {property.name}
                  {space && (
                    <span className="text-muted-foreground" data-testid="text-space">
                      {" "}/ {space.name}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {requester && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Requester</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" data-testid="text-requester-name">
                  {getUserDisplayName(requester)}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {requester.role}
                </p>
              </div>
            </div>

            {(requester.email || requester.phoneNumber) && (
              <>
                <Separator />
                <div className="space-y-2">
                  {requester.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate text-muted-foreground" data-testid="text-requester-email">
                        {requester.email}
                      </span>
                    </div>
                  )}
                  {requester.phoneNumber && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground" data-testid="text-requester-phone">
                        {requester.phoneNumber}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
