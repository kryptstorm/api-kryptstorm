/** External modules */
import _ from 'lodash';

/** Internal modules */
import {
	modelName as model,
	prepareCondition, prepareReturnFields, prepareAttributes,
	publicFields, customPublicFields
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

		let modelData = {
			model,
			attributes: prepareAttributes(attributes),
			saveFields: [...publicFields, 'password', 'validation_type', 'validation_expired']
		};

		return act('x_db:create', modelData)
			.then((result = {}) => {
				/** Only return allow data to client */
				const data$ = _.pick(result.data$, [...publicFields, ...customPublicFields]);

				return done(null, _.assign(result, { data$ }));
			})
			.catch(_catch => done(null, { _catch }));
	});

	this.add('x_user:users, func:find_by_id', function xUserUsersFindByIdUser({ payload$ = {} }, done) {
		payload$ = _.isObject(payload$) ? payload$ : {};
		let { params } = payload$;

		return act('x_db:find_by_id', { model, id: Number(params.id), returnFields: publicFields })
			.then(done.bind(this, null))
			.catch(_catch => done(null, { _catch }));
	});

	this.add('x_user:users, func:find_all', function findUser({ payload$ = {} }, done) {
		payload$ = _.isObject(payload$) ? payload$ : {};
		let { select = [], condition = {}, order = { id: 'DESC' }, pagination = {} } = payload$;

		let modelData = {
			model,
			where: prepareCondition(condition),
			returnFields: prepareReturnFields(select),
			pagination,
			order
		};

		return act('x_db:find_all', modelData)
			.then(done.bind(this, null))
			.catch(_catch => done(null, { _catch }));
	});

	this.add('x_user:users, func:update_by_id', function xUserUsersUpdateUser({ payload$ = {} }, done) {
		payload$ = _.isObject(payload$) ? payload$ : {};
		let { params, attributes = {} } = payload$;

		let modelData = {
			model,
			id: Number(params.id),
			attributes: prepareAttributes(attributes),
			saveFields: [...publicFields]
		};

		return act('x_db:update', modelData)
			.then((result = {}) => {
				/** Only return allow data to client */
				const data$ = _.pick(result.data$, [...publicFields, ...customPublicFields]);

				return done(null, _.assign(result, { data$ }));
			})
			.catch(_catch => done(null, { _catch }));
	});

	this.add('x_user:users, func:delete_by_id', function xUserUsersDeleteByIdUser({ payload$ = {} }, done) {
		payload$ = _.isObject(payload$) ? payload$ : {};
		let { params = {} } = payload$;

		return act('x_db:delete_by_id', { model, id: Number(params.id), returnFields: publicFields })
			.then(done.bind(this, null))
			.catch(_catch => done(null, { _catch }));
	});

	this.add('x_user:users, validate:unique', function xUserUsersValidateUnique({ payload$ }, done) {
		payload$ = _.isObject(payload$) ? payload$ : {};
		const { attributes = {} } = payload$;
		const { field = '', value = '' } = attributes;

		const uniqueFields = ['username', 'email'];
		if (!_.includes(uniqueFields, field)) {
			return done(null, { errorCode$: 'ERROR_INVALID_VALIDATION_FIELD', message$: `Validattion field is not allowed. You gave [${JSON.stringify(field)}].` });
		}

		let params = {
			model,
			field,
			value,
		}

		return act('x_db:validate, scenario:unique', params)
			.then(done.bind(this, null))
			.catch(_catch => done(null, { _catch }));
	});

	/** You must return plugin name */
	return { name: 'XUserUsersService' };
}