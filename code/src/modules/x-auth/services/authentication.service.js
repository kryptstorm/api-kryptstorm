/** External modules */
import _ from 'lodash';
import Validator from 'validator';
import Bcrypt from 'bcrypt';
import Config from 'config';
import JWT from 'jsonwebtoken';
import Bluebird from 'bluebird';

/** Internal modules */
import {
	modelName as model,
	STATUS_INACTIVE, STATUS_ACTIVE,
	VALIDATION_TYPE_NONE
} from '../../x-user/models/user.model';

const sign = Bluebird.promisify(JWT.sign);
const verify = Bluebird.promisify(JWT.verify);

export default function XAuthAuthenticationService() {
	const { act } = this.XService$;

	this.add('init:XAuthAuthenticationService', function XAuthAuthenticationServiceInit(args, done) {
		return done();
	});

	this.add('x_auth:authentication, func:register', function xAuthAuthenticationRegister({ payload$ = {} }, done) {
		/** This pattern is base on [x_user:users, func:create] */
		if (!this.has('x_user:users, func:create')) {
			return done(null, { _catch: new Error('Pattern [x_user:users, func:create] was not found.') });
		}

		payload$ = _.isObject(payload$) ? payload$ : {};
		let { attributes = {} } = payload$;

		/** If username was not register, user the string before @ as username */
		if (!attributes.username) {
			attributes.username = Validator.isEmail(attributes.email) ? attributes.email.split('@')[0].toLowerCase() : '';
		}
		/** Username and Email must be in lower case */
		attributes.username = attributes.username.toLowerCase();
		attributes.email = attributes.email ? attributes.email.toLowerCase() : '';

		/** Password must be exist and match with confirmPassword */
		if ((attributes.password !== attributes.confirmPassword) || !attributes.password) {
			return done(null, { errorCode$: 'ERROR_VALIDATION_FAILED', message$: 'Validation was failed.', errors$: { confirmPassword: 'Password does not match the confirm password.' } });
		}

		/** Set status for new user */
		attributes.status = STATUS_INACTIVE;
		/** Delete unnecessary field */
		delete attributes['confirmPassword'];

		/** Begin create user */
		return act('x_user:users, func:create', { payload$: { attributes } })
			.then(done.bind(this, null))
			.catch(_catch => done(null, { _catch }));
	});

	this.add('x_auth:authentication, func:login', function xAuthAuthenticatioLogin({ payload$ = {} }, done) {
		payload$ = _.isObject(payload$) ? payload$ : {};
		const { attributes = {} } = payload$, { username, email, password } = attributes;

		/** Find active user and don't have validation  */
		let where = {
			$or: {},
			$and: {
				status: STATUS_ACTIVE,
				validation_type: VALIDATION_TYPE_NONE
			}
		};

		const failedResult = { errorCode$: 'ERROR_AUTH_LOGIN_FAILED', message$: 'Login has failed.', errors$: { email: 'Invalid email or password.', username: 'Invalid username or password.', password: 'Invalid ID or password.' } };

		/** If user don't provide both username and email, login will be failed, return error immediately */
		if (!username && !email) {
			return done(null, failedResult);
		}

		if (username) {
			where.$or.username = username;
		}
		if (email) {
			where.$or.email = email;
		}

		return act('x_db:find_one', { model, where, returnFields: ['id', 'username', 'email', 'password'] })
			.then(({ errorCode$ = 'ERROR_NONE', data$ }) => {
				if (errorCode$ !== 'ERROR_NONE') return done(null, failedResult);
				return Bcrypt.compare(password, data$.password)
					.then(isMatch => {
						if (!isMatch) return done(null, failedResult);

						return JWT.sign(_.pick(data$, ['id', 'username', 'email']), Config.get('jwt.secreteKey'), Config.get('jwt.defaultOptions'), function jwtEncode(err, token) {
							if (err) return done(null, { _catch: err });
							return done(null, { data$: { token } });
						});
					})
					.catch(_catch => done(null, { _catch }));
			})
			.catch(_catch => done(null, { _catch }));
	});

	this.add('x_auth:authentication, func:verify', function xAuthAuthenticatioVerify({ payload$ = {} }, done) {
		const failedResult = { errorCode$: 'ERROR_AUTH_AUTHENTICATION_FAILED', message$: 'Your session has expired.' };

		const { _meta = {} } = payload$;
		if (!_meta.XToken) return done(null, failedResult);

		return verify(_meta.XToken, Config.get('jwt.secreteKey'))
			.then(data => done(null, { data$: _.pick(data, ['id', 'username', 'email']) }))
			.catch(_catch => done(null, { _catch }));
	});

	/** You must return plugin name */
	return { name: 'XAuthAuthenticationService' };
}