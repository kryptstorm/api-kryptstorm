/** External modules */
import Config from "config";
import ValidateJS from "validate.js";

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

/** Validation schema*/
const ruleOnAuthenticated = {
  username: {
    presence: true,
    length: { minimum: 3, maximum: 256 }
  },
  password: { presence: true, length: { minimum: 6, maximum: 256 } }
};

const ruleOnVerify = {
  accessToken: { presence: true },
  refreshToken: { presence: false }
};

export default {
  onAuthenticated: attributes =>
    ValidateJS.async(attributes, ruleOnAuthenticated),
  onVerify: attributes => ValidateJS.async(attributes, ruleOnVerify)
};
