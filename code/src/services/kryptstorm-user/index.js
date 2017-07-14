/** Internal modules */
import Users from './users';

export default function KryptstormUser() {
	this.add('init:KryptstormUser', function initKryptstormUser(args, reply) {
		/** Register users service */
		this.use(Users);
		return reply();
	});

	return { name: 'KryptstormUser' };
}