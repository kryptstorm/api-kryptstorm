/** External modules */
import Bluebird from "bluebird";

export default function Services({ services = {} }) {
  /** Register async act */
	this.decorate("asyncAct$", Bluebird.promisify(this.act, { context: this }));
	
  this.add("init:Services", function initServices(args, reply) {
    return reply();
  });

  return { name: "Services" };
}
