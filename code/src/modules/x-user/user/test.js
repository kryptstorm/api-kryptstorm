/** External modules */
import Seneca from 'seneca';
import _ from 'lodash';
import { expect } from 'chai';
import Faker from 'faker';

/** Internal modules */
import XMariadb from '../../../libs/x-mariadb';
import XService from '../../../libs/x-service';

import User, {
	STATUS_NEW, STATUS_ACTIVE, STATUS_LOCKED,
	REAL_PUBLIC_FIELDS,
	generateValidationBaseOnStatus
} from './model';

import UserService from '.';

/** Models */
const models = [User];

/** Services */
const services = [UserService];

/** Test config */
const tablePrefix = 'kryptstorm';

/** Test case */
describe('XUser - users', function () {
	const TestApp = fn => {
		const App = Seneca({
			log: 'test'
		})
			.test(fn)
			.use(XService)
			.use(XMariadb, { models, tablePrefix, options: { logging: false } });

		return _.reduce(services, (app, nextService) => app.use(nextService), App);
	}
	let app, validUser;

	before((done) => {
		app = _.reduce(services, (instance, nextService) => instance.use(nextService), TestApp(done));
		app.ready(function () {
			const table = `${tablePrefix}_${User.name}`;
			app.XMariadb$.model(table).truncate({ force: true })
				.then(() => app.XMariadb$.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`))
				.then(() => app.XService$.act('x_mariadb:create', { model: User.name, attributes: generateFakeUser({ status: STATUS_ACTIVE }), returnFields: REAL_PUBLIC_FIELDS }))
				.then(({ errorCode$ = 'ERROR_NONE', data$ }) => {
					if (errorCode$ !== 'ERROR_NONE') return done(new Error('Can not prepare data for unit test.'));
					validUser = {
						id: data$.id,
						username: data$.username,
						email: data$.email,
						password: '123456',
					}
					return done();
				})
				.catch(err => done(err));
		})
	})

	it('Find all user', function (done) {
		app.XService$.act('x_user:users, func:find_all', {})
			.then(({ errorCode$ = 'ERROR_NONE', data$, _meta$ }) => {

				expect(errorCode$).to.be.equal('ERROR_NONE');

				expect(data$).to.be.an('array');
				expect(_meta$).to.be.exist;
				expect(_meta$.count).to.be.exist;
				expect(_meta$.count).to.be.an('number');
				return done();
			})
			.catch(err => done(err));
	});

	it('Find all user with params', function (done) {
		const payload$ = {
			condition: {
				username: 'ell',
				status: STATUS_ACTIVE,
			}
		}
		app.XService$.act('x_user:users, func:find_all', { payload$ })
			.then(({ errorCode$ = 'ERROR_NONE', data$, _meta$ }) => {

				expect(errorCode$).to.be.equal('ERROR_NONE');

				expect(data$).to.be.an('array');
				expect(_meta$).to.be.exist;
				expect(_meta$.count).to.be.exist;
				expect(_meta$.count).to.be.an('number');
				return done();
			})
			.catch(err => done(err));
	});

	it('Create user', function (done) {
		const payload$ = {
			attributes: generateFakeUser()
		}
		app.XService$.act('x_user:users, func:create', { payload$ })
			.then(({ errorCode$ = 'ERROR_NONE', data$ }) => {

				expect(errorCode$).to.be.equal('ERROR_NONE');

				expect(data$).to.be.an('object');
				expect(data$.username).to.be.exist;
				expect(data$.username).to.be.equal(payload$.attributes.username);
				return done();
			})
			.catch(err => done(err));
	});

	it('Find user by id', function (done) {
		const payload$ = {
			params: {
				id: validUser.id
			}
		}

		app.XService$.act('x_user:users, func:find_by_id', { payload$ })
			.then(({ errorCode$ = 'ERROR_NONE', data$, _meta$ }) => {

				expect(errorCode$).to.be.equal('ERROR_NONE');

				expect(data$).to.be.an('object');
				expect(data$.id).to.be.equal(validUser.id);
				expect(_meta$).to.be.exist;
				expect(_meta$.count).to.be.exist;
				expect(_meta$.count).to.be.an('number');
				return done();
			})
			.catch(err => done(err));
	});

	it('Update user by id', function (done) {
		const payload$ = {
			params: {
				id: validUser.id,
			},
			attributes: generateFakeUser({}, ['first_name', 'last_name'])
		}

		app.XService$.act('x_user:users, func:update_by_id', { payload$ })
			.then(({ errorCode$ = 'ERROR_NONE', data$, _meta$ }) => {

				expect(errorCode$).to.be.equal('ERROR_NONE');

				expect(data$).to.be.an('object');
				expect(data$.id).to.be.equal(payload$.params.id);
				expect(data$.first_name).to.be.equal(payload$.attributes.first_name);
				expect(data$.last_name).to.be.equal(payload$.attributes.last_name);
				expect(_meta$).to.be.exist;
				expect(_meta$.count).to.be.exist;
				expect(_meta$.count).to.be.an('number');
				return done();
			})
			.catch(err => done(err));
	});

	it('Delete user by id', function (done) {
		const payload$ = {
			params: {
				id: validUser.id
			}
		}

		app.XService$.act('x_user:users, func:delete_by_id', { payload$ })
			.then(({ errorCode$ = 'ERROR_NONE', data$, _meta$ }) => {

				expect(errorCode$).to.be.equal('ERROR_NONE');

				expect(data$).to.be.an('object');
				expect(data$.id).to.be.equal(validUser.id);
				expect(_meta$).to.be.exist;
				expect(_meta$.count).to.be.exist;
				expect(_meta$.count).to.be.an('number');
				return done();
			})
			.catch(err => done(err));
	});

	it('Validate unique username', function (done) {
		const payload$ = {
			attributes: {
				field: 'username',
				value: validUser.username
			}
		}

		app.XService$.act('x_user:users, validate:unique', { payload$ })
			.then(({ errorCode$ = 'ERROR_NONE' }) => {

				expect(errorCode$).to.be.equal('ERROR_VALIDATION_FAILED');
				return done();
			})
			.catch(err => done(err));
	});

	it('Validate unique email', function (done) {
		const payload$ = {
			attributes: {
				field: 'email',
				value: validUser.email
			}
		}

		app.XService$.act('x_user:users, validate:unique', { payload$ })
			.then(({ errorCode$ = 'ERROR_NONE' }) => {

				expect(errorCode$).to.be.equal('ERROR_VALIDATION_FAILED');
				return done();
			})
			.catch(err => done(err));
	});
});

/** Helpers */
export const generateFakeUser = (attributes = {}, pick = []) => {
	attributes = _.assign({
		username: Faker.internet.userName().toLowerCase(),
		email: Faker.internet.email().toLowerCase(),
		status: generateFakeStatus(),
		first_name: Faker.name.firstName(),
		last_name: Faker.name.lastName(),
		created_at: Faker.date.past(),
		password: '123456'
	}, attributes);

	_.assign(attributes, generateValidationBaseOnStatus(attributes.status));
	if (attributes.status === STATUS_ACTIVE) {
		attributes.updated_at = Faker.date.recent();
	}
	if (attributes.status === STATUS_LOCKED) {
		attributes.updated_at = Faker.date.recent();
	}

	if (!_.isEmpty(pick) && _.isArray(pick)) {
		attributes = _.pick(attributes, pick)
	}

	return attributes;
}

export const generateFakeStatus = () => {
	const status = [STATUS_NEW, STATUS_ACTIVE, STATUS_LOCKED];
	return status[Math.floor((Math.random() * status.length))];
}

