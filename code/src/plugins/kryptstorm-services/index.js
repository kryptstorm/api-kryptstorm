/** External modules */
import Bluebird from "bluebird";
import _ from "lodash";

export default function Services({ services = {}, before = [], after = [] }) {
  const asyncAct$ = Bluebird.promisify(this.act, { context: this });

  /** Register async act */
  this.decorate("asyncAct$", (pattern, params) => {
    /** Convert object to string */
    if (_.isObject(pattern)) pattern = this.util.pattern(pattern);
    if (!_.isObject(params)) params = {};

    return asyncAct$(pattern, params);
  });

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
