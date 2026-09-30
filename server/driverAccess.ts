import { randomBytes, randomInt } from "crypto";
import { TRIP_CODE_ALPHABET, TRIP_CODE_LENGTH } from "@shared/driverRoster";

export function createAccessToken(): string {
  return randomBytes(32).toString("hex");
}

export function createTripCode(): string {
  let code = "";
  for (let i = 0; i < TRIP_CODE_LENGTH; i += 1) {
    code += TRIP_CODE_ALPHABET[randomInt(TRIP_CODE_ALPHABET.length)];
  }
  return code;
}
