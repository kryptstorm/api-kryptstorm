/** System modules */
import Crypto from "crypto";

/** External modules */
import ValidateJS from "validate.js";
import Bluebird from "bluebird";
import _ from "lodash";
import Randomstring from "randomstring";

/** Internal modules */
import App from "../..";

/** Public fields */
export const PUBLICK_FIELDS = [
  "id",
  "username",
  "email",
  "firstName",
  "lastName",
  "status",
  "createdAt",
  "updatedAt"
];

/** Status */
export const STATUS_NEW = 0;
export const STATUS_ACTIVE = 1;
export const STATUS_LOCKED = 2;
export const STATUS_DELETED = 3;
/** Validation */
export const VALIDATION_TYPE_NEW = 1;
export const VALIDATION_TYPE_RECOVERY = 2;

/** Helper */
export const getValidationToken = () =>
  Crypto.createHash("md5")
    .update(String(new Date().getTime()) + Randomstring.generate(9))
    .digest("hex");
export const getValidationExpired = () =>
  new Date(new Date().getTime() + 604800000);

/** Validation schema*/
const ruleOnNormal = {
  firstName: {
    format: {
      pattern: "[a-zA-Z.-]+",
      flags: "i",
      message: "can only contain letter, dot or hyphen."
    }
  },
  lastName: {
    format: {
      pattern: "[a-zA-Z.-]+",
      flags: "i",
      message: "can only contain letter, dot or hyphen."
    }
  },
  status: {
    presence: true,
    inclusion: [STATUS_NEW, STATUS_ACTIVE, STATUS_LOCKED, STATUS_DELETED]
  }
};

const rulesOnCreate = _.assign({}, ruleOnNormal, {
  username: {
    presence: true,
    format: {
      pattern: "[a-zA-Z0-9.-_]+",
      flags: "i",
      message: "can only contain letter, number, dot, hyphen and underscore."
    },
    unique: ["mongo", "kryptstorm", "users"],
    length: { minimum: 3, maximum: 256 }
  },
  email: {
    presence: true,
    email: true,
    unique: ["mongo", "kryptstorm", "users"]
  },
  password: { presence: true, length: { minimum: 6, maximum: 256 } }
});

const rulesOnRegister = _.assign({}, rulesOnCreate, {
  confirmPassword: { equality: "password" }
});

const rulesOnUpdate = _.assign({}, ruleOnNormal, {
  status: {
    presence: true,
    inclusion: [STATUS_NEW, STATUS_ACTIVE, STATUS_LOCKED, STATUS_DELETED]
  }
});

const ruleOnAuthenticated = {
  username: {
    presence: true,
    length: { minimum: 3, maximum: 256 }
  },
  password: { presence: true, length: { minimum: 6, maximum: 256 } }
};

const ruleOnVerify = {
  token: { presence: true },
  renewToken: { presence: false }
};

export default {
  onCreate: attributes => ValidateJS.async(attributes, rulesOnCreate),
  onRegister: attributes => ValidateJS.async(attributes, rulesOnRegister),
  onUpdate: attributes => ValidateJS.async(attributes, rulesOnUpdate),
  onAuthenticated: attributes =>
    ValidateJS.async(attributes, ruleOnAuthenticated),
  onVerify: attributes => ValidateJS.async(attributes, ruleOnVerify)
};
