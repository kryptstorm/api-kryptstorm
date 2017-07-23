/** External modules */
import _ from "lodash";
import Bcrypt from "bcrypt";
import Config from "config";
import JWT from "jsonwebtoken";
import Bluebird from "bluebird";

/** Internal modules */
import ValidationRules, { STATUS_ACTIVE } from "../kryptstorm-user/validate";

/** Routes */
export const routes = {
  "post::/auth": "auth:authenticated",
  "post::/auth/verify": "auth:verify"
};

/**
 * Defined public routes
 * 1. A route is not exist on both notAuthenticatednRoutes and notAuthorizedRoutes will be considered as public route
 * 2. If route is only exist on notAuthorizedRoutes, that mean after logged, user can do anything with current route
 * It's useful for account route as put::/user/:id
 * 3. If route is only exist on notAuthenticatednRoutes, that mean user must be logged and authorized for current routes
 */
export const notAuthenticatednRoutes = ["post::/auth", "post::/auth/verify"];
export const notAuthorizedRoutes = ["post::/auth", "post::/auth/verify"];

/** Defined async jwt methods */
const asyncSign$ = Bluebird.promisify(JWT.sign);
const asyncVerify$ = Bluebird.promisify(JWT.verify);

export default function Auth() {
  /** Register http options */
  if (this.has("init:Http")) {
    /** Register routes */
    _.assign(this.options().Https.routes, routes);
    /** Register notAuthenticatednRoutes */
    this.options().Https.auth.notAuthenticatednRoutes = [
      ...this.options().Https.auth.notAuthenticatednRoutes,
      ...notAuthenticatednRoutes
    ];
    /** Register notAuthorizedRoutes */
    this.options().Https.auth.notAuthorizedRoutes = [
      ...this.options().Https.auth.notAuthorizedRoutes,
      ...notAuthorizedRoutes
    ];
  }

  this.add("init:Auth", function initAuth(args, reply) {
    return reply();
  });

  this.add("auth:authenticated", function authAuthorization(args, reply) {
    const { attributes = {} } = args;
    const authenticationFailedResponse = {
      errorCode$: "AUTHENTICATION_FAILED",
      message$: "Authentication has been failed."
    };

    /** Validation */
    return ValidationRules.onAuthenticated(attributes)
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
            { fields: ["id", "username", "email", "password"] }
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
                  _.pick(row, ["id", "username", "email"]),
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

    return ValidationRules.onVerify(attributes)
      .then(({ token, renewToken }) =>
        asyncVerify$(token, Config.get("jwt.secreteKey"))
      )
      .then(jwtPayload => reply(null, { data$: jwtPayload }))
      .catch(err => reply(null, { errorCode$: "SYSTEM_ERROR", errors$: err }));
  });

  return { name: "Auth" };
}
