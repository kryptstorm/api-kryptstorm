/** External modules */
import Seneca from 'seneca';
import Config from 'config';
import _ from 'lodash';

/** Internal modules */
/** Kryptstorm system modules*/
import XDb from './libs/x-db';
import XService from './libs/x-service';
import XWeb from './libs/x-web';

/** Services */
import XUser from './modules/x-user';
import XAuth from './modules/x-auth';

/** Web config */
const HTTPPort = process.env.API_PORT || 9999;

/** Model config */
const models = [...XUser.models, ...XAuth.models];

/** Routes config */
const routes = [XUser.routes, XAuth.routes];

/** Public routes - guest can access */
const publicRoutes = [...XUser.publicRoutes, ...XAuth.publicRoutes];

/** Seneca plugins */
const services = [...XUser.services, ...XAuth.services];

/** Register seneca plugins */
const options = {
	default_plugins: { transport: false },
	debug: { undead: Config.get('api.isDebug') }
};
const App = Seneca(options);

/** Register System service to handle application */
App.use(XService);
App.use(XDb, { models, tablePrefix: 'kryptstorm' });
App.use(XWeb, { authentication: 'x_auth:authentication, func:verify', publicRoutes });

_.reduce(services, (app, nextService) => app.use(nextService), App)
	/** Only handle http/socketio after all plugin was ready. */
	.ready(() => {
		const server = App.export('XWeb/server')(routes, Config.get('api.isDebug'));
		return server.listen(HTTPPort, () => console.log(`XWeb was running on http://localhost:${HTTPPort}`));
	});