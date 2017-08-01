/** External modules */
import _ from "lodash";
import Bcrypt from "bcrypt";
import Config from "config";
import JWT from "jsonwebtoken";
import Bluebird from "bluebird";

/** Internal modules */
import UserValidationRules, {
  STATUS_ACTIVE
} from "../kryptstorm-user/validation";
import AuthValidationRules, {
  ADMINISTRATOR,
  OWNER,
  UNAUTHORIZATION,
  UNAUTHENTICATION,
  getSpecialRules
} from "./validation";

/** Routes */
export const routes = {
  "post::/auth": "auth:authenticated",
  "post::/auth/verify": "auth:verify"
};

const mws = ["auth:verify"];

/** Defined async jwt methods */
const asyncSign$ = Bluebird.promisify(JWT.sign);
const asyncVerify$ = Bluebird.promisify(JWT.verify);

const authenticationFailedResponse = {
  errorCode$: "AUTHENTICATION_FAILED",
  message$: "Authentication has been failed."
};

const authorizationFailedResponse = {
  errorCode$: "AUTHORIZATION_FAILED",
  message$: "Authorization has been failed."
};

const jwtPayload = ["id", "username", "email"];

export default function Auth() {
  const asyncAct$ = this.asyncAct$;
  let _auth = {};
  /** Register http options */
  if (this.has("init:Http")) {
    /** Register routes */
    _.assign(this.options().Https.routes, routes);
    _auth = this.options().Https.auth;
  }

  this.add("init:Auth", function initAuth(args, reply) {
    return reply();
  });

  this.add("auth:authenticated", function authAuthorization(args, reply) {
    const { attributes = {} } = args;
    /** Validation */
    return UserValidationRules.onAuthenticated(attributes)
      .then(({ username, password }) => {
        /** Username must be on lowercase */
        username = _.toLower(username);
        /** Build query */
        let _query = {
          native$: [
            {
              /** username - may be email or username, depend on client */
              $or: [{ email: username }, { username }],
              status: STATUS_ACTIVE,
              validation: { $exists: false }
            },
            { fields: [...jwtPayload, "password"] }
          ]
        };

        return this.make$("mongo", "kryptstorm", "users")
          .asyncLoad$(_query)
          .then(row => {
            /**
						 * User cannot be found, may be
						 * 1. User is deleted
						 * 2. User is inactived
						 * 3. User is on validate (new user or need to recovery password)
						 */
            if (_.isEmpty(row)) {
              return reply(null, authenticationFailedResponse);
            }

            return Bcrypt.compare(password, row.password).then(isMatch => {
              if (!isMatch) return done(null, authenticationFailedResponse);

              const getAuthenticatedToken = (options = {}) =>
                asyncSign$(
                  _.pick(row, jwtPayload),
                  Config.get("jwt.secreteKey"),
                  _.assign({}, Config.get("jwt.defaultOptions"), options)
                );

              /**
							 * Return 2 token
							 * If [token] is expired, [renewToken] will help user still login and reset [token]
							 * It's help mobile app can still logged forever
							 */
              return Bluebird.all([
                /** Token */
                getAuthenticatedToken(),
                /** RenewToken */
                getAuthenticatedToken({ expiresIn: 1209600 })
              ]).then(tokens => {
                return reply(null, {
                  data$: {
                    token: tokens[0],
                    renewToken: tokens[1]
                  }
                });
              });
            });
          });
      })
      .catch(err => reply(null, { errorCode$: "SYSTEM_ERROR", errors$: err }));
  });

  this.add("auth:verify", function authVerify(args, reply) {
    const { attributes = {} } = args;
    const verificationFailedResponse = {
      errorCode$: "VERIFICATION_FAILED",
      message$: "Authentication has been failed."
    };

    return UserValidationRules.onVerify(attributes)
      .then(({ token, renewToken }) =>
        asyncVerify$(token, Config.get("jwt.secreteKey"))
      )
      .then(jwtPayload => reply(null, { data$: jwtPayload }))
      .catch(err => reply(null, { errorCode$: "SYSTEM_ERROR", errors$: err }));
  });

  this.add("auth:check_permission", function authCheckPermission(args, reply) {
    const { mws = {}, _meta = {} } = args;
    let _roles;
    AuthValidationRules.onValidateMws(mws)
      .then(({ id, url, method }) => {
        _roles = _auth[`${method}::${url}`];

        /** If role of this route empty array, only administrator can access this url */
        if (!_.isArray(_roles) || _.isEmpty(_roles)) {
          return Bluebird.reject(
            new Error("Only administrator can access this url.")
          );
        }

        /** This is public route */
        if (_.includes(_roles, UNAUTHENTICATION) && _roles.length === 1) {
          return Bluebird.resolve({ _pass: true });
        }

        if (!id) {
          return Bluebird.reject(
            new Error("Only logged user can access this url.")
          );
        }

        /** Get role of current logged user */
        return asyncAct$("users:find_by_id", { params: { id } });
      })
      .then(({ id, role, _pass = false }) => {
        /** Pass from previous validate */
        if (_pass) return reply(null, { data$: mws });

        /** Validate ADMINISTRATOR */
        if (_.includes(_roles, ADMINISTRATOR) && role !== ADMINISTRATOR) {
          return Bluebird.reject(
            new Error("Only administrator can access this url.")
          );
        }

        /** Validate OWNER */
        //Idea - all entity should defined userId to access by role OWNER

        /** Custom role and this role is not allowed access this url */
        if (!_.includes(_roles, role)) {
          return Bluebird.reject(
            new Error("You don't have permission to access this url.")
          );
        }

        /** All thing is safe, return data to inject to midleware data */
        return reply(null, { data$: mws });
      })
      .catch(err => reply(null, authorizationFailedResponse));
  });

  return { name: "Auth" };
}
