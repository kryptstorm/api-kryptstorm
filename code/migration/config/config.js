const Config = require('config');

/**
 * Config will take care what is environment you used
 * and it'll get correct config for you
 */
const dbConnectionConfig = {
	'username': Config.get('db.connect.username'),
	'password': Config.get('db.connect.password'),
	'database': Config.get('db.connect.database'),
	'host': Config.get('db.connect.host'),
	'dialect': Config.get('db.connect.dialect'),
}

module.exports = {
	'development': dbConnectionConfig,
	'test': dbConnectionConfig,
	'production': dbConnectionConfig
}
