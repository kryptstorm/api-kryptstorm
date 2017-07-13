/** External modules */
import Bluebird from 'bluebird';

export default function Services({ services = {} }) {

	/** Register decorate instance */
	this.decorate('Services$', { actAsync: Bluebird.promisify(this.act, { context: this }) });

	this.add('init:Services', function initServices(args, reply) {
		return reply();
	});

	return { name: 'Services' };
}