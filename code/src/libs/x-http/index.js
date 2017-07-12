/** External modules */
import Express from 'express';
import BodyParser from 'body-parser';
import Cors from 'cors';
import MethodOverride from 'method-override';
import _ from 'lodash';
import Config from 'config';

export default function XHttp({ routes = {}, isDebug = false, authentication = {} }) {
	const { act } = this.XService$;
	const server = Express();
	/** Express default config */
	server.use(MethodOverride('X-HTTP-Method-Override'));
	server.use(Cors({ methods: ['GET', 'POST'] }));
	server.use(BodyParser.json());
	server.use(BodyParser.urlencoded({ extended: true }));

	/** Seneca init pattern */
	this.add('init:XHttp', function XWebInit(args, done) {
		/** Validate routes */
		if (!_.isObject(routes)) return done(new Error('Routes of XHttp must be an object.'));
		if (_.isEmpty(routes)) return done(new Error('Routes of XHttp can not be blank.'));

		/** Apply authentication rule if its's defined */
		if (_.isObject(authentication) && !_.isEmpty(authentication)) {
			const { authenticationPattern = '', authenticationExcludeRoutes = [] } = authentication;
			if ((!_.isString(authenticationPattern) && !_.isObject(authenticationPattern)) || !this.has(authenticationPattern)) return done(new Error('Authentication pattern has been invalid.'));

			/** Express midleware for authentication */
			server.use((req, res, next) => {
				/** Request url is on excluded authentication routes, go to next handler */
				if (_.includes(authenticationExcludeRoutes, req.url)) return next();

				return act(authenticationPattern, { payload$: _getPayload(req) })
					.then(({ errorCode$ = 'ERROR_NONE', data$ = {}, message$ = '', errors$ = {}, _error }) => {
						/** Any where system catch an error, throw it */
						if (typeof _error !== 'undefined') return next(_error);

						/** Authentication has been failed */
						if (errorCode$ !== 'ERROR_NONE') {
							return res.json({ errorCode: errorCode$, message: message$, errors: errors$ });
						}

						req._user = data$;
						return next();
					})
					.catch(next);
			});
		}

		/** Handle routes */
		_.each(routes, (info = {}, path = '') => {
			/** Validate route path */
			if (!_.isString(path)) return console.log(`Route path must be a string`);
			if (!path) return console.log('Route path can not be blank.');

			if (!_.isString(info) && !_.isObject(info)) return console.log(`Can not handle route path [${path}]. Route info is invalid.`);

			/** Info is string, that mean we use GET method to handle */
			if (_.isString(info) && this.has(info)) return server.get(path, _routeHandler.bind(null, info));
			/** Handler each method for this route paths */
			if (_.isObject(info)) {
				_.each(info, (pattern, method) => {
					if (!_.isString(pattern) || !this.has(pattern)) return console.log(`Pattern for path [${path}] is invalid.`);
					return server[method.toLowerCase()](path, _routeHandler.bind(null, pattern));
				});
			}
		});

		/** Express error handler */
		server.use((err, req, res, next) => {
			if (err) {
				const { message } = err;
				return res
					.status(500)
					.json({ message: isDebug ? message : 'Error was encountered' });
			}
			return next(err);
		});

		return done();
	});

	/** Get payload$ from Express request */
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
	const _routeHandler = (pattern, req, res, next) => {
		return act(pattern, { payload$: _getPayload(req) })
			.then(({ errorCode$ = 'ERROR_NONE', data$ = {}, message$ = '', errors$ = {}, _meta$ = {}, _error }) => {
				/** Any where system catch an error, throw it */
				if (typeof _error !== 'undefined') return next(_error);

				let resJson = { errorCode: errorCode$ };
				if (errorCode$ !== 'ERROR_NONE') {
					_.assign(resJson, { message: message$, errors: errors$ });
				} else {
					_.assign(resJson, { data: data$, _meta: _meta$ });
				}

				return res.json(resJson);
			})
			.catch(next);
	}

	return { name: 'XHttp', exportmap: { server } };
}