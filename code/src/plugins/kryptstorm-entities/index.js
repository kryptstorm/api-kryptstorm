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
    /** Inject async method to all instance */
    entityClass.makeWithAsync$ = function makeWithAsync$() {
      const entity = entityClass.make$.call(this);
      return _.assign(entity, asyncFunc(entity, entityClass));
    };

    /** Decorate makeWithAsync method to ensure entity async method will availabel */
    this.decorate("Enities$", {
      makeWithAsync$: (zone = null, base = null, name = null) => {
        const entity = this.make$(zone, base, name);
        return _.assign(entity, asyncFunc(entity, entityClass));
      }
    });

    /** Register validator */
    _.assign(ValidateJS.validators, _validators(this));

    return reply();
  });

  return { name: "Entities" };
}

const _formatRow = (row, fields$) => {
  let result = {};
  if (!row) return result;

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
        /** Check validatorParams must be params of makeWithAsync$ */
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

        App.Enities$.makeWithAsync$
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

/** Defined entity async method  */
const asyncFunc = (entity, entityClass) => ({
  asyncSave$: (query = {}, returnEntity = false) => {
    /** Ensure params have valid type */
    if (!_.isObject(query)) query = {};

    const asyncSave$ = Bluebird.promisify(entityClass.save$, {
      context: entity
    });
    const resolveQuery = _.assign({}, defaultQuery, query);

    /** Return enity instead of attribute object */
    if (returnEntity) return asyncSave$();

    return asyncSave$().then(row =>
      Bluebird.resolve(_formatRow(row ? row.data$() : {}, resolveQuery.fields$))
    );
  },
  asyncList$: (query = {}, returnEntity = false) => {
    /** Ensure params have valid type */
    if (!_.isObject(query)) query = {};

    const asyncList$ = Bluebird.promisify(entityClass.list$, {
      context: entity
    });
    const resolveQuery = _.assign({}, defaultQuery, query);

    /** Return enity instead of attribute object */
    if (returnEntity) return asyncList$(resolveQuery);

    return asyncList$(resolveQuery).then(rows => {
      let result = [];
      _.each(rows, row => result.push(_formatRow(row ? row.data$() : {})));
      return Bluebird.resolve(result);
    });
  },
  asyncLoad$: (query = {}, returnEntity = false) => {
    /** Ensure params have valid type */
    if (!_.isObject(query)) query = {};

    const asyncLoad$ = Bluebird.promisify(entityClass.load$, {
      context: entity
    });
    const resolveQuery = _.assign({}, defaultQuery, query);

    /** Return enity instead of attribute object */
    if (returnEntity) return asyncLoad$(resolveQuery);

    return asyncLoad$(resolveQuery).then(row =>
      Bluebird.resolve(_formatRow(row ? row.data$() : {}))
    );
  },
  asyncRemove$: Bluebird.promisify(entityClass.remove$, {
    context: entity
  })
});
