/** External modules */
import Bluebird from "bluebird";
import _ from "lodash";

const _errorMessage =
  "Server encountered an error while trying to handle request";

export default function Services({
  services = {},
  beforeHooks = {},
  afterHooks = {}
}) {
  let _services;
  const asyncAct$ = Bluebird.promisify(this.act, { context: this });

  /** Hanle both internal and external service */
  const _asyncAct$ = (pattern, params, services) => {
    /** Internal service */
    if (this.has(pattern)) {
      return asyncAct$(pattern, params);
    }

    // const example = {
    //   "users:find_all": {
    //     method: "get",
    //     url: "http://localhost:9999/users"
    //   }
    // };
    /**
		 * External service 
		 * @todo Use axios
		 */
    if (services[pattern]) {
    }

    if (!_.isString(pattern)) pattern = this.util.pattern(pattern);
    return Bluebird.reject(
      new ServiceError(
        `Service [${pattern}] is not found. Please make sure you has registered internal or external service.`
      )
    );
  };

  /** Register async act */
  this.decorate("asyncAct$", (pattern, params = {}) => {
    /** Pattern of asyncAct$ must a string or an object */
    if (!_.isString(pattern) && !_.isObject(pattern)) {
      return Bluebird.reject(
        new ServiceError("Pattern of asyncAct$ must a string or an object.")
      );
    }

    /** Params of asyncAct$ must an object */
    if (!_.isObject(params)) {
      return Bluebird.reject(
        new ServiceError("Params of asyncAct$ must an object.")
      );
    }

    /** Resolve current pattern with hooks */
    const _patterns = [
      ..._prepareHooks(pattern, beforeHooks),
      pattern,
      ..._prepareHooks(pattern, afterHooks)
    ];

    return _.reduce(
      _patterns,
      (instance, _pattern) =>
        instance.then(result => {
          const {
            errorCode$ = "ERROR_NONE",
            message$ = "",
            data$ = {},
            errors$
          } = result;

          /** Server encountered an error while trying to handle request */
          if (!_.isUndefined(errors$)) {
            return Bluebird.reject(new ServiceError(errors$.message));
          }

          /** If errorCode$ is not equal to ERROR_NONE, response error code and error message */
          if (errorCode$ !== "ERROR_NONE") {
            return Bluebird.reject(new ServiceError(message$, errorCode$));
          }

          return _asyncAct$(_pattern, params).then(_result =>
            Bluebird.resolve(this.util.deepextend({}, result, _result))
          );
        }),
      Bluebird.resolve({})
    );
  });

  /** Register Service error */
  this.decorate(
    "errors$",
    (message, code, stack) => new ServiceError(message, code, stack)
  );

  this.add("init:Services", function initServices(args, done) {
    /** Both before and after hook must be an object */
    if (!_.isObject(beforeHooks) || !_.isObject(afterHooks)) {
      return done(
        this.errors$("Both before and after hook must be an object.")
      );
    }
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

const _prepareHooks = (pattern, hooks) => {
  let _patterns = [];
  if (_.isArray(hooks.global)) _patterns = [..._patterns, ...hooks.global];
  if (_.isArray(hooks[pattern])) _patterns = [..._patterns, ...hooks[pattern]];
  return _patterns;
};

class ServiceError extends Error {
  constructor(message, code = "ERROR_SYSTEM", stack) {
    super(message);
    this.errorCode = code;
    if (stack) {
      this.stack = stack;
    }
  }
}
