/** System modules */
import Crypto from 'crypto';

/** Internal modules */
import Sequelize from 'sequelize';
import Bcrypt from 'bcrypt';
import Randomstring from 'randomstring';

/** New user and user has not activated yet */
export const STATUS_NEW = 0;
/** User was activated, can do anything her/him can */
export const STATUS_ACTIVE = 1;
/** User was locked, but all resource of her/him still available */
export const STATUS_LOCKED = 2;

/** Validation was executed */
export const VALIDATION_TYPE_NONE = 0;
/** Need to execute validate new account */
export const VALIDATION_TYPE_ACTIVE_ACCOUNT = 1;
/** Need to execute validate for recovery password */
export const VALIDATION_TYPE_RECOVERY_PASSWORD = 2;
/** Validation code only available on 7 days */
export const VALIDATION_EXPIRY_TIME = Sequelize.fn('ADDDATE', Sequelize.fn('NOW'), 7);

/** You should only return fields on this constant */
export const REAL_PUBLIC_FIELDS = ['id', 'username', 'email', 'status', 'first_name', 'last_name'];
export const VIRTUAL_PUBLIC_FILEDS = ['full_name'];

/** Model properties */
export default {
	name: 'users',
	schema: {
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
			defaultValue: STATUS_NEW,
			validate: {
				isIn: {
					args: [[STATUS_NEW, STATUS_ACTIVE, STATUS_LOCKED]],
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
			defaultValue: null,
			allowNull: true,
		},
		validation_code: {
			type: Sequelize.STRING(32),
			defaultValue: null,
			allowNull: true,
		}
	},
	schemaOptions: {
		hooks: {
			beforeCreate(instance) {
				const { dataValues = {} } = instance;

				if (!instance.changed('password')) {
					return Sequelize.Promise.reject(new Error('Password was not changed.'));
				}
				return Bcrypt.hash(dataValues.password, 10).then(hashedPassword => {
					dataValues.password = hashedPassword;
				});
			},
		}
	}
}

export const generateValidationBaseOnStatus = status => {
	let attributes = {};

	if (status == STATUS_NEW) {
		attributes.validation_type = VALIDATION_TYPE_ACTIVE_ACCOUNT;
		attributes.validation_expired = VALIDATION_EXPIRY_TIME;
		attributes.validation_code = Crypto.createHash('md5').update(String((new Date()).getTime()) + Randomstring.generate(9)).digest("hex");
	}
	if (status == STATUS_ACTIVE || status == STATUS_LOCKED) {
		attributes.validation_type = VALIDATION_TYPE_NONE;
		attributes.validation_expired = null;
		attributes.validation_code = null;
	}

	return attributes;
}