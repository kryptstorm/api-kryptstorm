/** External modules */
import Express from "express";
import BodyParser from "body-parser";
import Cors from "cors";
import MethodOverride from "method-override";
import _ from "lodash";
import Config from "config";
import Bluebird from "bluebird";

let defaultOptions = {
  withDefaultConfig: true,
  isDebug: false,
  queryConfig: { limit: 20, skip: 0 },
  routes: {},
  auth: {},
  mws: {},
  hooksBefore: {},
  hooksAfter: {}
};

/**
 * Example routes
 * const routes = {'get:/user': { pattern: 'user:find_all', roles: [] }}
 * 
 */
export default function Https(options) {
  /** Register plugin options */
  this.options({
    Https: this.util.deepextend(defaultOptions, options)
  });
  /** Retrive options */
  const { withDefaultConfig, isDebug, queryConfig } = this.options().Https;

  /** Plugin variable */
  const asyncAct$ = this.asyncAct$;
  let server;

  /** Init function */
  this.add("init:Http", function initHttp(args, reply) {
    /** Init express server */
    server = Express();
    if (withDefaultConfig) {
      /** Default config */
      server.use(MethodOverride("X-HTTP-Method-Override"));
      server.use(Cors({ methods: ["GET", "POST"] }));
      server.use(BodyParser.json());
      server.use(BodyParser.urlencoded({ extended: true }));
    }

    return reply();
  });

  /**
	 * 1. Handle all routes
	 * 2. Handle 404
	 * 3. Handle error
	 */
  this.add("http:run", function run(args, reply) {
    /**
		 * We can get routes from 2 source
		 * 1. Global config - routes
		 * 2. Local config of each modules  - this.options().Https.routes
		 * 
		 * The glbal routes has more priority than local routes
		 */
    const { routes, auth, mws, hooksBefore, hooksAfter } = this.options().Https;

    /** Return err if routes is empty */
    if (_.isEmpty(routes) || !_.isObject(routes)) {
      return reply(
        new Error(
          "You must defined routes on each module/plugin or when you reigster http plugin."
        )
      );
    }

    /** Execute midelware if it is not empty array */
    if (_.isArray(mws) && !_.isEmpty(mws)) {
      server.use((req, res, next) => {
        /** Defined where we will store midleware data */
        req.mws$ = {};
        /** Execute midleware pattern */
        let _mws = [];
        _.each(mws, mw => _mws.push(asyncAct$(mw)));

        /**
				 * The midelware will execute with rule
				 * First come, first served
				 * Current data will overwrite previous data
				 */
        return Bluebird.all(_mws)
          .then(mwData =>
            _.reduce(
              mwData,
              (mws$, { data$ = {} }) => _.assign(mws$, data$),
              req.mws$
            )
          )
          .catch(err => next(err));
      });
    }

    /** Handle each route */
    _.each(routes, (pattern, route) => {
      /** route must be a string */
      if (!_.isString(route))
        return console.log(
          `Routes must be a string. You gave [${JSON.stringify(route)}]`
        );
      /** route can not be blank */
      if (!route) return console.log("Routes can not e blank");

      const methodAndUrl = route.split("::");
      const method = _.toLower(methodAndUrl[0]),
        url = methodAndUrl[1];
      /** route must contain method and url with format _method_:_url_ */
      if (!method || !url)
        return console.log(
          `Route must contain method and url with format _method_:_url_. You gave [${route}]`
        );
      /** Allow method was defined at api.httpVerbs */
      if (!_.includes(Config.get("api.httpVerbs"), method))
        return console.log(
          `Method [${method}] is not allowed. It must be in [${JSON.stringify(
            Config.get("api.httpVerbs")
          )}]`
        );

      /** Pattern must be a string */
      if (!_.isString(pattern))
        return console.log("Seneca pattern must defined as a string.");
      /** Pattern mus be registered */
      if (!this.has(pattern))
        return console.log(`Pattern [${pattern}] has not been registered.`);

      server[method](url, (req, res, next) =>
        asyncAct$(pattern, _getPayload(req, { queryConfig }))
          .then(
            ({
              errorCode$ = "ERROR_NONE",
              message$ = "",
              data$ = {},
              meta$ = {},
              errors$
            }) => {
              /** 
							 * If error$ is defined
							 * 1. Or system error 
							 * 2. Or validation error
							 */
              if (!_.isUndefined(errors$)) return next(errors$);

              /** If errorCode$ is not equal to ERROR_NONE, response error and error message */
              if (errorCode$ !== "ERROR_NONE") {
                return res.json({ errorCode: errorCode$, message: message$ });
              }

              return res.json({
                errorCode: errorCode$,
                data: data$,
                meta: meta$
              });
            }
          )
          .catch(error => next(error))
      );
    });

    /** Default config */
    if (withDefaultConfig) {
      /** Handle 404 error */
      server.use(_http404);

      /** Handle system error */
      server.use(_httpError.bind(this, isDebug));
    }

    return reply(null, { data$: server });
  });

  return { name: "Http" };
}

