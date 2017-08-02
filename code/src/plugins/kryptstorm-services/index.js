/** External modules */
import Bluebird from "bluebird";

export default function Services({ services = {}, before = [], after = [] }) {
  const asyncAct$ = Bluebird.promisify(this.act, { context: this });
  console.log(this.prototype);

  /** Register async act */
  this.decorate("asyncAct$", asyncAct$);

  this.add("init:Services", function initServices(args, done) {
    return done();
  });

  return { name: "Services" };
}

const ex = {
  "users:find_all": {
    method: "get",
    url: "http://localhost:9999/users"
  }
};
