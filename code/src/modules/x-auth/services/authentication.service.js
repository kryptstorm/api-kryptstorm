/** External modules */
import _ from 'lodash';
import Bcrypt from 'bcrypt';
import Config from 'config';
import JWT from 'jsonwebtoken';
import Bluebird from 'bluebird';

/** Internal modules */
import User, {
	STATUS_NEW, STATUS_ACTIVE,
	VALIDATION_TYPE_NONE,
} from '../../x-user/models/user.model';

const jwtSign = Bluebird.promisify(JWT.sign);
const jwtVerify = Bluebird.promisify(JWT.verify);

export default function XAuthAuthenticationService() {
	const { act } = this.XService$;

	this.add('init:XAuthAuthenticationService', function XAuthAuthenticationServiceInit(args, done) {
		return done();
	});

	/** Overwrite create function with register */
	this.add('x_user:users, func:create, scenario:register', function xAuthAuthenticationRegister(args, done) {
		let { payload$ = {} } = args;
		payload$ = _.isObject(payload$) ? payload$ : {};
		let { attributes = {} } = payload$;

		/** Password must be exist and can not be falsy value */
		if (!attributes.password) {
			return done(null, { errorCode$: 'ERROR_VALIDATION_FAILED', message$: 'Validation has failed.', errors$: { password: 'Password can not be blank.' } });
		}
		/** Confirm password must match with password */
		if (attributes.password !== attributes.confirmPassword) {
			return done(null, { errorCode$: 'ERROR_VALIDATION_FAILED', message$: 'Validation has failed.', errors$: { confirmPassword: 'Password does not match the confirm password.' } });
		}
		delete attributes.confirmPassword;

		/** Set status for new user */
		attributes.status = STATUS_NEW;

		/** Run prior function */
		this.prior(args, done);
	});

	this.add('x_auth:authentication, func:login', function xAuthAuthenticatioLogin({ payload$ = {} }, done) {
		payload$ = _.isObject(payload$) ? payload$ : {};
		const { attributes = {} } = payload$, { username, email, password } = attributes;

		/** Find active user and don't have validation  */
		let where = {
			$or: {},
			$and: {
				status: STATUS_ACTIVE,
				validation_type: VALIDATION_TYPE_NONE,
			}
		};

		const loginFailed = { errorCode$: 'ERROR_AUTH_LOGIN_FAILED', message$: 'Login has failed.', errors$: { email: 'Invalid email or password.', username: 'Invalid username or password.', password: 'Invalid ID or password.' } };

		/** If user don't provide both username and email, login will be failed, return error immediately */
		if (!username && !email) {
			return done(null, loginFailed);
		}

		if (username) {
			where.$or.username = username;
		}
		if (email) {
			where.$or.email = email;
		}

		return act('x_mariadb:find_one', { model: User.name, where, returnFields: ['id', 'username', 'email', 'password'] })
			.then(({ errorCode$ = 'ERROR_NONE', data$ }) => {
				if (errorCode$ !== 'ERROR_NONE') return done(null, loginFailed);
				return Bcrypt.compare(password, data$.password)
					.then(isMatch => {
						if (!isMatch) return done(null, loginFailed);

						return jwtSign(_.pick(data$, ['id', 'username', 'email']), Config.get('jwt.secreteKey'), Config.get('jwt.defaultOptions'))
							.then(token => done(null, { data$: { token } }))
							.catch(_catch => done(null, { errorCode$: 'ERROR_SYSTEM', _catch }));
					})
					.catch(_catch => done(null, { errorCode$: 'ERROR_SYSTEM', _catch }));
			})
			.catch(_catch => done(null, { errorCode$: 'ERROR_SYSTEM', _catch }));
	});

	this.add('x_auth:authentication, func:verify', function xAuthAuthenticatioVerify({ payload$ = {} }, done) {
		const verifyFailed = { errorCode$: 'ERROR_AUTH_AUTHENTICATION_FAILED', message$: 'Your session has expired.' };

		const { _meta = {} } = payload$;
		if (!_meta.XToken) return done(null, verifyFailed);

		return jwtVerify(_meta.XToken, Config.get('jwt.secreteKey'))
			.then(({ id, username, email }) => {
				if (!id) return done(null, verifyFailed);

				return act('x_mariadb:find_by_id', { model: User.name, id: Number(id), returnFields: ['id', 'username', 'email'] })
					.then(({ errorCode$ = 'ERROR_NONE', data$ }) => {
						if (errorCode$ !== 'ERROR_NONE' || username !== data$.username || email !== data$.email) return done(null, verifyFailed);

						return done(null, { data$: _.pick(data$, ['id', 'username', 'email']) });
					})
					.catch(_catch => done(null, { errorCode$: 'ERROR_SYSTEM', _catch }));
			})
			.catch(_catch => done(null, { errorCode$: 'ERROR_SYSTEM', _catch }));
	});

	/** You must return plugin name */
	return { name: 'XAuthAuthenticationService' };
}