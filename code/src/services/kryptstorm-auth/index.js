/** External modules */
import _ from "lodash";
import Bcrypt from "bcrypt";
import Config from "config";
import JWT from "jsonwebtoken";
import Bluebird from "bluebird";

/** Internal modules */
import { STATUS_ACTIVE } from "../kryptstorm-user/validation";
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
  const { collection } = this.options().Users || {};

  const getAuthenticatedToken = (data, options = {}) =>
    asyncSign$(
      data,
      Config.get("jwt.secreteKey"),
      _.assign({}, Config.get("jwt.defaultOptions"), options)
    );

  this.add("init:Auth", function initAuth(args, done) {
    if (!collection) {
      return done(
        this.errors$("[kryptstorm-auth] is depend on [kryptstorm-user]")
      );
    }
    return done();
  });

  this.add("auth:authenticated", function authAuthorization(args, done) {
    const { attributes = {} } = args;
    /** Validation */
    return AuthValidationRules.onAuthenticated(attributes)
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
							 * If [token] is expired, [refreshToken] will help user still login and reset [token]
							 * It's help mobile app can still logged forever
							 */
              return Bluebird.all([
                /** Token */
                getAuthenticatedToken(_.pick(row, jwtPayload)),
                /** refreshToken */
                getAuthenticatedToken(_.pick(row, jwtPayload), {
                  expiresIn: 1209600
                })
              ]).then(tokens => {
                return done(null, {
                  data$: {
                    accessToken: tokens[0],
                    refreshToken: tokens[1]
                  }
                });
              });
            });
          });
      })
      .catch(err => done(null, { errorCode$: "ERROR_SYSTEM", errors$: err }));
  });

  this.add("auth:verify", function authVerify(args, done) {
    const verificationFailedResponse = {
      errorCode$: "VERIFICATION_FAILED",
      message$: "Authentication has been failed."
    };

    let _refreshToken, _refreshJwtPayload;

    return AuthValidationRules.onVerify(args)
      .then(({ accessToken, refreshToken }) => {
        _refreshToken = refreshToken;
        return asyncVerify$(accessToken, Config.get("jwt.secreteKey"));
      })
      .then(accessTokenPayload => done(null, { data$: accessTokenPayload }))
      .catch(err => asyncVerify$(_refreshToken, Config.get("jwt.secreteKey")))
      .then(refreshTokenPayload => {
        _refreshJwtPayload = _.pick(refreshTokenPayload, jwtPayload);
        return Bluebird.all([
          /** Token */
          getAuthenticatedToken(_refreshJwtPayload),
          /** refreshToken */
          getAuthenticatedToken(_refreshJwtPayload, {
            expiresIn: 1209600
          })
        ]);
      })
      .then(tokens =>
        done(null, {
          data$: _.assign(_refreshJwtPayload, {
            accessToken: tokens[0],
            refreshToken: tokens[1]
          })
        })
      )
      .catch(err => done(null, { errorCode$: "ERROR_SYSTEM", errors$: err }));
  });

  return { name: "Auth" };
}
