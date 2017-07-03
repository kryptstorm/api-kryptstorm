/** External modules */
import Sequelize, { ValidationError } from 'sequelize';
import Config from 'config';
import _ from 'lodash';

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
			return _handleError.call(null, done, [], new Error('You init an API without models. You\'ll dont\'t want do it.'));
		}

		if (!_.isArray(models)) {
			return _handleError.call(null, done, [], new Error('You must give XDb array of models.'));
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
			.catch(_handleError.bind(this, done, []));
	});

	this.add('x_db:create', function XDbCreate({ model, attributes, saveFields, returnFields }, done) {
		const modelAfterValidate = _modelValidate.call(null, model, db, tablePrefix);
		/** Now after validate, modelAfterValidate is instance of error */
		if (!_.isString(modelAfterValidate)) {
			return _handleError.call(null, done, [], modelAfterValidate);
		}

		if (!_.isObject(attributes) || _.isEmpty(attributes)) {
			return _handleError.call(null, done, [], new Error('You can not create item without attributes.'));
		}

		if (!_.isArray(saveFields) || _.isEmpty(saveFields)) {
			saveFields = _.keys(attributes);
		}

		return db
			.model(modelAfterValidate)
			.create(attributes, { fields: saveFields })
			.then(row => {
				/** If params don't have returnFields, only return id */
				returnFields = (_.isEmpty(returnFields) || !_.isArray(returnFields)) ? ['id'] : returnFields;
				returnFields = _.uniq(returnFields);
				return done(null, { data$: _.pick(row.get({ plain: true }), returnFields), _meta$: { count: 1 } });
			})
			.catch(_handleError.bind(this, done, saveFields));
	});

	this.add('x_db:find_all', function XDbFind({ model, where, order, pagination, returnFields }, done) {
		const modelAfterValidate = _modelValidate.call(null, model, db, tablePrefix);
		/** Now after validate, modelAfterValidate is instance of error */
		if (!_.isString(modelAfterValidate)) {
			return _handleError.call(null, done, [], modelAfterValidate);
		}

		/** If params don't have returnFields, only return id */
		returnFields = (_.isEmpty(returnFields) || !_.isArray(returnFields)) ? ['id'] : returnFields;
		returnFields = _.uniq(returnFields);

		/** Ger ordering */
		order = (!_.isObject(order) || _.isEmpty(order)) ? { id: 'DESC' } : order;
		order = _.map(order, (v, k) => {
			if (_.isString(v) && v && _.isString(k) && k && _.includes(['DESC', 'ASC'], v.toUpperCase())) {
				return [k, v.toUpperCase()];
			}
			return false;
		});

		let query = _.assign({}, { where, attributes: returnFields, order, raw: true }, _preparePagination(pagination));

		return db
			.model(modelAfterValidate)
			.findAndCountAll(query)
			.then(({ count, rows }) => done(null, { data$: rows, _meta$: { count } }))
			.catch(_handleError.bind(this, done, returnFields));
	});

	this.add('x_db:find_by_id', function XDbFindById({ model, id, returnFields }, done) {
		const modelAfterValidate = _modelValidate.call(null, model, db, tablePrefix);
		/** Now after validate, modelAfterValidate is instance of error */
		if (!_.isString(modelAfterValidate)) {
			return _handleError.call(null, done, [], modelAfterValidate);
		}

		if (!id || !_.isNumber(id)) {
			return done(null, { errorCode$: 'ERROR_INVALID_ID', message$: `Id must be integer and can not be blank. You gave [${JSON.stringify(id)}].` });
		}

		returnFields = (_.isEmpty(returnFields) || !_.isArray(returnFields)) ? ['id'] : returnFields;
		returnFields = _.uniq(returnFields);

		return db
			.model(modelAfterValidate)
			.findById(id, { attributes: returnFields })
			.then(row => {
				if (!row) {
					return done(null, { errorCode$: 'ERROR_ID_NOT_FOUND', message$: `The document with id [${id}] was not found.` });
				}
				return done(null, { data$: row.get({ plain: true }) });
			})
			.catch(_handleError.bind(this, done, returnFields));
	});

	this.add('x_db:find_one', function XDbFindById({ model, where, returnFields }, done) {
		const modelAfterValidate = _modelValidate.call(null, model, db, tablePrefix);
		/** Now after validate, modelAfterValidate is instance of error */
		if (!_.isString(modelAfterValidate)) {
			return _handleError.call(null, done, [], modelAfterValidate);
		}

		returnFields = (_.isEmpty(returnFields) || !_.isArray(returnFields)) ? ['id'] : returnFields;
		returnFields = _.uniq(returnFields);

		return db
			.model(modelAfterValidate)
			.findOne({ where }, { attributes: returnFields })
			.then(row => {
				if (!row) {
					return done(null, { errorCode$: 'ERROR_DATA_NOT_FOUND', message$: `The document you retrieve was not found.` });
				}
				return done(null, { data$: row.get({ plain: true }) });
			})
			.catch(_handleError.bind(this, done, returnFields));
	});

	this.add('x_db:update', function XDbUpdate({ model, id, attributes, saveFields }, done) {
		const modelAfterValidate = _modelValidate.call(null, model, db, tablePrefix);
		/** Now after validate, modelAfterValidate is instance of error */
		if (!_.isString(modelAfterValidate)) {
			return _handleError.call(null, done, [], modelAfterValidate);
		}

		if (!id || !_.isNumber(id)) {
			return done(null, { errorCode$: 'ERROR_INVALID_ID', message$: `Id must be integer and can not be blank. You gave [${JSON.stringify(id)}].` });
		}

		if (!_.isObject(attributes) || _.isEmpty(attributes)) {
			return _handleError.call(null, done, [], new Error('You can not update item without attributes.'));
		}

		if (!_.isArray(saveFields) || _.isEmpty(saveFields)) {
			saveFields = _.keys(attributes);
		}

		return db
			.model(modelAfterValidate)
			.findById(id)
			.then(row => {
				if (!row) {
					return done(null, { errorCode$: 'ERROR_ID_NOT_FOUND', message$: `The document with id [${id}] was not found.` });
				}
				return row.update(attributes, { fields: saveFields });
			})
			.then(row => done(null, { data$: row.get({ plain: true }) }))
			.catch(_handleError.bind(this, done, saveFields));
	});

	this.add('x_db:delete_by_id', function XDbDeleteById({ model, id, returnFields }, done) {
		const modelAfterValidate = _modelValidate.call(null, model, db, tablePrefix);
		/** Now after validate, modelAfterValidate is instance of error */
		if (!_.isString(modelAfterValidate)) {
			return _handleError.call(null, done, [], modelAfterValidate);
		}

		if (!id || !_.isNumber(id)) {
			return done(null, { errorCode$: 'ERROR_INVALID_ID', message$: `Id must be integer and can not be blank. You gave [${JSON.stringify(id)}].` });
		}

		returnFields = (_.isEmpty(returnFields) || !_.isArray(returnFields)) ? ['id'] : returnFields;
		returnFields = _.uniq(returnFields);

		return db
			.model(modelAfterValidate)
			.findById(id)
			.then(row => {
				if (!row) {
					return done(null, { errorCode$: 'ERROR_ID_NOT_FOUND', message$: `The document with id [${id}] was not found.` });
				}

				return row.destroy();
			})
			.then(deletedRow => done(null, { data$: _.pick(deletedRow.get({ plain: true }), returnFields) }))
			.catch(_handleError.bind(this, done, []));
	});

	this.add('x_db:validate, scenario:unique', function XDbvalidateUnique({ model, field = '', value = '' }, done) {
		const modelAfterValidate = _modelValidate.call(null, model, db, tablePrefix);
		/** Now after validate, modelAfterValidate is instance of error */
		if (!_.isString(modelAfterValidate)) {
			return _handleError.call(null, done, [], modelAfterValidate);
		}

		if (!field || !_.isString(field)) {
			return done(null, { errorCode$: 'ERROR_INVALID_VALIDATION_FIELD', message$: `Validattion field must be a string and can not be blank. You gave [${JSON.stringify(field)}].` });
		}

		if (!field || !_.isString(field)) {
			return done(null, { errorCode$: 'ERROR_INVALID_VALIDATION_VALUE', message$: `Validattion value must be a string and can not be blank. You gave [${JSON.stringify(value)}].` });
		}

		const data$ = { [field]: value };

		return db
			.model(modelAfterValidate)
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
			.catch(_handleError.bind(this, done, [[field]]));
	});

	return { name: 'XDb' };
}

