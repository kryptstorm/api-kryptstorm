/** External modules */
import Seneca from 'seneca';
import _ from 'lodash';
import { expect } from 'chai';
import Faker from 'faker';

/** Internal modules */
/** Kryptstorm system modules*/
import XDb from '../../../libs/x-db';
import XService from '../../../libs/x-service';

/** Services */
import XAuth from '..';
import XUser from '../../x-user';

import { modelName, STATUS_ACTIVE, VALIDATION_TYPE_NONE } from '../../x-user/models/user.model';

/** Model config */
const models = [...XUser.models, ...XAuth.models];

/** Seneca plugins */
const services = [...XUser.services, ...XAuth.services];

describe('XAuth - authentication', function () {
	const TestApp = fn => {
		const App = Seneca({
			log: 'test'
		})
			.test(fn)
			.use(XService)
			.use(XDb, { models, tablePrefix: 'kryptstorm', options: { logging: false } });

		return _.reduce(services, (app, nextService) => app.use(nextService), App);
	}
	let app, validUser, token;

	before((done) => {
		app = _.reduce(services, (instance, nextService) => instance.use(nextService), TestApp(done));
		app.ready(function () {
			const validUserAttributes = {
				username: Faker.internet.userName(),
				password: '123456', // equal to '123456'
				email: Faker.internet.email(),
				first_name: Faker.name.firstName(),
				last_name: Faker.name.lastName(),
				status: STATUS_ACTIVE,
				validation_type: VALIDATION_TYPE_NONE
			};

			app.XService$.act('x_db:create', { model: modelName, attributes: validUserAttributes })
				.then(() => {
					validUser = {
						username: validUserAttributes.username,
						email: validUserAttributes.email,
						password: validUserAttributes.password,
					}

					return done();
				})
				.catch(err => done(err));
		})
	})

	it('Register new user', function (done) {
		const payload$ = {
			attributes: {
				username: Faker.internet.userName(),
				password: '123456',
				confirmPassword: '123456',
				email: Faker.internet.email(),
				first_name: Faker.name.firstName(),
				last_name: Faker.name.lastName(),
			}
		}

		app.XService$.act('x_auth:authentication, func:register', { payload$ })
			.then(({ errorCode$ = 'ERROR_NONE', data$ }) => {

				expect(errorCode$).to.be.equal('ERROR_NONE');

				expect(data$).to.be.an('object');
				expect(data$.username).to.be.exist;
				expect(data$.username).to.be.equal(payload$.attributes.username.toLowerCase());
				expect(data$.email).to.be.equal(payload$.attributes.email.toLowerCase());

				return done();
			})
			.catch(err => done(err));
	});

	it('Login by username', function (done) {
		const payload$ = {
			attributes: {
				username: validUser.username,
				password: validUser.password
			}
		}

		app.XService$.act('x_auth:authentication, func:login', { payload$ })
			.then(({ errorCode$ = 'ERROR_NONE', data$ }) => {

				expect(errorCode$).to.be.equal('ERROR_NONE');

				expect(data$).to.be.an('object');
				expect(data$.token).to.be.exist;
				expect(data$.token).to.be.an('string');

				if (!token) token = data$.token;

				return done();
			})
			.catch(err => done(err));
	});

	it('Login by email', function (done) {
		const payload$ = {
			attributes: {
				email: validUser.email,
				password: validUser.password
			}
		}

		app.XService$.act('x_auth:authentication, func:login', { payload$ })
			.then(({ errorCode$ = 'ERROR_NONE', data$ }) => {

				expect(errorCode$).to.be.equal('ERROR_NONE');

				expect(data$).to.be.an('object');
				expect(data$.token).to.be.exist;
				expect(data$.token).to.be.an('string');

				if (!token) token = data$.token;

				return done();
			})
			.catch(err => done(err));
	});

	it('Authentication by token', function (done) {
		const payload$ = {
			_meta: { XToken: token }
		}

		app.XService$.act('x_auth:authentication, func:verify', { payload$ })
			.then(({ errorCode$ = 'ERROR_NONE', data$ }) => {

				expect(errorCode$).to.be.equal('ERROR_NONE');

				expect(data$).to.be.an('object');
				expect(data$.id).to.be.exist;
				expect(data$.username).to.be.equal(validUser.username);
				expect(data$.email).to.be.equal(validUser.email);

				return done();
			})
			.catch(err => done(err));
	});

});
