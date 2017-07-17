/** External modules */
import Express from "express";
import BodyParser from "body-parser";
import Cors from "cors";
import MethodOverride from "method-override";
import _ from "lodash";
import Config from "config";

let defaultPagination = { limit: 20, skip: 0 };

/**
 * Example routes
 * const routes = {'get:/user': { pattern: 'user:find_all', roles: [] }}
 * 
 * @export Http
 * @param Object { withDefaultConfig = '', isDebug = false } 
 * @returns Object
 */
export default function Http({
  withDefaultConfig = true,
  isDebug = false,
  pagination = {}
}) {
  /** Overwrite default config */
  _.assign(defaultPagination, _.pick(pagination, _.keys(defaultPagination)));

  const { actAsync } = this.Services$;
  let server,
    serverRoutes = {},
    mwBefore = [],
    mwAfter = [];

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

  /** Add midleware to express before execute all route */
  this.add("http:add_midleware, scenario:before", function addMidleware(
    { pattern = "" },
    reply
  ) {
    mwBefore.push(pattern);
    return reply(null, mwBefore);
  });

  /** Add midleware to express after  execute all route */
  this.add("http:add_midleware, scenario:after", function addMidleware(
    { pattern = "" },
    reply
  ) {
    mwAfter.push(pattern);
    return reply(null, mwAfter);
  });

  /** Update route if it has alrady exist, add new if it is not exist */
  this.add("http:save_route", function saveRoute(
    { url = "", handler = {} },
    reply
  ) {
    /** url must be a string */
    if (!_.isString(url)) {
      return reply(null, {
        errorCode$: "HTTP_SAVE_ROUTE_INVALID_URL",
        message$: `To inject route handler, url must be a string. You gave ${JSON.stringify(
          url
        )}`
      });
    }
    /** handler must be an object */
    if (!_.isObject(handler)) {
      return reply(null, {
        errorCode$: "HTTP_SAVE_ROUTE_INVALID_HANDLER",
        message$: `To inject route handler, handler must be an object. You gave ${JSON.stringify(
          handler
        )}`
      });
    }

    if (serverRoutes[url]) {
      console.warn(
        `You are overwrite route ${url}. Before handler is: ${serverRoutes[
          url
        ]}`
      );
      _.assign(serverRoutes[url], handler);
    } else {
      serverRoutes[url] = handler;
    }

    return reply(null, { data$: serverRoutes });
  });

  /** Save multi routes */
  this.add("http:save_routes", function saveRoutes({ routes }, reply) {
    /** routes must be an object */
    if (!_.isObject(routes)) {
      return reply(null, {
        errorCode$: "HTTP_SAVE_ROUTES_INVALID_ROUTE",
        message$: `To register routes, routes must be an object. You gave ${JSON.stringify(
          routes
        )}`
      });
    }

    _.assign(serverRoutes, routes);
    return reply(null, serverRoutes);
  });

  /**
	 * 1. Handle all routes
	 * 2. Handle 404
	 * 3. Handle error
	 */
  this.add("http:run", function run(args, reply) {
    /** Midleware before handl all route */
    if (!_.isEmpty(mwBefore)) {
      _.each(mwBefore, pattern =>
        server.use((req, res, next) =>
          actAsync(pattern, {})
            .then(
              ({
                errorCode$ = "ERROR_NONE",
                message$ = "",
                data$ = {},
                meta$
              }) => {
                if (errorCode$ !== "ERROR_NONE") {
                  return res.json({ errorCode: errorCode$, message: message$ });
                }
                return next();
              }
            )
            .catch(error => next(error))
        )
      );
    }

    /** Handle each route */
    _.each(serverRoutes, (pattern, route) => {
      /** route must be a string */
      if (!_.isString(route))
        return console.log(
          `Routes must be a string. You gave [${JSON.stringify(route)}]`
        );
      /** route can not be blank */
      if (!route) return console.log("Routes can not e blank");

      const methodAndUrl = route.split("::");
      const method = methodAndUrl[0],
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

      server[method](url, (req, res) =>
        actAsync(pattern, _getPayload(req))
          .then(
            ({
              errorCode$ = "ERROR_NONE",
              message$ = "",
              data$ = {},
              meta$
            }) => {
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

    /** Midleware after handl all route */
    if (!_.isEmpty(mwAfter)) {
      _.each(mwAfter, pattern =>
        server.use((req, res, next) =>
          actAsync(pattern, {})
            .then(
              ({
                errorCode$ = "ERROR_NONE",
                message$ = "",
                data$ = {},
                meta$
              }) => {
                if (errorCode$ !== "ERROR_NONE") {
                  return res.json({ errorCode: errorCode$, message: message$ });
                }
                return next();
              }
            )
            .catch(error => next(error))
        )
      );
    }

    /** Default config */
    if (withDefaultConfig) {
      /** Handle 404 error */
      server.use((req, res, next) => {
        return res.status(404).json({
          errorCode: "ERROR_NOT_FOUND",
          message: `The requested URL [${req.url}] was not found on this server`
        });
      });

      /** Handle system error */
      server.use((err, req, res, next) => {
        if (err) {
          const message = isDebug
            ? err.message
            : "Server encountered an error while trying to handle request";
          return res.status(500).json({ errorCode: "ERROR_SYSTEM", message });
        }

        return next(err);
      });
    }

    return reply(null, { data$: server });
  });

  return { name: "Http" };
}

const _getPayload = req => {
  const { query = {}, body = {}, params = {}, method } = req;
  let { limit, page, sortBy, asc, token = "" } = query;

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
      _payload.sort = _prepareSort(sortBy, asc);
      _payload.params = params;
      _.assign(_payload, _preparePagination(limit, page));
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

const _prepareSort = (sortBy = "id", asc) => {
  if (!_.isEmpty(sortBy) && _.isString(sortBy)) {
    return { [sortBy]: asc == 1 ? 1 : -1 };
  }
  return { id: -1 };
};

const _preparePagination = (limit, page) => {
  let pagination = _.assign({}, defaultPagination);

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
