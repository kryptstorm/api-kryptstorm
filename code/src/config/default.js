/**
 * Uncomment and use deferConfig if you want config was a function
 * @see https://github.com/lorenwest/node-config/wiki/Configuration-Files
 */
// import { deferConfig } from 'config/defer';

/**
 * Can not use export default {} at here,
 * We must use `Config.get('default.CONFIG_KEY');` instead of Config.get('CONFIG_KEY');` when we retrieved config
 * To make all thing is simple, just use as block bellow
 */
module.exports = {
	api: {
		info: {
			version: require('../../package.json').version,
			name: require('../../package.json').name,
			author: require('../../package.json').author.name,
		},
		isDebug: process.env.NODE_ENV === 'development',
		HTTPMethod: ['POST', 'GET', 'PUT', 'DELETE'],
		perPageLimit: 20
	},
	db: {
		connect: {
			host: process.env.DB_HOST || 'db',
			dialect: 'mysql',
			database: process.env.DB_DATABASE || 'kryptstorm',
			username: process.env.DB_USER || 'root',
			password: process.env.DB_PASSWORD || 'kryptstorm',
		},
		schemaOptions: {
			timestamps: true,
			paranoid: true,
			underscored: true,
			freezeTableName: true
		},
		timezone: 'Asia/Ho_Chi_Minh',
		prefix: 'kryptstorm'
	},
	jwt: {
		secreteKey: 'R2KuAPpwmLXpnNbglpHjhi2K61ukzQ1s',
		defaultOptions: {
			expiresIn: 604800 // 7 days
		}
	},
}