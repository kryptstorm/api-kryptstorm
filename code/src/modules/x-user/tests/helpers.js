/** External modules */
import Faker from 'faker';
import _ from 'lodash';

import {
	STATUS_INACTIVE, STATUS_ACTIVE, STATUS_LOCKED,
	VALIDATION_TYPE_NONE, VALIDATION_TYPE_ACTIVE_ACCOUNT, VALIDATION_TYPE_RECOVERY_PASSWORD
} from '../models/user.model';

export const getFakeUser = () => {
	let pushData = {
		username: Faker.internet.userName().toLowerCase(),
		email: Faker.internet.email().toLowerCase(),
		status: _getStatus(),
		first_name: Faker.name.firstName(),
		last_name: Faker.name.lastName(),
		created_at: Faker.date.past(),
		password: '$2a$10$dFizCewZ/Vjnme9I13VXM.vVVOxPKTLiUvcC5c9K5hhQNUZ8OTNLu'
	}
	if (pushData.status === STATUS_INACTIVE) {
		pushData.validation_type = VALIDATION_TYPE_ACTIVE_ACCOUNT;
		pushData.validation_expired = Faker.date.future();
	}
	if (pushData.status === STATUS_ACTIVE) {
		pushData.validation_type = _.random(1) ? VALIDATION_TYPE_NONE : VALIDATION_TYPE_RECOVERY_PASSWORD;
		if (pushData.validation_type === VALIDATION_TYPE_RECOVERY_PASSWORD) {
			pushData.validation_expired = Faker.date.future();
		}
		pushData.updated_at = Faker.date.recent();
	}
	if (pushData.status === STATUS_LOCKED) {
		pushData.validation_type = VALIDATION_TYPE_NONE;
		pushData.updated_at = Faker.date.recent();
	}

	return pushData;
}

function _getStatus() {
	const status = [STATUS_INACTIVE, STATUS_ACTIVE, STATUS_LOCKED];
	return status[Math.floor((Math.random() * status.length))];
}
