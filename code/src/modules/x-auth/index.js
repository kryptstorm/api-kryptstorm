/** Internal modules */
/** Services */
import XAuthDefaultService from './services/default.service';
import XAuthAuthenticationService from './services/authentication.service';

export default {
	routes: {
		endpoint: '/x-auth',
		map: {
			'/': 'x_auth:default, func:info',
			'/auth/register': {
				'POST': 'x_auth:authentication, func:register',
			},
			'/auth/login': {
				'POST': 'x_auth:authentication, func:login',
			},
			'/auth/verify': {
				'GET': 'x_auth:authentication, func:verify',
				'POST': 'x_auth:authentication, func:verify',
			},
		}
	},
	models: [],
	services: [XAuthDefaultService, XAuthAuthenticationService],
	publicRoutes: ['/x-auth/auth/register', '/x-auth/auth/login', '/x-auth/auth/verify'],
}