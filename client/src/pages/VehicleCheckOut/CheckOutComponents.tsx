import {
  ScrollText, ShieldCheck, Check, CircleAlert,
  Fuel, Sparkles,
  ClipboardCheck, Key, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  STEPS,
  FUEL_OPTIONS,
  getKeyPickupMethodLabel,
  type Step,
  type VehicleCheckOutContext,
} from "./useVehicleCheckOut";

export function FuelLevelSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {FUEL_OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        const isLow = opt.value === "empty" || opt.value === "1/4";
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            data-testid={`fuel-option-${opt.value}`}
            className={`flex flex-col items-center gap-2 p-3 rounded-md border-2 transition-all ${
              isSelected
                ? isLow
                  ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                  : "border-primary bg-primary/10"
                : "border-muted hover-elevate"
            }`}
          >
            <div className="flex flex-col gap-0.5 w-full">
              {[0, 1, 2, 3].map((barIdx) => {
                const isFilled = (4 - barIdx) <= opt.filled;
                return (
                  <div
                    key={barIdx}
                    className={`h-1.5 rounded-sm transition-colors ${
                      isFilled
                        ? isSelected
                          ? isLow ? "bg-red-500" : "bg-primary"
                          : "bg-muted-foreground/40"
                        : "bg-muted"
                    }`}
                  />
                );
              })}
            </div>
            <span className={`text-xs font-medium leading-tight text-center ${
              isSelected
                ? isLow ? "text-red-700 dark:text-red-400" : "text-primary"
                : "text-muted-foreground"
            }`}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SubStepDots({ total, currentIndex }: { total: number; currentIndex: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 pt-1 pb-3">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < currentIndex
              ? "w-4 bg-primary/40"
              : i === currentIndex
              ? "w-5 bg-primary"
              : "w-1.5 bg-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export function StepProgress({ currentStep, advisoryAlreadyAccepted }: { currentStep: Step; advisoryAlreadyAccepted: boolean }) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);
  const currentStepData = STEPS[currentIndex];
  return (
    <div className="mb-6">
      <div className="flex items-center px-2">
        {STEPS.map((step, index) => {
          const isCompleted = advisoryAlreadyAccepted && step.id === "advisory"
            ? true
            : index < currentIndex;
          const isCurrent = step.id === currentStep;
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0 ${
                isCompleted
                  ? "bg-primary border-primary text-primary-foreground"
                  : isCurrent
                  ? "border-primary text-primary bg-primary/10"
                  : "border-muted-foreground/30 text-muted-foreground/40"
              }`}>
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${
                  index < currentIndex || (advisoryAlreadyAccepted && index === 0) ? "bg-primary" : "bg-muted"
                }`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-2">
        <span className="text-xs text-muted-foreground">Step {currentIndex + 1} of {STEPS.length}</span>
        <span className="text-xs text-muted-foreground">—</span>
        <span className="text-xs font-medium text-foreground">{currentStepData?.label}</span>
      </div>
    </div>
  );
}

export function AdvisoryPreAcceptStep({ ctx }: { ctx: VehicleCheckOutContext }) {
  const { acceptAdvisoryMutation, setLocation } = ctx;
  return (
    <Card>
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <ScrollText className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <CardTitle className="text-xl">Vehicle Use Advisory</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Please read and acknowledge the following before taking out the vehicle.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-4 space-y-3">
          <p className="font-semibold text-amber-900 dark:text-amber-100 text-sm">By accepting, you agree to the following:</p>
          <ul className="space-y-2">
            {[
              "Vehicle usage is for official college business only",
              "You are responsible for the vehicle during the entire reservation period",
              "Report any damages or issues immediately to the admin team",
              "Follow all traffic laws and college vehicle policies at all times",
              "Return the vehicle on time and in the same condition as received",
              "Return with at least half a tank of fuel (1/2 or more)",
              "Return the vehicle clean — interior and exterior",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                <CircleAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={() => acceptAdvisoryMutation.mutate()}
            disabled={acceptAdvisoryMutation.isPending}
            className="w-full"
            data-testid="button-accept-advisory"
          >
            <Check className="h-4 w-4 mr-2" />
            {acceptAdvisoryMutation.isPending ? "Processing..." : "I Accept & Continue"}
          </Button>
          <Button variant="outline" onClick={() => setLocation("/my-reservations")} className="w-full">
            Cancel — Return to My Reservations
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdvisoryKeyRevealStep({ ctx }: { ctx: VehicleCheckOutContext }) {
  const {
    assignedCode, codeLoading, codeError, reservation,
    setAdvisoryJustAccepted, advanceStep,
  } = ctx;
  return (
    <Card>
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <CardTitle className="text-xl">Advisory Accepted!</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">Here's how to retrieve your keys before continuing.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {assignedCode && (
          <div className="rounded-md border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 p-4 space-y-3" data-testid="lockbox-code-section">
            <p className="flex items-center gap-2 font-semibold text-green-900 dark:text-green-100 text-sm">
              <Lock className="h-4 w-4" />
              Lockbox Access Code
            </p>
            <div className="flex items-center justify-center py-3">
              <span className="text-3xl font-mono font-bold tracking-widest text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900/50 px-6 py-3 rounded-md border border-green-300 dark:border-green-700" data-testid="text-lockbox-code">
                {assignedCode.code}
              </span>
            </div>
            <p className="text-xs text-green-700 dark:text-green-300 italic text-center">
              Use this code to open the lockbox and retrieve the vehicle keys.
            </p>
          </div>
        )}
        {codeLoading && (
          <div className="rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 p-4 flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="text-sm text-blue-800 dark:text-blue-200">Assigning lockbox code...</span>
          </div>
        )}
        {(reservation?.keyPickupMethod || reservation?.adminNotes) && (
          <div className="rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3">
            <p className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100 text-sm">
              <Key className="h-4 w-4" />
              Your Key Pickup Instructions
            </p>
            {reservation?.keyPickupMethod && (
              <div className="space-y-1">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Method</p>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {getKeyPickupMethodLabel(reservation.keyPickupMethod)}
                </p>
              </div>
            )}
            {reservation?.adminNotes && (
              <div className="space-y-1">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Additional Instructions</p>
                <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{reservation.adminNotes}</p>
              </div>
            )}
            <p className="text-xs text-blue-700 dark:text-blue-300 italic">
              Go retrieve your keys using the instructions above, then tap Continue.
            </p>
          </div>
        )}
        {codeError && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3">
            <p className="text-sm text-destructive font-medium" data-testid="text-code-error">
              Failed to assign a lockbox code. Please contact an administrator before proceeding.
            </p>
          </div>
        )}
        <Button
          onClick={() => { setAdvisoryJustAccepted(false); advanceStep("safety"); }}
          className="w-full"
          disabled={codeLoading || (!!reservation?.lockboxId && codeError)}
          data-testid="button-have-keys-continue"
        >
          <Key className="h-4 w-4 mr-2" />
          I Have the Keys — Continue
        </Button>
      </CardContent>
    </Card>
  );
}

export function SafetyStep({ ctx }: { ctx: VehicleCheckOutContext }) {
  const {
    safetyChecked, setSafetyChecked, advanceStep, goBackStep,
    advisoryAccepted, setLocation,
  } = ctx;
  return (
    <Card>
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <CardTitle className="text-xl">Safety Acknowledgment</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">Please confirm the following before proceeding.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="safety-check"
              checked={safetyChecked}
              onCheckedChange={(v) => setSafetyChecked(v === true)}
              data-testid="checkbox-safety"
            />
            <label htmlFor="safety-check" className="text-sm font-medium leading-relaxed cursor-pointer text-green-900 dark:text-green-100">
              I confirm I will not operate the vehicle until the formal checkout process is completed and logged in the system.
            </label>
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={() => advanceStep("responsibility")}
            disabled={!safetyChecked}
            className="w-full"
            data-testid="button-safety-continue"
          >
            Continue
          </Button>
          <Button
            variant="outline"
            onClick={() => advisoryAccepted ? setLocation("/my-reservations") : goBackStep("advisory")}
            className="w-full"
          >
            Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ResponsibilityStep({ ctx }: { ctx: VehicleCheckOutContext }) {
  const {
    fuelChecked, setFuelChecked, cleanlinessChecked, setCleanlinessChecked,
    setCheckoutSubStep, advanceStep, goBackStep,
  } = ctx;
  return (
    <Card>
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <ClipboardCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <CardTitle className="text-xl">Your Responsibilities</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">Confirm you understand your obligations.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="bg-muted/50 border rounded-md p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="fuel-responsibility"
                checked={fuelChecked}
                onCheckedChange={(v) => setFuelChecked(v === true)}
                data-testid="checkbox-fuel-responsibility"
              />
              <label htmlFor="fuel-responsibility" className="text-sm leading-relaxed cursor-pointer">
                <span className="font-semibold flex items-center gap-1 mb-1">
                  <Fuel className="h-4 w-4 text-primary" />
                  Fuel Agreement
                </span>
                I will return the vehicle with at least half a tank of fuel. If I return with less, it will be recorded on my account.
              </label>
            </div>
          </div>
          <div className="bg-muted/50 border rounded-md p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="cleanliness-responsibility"
                checked={cleanlinessChecked}
                onCheckedChange={(v) => setCleanlinessChecked(v === true)}
                data-testid="checkbox-cleanliness-responsibility"
              />
              <label htmlFor="cleanliness-responsibility" className="text-sm leading-relaxed cursor-pointer">
                <span className="font-semibold flex items-center gap-1 mb-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Cleanliness Agreement
                </span>
                I will return the vehicle clean and in the same condition as received. If returned unclean, it will be recorded on my account.
              </label>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">Violations are recorded and may affect your reservation privileges.</p>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={() => { setCheckoutSubStep("mileage"); advanceStep("checkout"); }}
            disabled={!fuelChecked || !cleanlinessChecked}
            className="w-full"
            data-testid="button-responsibility-continue"
          >
            I Understand — Continue to Checkout
          </Button>
          <Button variant="outline" onClick={() => goBackStep("safety")} className="w-full">Back</Button>
        </div>
      </CardContent>
    </Card>
  );
}

