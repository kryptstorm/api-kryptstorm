'use strict';

/** External modules */
/** Make sequence-cli work with es6 */
require('babel-register');
const Config = require('config');

/** Internal modules */
const userModel = require('../../src/modules/x-user/models/user.model');
const userUnitTestHelpers = require('../../src/modules/x-user/tests/helpers');

const prefix = Config.get('db.prefix');
const table = `${prefix}_${userModel.modelName}`;

let uniqueUsername = [];
let uniqueEmail = [];

function _generate(data = [], remain = 0) {
	if (remain < 1) {
		return data;
	}

	const pushData = userUnitTestHelpers.getFakeUser();
	if (uniqueUsername.indexOf(pushData.username) < 0 && uniqueEmail.indexOf(pushData.email) < 0) {
		--remain;
		uniqueUsername.push(pushData.username);
		uniqueEmail.push(pushData.email);
		data.push(pushData);
	}

	return _generate(data, remain);
}

module.exports = {
	up: function (queryInterface) {
		return queryInterface
			.bulkDelete(table, null, {})
			.then(() => queryInterface.sequelize.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`))
			.then(() => queryInterface.bulkInsert(table, _generate([], 333), {}));
	},

	down: function (queryInterface) {
		return queryInterface.bulkDelete(table, null, {}).then(() => queryInterface.sequelize.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`));
	}
};
