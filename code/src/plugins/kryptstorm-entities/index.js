/** External modules */
import Bluebird from "bluebird";
import _ from "lodash";

export default function Entities() {
  let entities = {};
  this.add("init:Entities", function initEntities(args, reply) {
    return reply();
  });

  this.add("entities:add", function add({ entity = {} }, reply) {
    /** entity must be an object */
    if (!_.isObject(entity)) {
      return reply(null, { errorCode$: "ENTITIES_INVALID_FORMAT_ENTITY" });
    }
    /** entity cannot be blank */
    if (_.isEmpty(entity)) {
      return reply(null, { errorCode$: "ENTITIES_EMPTY_ENTITY" });
    }
    /** Register entity */
    _.assign(entities, entity);
    return reply(null, { data$: entities });
  });

  this.add("entities:run", function run(args, reply) {
    /** entities cannot be blnak */
    if (_.isEmpty(entities)) {
      return reply(null, { errorCode$: "ENTITIES_EMPTY_ENTITIES" });
    }
    const entityClass = this.private$.exports.Entity.prototype;
    let Entity$ = {};

    /**
		 * Register entities 
		 * source example: 
		 * - ["mongo", "kryptstorm", "users"]
		 * - [null, "kryptstorm", "users"]
		 * - [null, null, "users"]
		 */
    _.each(entities, (source = [], name) => {
      /** Validate source */
      if (!_.isArray(source)) {
        return console.log(`Entity with name ${name} must be an array.`);
      }
      /** Create entity with source */
      const entity = this.make$.apply(this, source);

      Entity$[name] = _.assign(entity, {
        asyncSave$: (options = {}, isNative = false) => {
          /** Ensure params have valid type */
          if (!_.isObject(options)) options = {};

          const { returnFields = [] } = options;
          const asyncSave$ = Bluebird.promisify(entityClass.save$, {
            context: entity
          });

          /** Return enity instead of attribute object */
          if (isNative) return asyncSave$();

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
        asyncList$: (query = {}, options = {}, isNative = true) => {
          /** Ensure params have valid type */
          if (!_.isObject(query)) query = {};
          if (!_.isObject(options)) options = {};

          const { returnFields = [] } = options;
          const asyncList$ = Bluebird.promisify(entityClass.list$, {
            context: entity
          });

          /** Return enity instead of attribute object */
          if (isNative) return asyncList$(query);

          return asyncList$(query).then(rows => {
            let result = [];
            _.each(rows, row => {
              const data = row.data$();
              let tmp = {};

              /** If returnFields is defined, only retrieve field on returnFields */
              if (_.isArray(returnFields) && !_.isEmpty(returnFields)) {
                result.push(_.pick(data, returnFields));
                return false;
              }
              /** Return all field, exclude system field - postfix with $ */
              _.each(data, (v, k) => {
                if (!_.includes(k, "$")) tmp[k] = v;
              });

              /** Return data */
              result.push(tmp);
            });
            return Bluebird.resolve(result);
          });
        },
        asyncLoad$: (id = "", options = {}, isNative = true) => {
          /** Ensure params have valid type */
          if (!_.isObject(id)) id = "";
          if (!_.isObject(options)) options = {};

          const { returnFields = [] } = options;
          const asyncLoad$ = Bluebird.promisify(entityClass.load$, {
            context: entity
          });

          /** Return enity instead of attribute object */
          if (isNative) return asyncLoad$(id);

          return asyncLoad$(id).then(row => {
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
        asyncRemove$: Bluebird.promisify(entityClass.remove$, {
          context: entity
        })
      });
    });

    /** Register Entity$ */
    this.decorate("Entity$", Entity$);
    return reply(null, { data$: Entity$ });
  });

  return { name: "Entities" };
}
