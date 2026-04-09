import { Check, MapPin, ClipboardList, CircleCheck } from "lucide-react";
import { STEPS, FUEL_OPTIONS, type Step } from "./useVehicleCheckIn";

const STEP_ICONS: Record<string, any> = {
  MapPin,
  ClipboardList,
  CircleCheck,
};

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

export function StepProgress({ currentStep }: { currentStep: Step }) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);
  return (
    <div className="flex items-center justify-between mb-6 px-2">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.id === currentStep;
        const Icon = STEP_ICONS[step.icon] || CircleCheck;
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                isCompleted ? "bg-primary border-primary text-primary-foreground"
                  : isCurrent ? "border-primary text-primary bg-primary/10"
                  : "border-muted-foreground/30 text-muted-foreground/40"
              }`}>
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-xs text-center leading-tight max-w-[60px] ${
                isCurrent ? "text-primary font-medium" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/50"
              }`}>
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-5 transition-all duration-300 ${
                index < currentIndex ? "bg-primary" : "bg-muted"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
