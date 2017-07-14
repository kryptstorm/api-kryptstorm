/** External modules */
import _ from 'lodash';

export default function Users() {
	const routes = {
		'get:/users': 'user:find_all'
	}
	let user;

	this.add('init:Users', function initUsers(args, reply) {
		const { actAsync } = this.Services$;
		/** Defined mongo schema */
		user = this.make$('users');
		/** Init route for this plugin */
		actAsync('http:save_routes', { routes })
			.then(result => reply())
			.catch(reply)
	});

	this.add('user:find_all', function usersFindAll(args, reply) {
		return reply(null, { data$: { hello: 'world' } });
	});

	return { name: 'Users' };
}