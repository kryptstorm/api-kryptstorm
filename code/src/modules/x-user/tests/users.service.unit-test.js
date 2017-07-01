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
		app.act('x_user:users, func:find_all', {}, function (err, result = {}) {
			const { data$, _meta$ } = result;
			expect(err).to.be.not.exist;

			expect(data$).to.be.an('array');
			expect(_meta$).to.be.exist;
			expect(_meta$.count).to.be.exist;
			expect(_meta$.count).to.be.an('number');
			return done();
		})
	});

	it('Find all data with params', function (done) {
		const payload$ = {
			condition: {
				username: 'ell',
				status: STATUS_ACTIVE,
			}
		}
		app.act('x_user:users, func:find_all', { payload$ }, function (err, result = {}) {
			const { data$, _meta$ } = result;
			expect(err).to.be.not.exist;

			expect(data$).to.be.an('array');
			expect(_meta$).to.be.exist;
			expect(_meta$.count).to.be.exist;
			expect(_meta$.count).to.be.an('number');
			return done();
		})
	});

	it('Create data', function (done) {
		const payload$ = {
			attributes: _.assign({}, getFakeUser(), { password: '123456' })
		}
		app.act('x_user:users, func:create', { payload$ }, function (err, result = {}) {
			const { data$ } = result;
			expect(err).to.be.not.exist;

			expect(data$).to.be.an('object');
			expect(data$.username).to.be.exist;
			expect(data$.username).to.be.equal(payload$.attributes.username);
			return done();
		})
	});

});
