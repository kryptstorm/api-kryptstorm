/** External modules */
import Bluebird from "bluebird";

export default function Services({ services = {} }) {
  this.add("init:Services", function initServices(args, reply) {
    /** Register Services$ */
    this.decorate("Services$", {
      actAsync: Bluebird.promisify(this.act, { context: this })
    });

    return reply();
  });

  return { name: "Services" };
}
