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
export const VALIDATION_TYPE_RECOVERY = 1;

/** Helper */
export const getToken = () =>
  Crypto.createHash("md5")
    .update(String(new Date().getTime()) + Randomstring.generate(9))
    .digest("hex");
export const getExpired = () => new Date(new Date().getTime() + 604800000);

/** Validation schema*/
const rulesOnCreate = {
  username: {
    presence: true,
    unique: ["mongo", "kryptstorm", "users"],
    length: { minimum: 3, maximum: 256 }
  },
  email: {
    presence: true,
    email: true,
    unique: ["mongo", "kryptstorm", "users"]
  },
  password: { presence: true, length: { minimum: 6, maximum: 256 } },
  status: {
    presence: true,
    inclusion: [STATUS_NEW, STATUS_ACTIVE, STATUS_LOCKED, STATUS_DELETED]
  }
};

const rulesOnRegister = _.assign({}, rulesOnCreate, {
  confirmPassword: { equality: "password" }
});

const rulesOnUpdate = {
  status: {
    presence: true,
    inclusion: [STATUS_NEW, STATUS_ACTIVE, STATUS_LOCKED, STATUS_DELETED]
  }
};

export default {
  onCreate: attributes => ValidateJS.async(attributes, rulesOnCreate),
  onUpdate: attributes => ValidateJS.async(attributes, rulesOnUpdate),
  onRegister: attributes => ValidateJS.async(attributes, rulesOnRegister)
};
