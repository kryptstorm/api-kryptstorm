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

// import { getFakeUser } from '../../x-user/tests/helpers';
// import { modelName, STATUS_ACTIVE, VALIDATION_TYPE_NONE } from '../../x-user/models/user.model';

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
	let app;

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

		app.XService$.act('x_auth:authentication, func:register', { payload$ })
			.then(({ errorCode$ = 'ERROR_NONE', data$ }) => {

				expect(errorCode$).to.be.equal('ERROR_NONE');

				expect(data$).to.be.an('object');
				expect(data$.username).to.be.exist;
				expect(data$.username).to.be.equal(payload$.attributes.username.toLowerCase());
				expect(data$.email).to.be.equal(payload$.attributes.email.toLowerCase());

				return done();
			})
			.catch(err => expect(err).to.be.not.exist);
	});

});
