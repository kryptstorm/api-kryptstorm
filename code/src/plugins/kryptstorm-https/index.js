/** External modules */
import Express from 'express';
import BodyParser from 'body-parser';
import Cors from 'cors';
import MethodOverride from 'method-override';
import _ from 'lodash';
import Config from 'config';

/**
 * Example routes
 * const routes = {'get:/user': { pattern: 'user:find_all', roles: [] }}
 * 
 * @export Http
 * @param Object { withDefaultConfig = '', isDebug = false } 
 * @returns Object
 */
export default function Http({ withDefaultConfig = true, isDebug = false }) {
	const { actAsync } = this.Services$;
	let server, serverRoutes = {};

	/** Init function */
	this.add('init:Http', function initHttp(args, reply) {
		/** Init express server */
		server = Express();
		if (withDefaultConfig) {
			/** Default config */
			server.use(MethodOverride('X-HTTP-Method-Override'));
			server.use(Cors({ methods: ['GET', 'POST'] }));
			server.use(BodyParser.json());
			server.use(BodyParser.urlencoded({ extended: true }));
		}

		return reply();
	});

	/** Add midleware to express */
	this.add('http:add_midleware', function addMidleware({ pattern = '' }, reply) {
		server.use((req, res, next) => {
			return actAsync(pattern, { req$: req })
				.then(({ errorCode$ = 'ERROR_NONE', message$ = '', data$ = {}, meta$ }) => {
					/** Midleware have error */
					if (errorCode$ !== 'ERROR_NONE') {
						res.json({ errorCode: errorCode$, message: message$ });
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

	/** Update route if it has alrady exist, add new if it is not exist */
	this.add('http:save_route', function saveRoute({ url = '', handler = {} }, reply) {
		/** url must be a string */
		if (!_.isString(url)) {
			console.log(`To inject route handler, url must be a string. You gave ${JSON.stringify(url)}`);
			return reply();
		}
		/** handler must be an object */
		if (!_.isObject(handler)) {
			console.log(`To inject route handler, handler must be an object. You gave ${JSON.stringify(handler)}`);
			return reply();
		}

		if (serverRoutes[url]) {
			_.assign(serverRoutes[url], handler);
		} else {
			serverRoutes[url] = handler;
		}

		return reply();
	});

	/** Save multi routes */
	this.add('http:save_routes', function saveRoutes({ routes }, reply) {
		/** routes must be an object */
		if (!_.isObject(routes)) {
			console.log(`To register routes, routes must be an object. You gave ${JSON.stringify(routes)}`);
			return reply();
		}

		_.assign(serverRoutes, routes);
		return reply();
	});

	/**
	 * 1. Handle all routes
	 * 2. Handle 404
	 * 3. Handle error
	 */
	this.add('http:run', function run(args, reply) {
		/** Handle each route */
		_.each(serverRoutes, (pattern, route) => {
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

			server.use((req, res, next) => actAsync(pattern, {})
				.then(({ errorCode$ = 'ERROR_NONE', message$ = '', data$ = {}, meta$ }) => {
					if (errorCode$ !== 'ERROR_NONE') {
						return res.json({ errorCode: errorCode$, message: message$ });
					}

					return res.json({ errorCode: errorCode$, data: data$, meta: meta$ });
				})
				.catch(error => next(error)));
		})

		/** Handle 404 error */
		server.use((req, res, next) => {
			return res.status(404).json({ errorCode: 'ERROR_NOT_FOUND', message: `The requested URL [${req.url}] was not found on this server` });
		});

		/** Handle system error */
		server.use((err, req, res, next) => {
			if (err) {
				const message = isDebug ? err.message : 'Server encountered an error while trying to handle request';
				return res.status(500).json({ errorCode: 'ERROR_SYSTEM', message });
			}

			return next(err);
		});

		return reply(null, { server });
	});

	return { name: 'Http' };
}
