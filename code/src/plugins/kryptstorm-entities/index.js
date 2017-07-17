/** External modules */
import Bluebird from "bluebird";
import _ from "lodash";

let defaultQuery = { limit$: 20, skip$: 0, fields$: ["id"] };

export default function Entities({ query = {} }) {
  /** Overwrite default config */
  _.assign(defaultQuery, _.pick(query, _.keys(defaultQuery)));

  const entityClass = this.private$.exports.Entity.prototype,
    self = this;
  let Entity$ = {};

  /** Defined entity async method  */
  const asyncFunc = entity => ({
    asyncSave$: (options = {}, returnEntity = false) => {
      /** Ensure params have valid type */
      if (!_.isObject(options)) options = {};

      const { returnFields = [] } = options;
      const asyncSave$ = Bluebird.promisify(entityClass.save$, {
        context: entity
      });

      /** Return enity instead of attribute object */
      if (returnEntity) return asyncSave$();

      return asyncSave$().then(row => {
        const data = row.data$();
        let result = {};

        /** If returnFields is defined, only retrieve field on returnFields */
        if (_.isArray(returnFields) && !_.isEmpty(returnFields)) {
          return Bluebird.resolve(_.pick(data, returnFields));
        }
        /** Return all field, exclude system field - postfix with $ */
        _.each(data, (v, k) => {
          if (!_.includes(k, "$")) result[k] = v;
        });

        return Bluebird.resolve(result);
      });
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
        _.each(rows, row => result.push(_formatRow(row.data$())));
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

      return asyncLoad$(resolveQuery).then(row => {
        const data = row.data$();
        let result = {};

        return Bluebird.resolve(_formatRow(data));
      });
    },
    asyncRemove$: Bluebird.promisify(entityClass.remove$, {
      context: entity
    })
  });

  this.add("init:Entities", function initEntities(args, reply) {
    /** Inject async method to all instance */
    entityClass.fixMake$ = function fixMake$() {
      const entity = entityClass.make$.call(this);
      return _.assign(entity, asyncFunc(entity));
    };

    /** Decorate fixMake method to ensure entity async method will availabel */
    this.decorate("Enities$", {
      fixMake$: (zone = null, base = null, name = null) => {
        const entity = this.make$(zone, base, name);
        return _.assign(entity, asyncFunc(entity));
      }
    });

    return reply();
  });

  return { name: "Entities" };
}

const _formatRow = row => {
  let result = {};
  _.each(row, (v, c) => (!_.includes(c, "$") ? (result[c] = v) : result));
  return result;
};
