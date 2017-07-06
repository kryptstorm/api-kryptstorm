/** External modules */
import Sequelize from 'sequelize';
import Config from 'config';
import _ from 'lodash';

/** Internal modules */
import { xMariadbErrorHandler, xMariadbModelValidate, xMariadbResolvePagination, xMariadbResolveReturnFields } from './helpers';

const defaultOptions = {
	host: Config.get('db.connect.host'),
	dialect: Config.get('db.connect.dialect'),
	define: Config.get('db.schemaOptions'),
	timezone: Config.get('db.timezone'),
	logging: Config.get('api.isDebug') ? console.log : false,
}

export default function XDb({
  models = [],
	tablePrefix = Config.get('db.prefix'),
	database = Config.get('db.connect.database'),
	username = Config.get('db.connect.username'),
	password = Config.get('db.connect.password'),
	options = {}
   }) {
	/** Init options */
	if (!_.isObject(options)) options = {};
	options = _.assign({}, defaultOptions, options);

	/** Init Sequelize instance */
	const db = new Sequelize(database, username, password, options);

	/** Inject db instance to Seneca, this will help you use sequelizejs if this plugin was not enough for you */
	this.decorate('XDb$', db);

	this.add('init:XDb', function XDbInit(args, done) {
		if (_.isEmpty(models)) {
			return xMariadbErrorHandler.call(null, done, [], new Error('You init an API without models. You\'ll dont\'t want do it.'));
		}

		if (!_.isArray(models)) {
			return xMariadbErrorHandler.call(null, done, [], new Error('You must give XDb array of models.'));
		}

		_.each(models, ({ name = '', schema = {}, schemaOptions = {} }) => {
			if (!name || !_.isString(name)) {
				console.log('ERROR-XDb: Name of model was empty or was not String.');
				return false;
			}

			if (_.isEmpty(schema) || !_.isObject(schema)) {
				console.log(`ERROR-XDb: Schema of model [${name}] was not defined.`);
				return false;
			}

			if (_.isEmpty(schemaOptions) || !_.isObject(schemaOptions)) {
				schemaOptions = {};
			}

			/** Defined model */
			db
				.define(`${tablePrefix}_${name}`, schema, schemaOptions)
				.sync()
				.catch(_catch => done(null, { _catch }));
		});

		return db
			.authenticate()
			.then(() => done())
			.catch(xMariadbErrorHandler.bind(this, done, []));
	});

	this.add('x_db:create', function XDbCreate({ model, attributes, saveFields, returnFields }, done) {
		const _model = xMariadbModelValidate.call(null, model, db, tablePrefix);
		/** Now after validate, _model is instance of error */
		if (!_.isString(_model)) {
			return xMariadbErrorHandler.call(null, done, [], _model);
		}

		if (!_.isObject(attributes) || _.isEmpty(attributes)) {
			return xMariadbErrorHandler.call(null, done, [], new Error('You can not create item without attributes.'));
		}

		if (!_.isArray(saveFields) || _.isEmpty(saveFields)) {
			saveFields = _.keys(attributes);
		}

		return db
			.model(_model)
			.create(attributes, { fields: saveFields })
			.then(row => done(null, { data$: _.pick(row.get({ plain: true }), xMariadbResolveReturnFields(returnFields)), _meta$: { count: 1 } }))
			.catch(xMariadbErrorHandler.bind(this, done, saveFields));
	});

	this.add('x_db:find_all', function XDbFind({ model, where, order, pagination, returnFields }, done) {
		const _model = xMariadbModelValidate.call(null, model, db, tablePrefix);
		/** Now after validate, _model is instance of error */
		if (!_.isString(_model)) {
			return xMariadbErrorHandler.call(null, done, [], _model);
		}

		/** Ger ordering */
		order = (!_.isObject(order) || _.isEmpty(order)) ? { id: 'DESC' } : order;
		order = _.map(order, (v, k) => {
			if (_.isString(v) && v && _.isString(k) && k && _.includes(['DESC', 'ASC'], v.toUpperCase())) {
				return [k, v.toUpperCase()];
			}
			return false;
		});

		let query = _.assign({}, { where, attributes: xMariadbResolveReturnFields(returnFields), order, raw: true }, xMariadbResolvePagination(pagination));

		return db
			.model(_model)
			.findAndCountAll(query)
			.then(({ count, rows }) => done(null, { data$: rows, _meta$: { count } }))
			.catch(xMariadbErrorHandler.bind(this, done, returnFields));
	});

	this.add('x_db:find_by_id', function XDbFindById({ model, id, returnFields }, done) {
		const _model = xMariadbModelValidate.call(null, model, db, tablePrefix);
		/** Now after validate, _model is instance of error */
		if (!_.isString(_model)) {
			return xMariadbErrorHandler.call(null, done, [], _model);
		}

		if (!id || !_.isNumber(id)) {
			return done(null, { errorCode$: 'ERROR_INVALID_ID', message$: `Id must be integer and can not be blank. You gave [${JSON.stringify(id)}].` });
		}

		return db
			.model(_model)
			.findById(id, { attributes: xMariadbResolveReturnFields(returnFields) })
			.then(row => {
				if (!row) {
					return done(null, { errorCode$: 'ERROR_ID_NOT_FOUND', message$: `The document with id [${id}] was not found.` });
				}
				return done(null, { data$: row.get({ plain: true }), _meta$: { count: 1 } });
			})
			.catch(xMariadbErrorHandler.bind(this, done, xMariadbResolveReturnFields(returnFields)));
	});

	this.add('x_db:find_one', function XDbFindById({ model, where, returnFields }, done) {
		const _model = xMariadbModelValidate.call(null, model, db, tablePrefix);
		/** Now after validate, _model is instance of error */
		if (!_.isString(_model)) {
			return xMariadbErrorHandler.call(null, done, [], _model);
		}

		return db
			.model(_model)
			.findOne({ where }, { attributes: xMariadbResolveReturnFields(returnFields) })
			.then(row => {
				if (!row) {
					return done(null, { errorCode$: 'ERROR_DATA_NOT_FOUND', message$: `The document you retrieve was not found.` });
				}
				return done(null, { data$: row.get({ plain: true }), _meta$: { count: 1 } });
			})
			.catch(xMariadbErrorHandler.bind(this, done, xMariadbResolveReturnFields(returnFields)));
	});

	this.add('x_db:update', function XDbUpdate({ model, id, attributes, saveFields, returnFields }, done) {
		const _model = xMariadbModelValidate.call(null, model, db, tablePrefix);
		/** Now after validate, _model is instance of error */
		if (!_.isString(_model)) {
			return xMariadbErrorHandler.call(null, done, [], _model);
		}

		if (!id || !_.isNumber(id)) {
			return done(null, { errorCode$: 'ERROR_INVALID_ID', message$: `Id must be integer and can not be blank. You gave [${JSON.stringify(id)}].` });
		}

		if (!_.isObject(attributes) || _.isEmpty(attributes)) {
			return xMariadbErrorHandler.call(null, done, [], new Error('You can not update item without attributes.'));
		}

		if (!_.isArray(saveFields) || _.isEmpty(saveFields)) {
			saveFields = _.keys(attributes);
		}

		return db
			.model(_model)
			.findById(id)
			.then(row => {
				if (!row) {
					return done(null, { errorCode$: 'ERROR_ID_NOT_FOUND', message$: `The document with id [${id}] was not found.` });
				}
				return row.update(attributes, { fields: saveFields });
			})
			.then(row => done(null, { data$: _.pick(row.get({ plain: true }), xMariadbResolveReturnFields(returnFields)), _meta$: { count: 1 } }))
			.catch(xMariadbErrorHandler.bind(this, done, saveFields));
	});

	this.add('x_db:delete_by_id', function XDbDeleteById({ model, id, returnFields }, done) {
		const _model = xMariadbModelValidate.call(null, model, db, tablePrefix);
		/** Now after validate, _model is instance of error */
		if (!_.isString(_model)) {
			return xMariadbErrorHandler.call(null, done, [], _model);
		}

		if (!id || !_.isNumber(id)) {
			return done(null, { errorCode$: 'ERROR_INVALID_ID', message$: `Id must be integer and can not be blank. You gave [${JSON.stringify(id)}].` });
		}

		return db
			.model(_model)
			.findById(id)
			.then(row => {
				if (!row) {
					return done(null, { errorCode$: 'ERROR_ID_NOT_FOUND', message$: `The document with id [${id}] was not found.` });
				}

				return row.destroy();
			})
			.then(deletedRow => done(null, { data$: _.pick(deletedRow.get({ plain: true }), xMariadbResolveReturnFields(returnFields)), _meta$: { count: 1 } }))
			.catch(xMariadbErrorHandler.bind(this, done, []));
	});

	this.add('x_db:validate, scenario:unique', function XDbvalidateUnique({ model, field = '', value = '' }, done) {
		const _model = xMariadbModelValidate.call(null, model, db, tablePrefix);
		/** Now after validate, _model is instance of error */
		if (!_.isString(_model)) {
			return xMariadbErrorHandler.call(null, done, [], _model);
		}

		if (!field || !_.isString(field)) {
			return done(null, { errorCode$: 'ERROR_INVALID_VALIDATION_FIELD', message$: `Validattion field must be a string and can not be blank. You gave [${JSON.stringify(field)}].` });
		}

		if (!field || !_.isString(field)) {
			return done(null, { errorCode$: 'ERROR_INVALID_VALIDATION_VALUE', message$: `Validattion value must be a string and can not be blank. You gave [${JSON.stringify(value)}].` });
		}

		const data$ = { [field]: value };

		return db
			.model(_model)
			.findOne({
				where: data$,
				attributes: [field],
				/** @param {bool} paranoid Allow search with soft deleted row */
				paranoid: false
			})
			.then((instance) => {
				if (!instance) {
					return done(null, { data$ });
				}

				return done(null, { errorCode$: 'ERROR_VALIDATION_FAILED', message$: `Validation was failed.`, errors$: { [field]: `This [${field}] with value {${value}} has already been taken.` } });
			})
			.catch(xMariadbErrorHandler.bind(this, done, [[field]]));
	});

	return { name: 'XDb' };
}