const _getPayload = (req, { queryConfig = {} }) => {
  const { query = {}, body = {}, params = {}, method } = req;
  let { limit, page, sort, token = "" } = query;

  let _payload = {};

  /** Get JWT from header or query */
  if (!token) token = req.get("Token");
  _payload.token = !_.isString(token) ? token : "";

  /** Bind _payload */
  switch (method) {
    case "POST":
      _payload.attributes = _.isObject(body) ? body : {};
      break;
    case "GET":
      _payload.query = _preapreQuery(query, [
        "limit",
        "page",
        "sortBy",
        "asc",
        "token"
      ]);
      _payload.sort = _prepareSort(sort);
      _payload.params = params;
      _.assign(_payload, _preparePagination(limit, page, { queryConfig }));
      break;
    case "PUT":
      _payload.params = params;
      _payload.attributes = _.isObject(body) ? body : {};
      break;
    case "DELETE":
      _payload.params = params;
      break;
  }

  return _payload;
};

const _preapreQuery = (query = {}, excludeFields) => {
  /** Return empty object if query have invalid type */
  if (!_.isObject(query) || _.isEmpty(query)) {
    return {};
  }
  /** Return full query data if excludeFields is not an array or is empty */
  if (_.isEmpty(excludeFields) || !_.isArray(excludeFields)) return query;

  return _.omit(query, excludeFields);
};

const _prepareSort = sort => {
  if (!_.isString(sort) || !sort) sort = "id";
  return _.reduce(
    sort.split(","),
    (_sort, field) => {
      if (field[0] !== "-") return _.assign(_sort, { [field]: 1 });
      return _.assign(_sort, { [field.substr(1)]: -1 });
    },
    {}
  );
};

const _preparePagination = (limit, page, { queryConfig = {} }) => {
  let pagination = _.assign({}, queryConfig);

  limit = parseInt(limit, 10);
  page = parseInt(page, 10);

  if (_.isNumber(limit) && limit > 0) {
    pagination.limit = limit;
  }
  if (_.isNumber(page) && page > 0) {
    pagination.skip = (page - 1 < 0 ? page : page - 1) * limit;
  }
  return pagination;
};

const _http404 = (req, res, next) => {
  return res.status(404).json({
    errorCode: "ERROR_NOT_FOUND",
    message: `The requested URL [${req.url}] was not found on this server`
  });
};

const _httpError = (isDebug, err, req, res, next) => {
  /** Validate error, err will be object of error */
  if (err && !_.isError(err) && _.isObject(err)) {
    return res.json({
      errorCode: "VALIDATION_FAILED",
      message: "Validation has been failed. Please try again.",
      errors: err
    });
  }

  /** System error */
  const message =
    isDebug && err.message
      ? err.message
      : "Server encountered an error while trying to handle request";
  return res.status(500).json({ errorCode: "ERROR_SYSTEM", message });
};
