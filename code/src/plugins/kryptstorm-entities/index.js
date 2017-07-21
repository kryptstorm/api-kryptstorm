/** External modules */
import ValidateJS from "validate.js";
import Bluebird from "bluebird";
import _ from "lodash";

/* Config ValidateJS promise */
ValidateJS.Promise = Bluebird;

/** Default query */
let defaultOptions = { queryConfig: { limit$: 20, skip$: 0, fields$: ["id"] } };

export default function Entities(options) {
  /** Register plugin options */
  this.options({
    Entities: this.util.deepextend(defaultOptions, options)
  });
  /** Retrive options */
	const { queryConfig } = this.options().Entities;

  const entityClass = this.private$.exports.Entity.prototype;

  /**
	 * Save data by async method
	 * Assume you have an entity, let enity = this.make$("mongo", "kryptstorm", "users");
	 * 1. If enity have a function fields$ => entity only save all fields return by this function
	 * 2. If query have fields$ (type is array) => after save data successfully, only fields on this array will be return
	 * 3. If returnEntity is true, enity will be return instead of attributes object
	 * 
	 * query can have 
	 * 1. native$
	 * 	- object => use object as query, no meta settings
	 * 	- array => use first elem as query, second elem as meta settings
	 * 2. fields$ (default is ["id"]) only return fields on this param 
	 * @param {object} query defined query of entity
	 * @param {bool} returnEntity if true, result is entity instead of attributes object
	 * 
	 */
  entityClass.asyncSave$ = function asyncSave$(
    query = {},
    returnEntity = false
  ) {
    /** Ensure params have valid type */
    if (!_.isObject(query)) query = {};

    const resolveQuery = _.assign({}, queryConfig, query);
    const _asyncSave$ = Bluebird.promisify(entityClass.save$, {
      context: this
    });

    /** Return enity instead of attribute object */
    if (returnEntity) return _asyncSave$();

    return _asyncSave$().then(row =>
      Bluebird.resolve(_formatRow(row, resolveQuery.fields$))
    );
  };

  /**
	 * Get list of data by async method
	 * query can have
	 * 1. native$
	 * 	- object => use object as query, no meta settings
	 * 	- array => use first elem as query, second elem as meta settings
	 * 2. fields$ (default is ["id"]) only return fields on this param
	 * 3. limit$ number of rows should be return
	 * 4. skip$
	 * 5. sort$ {field_1: -1, field_2: 1}
	 * Other attributes is awhat seneca-mongo put to mongo
	 * 
	 * @param {object} query defined query of entity
	 * @param {bool} returnEntity if true, result is entity instead of attributes object
	 */
  entityClass.asyncList$ = function asyncList$(
    query = {},
    returnEntity = false
  ) {
    /** Ensure params have valid type */
    if (!_.isObject(query)) query = {};

    const resolveQuery = _.assign({}, queryConfig, query);
    const _asyncList$ = Bluebird.promisify(entityClass.list$, {
      context: this
    });

    /** Return enity instead of attribute object */
    if (returnEntity) return _asyncList$(resolveQuery);

    return _asyncList$(resolveQuery).then(rows => {
      let result = [];
      _.each(rows, row => result.push(_formatRow(row)));
      return Bluebird.resolve(result);
    });
  };

  /**
	 * Get data by async method
	 * query can have 
	 * 1. native$
	 * 	- object => use object as query, no meta settings
	 * 	- array => use first elem as query, second elem as meta settings
	 * 2. fields$ (default is ["id"]) only return fields on this param 
	 * 
	 * @param {object} query defined query of entity
	 * @param {bool} returnEntity if true, result is entity instead of attributes object
	 */
  entityClass.asyncLoad$ = function asyncLoad$(
    query = {},
    returnEntity = false
  ) {
    /** Ensure params have valid type */
    if (!_.isObject(query)) query = {};

    const resolveQuery = _.assign({}, queryConfig, query);
    const _asyncLoad$ = Bluebird.promisify(entityClass.load$, {
      context: this
    });

    /** Return enity instead of attribute object */
    if (returnEntity) return _asyncLoad$(resolveQuery);

    return _asyncLoad$(resolveQuery).then(row =>
      Bluebird.resolve(_formatRow(row))
    );
  };

  /**
	 * Remove data by async method
	 * query can have
	 * 1. native$
	 * 	- object => use object as query, no meta settings
	 * 	- array => use first elem as query, second elem as meta settings
	 * 2. all$ (default is false) Delete all fields match condition
	 * 3. load$ (default is true) Return data after delete an entity
	 * 4. fields (default is ["id"]) only return fields on this param. That is option provide by Kryptstorm
	 * 
	 * @param {object} query defined query of entity
	 * @param {bool} returnEntity if true, result is entity instead of attributes object
	 */
  entityClass.asyncRemove$ = function asyncRemove$(query = {}) {
    /** Ensure params have valid type */
    if (!_.isObject(query)) return Bluebird.resolve({});
    const returnFields = _.assign({}, queryConfig, query).fields$;

    const resolveQuery = _.assign(
      { all$: false, load$: true },
      _.omit(query, ["fields$"])
    );
    /** fields$ is custom field, we should delete it before run remove command */
    delete query.fields$;
    const _asyncRemove$ = Bluebird.promisify(entityClass.remove$, {
      context: this
    });

    return _asyncRemove$(resolveQuery).then(row => {
      /** Delete many fields */
      if (resolveQuery.all$) return Bluebird.resolve([]);
      /** Delete 1 row and load data after deleted */
      if (resolveQuery.load$) {
        return Bluebird.resolve(_formatRow(row, returnFields));
      }
      /** Delete 1 row and keep slient */
      return Bluebird.resolve({});
    });
  };

  entityClass.asyncNative$ = function asyncNative$() {
    const _asyncNative$ = Bluebird.promisify(entityClass.native$, {
      context: this
    });

    return _asyncNative$();
  };

  this.add("init:Entities", function initEntities(args, reply) {
    /** Register validator */
    _.assign(ValidateJS.validators, _validators(this));
    return reply();
  });

  return { name: "Entities" };
}

