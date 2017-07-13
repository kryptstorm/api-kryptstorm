/** External modules */
import Express from 'express';
import BodyParser from 'body-parser';
import Cors from 'cors';
import MethodOverride from 'method-override';
import _ from 'lodash';

/**
 * Example routes
 * const routes = {'get:/user': { pattern: 'user:find_all', roles: [] }}
 * 
 * @export Http
 * @param Object { roleVerifyPattern = '', isDebug = false } 
 * @returns Object
 */
export default function Http({ roleVerifyPattern = '', isDebug = false }) {
	const { actAsync } = this.Services$;
	let server, serverRoutes = {};

	this.add('init:Http', function initHttp(args, reply) {
		server = Express();
		/** Default config */
		server.use(MethodOverride('X-HTTP-Method-Override'));
		server.use(Cors({ methods: ['GET', 'POST'] }));
		server.use(BodyParser.json());
		server.use(BodyParser.urlencoded({ extended: true }));

		return reply();
	});

	this.add('http:add_midleware', function addMidleware({ pattern = '' }, reply) {
		server.use((req, res, next) => {
			return actAsync(pattern, { req$: req })
				.then(({ errorCode$ = 'ERROR_NONE', message$ = '', data$ = {}, meta$ }) => {
					/** Midleware have error */
					if (errorCode$ !== 'ERROR_NONE') {
						res.json({ error_code: errorCode$, message: message$ });
						return reply();
					}
					/** OK, Fine! */
					next();
					return reply();
				})
				.catch(error => {
					/** Go to express error handler */
					next(error);
					return reply();
				});
		});
	});

	this.add('http:parse_routes', function parseRoutes({ routes = {} }, reply) {
		/** Router must be a object */
		if (!_.isObject(routes)) return reply(new Error('Routes must be an object.'));
		/** Setting routes */
		_.assign(serverRoutes, routes);
	});

	this.add('http:add_route_role', function injectRouteInfo({ url = '', roles = [] }, reply) {
		/** url must be a string */
		if (!_.isString(url)) {
			console.log(`To inject route handler, url must be a string. You gave ${JSON.stringify(url)}`);
			return reply();
		}
		/** handler must be a object */
		if (!_.isObject(roles)) {
			console.log(`To inject route handler, handler must be an array. You gave ${JSON.stringify(roles)}`);
			return reply();
		}
		/** If route was not defined */
		if (!serverRoutes[url]) {
			console.log(`To inject route handler, route must be exist. You gave ${JSON.stringify(url)}`);
			return reply();
		}

		/** Inject route handler */
		serverRoutes[url] = _.assign(serverRoutes[url], { roles });
		return reply();
	});

	this.add('http:run', function run(args, reply) {
		/** Handle each route */
		_.each(serverRoutes, ({ pattern = '', roles = [] }, route) => {
			/** route must be a string */
			if (!_.isString(route)) return console.log(`Routes must be a string. You gave [${JSON.stringify(route)}]`);
			/** route can not be blank */
			if (!route) return console.log('Routes can not e blank');

			const methodAndUrl = route.split(':');
			const method = methodAndUrl[0], url = methodAndUrl[1];
			/** route must contain method and url with format _method_:_url_ */
			if (!method || !url) return console.log(`Route must contain method and url with format _method_:_url_. You gave [${route}]`);
			/** Allow method was defined at api.httpVerbs */
			if (!_.includes(Config.get('api.httpVerbs'), method)) return console.log(`Method [${method}] is not allowed. It must be in [${JSON.stringify(Config.get('api.httpVerbs'))}]`);

			/** Pattern must be a string */
			if (!_.isString(pattern)) return console.log('Seneca pattern must defined as a string.');
			/** Pattern mus be registered */
			if (!this.has(pattern)) return console.log(`Pattern [${pattern}] has not been registered.`);

			/** Role was not defined, init new empty roless */
			if (!_.isArray(roles) || _.isEmpty(roles)) roles = [];

			/** But role verify pattern was not provided or invalid format or was not defined */
			if (!_.isString(roleVerifyPattern) || !roleVerifyPattern || !this.has(roleVerifyPattern)) return console.log('Role verify pattern was not provided or is not a string or was not defined ');

			server.use((req, res, next) => {
				actAsync(roleVerifyPattern, {})
					.then(({ errorCode$ = 'ERROR_NONE', message$ = '', data$ = {}, meta$ }) => {
						/** Role verify action encountered an error while trying to handle request */
						if (errorCode$ !== 'ERROR_NONE') {
							return res.json({ error_code: errorCode$, message: message$ });
						}

						return actAsync(pattern, { _user: data$ });
					})
					.then(({ errorCode$ = 'ERROR_NONE', message$ = '', data$ = {}, meta$ }) => {
						/** Role verify action encountered an error while trying to handle request */
						if (errorCode$ !== 'ERROR_NONE') {
							return res.json({ error_code: errorCode$, message: message$ });
						}

						return res.json({ error_code: errorCode$, data: data$, meta: meta$ });
					})
					.catch(error => next(error));
			});
		})

		/** Handle 404 error */
		server.use((req, res, next) => {
			return res.status(404).json({ error_code: 'ERROR_NOT_FOUND', message: `The requested URL [${req.url}] was not found on this server` });
		});

		/** Handle system error */
		server.use((err, req, res, next) => {
			if (err) {
				const message = isDebug ? err.message : 'Server encountered an error while trying to handle request';
				return res.status(500).json({ error_code: 'ERROR_SYSTEM', message });
			}

			return next(err);
		});

		return reply(null, { server });
	})

	return { name: 'Http' };
}
