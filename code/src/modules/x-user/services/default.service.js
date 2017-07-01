/** External modules */
import _ from 'lodash';
import Config from 'config';

export default function XUserDefaultService() {
	this.add('init:XUserDefaultService', function XUserDefaultServiceInit(args, done) {
		return done();
	});

	this.add('x_user:default, func:info', function XUserDefaultInfo(args, done) {
		return done(null, { data$: _.assign({}, Config.get('api.info'), { module: 'XUser' }) });
	});

	/** You must return plugin name */
	return { name: 'XUserDefaultService' };
}