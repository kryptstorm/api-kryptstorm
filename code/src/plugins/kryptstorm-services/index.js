/** External modules */
import Bluebird from "bluebird";
import _ from "lodash";

export default function Services({ services = {}, before = [], after = [] }) {
  const asyncAct$ = Bluebird.promisify(this.act, { context: this });
  let _services;

  /** Register async act */
  this.decorate("asyncAct$", (pattern, params) => {
    /** Internal service */
    if (this.has(pattern)) {
      return asyncAct$(pattern, params);
    }

    /** External service */
    if (_services[pattern]) {
    }

    if (!_.isString(pattern)) pattern = this.util.pattern(pattern);
    return Bluebird.reject(
      new Error(
        `Service [${pattern}] is not found. Please make sure you has registered internal or external service.`
      )
    );
  });

  this.add("init:Services", function initServices(args, done) {
    /** Parse services */
    _services = _prepareServices(services);
    return done();
  });

  return { name: "Services" };
}

const _prepareServices = services =>
  _.reduce(
    services,
    (_services, pattern, info) => {
      if (!_.isString(pattern)) return _services;
      if (_.isString(info)) {
        return (_services[pattern] = {
          method: "get",
          url: info
        });
      }
      if (!_.isObject(info) || !_.isString(method.method) || !_.isString(url))
        return _services;
      return (_services[pattern] = info);
    },
    {}
  );
const ex = {
  "users:find_all": {
    method: "get",
    url: "http://localhost:9999/users"
  }
};
