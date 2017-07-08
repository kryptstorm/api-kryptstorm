/** External modules */
import Seneca from 'seneca';
import Sequelize from 'sequelize';
import { expect } from 'chai';
import Faker from 'faker';
import Bluebird from 'bluebird';

/** Internal modules */
import XDb from '.';

const testTable = 'test_x_mariadb';

const models = [
	{
		name: testTable,
		schema: {
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


describe('XMariadb', function () {
	const TestApp = fn => {
		return Seneca({
			log: 'test'
		})
			.test(fn)
			.use(XDb, { models, options: { logging: false } })
	}
	let act, db, app, row;

	before((done) => {
		app = TestApp(done);
		act = Bluebird.promisify(app.act, { context: app });

		app.ready(function () {
			db = this.XMariadb$;
			return done();
		})
	})

	it('Insert data', function (done) {
		const payload$ = {
			model: testTable,
			attributes: {
				username: Faker.internet.userName(),
				email: Faker.internet.email(),
				first_name: Faker.name.findName(),
				last_name: Faker.name.lastName(),
			},
			returnFields: ['id', 'username', 'email', 'first_name', 'last_name']
		}
		act('x_mariadb:create', payload$)
			.then(({ errorCode$ = 'ERROR_NONE', data$ }) => {

				expect(errorCode$).to.be.equal('ERROR_NONE');

				expect(data$).to.be.an('object');
				expect(data$.username).to.be.exist;
				expect(data$.username).to.be.equal(payload$.attributes.username);

				row = data$;
				return done();
			})
			.catch(err => done(err));
	});

	it('Find all data', function (done) {
		const payload$ = {
			model: testTable,
			returnFields: ['id', 'username', 'email', 'first_name', 'last_name']
		}
		act('x_mariadb:find_all', payload$)
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

	it('Find data by id', function (done) {
		const payload$ = {
			model: testTable,
			id: row.id,
			returnFields: ['id', 'username', 'email', 'first_name', 'last_name']
		}

		act('x_mariadb:find_by_id', payload$)
			.then(({ errorCode$ = 'ERROR_NONE', data$, _meta$ }) => {

				expect(errorCode$).to.be.equal('ERROR_NONE');

				expect(data$).to.be.an('object');
				expect(data$.id).to.be.equal(row.id);
				expect(_meta$).to.be.exist;
				expect(_meta$.count).to.be.exist;
				expect(_meta$.count).to.be.an('number');
				return done();
			})
			.catch(err => done(err));
	});

	it('Update data by id', function (done) {
		const payload$ = {
			model: testTable,
			id: row.id,
			attributes: {
				first_name: Faker.name.firstName(),
				last_name: Faker.name.lastName(),
			},
			returnFields: ['id', 'username', 'email', 'first_name', 'last_name']
		}
		act('x_mariadb:update', payload$)
			.then(({ errorCode$ = 'ERROR_NONE', data$, _meta$ }) => {

				expect(errorCode$).to.be.equal('ERROR_NONE');

				expect(data$).to.be.an('object');
				expect(data$.id).to.be.equal(payload$.id);
				expect(data$.first_name).to.be.equal(payload$.attributes.first_name);
				expect(data$.last_name).to.be.equal(payload$.attributes.last_name);
				expect(_meta$).to.be.exist;
				expect(_meta$.count).to.be.exist;
				expect(_meta$.count).to.be.an('number');
				return done();
			})
			.catch(err => done(err));
	});

	it('Delete data by id', function (done) {
		const data = {
			model: testTable,
			id: row.id,
			returnFields: ['id', 'username', 'email', 'first_name', 'last_name']
		}
		act('x_mariadb:delete_by_id', data)
			.then(({ errorCode$ = 'ERROR_NONE', data$, _meta$ }) => {

				expect(errorCode$).to.be.equal('ERROR_NONE');

				expect(data$).to.be.an('object');
				expect(data$.id).to.be.equal(row.id);
				expect(_meta$).to.be.exist;
				expect(_meta$.count).to.be.exist;
				expect(_meta$.count).to.be.an('number');
				return done();
			})
			.catch(err => done(err));
	});

	it('Validate unique', function (done) {
		const data = {
			model: testTable,
			field: 'username',
			value: row.username
		}

		act('x_mariadb:validate, scenario:unique', data)
			.then(({ errorCode$ = 'ERROR_NONE' }) => {

				expect(errorCode$).to.be.equal('ERROR_VALIDATION_FAILED');
				return done();
			})
			.catch(err => done(err));
	});

	after(function afterTestXDb(done) {
		db.model(`kryptstorm_${testTable}`).drop().then(() => done()).catch(err => done(err));
	});
});
