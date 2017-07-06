/** External modules */
import _ from 'lodash';
import { ValidationError } from 'sequelize';
import Config from 'config';


/** Error handler for mariadb */
export function xMariadbErrorHandler(done, returnErrorFields = [], _catch) {
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

/** Model validation */
export function xMariadbModelValidate(model, db, tablePrefix) {
	if (!model || !_.isString(model)) {
		return new Error(`Params "model" must be string and can not be blank. You gave [${JSON.stringify(model)}]`)
	}

	const modelName = `${tablePrefix}_${model}`;
	if (!db.isDefined(modelName)) {
		return new Error(`Model [${model}] was not register.`);
	}

	return modelName;
}

/** Resolve pagination */
export function xMariadbResolvePagination(pagination) {
	if (!_.isObject(pagination) || _.isEmpty(pagination)) {
		return { offset: 0, limit: Config.get('api.perPageLimit') };
	}

	let { offset, limit } = pagination
	offset = (_.isNumber(offset) && offset > -1) ? offset : 0;
	limit = (_.isNumber(limit) && limit > 0) ? limit : Config.get('api.perPageLimit');
	return { offset, limit };
}

/** Resolve return fields */
export function xMariadbResolveReturnFields(returnFields) {
	/** If params don't have returnFields, only return id */
	returnFields = (_.isEmpty(returnFields) || !_.isArray(returnFields)) ? ['id'] : returnFields;
	return _.uniq(returnFields);
}
