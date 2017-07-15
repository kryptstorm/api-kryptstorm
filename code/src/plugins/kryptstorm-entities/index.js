/** External modules */
import Bluebird from "bluebird";
import _ from "lodash";

export default function Entities() {
  let entities = [];
  this.add("init:Entities", function initEntities(args, reply) {
    return reply();
  });

  this.add("entities:add", function add({ name = "" }, reply) {
    /** Validate name of entity */
    if (!name) return reply(null, { errorCode$: "ENTITIES_ADD_EMPTY_NAME" });
    if (!_.isString(name))
      return reply(null, { errorCode$: "ENTITIES_ADD_INVALID_NAME" });

    /** Alway use lower case */
    entities.push(_.toLower(name));
    return reply(null, { data$: entities });
  });

  this.add("entities:run", function run(args, reply) {
    let entitiesAsync = {};
    /** Validate entities */
    if (_.isEmpty(entities))
      return reply(null, { errorCode$: "ENTITIES_EMPTY_ENTITIES" });

    /** Register entities */
    _.each(entities, entity => {
      /** Callback style entity method */
      const cbEntity = this.make$(`${entity}`);

      /** Register promise style for this entity */
      entitiesAsync[`${entity}$`] = {
        save$: Bluebird.promisify(cbEntity.save$, {
          context: cbEntity
        }),
        load$: Bluebird.promisify(cbEntity.load$, {
          context: cbEntity
        }),
        list$: Bluebird.promisify(cbEntity.list$, {
          context: cbEntity
        }),
        remove$: Bluebird.promisify(cbEntity.remove$, {
          context: cbEntity
        })
      };
    });

    this.decorate("Entities$", entitiesAsync);
    return reply(null, { data$: entitiesAsync });
  });

  return { name: "Entities" };
}
