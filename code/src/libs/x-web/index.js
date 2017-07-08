/** External modules */
import Express, { Router } from 'express';
import BodyParser from 'body-parser';
import Cors from 'cors';
import methodOverride from 'method-override';
import _ from 'lodash';
import Config from 'config';

/** Internal modules */
import XError from '../x-error';

export default function XWeb({ auth = {}, routes = [], isDebug = false }) {
	const seneca = this;
	let server = Express();
	server.use(methodOverride('X-HTTP-Method-Override'));
	server.use(Cors({
		methods: ['GET', 'POST']
	}));
	server.use(BodyParser.json());
	server.use(BodyParser.urlencoded({
		extended: true
	}));

	const _authentication = (authentication, publicRoutes, req, res, next) => {
		if (!authentication) return next();

		if (_.isArray(publicRoutes) && _.includes(publicRoutes, req.url)) {
			return next();
		}
		if (!seneca.has(authentication) || !_.isString(authentication)) {
			return next(new XError(`You must register authentication pattern before used. You gave [${JSON.stringify(authentication)}]`));
		}

		return this.XService$.act(authentication, { payload$: _getPayload(req) })
			.then((result) => {
				if (!(result && _.isObject(result))) {
					return next(new XError('Result of action was null. It must be had at least errorCode$'));
				}
				const { errorCode$ = 'ERROR_NONE', data$ = {}, message$ = '', errors$ = {}, _catch } = result;
				/** Any where system catch an error, throw it */
				if (typeof _catch !== 'undefined') {
					return next(_catch);
				}

				if (errorCode$ !== 'ERROR_NONE') {
					return res.json({ errorCode: errorCode$, message: message$, errors: errors$ });
				}

				req._user = data$;
				return next();
			})
			.catch(_catch => next(new XError(_catch.message)));
	}
	const _prepareCondition = (condition = {}) => {
		if (!_.isObject(condition) || _.isEmpty(condition)) {
			return {};
		}

		return condition;
	}
	const _prepareOrder = (orderBy = 'id', asc) => {
		if (!_.isEmpty(orderBy) && _.isString(orderBy)) {
			return { [orderBy]: asc == 1 ? 'ASC' : 'DESC' };
		}
		return { id: 'DESC' };
	}
	const _preparePagination = (limit, page) => {
		let result = { limit: Config.get('api.perPageLimit'), offset: 0 };

		limit = parseInt(limit, 10);
		page = parseInt(page, 10);

		if (_.isNumber(limit) && limit > 0) {
			result.limit = limit;
		}
		if (_.isNumber(page) && page > 0) {
			result.offset = (((page - 1) < 0) ? page : (page - 1)) * limit;
		}
		return result;
	}
	const _server = (server, routes = [], isDebug = false) => {
		const seneca = this;

		if (_.isEmpty(routes)) {
			server.use((req, res, next) => {
				return next(new XError('Routes was empty.'));
			})
		}

		/** Register router */
		_.each(routes, (route) => {
			const { endpoint, map } = route;

			/** Validate Endpoint */
			if (_.isEmpty(endpoint)) {
				console.log(`Endpoint can not be empty. You gave [${JSON.stringify(endpoint)}]`);
				return false;
			}
			if (!_.isString(endpoint)) {
				console.log(`Endpoint must be a string. You gave [${JSON.stringify(endpoint)}]`);
				return false;
			}

			/** Validate Map */
			if (_.isEmpty(map)) {
				console.log(`Map can not be empty. You gave [${JSON.stringify(map)}]`);
				return false;
			}
			if (!_.isObject(map)) {
				console.log(`Map must be object. You gave [${JSON.stringify(map)}]`);
				return false;
			}

			const router = new Router();

			_.each(map, (handler, path) => {
				/** Validate Path */
				if (_.isEmpty(path)) {
					console.log(`Path can not be empty. You gave [${JSON.stringify(path)}]`);
					return false;
				}
				if (!_.isString(path)) {
					console.log(`Path must be a string. You gave [${JSON.stringify(path)}]`);
					return false;
				}

				if (!_.isString(handler) && !_.isObject(handler)) {
					console.log(`Can not handle routes for path [${path}]`);
					return false;
				}

				if (_.isString(handler)) {
					/** Validate handler */
					if (_.isEmpty(handler)) {
						console.log(`Handler can not be empty. You gave [${JSON.stringify(handler)}]`);
						return false;
					}

					/** Does register this pattern */
					if (!seneca.has(handler)) {
						console.log(`You must register pattern before used. You gave [${JSON.stringify(handler)}]`);
						return false;
					}
					return router.get(path, _handle.bind(seneca, handler, 'GET'));
				}

				if (_.isObject(handler)) {
					_.each(handler, (pattern, method) => {
						/** Validate Method */
						if (_.isEmpty(method)) {
							console.log(`Method can not be empty. You gave [${JSON.stringify(method)}]`);
							return false;
						}
						if (!_.isString(method)) {
							console.log(`Method must be a string. You gave [${JSON.stringify(method)}]`);
							return false;
						}

						if (!_.includes(Config.get('api.HTTPMethod'), method)) {
							console.log(`Can not handle routes for path [${path}] with method [${JSON.stringify(method)}]`);
							return false;
						}

						/** Validate Pattern */
						if (_.isEmpty(pattern)) {
							console.log(`Pattern can not be empty. You gave [${JSON.stringify(pattern)}]`);
							return false;
						}
						if (!_.isString(pattern)) {
							console.log(`Pattern must be a string. You gave [${JSON.stringify(pattern)}]`);
							return false;
						}

						return router[method.toLowerCase()](path, _handle.bind(seneca, pattern, method));
					});
				}
			});

			server.use(endpoint, router);
			return true;
		});

		/** Express error handler */
		server.use((err, req, res, next) => {
			if (err) {
				let { httpCode$ = 500, errorCode$ = 'ERROR_SYSTEM', message$ = '', errors$ = {}, data$ = {}, message } = err;
				httpCode$ = _.isNumber(httpCode$) ? httpCode$ : 500;
				errorCode$ = _.isString(errorCode$) ? errorCode$ : 'ERROR_SYSTEM';

				message$ = _.isEmpty(message$) ? message : message$;
				message$ = !_.isString(message$) ? JSON.stringify(message$) : message$;
				message$ = isDebug ? message$ : 'Error was encountered';

				return res.status(httpCode$).json({
					errorCode: errorCode$,
					data: data$,
					message: message$,
					errors: errors$
				});

			}
			return next(err);
		});

		return server;
	}
	function _handle(pattern, method, req, res, next) {
		let errMsg;
		/** Validate Pattern */
		if (_.isEmpty(pattern)) {
			errMsg = `Pattern can not be empty. You gave [${JSON.stringify(pattern)}]`;
			return next(new XError(errMsg));
		}
		if (!_.isString(pattern)) {
			errMsg = `Pattern must be a string. You gave [${JSON.stringify(pattern)}]`;
			return next(new XError(errMsg));
		}

		/** Does register this pattern */
		if (!this.has(pattern)) {
			errMsg = `You must register pattern before used. You gave [${JSON.stringify(pattern)}]`;
			return next(new XError(errMsg));
		}

		return this.XService$.act(pattern, { payload$: _getPayload(req) })
			.then((result) => {
				if (!(result && _.isObject(result))) {
					return next(new XError('Result of action was null. It must be had at least errorCode$'));
				}
				const { errorCode$ = 'ERROR_NONE', data$ = {}, message$ = '', errors$ = {}, _meta$ = {}, _catch } = result;

				/** Any where system catch an error, throw it */
				if (typeof _catch !== 'undefined') {
					return next(_catch);
				}

				let responseData = { errorCode: errorCode$ };
				if (errorCode$ !== 'ERROR_NONE') {
					_.assign(responseData, { message: message$, errors: errors$ });
				} else {
					_.assign(responseData, { data: data$, _meta: _meta$ });
				}

				return res.json(responseData);
			})
			.catch(_catch => next(new XError(_catch.message)));
	}
	const _getPayload = (req) => {
		const { query = {}, body = {}, params = {}, method } = req;
		const { condition, limit, page, orderBy, asc } = query;

		let payload = {
			_meta: {
				XToken: ''
			}
		};

		/** Inject XToken, the priority of headers is highest */
		if (query.XToken && _.isString(query.XToken) && query.XToken.length > 15) {
			payload._meta.XToken = query.XToken;
		}
		if (req.get('XToken') && _.isString(req.get('XToken')) && req.get('XToken').length > 15) {
			payload._meta.XToken = req.get('XToken');
		}

		/** Bind payload for POST - create data */
		if (method === 'POST') {
			payload.attributes = _.isObject(body) ? body : {};
		}

		/** Bind payload for GET - read data */
		if (method === 'GET') {
			payload.select = [];
			payload.condition = _prepareCondition(condition);
			payload.order = _prepareOrder(orderBy, asc);
			payload.pagination = _preparePagination(limit, page);
			payload.params = params;
		}

		/** Bind payload for PUT - update data */
		if (method === 'PUT') {
			payload.params = params;
			payload.attributes = _.isObject(body) ? body : {};
		}

		/** Bind payload for DELETE - delete data */
		if (method === 'DELETE') {
			payload.params = params;
		}

		return payload;
	}

	this.add('init:XWeb', function XWebInit(args, done) {
		/** Need routes to init XWeb */
		if (_.isEmpty(routes) || !_.isArray(routes)) return done(new Error('Init XWeb must defined routes.'));
		if (!_.isEmpty(auth) && _.isObject(auth)) {
			const { authentication, publicRoutes } = auth;
			server.use(_authentication.bind(authentication, publicRoutes));
		}

		/** Init web handler */
		server = _server(server, routes, isDebug);

		return done();
	});

	return { name: 'XWeb', exportmap: { server } };
}