const _formatRow = (entity, fields$) => {
  let result = {},
    row;
  /** Invalid entity */
  if (!entity || !_.isObject(entity)) return result;
  /** entity is seneca entity */
  if (typeof entity.data$ === "function") {
    row = entity.data$();
  } else {
    /** Result of remove function is a mongo object, convert it to entity-like */
    row = _.assign(entity, { id: entity._id });
  }

  const _row = _.isArray(fields$) ? _.pick(row, fields$) : row;
  _.each(_row, (v, c) => (!_.includes(c, "$") ? (result[c] = v) : result));
  return result;
};

/**
 * Validator
 * Valid format of validation message, ValidateJS will auto generate message when you use ValidateJS.format
 * 
 * Short syntax
 * 1. "has been taken." => ValidateJS will auto generate to "Username has been taken."
 * 
 * You should know ValidateJS.format use regex, so, "^" char will said to ValidateJS.format know where message is begin
 * 2. "^This %{value} has been taken." => ValidateJS will auto generate to "This username has been taken." 
 */
const _validators = App => {
  return {
    unique: (
      attributeValue,
      validatorParams,
      attributeField,
      attributesInput
    ) => {
      return new ValidateJS.Promise((resolve, reject) => {
        /** Check validatorParams must be params of make$ */
        if (!_.isArray(validatorParams) || validatorParams.length !== 3) {
          return resolve(
            ValidateJS.format(
              "^Cannot validate field [%{field}] with value (%{value}).",
              {
                field: attributeField,
                value: attributeValue
              }
            )
          );
        }

        App.make$
          .apply(null, validatorParams)
          .asyncLoad$({ [attributeField]: attributeValue })
          .then(
            result =>
              result.id
                ? resolve(
                    ValidateJS.format(
                      "^This %{field} (%{value}) has been taken.",
                      {
                        field: attributeField,
                        value: attributeValue
                      }
                    )
                  )
                : resolve()
          )
          .catch(err => reject(err));
      });
    }
  };
};
