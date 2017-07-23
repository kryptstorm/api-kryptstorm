/** Ensure you only run this file on development mode */
if (process.env.NODE_ENV !== "development") {
  console.log(`Cannot run this file at env: ${process.env.NODE_ENV}`);
  process.exit(0);
}

/** External modules */
import Faker from "faker";
import _ from "lodash";
import Bcrypt from "bcrypt";

/** Internal modules */
import {
  STATUS_NEW,
  STATUS_ACTIVE,
  STATUS_LOCKED,
  STATUS_DELETED,
  VALIDATION_TYPE_NEW,
  VALIDATION_TYPE_RECOVERY,
  getValidationToken,
  getValidationExpired
} from "./validate";

const statuses = [STATUS_NEW, STATUS_ACTIVE, STATUS_LOCKED, STATUS_DELETED];
export const faker = (entity, number = 0, overwriteAttributes = {}, query) => {
  let result = [],
    usernames = [],
    emails = [];

  while (number > 0) {
    let user = {
      username: _.toLower(Faker.internet.userName()),
      email: _.toLower(Faker.internet.email()),
      password: "123456",
      firstName: Faker.name.firstName(),
      lastName: Faker.name.lastName(),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdAt: Faker.date.past(),
      updatedAt: Faker.date.recent()
    };

    if (
      _.includes(usernames, user.username) ||
      _.includes(emails, user.email)
    ) {
      return false;
    }

    /** If it's new, generate validation data */
    if (user.status === STATUS_NEW) {
      _.assign(user, {
        validation: {
          type: VALIDATION_TYPE_NEW,
          code: getValidationToken(),
          expiredAt: getValidationExpired()
        }
      });
    }

    /** If it's active, may be this user need to recover their password */
    if (user.status === STATUS_ACTIVE) {
      let validationType = [VALIDATION_TYPE_RECOVERY][
        Math.floor(Math.random() * 2)
      ];

      /** 
			 * This is trick to get validationType
			 * 1. validationType is "undefined" - get the item has not been exist
			 * 2. validationType is VALIDATION_TYPE_RECOVERY
			 */
      if (validationType) {
        _.assign(user, {
          validation: {
            type: VALIDATION_TYPE_RECOVERY,
            code: getValidationToken(),
            expiredAt: getValidationExpired()
          }
        });
      }
    }

    /** Overwrite by attrbites provide by user */
    _.assign(user, overwriteAttributes);

    /** If enitty is truly, return array of asyncSave$ function */
    if (entity) {
      let _entity = entity.make$();
      /** Save item to db, so password must be hashed */
      _.assign(_entity, user, {
        password: Bcrypt.hashSync(user.password, 12)
      });

      result.push(_entity.asyncSave$(query));
    } else {
      /** Return array of attibute item */
      result.push(user);
    }
    number--;
  }

  return result;
};
