/** External modules */
import Seneca from 'seneca';
import Config from 'config';
import _ from 'lodash';

/** Kryptstorm system modules*/
import XMariadb from './libs/x-mariadb';
import XService from './libs/x-service';
import XWeb from './libs/x-web';

/** Services */
import UserService, {
	routes as userRoutes,
	publicRoutes as userPublicRoutes
} from './modules/x-user/user';
import AuthenticationService, {
	routes as authenticationRoutes,
	publicRoutes as authenticationPublicRoutes
} from './modules/x-user/authentication';

/** Models */
import User from './modules/x-user/user/model';

/** Web config */
const HTTPPort = process.env.API_PORT || 9999;

/** Model config */
const models = [User];

/** Routes config */
const routes = [userRoutes, authenticationRoutes];

/** Public routes - guest can access */
const publicRoutes = [userPublicRoutes, authenticationPublicRoutes];

/** Seneca plugins */
const services = [UserService, AuthenticationService];

/** Register seneca plugins */
const options = {
	default_plugins: { transport: false },
	debug: { undead: Config.get('api.isDebug') }
};
const App = Seneca(options);

/** Register System service to handle application */
App.use(XService);
App.use(XMariadb, { models, tablePrefix: 'kryptstorm' });
App.use(XWeb, {
	auth: { authentication: 'x_auth:authentication, func:verify', publicRoutes },
	routes,
	isDebug: Config.get('api.isDebug')
});

_.reduce(services, (app, nextService) => app.use(nextService), App)
	/** Only handle http/socketio after all plugin was ready. */
	.ready(() => {
		const server = App.export('XWeb/server');
		return server.listen(HTTPPort, () => console.log(`XWeb was running on http://localhost:${HTTPPort}`));
	});