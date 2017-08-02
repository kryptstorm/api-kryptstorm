/** External modules */
import Config from "config";

/** Public fields */
export const PUBLICK_FIELDS = ["id", "role", "permissions"];

/** Highest role, can do anything anywhere anytime */
export const ADMINISTRATOR = "ADMINISTRATOR";
/** User must logged to interact with the sourse */
export const UNAUTHORIZATION = "UNAUTHORIZATION";
/** This sourse is public, anyone can interact with the sourse */
export const UNAUTHENTICATION = "UNAUTHENTICATION";

/** Helper */
const getSpecialRules = () => [
  ADMINISTRATOR,
  UNAUTHORIZATION,
  UNAUTHENTICATION
];
