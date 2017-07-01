/** Internal modules */
/** Services */
import XUserUsersService from './services/users.service';
import XUserDefaultService from './services/default.service';

/** Schemas */
import User, { modelName, schemaOptions } from './models/user.model';

export default {
	routes: {
		endpoint: '/x-user',
		map: {
			'/': 'x_user:default, func:info',
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
		}
	},
	models: [
		{ name: modelName, schema: User, schemaOptions }
	],
	services: [XUserDefaultService, XUserUsersService],
}