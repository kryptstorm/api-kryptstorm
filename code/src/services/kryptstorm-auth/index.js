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

  /** Retrieve option */
  const { collection } = this.options().Users;

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

        return this.make$
          .apply(null, collection)
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

  return { name: "Auth" };
}
