/** External modules */
import Bluebird from 'bluebird';

export default function XService() {

	/** Register decorate instance */
	this.decorate('XService$', { act: Bluebird.promisify(this.act, { context: this }) });

	this.add('init:XService', function XServiceInit(args, done) {
		return done();
	});

	return { name: 'XService' };
}