import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

function readSession<T>(key: string, isValid?: (value: unknown) => value is T): T | undefined {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw == null) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (isValid && !isValid(parsed)) return undefined;
    return parsed as T;
  } catch {
    return undefined;
  }
}

function writeSession(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / private mode
  }
}

/** State that survives leaving a page and coming back in the same browser tab. */
export function useSessionState<T>(
  key: string,
  initial: T,
  isValid?: (value: unknown) => value is T,
): [T, Dispatch<SetStateAction<T>>] {
  const [slot, setSlot] = useState(() => ({
    key,
    value: readSession<T>(key, isValid) ?? initial,
  }));

  if (slot.key !== key) {
    setSlot({ key, value: readSession<T>(key, isValid) ?? initial });
  }

  const setValue = useCallback((action: SetStateAction<T>) => {
    setSlot((current) => {
      const previous = current.key === key ? current.value : (readSession<T>(key, isValid) ?? initial);
      const value = typeof action === "function" ? (action as (prev: T) => T)(previous) : action;
      writeSession(key, value);
      return { key, value };
    });
  }, [key, initial, isValid]);

  const value = slot.key === key ? slot.value : (readSession<T>(key, isValid) ?? initial);
  return [value, setValue];
}
