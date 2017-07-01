/** Internal modules */
import Sequelize from 'sequelize';
import _ from 'lodash';
import Bcrypt from 'bcrypt';

/** New user and user was not activated yet */
export const STATUS_INACTIVE = 0;
/** User was activated, can do anything her/him can */
export const STATUS_ACTIVE = 1;
/** User was locked, but all resource of her/him still available */
export const STATUS_LOCKED = 2;

export const VALIDATION_TYPE_NONE = 0;
export const VALIDATION_TYPE_ACTIVE_ACCOUNT = 1;
export const VALIDATION_TYPE_RECOVERY_PASSWORD = 2;

export const modelName = 'users';
export const publicFields = ['id', 'username', 'email', 'status', 'first_name', 'last_name'];
export const customPublicFields = ['full_name'];

export const prepareCondition = conditions => {
	/** Remove empty field */
	conditions = _.isObject(conditions) ? _.pickBy(conditions, _.identity) : {};

	const like = ['username', 'email', 'first_name', 'last_name'];
	const equal = ['status'];
	return _.reduce(conditions, (query, v, k) => {
		if (!_.isString(v) && !_.isNumber(v)) {
			return {};
		}

		/** Custom query */
		if (k === 'full_name') {
			return _.assign(query, { k: Sequelize.where(Sequelize.fn('CONCAT', Sequelize.col('first_name'), Sequelize.col('last_name')), { like: `%${v}%` }) })
		}

		if (_.includes(like, k)) {
			return _.assign(query, { [k]: { like: `%${v}%` } });
		}

		if (_.includes(equal, k)) {
			return _.assign(query, { [k]: v });
		}

		return {};
	}, {});
}

export const prepareReturnFields = choices => {
	let selected = _.filter((_.isArray(choices)) ? [...choices, ...publicFields] : [], v => _.includes(publicFields, v));

	selected.push([Sequelize.fn('CONCAT', Sequelize.col('first_name'), ' ', Sequelize.col('last_name')), 'full_name']);

	return selected;
}

export const prepareAttributes = attributes => {
	attributes = _.isObject(attributes) ? attributes : {};
	/**
	 * Only allow save data with public fields
	 * That mean, you will give him what you allow them save
	 */
	attributes = _.pick(attributes, [...publicFields, 'password']);

	/**
	 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete
	 * You should visit this link to know what exactly happen with [delete] function 
	 */
	if (!attributes.first_name) {
		delete attributes.first_name;
	}
	if (!attributes.last_name) {
		delete attributes.last_name;
	}

	/** Now, you can add what you want save only on server */
	if (attributes.status === STATUS_ACTIVE) {
		_.assign(attributes, { validation_type: VALIDATION_TYPE_NONE, validation_expired: null });
	}
	if (attributes.status === STATUS_INACTIVE && (attributes.validation_type !== VALIDATION_TYPE_ACTIVE_ACCOUNT || !attributes.validation_expired) ) {
		_.assign(attributes, { validation_type: VALIDATION_TYPE_ACTIVE_ACCOUNT, validation_expired: Date.now() });
	}

	return attributes;
}

export default {
	username: {
		type: Sequelize.STRING(254),
		unique: {
			args: true,
			msg: 'This username has already been taken.'
		},
		validate: {
			is: {
				args: [/^[a-zA-Z0-9._]+$/],
				msg: 'Username must contain only letters, numbers, dots and underscores.'
			},
			len: {
				args: [[3, 254]],
				msg: 'Username length must be between 3 and 254 characters.'
			}
		}
	},
	email: {
		type: Sequelize.STRING(255),
		unique: {
			args: true,
			msg: 'This email has already been taken.'
		},
		validate: {
			isEmail: {
				msg: 'The email address you entered is not valid email address.'
			},
			len: {
				args: [[1, 255]],
				msg: 'The email address you entered is too long.'
			}
		}
	},
	password: {
		type: Sequelize.STRING(60),
		notEmpty: true,
	},
	status: {
		type: Sequelize.INTEGER(1),
		defaultValue: STATUS_INACTIVE,
		validate: {
			isIn: {
				args: [[STATUS_INACTIVE, STATUS_ACTIVE, STATUS_LOCKED]],
				msg: 'The status value you entered is not valid.'
			}
		}
	},
	first_name: {
		type: Sequelize.STRING(128),
		defaultValue: 'No',
		validate: {
			is: {
				args: [/^[A-Za-z\u0080-\u00FF \'-]+$/],
				msg: 'Last name must contain only letters (allow unicode), spaces, hyphens and apostrophes.'
			},
			len: {
				args: [[0, 128]],
				msg: 'First name is too long (maximum is 128 characters).'
			}
		}
	},
	last_name: {
		type: Sequelize.STRING(128),
		defaultValue: 'Name',
		validate: {
			is: {
				args: [/^[A-Za-z\u0080-\u00FF \'-]+$/],
				msg: 'Last name must contain only letters (allow unicode), spaces, hyphens and apostrophes.'
			},
			len: {
				args: [[0, 128]],
				msg: 'Last name is too long (maximum is 128 characters).'
			}
		}
	},
	validation_type: {
		type: Sequelize.INTEGER(1),
		defaultValue: VALIDATION_TYPE_ACTIVE_ACCOUNT,
		validate: {
			isIn: [[VALIDATION_TYPE_NONE, VALIDATION_TYPE_ACTIVE_ACCOUNT, VALIDATION_TYPE_RECOVERY_PASSWORD]]
		}
	},
	validation_expired: {
		type: Sequelize.DATE,
		defaultValue: Sequelize.NOW,
		allowNull: true,
	}
}

export const schemaOptions = {
	hooks: {
		beforeCreate(instance) {
			const { dataValues = {} } = instance;
			if (!instance.changed('password')) {
				return Sequelize.Promise.reject(new Error('Password was not changed.'));
			}
			return Bcrypt.hash(dataValues.password, 10).then(hashedPassword => {
				dataValues.password = hashedPassword;
			});
		}
	}
};