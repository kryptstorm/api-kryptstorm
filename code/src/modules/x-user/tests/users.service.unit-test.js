/** External modules */
import Seneca from 'seneca';
import _ from 'lodash';
import { expect } from 'chai';

/** Internal modules */
/** Kryptstorm system modules*/
import XDb from '../../../libs/x-db';
import XService from '../../../libs/x-service';

import { STATUS_ACTIVE } from '../models/user.model';
import { getFakeUser } from './helpers';

/** Services */
import XUser from '..';

/** Model config */
const models = [...XUser.models];

/** Seneca plugins */
const services = [...XUser.services];

describe('XUser - users', function () {
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

	it('Find all data', function (done) {
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

	it('Find all data with params', function (done) {
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

	it('Create data', function (done) {
		const payload$ = {
			attributes: _.assign({}, getFakeUser(), { password: '123456' })
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

});
