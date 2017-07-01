/** External modules */
import _ from 'lodash';
import Config from 'config';

export default function XAuthDefaultService() {
	this.add('init:XAuthDefaultService', function XAuthDefaultServiceInit(args, done) {
		return done();
	});

	this.add('x_auth:default, func:info', function XAuthDefaultInfo(args, done) {
		return done(null, { data$: _.assign({}, Config.get('api.info'), { module: 'XAuth' }) });
	});

	/** You must return plugin name */
	return { name: 'XAuthDefaultService' };
}