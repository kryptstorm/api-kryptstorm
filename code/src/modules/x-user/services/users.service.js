/** External modules */
import _ from 'lodash';
import Sequelize from 'sequelize';
import Validator from 'validator';

/** Internal modules */
import User, {
	STATUS_NEW, STATUS_ACTIVE,
	generateValidationBaseOnStatus, REAL_PUBLIC_FIELDS, VIRTUAL_PUBLIC_FILEDS
} from '../models/user.model';

/**
 * Seneca plugin
 * You must not use arrow function on export plugin, because `this` context was bound with seneca instance
 */
export default function XUserUsersService() {
	const { act } = this.XService$;

	this.add({ init: 'XUserUsersService' }, function XUserUsersServiceInit(args, done) {
		return done();
	});

	this.add('x_user:users, func:create', function xUserUsersCreateUser({ payload$ = {} }, done) {
		payload$ = _.isObject(payload$) ? payload$ : {};
		let { attributes = {} } = payload$;
		attributes = _.pick(attributes, [...REAL_PUBLIC_FIELDS, 'password']);
		/**
		 * Sequelize will validate any field exist on attribute,
		 * not matter you set defaultValue or notEmpty or allowNull
		 * Just remove this attribute will make sure Sequelize will not validate this field
		 */
		if (!attributes.first_name) delete attributes.first_name;
		if (!attributes.last_name) delete attributes.last_name;

		/** If username was not register, user the string before @ as username */
		if (!attributes.username) {
			attributes.username = Validator.isEmail(attributes.email) ? attributes.email.split('@')[0].toLowerCase() : '';
		}
		/** Username and Email must be in lower case */
		attributes.username = attributes.username.toLowerCase();
		attributes.email = attributes.email ? attributes.email.toLowerCase() : '';

		/** Only allow create user with status is STATUS_NEW or STATUS_ACTIVE */
		if (!_.includes([STATUS_NEW, STATUS_ACTIVE], attributes.status)) attributes.status = STATUS_NEW;
		/** Set validation field base on status */
		_.assign(attributes, generateValidationBaseOnStatus(attributes.status));

		let dbPayload = {
			model: User.name,
			attributes,
			saveFields: attributes,
			returnFields: REAL_PUBLIC_FIELDS,
		};

		return act('x_db:create', dbPayload)
			.then(({ errorCode$ = 'ERROR_NONE', data$ = {}, _meta$ = {}, errors$ = {} }) => {
				if (errorCode$ !== 'ERROR_NONE') {
					return done(null, { errorCode$, message$: 'Can not create user. Please try again.', errors$ })
				}

				_.assign(data$, { full_name: `${data$.first_name} ${data$.last_name}` });
				return done(null, { data$, _meta$ });
			})
			.catch(_catch => done(null, { errorCode$: 'ERROR_SYSTEM', _catch }));
	});

	this.add('x_user:users, func:find_by_id', function xUserUsersFindByIdUser({ payload$ = {} }, done) {
		payload$ = _.isObject(payload$) ? payload$ : {};
		let { params = {} } = payload$;

		let dbPayload = {
			model: User.name,
			id: Number(params.id),
			returnFields: REAL_PUBLIC_FIELDS,
		};

		return act('x_db:find_by_id', dbPayload)
			.then(({ errorCode$ = 'ERROR_NONE', data$ = {}, _meta$ = {}, errors$ = {} }) => {
				if (errorCode$ !== 'ERROR_NONE') {
					return done(null, { errorCode$, message$: 'User was not found. Please try again.', errors$ })
				}

				_.assign(data$, { full_name: `${data$.first_name} ${data$.last_name}` });
				return done(null, { data$, _meta$ });
			})
			.catch(_catch => done(null, { errorCode$: 'ERROR_SYSTEM', _catch }));
	});

	this.add('x_user:users, func:find_all', function xUserUsersFindAllUser({ payload$ = {} }, done) {
		payload$ = _.isObject(payload$) ? payload$ : {};
		let { select = [], condition = {}, order = { id: 'DESC' }, pagination = {} } = payload$, where = {};

		/** Prepare selected fields */
		if (!_.isArray(select)) select = [...REAL_PUBLIC_FIELDS, ...VIRTUAL_PUBLIC_FILEDS];
		select = _.uniq(_.filter(select, field => _.includes([...REAL_PUBLIC_FIELDS, ...VIRTUAL_PUBLIC_FILEDS], field)));
		const fullName = _.remove(select, field => field === 'full_name');
		if (!_.isEmpty(fullName)) select.push([Sequelize.fn('CONCAT', Sequelize.col('first_name'), ' ', Sequelize.col('last_name')), 'full_name']);

		/** Prepare filter condition */
		condition = _.isObject(condition) ? _.pickBy(condition, _.identity) : {};
		if (!_.isEmpty(condition)) {
			/** Only allow filter by String or Number and must be value on PUBLIC_FIELDS  */
			where = _.reduce(condition, (query, value, field) => {
				if ((!_.isString(value) && !_.isNumber(value)) || _.includes([...REAL_PUBLIC_FIELDS, ...VIRTUAL_PUBLIC_FILEDS], field)) {
					return query;
				}

				if (field === 'full_name') {
					return _.assign(query, { [field]: Sequelize.where(Sequelize.fn('CONCAT', Sequelize.col('first_name'), Sequelize.col('last_name')), { like: `%${value}%` }) })
				}

				/** Filter by Equal operator */
				if (_.includes(['status'], field)) {
					return _.assign(query, { [field]: value });
				}

				/** Filter by Like operator */
				if (_.includes(['username', 'email', 'first_name', 'last_name'], field)) {
					return _.assign(query, { [field]: { like: `%${value}%` } })
				}

				return query;
			}, {});
		}

		let dbPayload = {
			model: User.name,
			where,
			returnFields: select,
			pagination,
			order
		};

		return act('x_db:find_all', dbPayload)
			.then(done.bind(this, null))
			.catch(_catch => done(null, { errorCode$: 'ERROR_SYSTEM', _catch }));
	});

	this.add('x_user:users, func:update_by_id', function xUserUsersUpdateUser({ payload$ = {} }, done) {
		payload$ = _.isObject(payload$) ? payload$ : {};
		let { params = {}, attributes = {} } = payload$;

		/** Only allow update some fields */
		attributes = _.pick(attributes, ['status', 'first_name', 'last_name']);
		/**
		 * Sequelize will validate any field exist on attribute,
		 * not matter you set defaultValue or notEmpty or allowNull
		 * Just remove this attribute will make sure Sequelize will not validate this field
		 */
		if (!attributes.first_name) delete attributes.first_name;
		if (!attributes.last_name) delete attributes.last_name;

		/** Set validation field base on status */
		_.assign(attributes, generateValidationBaseOnStatus(attributes.status, String(attributes.email)));

		let dbPayload = {
			model: User.name,
			id: Number(params.id),
			attributes,
			saveFields: _.keys(attributes),
			returnFields: REAL_PUBLIC_FIELDS,
		};

		return act('x_db:update', dbPayload)
			.then(({ errorCode$ = 'ERROR_NONE', data$ = {}, _meta$ = {}, errors$ = {} }) => {
				if (errorCode$ !== 'ERROR_NONE') {
					return done(null, { errorCode$, message$: 'Can not update user. Please try again.', errors$ })
				}

				_.assign(data$, { full_name: `${data$.first_name} ${data$.last_name}` });
				return done(null, { data$, _meta$ });
			})
			.catch(_catch => done(null, { errorCode$: 'ERROR_SYSTEM', _catch }));
	});

	this.add('x_user:users, func:delete_by_id', function xUserUsersDeleteByIdUser({ payload$ = {} }, done) {
		payload$ = _.isObject(payload$) ? payload$ : {};
		let { params = {} } = payload$;

		let dbPayload = {
			model: User.name,
			id: Number(params.id),
			returnFields: REAL_PUBLIC_FIELDS,
		};

		return act('x_db:delete_by_id', dbPayload)
			.then(({ errorCode$ = 'ERROR_NONE', data$ = {}, _meta$ = {}, errors$ = {} }) => {
				if (errorCode$ !== 'ERROR_NONE') {
					return done(null, { errorCode$, message$: 'Can not update user. Please try again.', errors$ })
				}

				_.assign(data$, { full_name: `${data$.first_name} ${data$.last_name}` });
				return done(null, { data$, _meta$ });
			})
			.catch(_catch => done(null, { errorCode$: 'ERROR_SYSTEM', _catch }));
	});

	this.add('x_user:users, validate:unique', function xUserUsersValidateUnique({ payload$ }, done) {
		payload$ = _.isObject(payload$) ? payload$ : {};
		const { attributes = {} } = payload$;
		const { field = '', value = '' } = attributes;

		const uniqueFields = ['username', 'email'];
		if (!_.includes(uniqueFields, field)) {
			return done(null, { errorCode$: 'ERROR_INVALID_VALIDATION_FIELD', message$: `Validattion field is not allowed. You gave [${JSON.stringify(field)}].` });
		}

		return act('x_db:validate, scenario:unique', { model: User.name, field, value, })
			.then(done.bind(this, null))
			.catch(_catch => done(null, { errorCode$: 'ERROR_SYSTEM', _catch }));
	});

	/** You must return plugin name */
	return { name: 'XUserUsersService' };
}