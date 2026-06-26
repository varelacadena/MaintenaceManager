import type { ChangeEventHandler, Ref } from "react";

interface PanelFileInputProps {
  fileInputRef: Ref<HTMLInputElement>;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

export function PanelFileInput({ fileInputRef, onChange }: PanelFileInputProps) {
  return (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,video/*"
      className="hidden"
      onChange={onChange}
      data-testid="input-file-upload"
    />
  );
}
