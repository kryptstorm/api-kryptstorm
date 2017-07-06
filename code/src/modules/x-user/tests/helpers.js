/** External modules */
import Faker from 'faker';
import _ from 'lodash';

import {
	STATUS_NEW, STATUS_ACTIVE, STATUS_LOCKED,
	generateValidationBaseOnStatus
} from '../models/user.model';

export const generateFakeUser = (attributes = {}, pick = []) => {
	attributes = _.assign({
		username: Faker.internet.userName().toLowerCase(),
		email: Faker.internet.email().toLowerCase(),
		status: generateFakeStatus(),
		first_name: Faker.name.firstName(),
		last_name: Faker.name.lastName(),
		created_at: Faker.date.past(),
		password: '123456'
	}, attributes);

	_.assign(attributes, generateValidationBaseOnStatus(attributes.status));
	if (attributes.status === STATUS_ACTIVE) {
		attributes.updated_at = Faker.date.recent();
	}
	if (attributes.status === STATUS_LOCKED) {
		attributes.updated_at = Faker.date.recent();
	}

	if (!_.isEmpty(pick) && _.isArray(pick)) {
		attributes = _.pick(attributes, pick)
	}
	
	return attributes;
}

const generateFakeStatus = () => {
	const status = [STATUS_NEW, STATUS_ACTIVE, STATUS_LOCKED];
	return status[Math.floor((Math.random() * status.length))];
}
