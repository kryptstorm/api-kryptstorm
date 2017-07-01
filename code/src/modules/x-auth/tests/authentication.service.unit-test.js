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
	let app, userPayload;

	before((done) => {
		app = _.reduce(services, (instance, nextService) => instance.use(nextService), TestApp(done));
		app.ready(function () {
			return done();
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
		app.act('x_auth:authentication, func:register', { payload$ }, function (err, result = {}) {
			const { data$ } = result;
			expect(err).to.be.not.exist;

			expect(data$).to.be.an('object');
			expect(data$.username).to.be.exist;
			expect(data$.username).to.be.equal(payload$.attributes.username.toLowerCase());
			expect(data$.email).to.be.equal(payload$.attributes.email.toLowerCase());
			userPayload = {
				username: data$.username,
				email: data$.email,
				password: payload$.attributes.password,
			}
			return done();
		})
	});

	it('Login with username', function (done) {
		let payload$ = {
			attributes: {
				username: userPayload.username,
				password: userPayload.password,
			}
		};

		app.act('x_auth:authentication, func:login', { payload$ }, function (err, result = {}) {
			const { data$ } = result;
			expect(err).to.be.not.exist;

			expect(data$).to.be.an('object');
			expect(data$.token).to.be.exist;
			expect(data$.token).to.be.an('string');
			return done();
		})
	});

	it('Login with email', function (done) {
		let payload$ = {
			attributes: {
				email: userPayload.email,
				password: userPayload.password,
			}
		};

		app.act('x_auth:authentication, func:login', { payload$ }, function (err, result = {}) {
			const { data$ } = result;
			expect(err).to.be.not.exist;

			expect(data$).to.be.an('object');
			expect(data$.token).to.be.exist;
			expect(data$.token).to.be.an('string');
			return done();
		})
	});

});
