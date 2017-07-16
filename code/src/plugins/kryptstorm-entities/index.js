/** External modules */
import Bluebird from "bluebird";
import _ from "lodash";

export default function Entities() {
  this.add("init:Entities", function initEntities(args, reply) {
    const entityClass = this.private$.exports.Entity.prototype,
      entity = this.private$.entity;

    /** Register async entity method */
    entityClass.asyncSave$ = Bluebird.promisify(entityClass.save$, {
      context: entity
    });
    entityClass.asyncList$ = Bluebird.promisify(entityClass.list$, {
      context: entity
    });
    entityClass.asyncLoad$ = Bluebird.promisify(entityClass.load$, {
      context: entity
    });
    entityClass.asyncRemove$ = Bluebird.promisify(entityClass.remove$, {
      context: entity
		});
		
    return reply();
  });

  return { name: "Entities" };
}
