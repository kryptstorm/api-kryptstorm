/** Service */
import UserService from './user';
import AuthenticationService from './authentication';

/** Models */
import User from './user/model';

/** Service */
export default [UserService, AuthenticationService];

/** Models */
export const models = [User];

/** Routes */
export const routes = {
	/** User routes */
	'/users': {
		'GET': 'x_user:users, func:find_all',
		'POST': 'x_user:users, func: create',
	},
	'/users/:id': {
		'GET': 'x_user:users, func:find_by_id',
		'PUT': 'x_user:users, func:update_by_id',
		'DELETE': 'x_user:users, func:delete_by_id',
	},
	'/users/validation/unique': {
		'POST': 'x_user:users, validate:unique',
	},
	/** Authentication routes */
	'/auth/register': {
		'POST': 'x_user:users, func:create, scenario:register',
	},
	'/auth/login': {
		'POST': 'x_user:authentication, func:login',
	},
	'/auth/verify': {
		'GET': 'x_user:authentication, func:verify',
		'POST': 'x_user:authentication, func:verify',
	},
};

/**
 * Public routes
 * 
 * If you don't defined public routes, all routes will be consider as private route
 * If authentication or authorization has been installed, rule will be execute
 */
export const authenticationExcludeRoutes = {
	/** User exclude routes */
	'/auth/register': ['POST'],
	'/auth/login': ['POST'],
	'/auth/verify': ['GET', 'POST'],
	/** Authentication exclude routes */
	'/users/validation/unique': ['POST'],
};