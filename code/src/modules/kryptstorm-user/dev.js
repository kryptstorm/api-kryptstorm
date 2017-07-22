/** Ensure you only run this file on development mode */
if (process.env.NODE_ENV !== "development") {
  console.log(
    `Cannot run development prepare file at env: ${process.env.NODE_ENV}`
  );
  process.exit(0);
}

/**
 * Run this file will do all thing to make your development is ready
 * Don't run this file if you aren't in development mode
 */
/** System modules */
import Crypto from "crypto";

/** External modules */
import Faker from "faker";
import _ from "lodash";
import Bcrypt from "bcrypt";
import Bluebird from "bluebird";
import Randomstring from "randomstring";
import Seneca from "seneca";
import Config from "config";

/** Kryptstorm plugins */
import Services from "../../plugins/kryptstorm-services";
import Enitties from "../../plugins/kryptstorm-entities";

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
const TestApp = fn =>
  Seneca({
    log: "test"
  })
    .test(fn)
    .use("mongo-store", Config.get("mongo"))
    .use("entity")
    .use(Services)
    .use(Enitties);

/** Export test to other file can use it to init test app */
export default TestApp;

export const faker = (entity, number = 0, overwriteAttributes = {}) => {
  let result = [],
    usernames = [],
    emails = [];

  while (number > 0) {
    let user = {
      username: Faker.internet.userName(),
      email: Faker.internet.email(),
      password: Bcrypt.hashSync("123456", 12),
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
      _.assign(_entity, user);

      result.push(_entity.asyncSave$());
    } else {
      /** Return array of attibute item */
      result.push(user);
    }
    number--;
  }

  return result;
};
