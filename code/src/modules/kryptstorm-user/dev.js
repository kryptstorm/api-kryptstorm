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

/** Internal modules */
import App from "../../";

if (process.env.NODE_ENV !== "development") {
  console.log(
    `Cannot run development prepare file at env: ${process.env.NODE_ENV}`
  );
  process.exit(0);
}

const number = 254;
const faker = (entity, number) => {
  let result = [],
    usernames = [],
    emails = [];

  while (number > 0) {
    let user = {
      username: Faker.internet.userName(),
      email: Faker.internet.email(),
      password: Bcrypt.hashSync("123456", 12),
      status: Math.floor(Math.random() * 4),
      createdAt: Faker.date.past(),
      updateAt: Faker.date.recent()
    };

    if (
      _.includes(usernames, user.username) ||
      _.includes(emails, user.email)
    ) {
      return false;
    }

    if (user.status === 0) {
      _.assign(user, {
        validation: {
          type: Math.floor(Math.random() * 3),
          code: Crypto.createHash("md5")
            .update(String(new Date().getTime()) + Randomstring.generate(9))
            .digest("hex"),
          expiredAt: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    }

    let _entity = entity.fixMake$();
    _.assign(_entity, user);

    result.push(_entity.asyncSave$());
    number--;
  }

  return result;
};

/** All services is ready, now we handle http connection */
App.ready(() =>
  Bluebird.all(
    faker(App.Enities$.fixMake$("mongo", "kryptstorm", "users"), number)
  )
    .then(() => {
      console.log(`Insert ${number} users.`);
      process.exit(0);
    })
    .catch(err => {
      console.log(err.message);
      process.exit(0);
    })
);
