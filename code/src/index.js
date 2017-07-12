/** External modules */
import Seneca from 'seneca';
import Config from 'config';
import _ from 'lodash';

/** Kryptstorm system modules*/
import XMariadb from './libs/x-mariadb';
import XService from './libs/x-service';
import XHttp from './libs/x-http';

/** Internal Modules */
import XUserService, { models as XUserModels, routes as XUserRoutes, authenticationExcludeRoutes as XUserAuthenticationExcludeRoutes } from './modules/x-user';

/** Web config */
const HTTPPort = process.env.API_PORT || 9999;

/** Model config */
const models = [...XUserModels];

/** Routes config */
const routes = _.assign({}, XUserRoutes);

/** Public routes - guest can access */
const authenticationExcludeRoutes = [...XUserAuthenticationExcludeRoutes];

/** Seneca plugins */
const services = [...XUserService];

/** Register seneca plugins */
const options = {
	default_plugins: { transport: false },
	debug: { undead: Config.get('api.isDebug') }
};
const App = Seneca(options);

/** Register System service to handle application */
App.use(XService);
App.use(XMariadb, { models, tablePrefix: 'kryptstorm' });

_.reduce(services, (app, nextService) => app.use(nextService), App)
	.use(XHttp, {
		authentication: { authenticationPattern: 'x_auth:authentication, func:verify', authenticationExcludeRoutes },
		routes,
		isDebug: Config.get('api.isDebug')
	})
	/** Only handle http/socketio after all plugin was ready. */
	.ready(() => {
		const server = App.export('XHttp/server');
		return server.listen(HTTPPort, () => console.log(`XWeb was running on http://localhost:${HTTPPort}`));
	});