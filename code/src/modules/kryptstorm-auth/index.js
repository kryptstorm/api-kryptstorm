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
  "post::/auth": "auth:authenticated"
};

export const notAuthenticatednRoutes = ["post::/auth"];
export const notAuthorizedRoutes = [];

const asyncSign$ = Bluebird.promisify(JWT.sign);
const asyncVerify$ = Bluebird.promisify(JWT.verify);

export default function Auth() {
  /** Make notAuthenticatednRoutes and notAuthorizedRoutes is unique */
  const _notAuthenticatednRoutes = _.uniq([
    ...this.options().Https.notAuthenticatednRoutes,
    ...notAuthenticatednRoutes
  ]);
  const _notAuthorizedRoutes = _.uniq([
    ...this.options().Https.notAuthorizedRoutes,
    ...notAuthorizedRoutes
  ]);

  /** Register notAuthenticatednRoutes and notAuthorizedRoutes to http modules if it's exist */
  if (this.has("init:Http")) {
    _.assign(this.options().Https, {
      notAuthenticatednRoutes: _notAuthenticatednRoutes,
      notAuthorizedRoutes: _notAuthorizedRoutes
    });
  }

  this.add("init:Auth", function initAuth(args, reply) {
    return reply();
  });

  this.add("auth:authenticated", function authAuthorization(args, reply) {
    const { attributes = {} } = args;
    const authenticatedFailedResponse = {
      errorCode$: "AUTHENTICATED_FAILED",
      message$: "Authentication has been failed."
    };

    /** Validation */
    return ValidationRules.onAuthenticated(attributes)
      .then(({ username = "", password = "" }) => {
        /** Build query */
        let _query = {
          native$: [
            {
              /** username - may be email or username, depend on client */
              $or: [{ email: username }, { username }],
              status: STATUS_ACTIVE,
              validation: { $exists: false }
            },
            { fields$: ["id", "username", "email", "password"] }
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
              return reply(null, authenticatedFailedResponse);
            }

            return Bcrypt.compare(password, row.password).then(isMatch => {
              if (!isMatch) return done(null, authenticatedFailedResponse);

              const getAuthenticatedToken = (options = {}) =>
                asyncSign$(
                  _.pick(data$, ["id", "username", "email"]),
                  Config.get("jwt.secreteKey"),
                  _.assign({}, Config.get("jwt.defaultOptions"), options)
                );

              /**
							 * Return 2 token
							 * If [token] is expired, [renewToken] will help user still login and reset [token]
							 * It's help mobile app can still logged forever
							 */
              return Bluebird.all(
                /** Token */
                getAuthenticatedToken(),
                /** RenewToken */
                getAuthenticatedToken({ expiresIn: 1209600 })
              ).then(tokens =>
                reply(null, {
                  data$: {
                    token: tokens[0],
                    renewToken: tokens[1]
                  }
                })
              );
            });
          });
      })
      .catch(err => reply(null, { errorCode$: "SYSTEM_ERROR", errors$: err }));
  });
  this.add("auth:verify", function authVerify(args, reply) {});

  return { name: "Auth" };
}
