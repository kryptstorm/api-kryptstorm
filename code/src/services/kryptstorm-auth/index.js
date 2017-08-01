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

  const getAuthenticatedToken = (data, options = {}) =>
    asyncSign$(
      data,
      Config.get("jwt.secreteKey"),
      _.assign({}, Config.get("jwt.defaultOptions"), options)
    );

  this.add("init:Auth", function initAuth(args, done) {
    return done();
  });

  this.add("auth:authenticated", function authAuthorization(args, done) {
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
              return done(null, authenticationFailedResponse);
            }

            return Bcrypt.compare(password, row.password).then(isMatch => {
              if (!isMatch) return done(null, authenticationFailedResponse);

              /**
							 * Return 2 token
							 * If [token] is expired, [renewToken] will help user still login and reset [token]
							 * It's help mobile app can still logged forever
							 */
              return Bluebird.all([
                /** Token */
                getAuthenticatedToken(_.pick(row, jwtPayload)),
                /** RenewToken */
                getAuthenticatedToken(_.pick(row, jwtPayload), {
                  expiresIn: 1209600
                })
              ]).then(tokens => {
                return done(null, {
                  data$: {
                    token: tokens[0],
                    renewToken: tokens[1]
                  }
                });
              });
            });
          });
      })
      .catch(err => done(null, { errorCode$: "SYSTEM_ERROR", errors$: err }));
  });

  this.add("auth:verify", function authVerify(args, done) {
    const { attributes = {} } = args;
    const verificationFailedResponse = {
      errorCode$: "VERIFICATION_FAILED",
      message$: "Authentication has been failed."
    };

    let _renewToken;

    return UserValidationRules.onVerify(attributes)
      .then(({ token, renewToken }) => {
        _renewToken = renewToken;
        return asyncVerify$(token, Config.get("jwt.secreteKey"));
      })
      .then(jwtPayload => done(null, { data$: jwtPayload }))
      .catch(err => asyncVerify$(_renewToken, Config.get("jwt.secreteKey")))
      .then(jwtPayload => done(null, { data$: jwtPayload }))
      .catch(err => done(null, { errorCode$: "SYSTEM_ERROR", errors$: err }));
  });

  return { name: "Auth" };
}
