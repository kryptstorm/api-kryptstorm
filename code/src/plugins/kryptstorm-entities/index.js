/** External modules */
import ValidateJS from "validate.js";
import Bluebird from "bluebird";
import _ from "lodash";

/* Config ValidateJS promise */
ValidateJS.Promise = Bluebird;

/** Default query */
let defaultQuery = { limit$: 20, skip$: 0, fields$: ["id"] };

export default function Entities({ query = {} }) {
  /** Overwrite default config */
  _.assign(defaultQuery, _.pick(query, _.keys(defaultQuery)));

  const entityClass = this.private$.exports.Entity.prototype,
    self = this;
  let Entity$ = {};

  this.add("init:Entities", function initEntities(args, reply) {
    entityClass.asyncSave$ = function asyncSave$(
      query = {},
      returnEntity = false
    ) {
      /** Ensure params have valid type */
      if (!_.isObject(query)) query = {};

      const resolveQuery = _.assign({}, defaultQuery, query);
      const _asyncSave$ = Bluebird.promisify(entityClass.save$, {
        context: this
      });

      /** Return enity instead of attribute object */
      if (returnEntity) return _asyncSave$({});

      return _asyncSave$().then(row =>
        Bluebird.resolve(_formatRow(row, resolveQuery.fields$))
      );
    };

    entityClass.asyncList$ = function asyncList$(
      query = {},
      returnEntity = false
    ) {
      /** Ensure params have valid type */
      if (!_.isObject(query)) query = {};

      const resolveQuery = _.assign({}, defaultQuery, query);
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

    entityClass.asyncLoad$ = function asyncLoad$(
      query = {},
      returnEntity = false
    ) {
      /** Ensure params have valid type */
      if (!_.isObject(query)) query = {};

      const resolveQuery = _.assign({}, defaultQuery, query);
      const _asyncLoad$ = Bluebird.promisify(entityClass.load$, {
        context: this
      });

      /** Return enity instead of attribute object */
      if (returnEntity) return _asyncLoad$(resolveQuery);

      return _asyncLoad$(resolveQuery).then(row =>
        Bluebird.resolve(_formatRow(row))
      );
    };

    entityClass.asyncRemove$ = function asyncRemove$(query = {}) {
      /** Ensure params have valid type */
      if (!_.isObject(query)) return Bluebird.resolve({});
      const returnFields = _.assign({}, defaultQuery, query).fields$;

      const resolveQuery = _.assign(
        { all$: false, load$: true },
        _.omit(query, ["fields$"])
      );
      /** fields is custom field, we should delete it before run remove command */
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
