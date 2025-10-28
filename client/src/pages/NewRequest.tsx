import ServiceRequestForm from "@/components/ServiceRequestForm";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function NewRequest() {
  const { toast } = useToast();

  const handleSubmit = (data: any) => {
    console.log("New request submitted:", data);
    toast({
      title: "Request Submitted",
      description: "Your maintenance request has been submitted successfully.",
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Service Request</h1>
        <p className="text-sm text-muted-foreground mt-1">Submit a new maintenance request</p>
      </div>

      <Card className="p-6">
        <ServiceRequestForm onSubmit={handleSubmit} />
      </Card>
    </div>
  );
}
