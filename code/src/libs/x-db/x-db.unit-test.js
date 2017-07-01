/** External modules */
import Seneca from 'seneca';
import Sequelize from 'sequelize';
import { expect } from 'chai';
import Faker from 'faker';
import _ from 'lodash';

/** Internal modules */
import XDb from '.';

const testTable = 'test_x_db';

const models = [
	{
		name: testTable, schema: {
			username: {
				type: Sequelize.STRING(128),
				unique: true,
				validate: {
					is: /^[a-zA-Z0-9._]+$/i,
					len: [3, 128]
				}
			},
			email: {
				type: Sequelize.STRING(255),
				unique: true,
				validate: {
					isEmail: true,
				}
			},
			first_name: {
				type: Sequelize.STRING(60),
				allowNull: true,
				defaultValue: 'Lorem',
				validate: {
					is: /^[a-zA-Z0-9._ ]+$/i,
					len: [0, 60]
				}
			},
			last_name: {
				type: Sequelize.STRING(60),
				allowNull: true,
				defaultValue: 'Ipsum',
				validate: {
					is: /^[a-zA-Z0-9._ ]+$/i,
					len: [0, 60]
				}
			},
		}
	}
]

describe('XDb', function () {
	const TestApp = fn => {
		return Seneca({
			log: 'test'
		})
			.test(fn)
			.use(XDb, { models, options: { logging: false } })
	}
	let db, app, rowId;

	before((done) => {
		app = TestApp(done);
		app.ready(function () {
			db = this.XDb$;
			return done();
		})
	})

	it('Insert data', function (done) {
		const data = {
			model: testTable,
			attributes: {
				username: Faker.internet.userName(),
				email: Faker.internet.email(),
				first_name: Faker.name.findName(),
				last_name: Faker.name.lastName(),
			}
		}
		app.act('x_db:create', data, function (err, result = {}) {
			const { data$ } = result;

			expect(err).to.be.not.exist;
			expect(data$).to.be.an('object');
			expect(data$.id).to.be.an('number');
			expect(data$.username).to.equal(data.attributes.username);

			rowId = data$.id;
			return done();
		})
	});

	it('Find all data', function (done) {
		const data = {
			model: testTable,
		}
		app.act('x_db:find_all', data, function (err, result = {}) {
			const { data$, _meta$ } = result;

			expect(err).to.be.not.exist;
			expect(data$).to.be.an('array');
			expect(data$.length).to.equal(1);
			expect(_meta$).to.be.exist;
			expect(_meta$.count).to.be.exist;
			expect(_meta$.count).to.equal(1);
			return done();
		})
	});

	it('Find data by id', function (done) {
		const data = {
			model: testTable,
			id: rowId
		}
		app.act('x_db:find_by_id', data, function (err, result = {}) {
			const { data$ } = result;

			expect(err).to.be.not.exist;
			expect(data$).to.be.an('object');
			expect(data$.id).to.be.an('number');
			expect(data$.id).to.equal(rowId);
			expect(_.size(data$)).to.equal(1);
			return done();
		})
	});

	it('Update data by id', function (done) {
		const data = {
			model: testTable,
			id: rowId,
			attributes: {
				username: Faker.internet.userName(),
			}
		}
		app.act('x_db:update', data, function (err, result = {}) {
			const { data$ } = result;

			expect(err).to.be.not.exist;
			expect(data$).to.be.an('object');
			expect(data$.id).to.be.an('number');
			expect(data$.id).to.equal(data.id);
			expect(data$.username).to.equal(data.attributes.username);

			rowId = data$.id;
			return done();
		})
	});

	it('Delete data by id', function (done) {
		const data = {
			model: testTable,
			id: rowId,
		}
		app.act('x_db:delete_by_id', data, function (err, result = {}) {
			const { data$ } = result;

			expect(err).to.be.not.exist;
			expect(data$).to.be.an('number');
			expect(data$).to.equal(rowId);

			rowId = data$.id;
			return done();
		})
	});

	after(function afterTestXDb(done) {
		db.model(`kryptstorm_${testTable}`).drop().then(() => done()).catch(err => done(err));
	});
});