function _preparePagination(pagination) {
	if (!_.isObject(pagination) || _.isEmpty(pagination)) {
		return { offset: 0, limit: Config.get('api.perPageLimit') };
	}

	let { offset, limit } = pagination
	offset = (_.isNumber(offset) && offset > -1) ? offset : 0;
	limit = (_.isNumber(limit) && limit > 0) ? limit : Config.get('api.perPageLimit');
	return { offset, limit };
}

function _modelValidate(model, db, tablePrefix) {
	if (!model || !_.isString(model)) {
		return new Error(`Params "model" must be string and can not be blank. You gave [${JSON.stringify(model)}]`)
	}

	const modelName = `${tablePrefix}_${model}`;
	if (!db.isDefined(modelName)) {
		return new Error(`Model [${model}] was not register.`);
	}

	return modelName;
}

function _handleError(done, returnErrorFields = [], _catch) {
	/** You should catch validation error at here */
	if (_catch instanceof ValidationError) {
		const { errors } = _catch;
		let errors$ = {};

		if (_.isArray(returnErrorFields)) {
			if (_.isArray(errors) && !_.isEmpty(errors)) {
				_.each(errors, ({ message, path }) => {
					if (_.includes(returnErrorFields, path)) {
						errors$[path] = message;
					}
				});
			}
		}

		return done(null, { errorCode$: 'ERROR_VALIDATION_FAILED', message$: `Validation was failed.`, errors$ });
	}

	return done(null, { errorCode$: 'ERROR_SYSTEM', _catch });
}