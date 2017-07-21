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

/** Kryptstorm plugins */
import Services from "../../plugins/kryptstorm-services";
import Enitties from "../../plugins/kryptstorm-entities";

/** Ensure you only run this file on development mode */
if (process.env.NODE_ENV !== "development") {
  console.log(
    `Cannot run development prepare file at env: ${process.env.NODE_ENV}`
  );
  process.exit(0);
}

export const faker = (entity, number, overwriteAttributes = {}) => {
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
      updatedAt: Faker.date.recent()
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

    let _entity = entity.make$();
    _.assign(_entity, user, overwriteAttributes);

    result.push(_entity.asyncSave$());
    number--;
  }

	return result;
};

const App = Seneca({
  default_plugins: { transport: false },
  debug: { undead: true }
})
  .use(Services)
  .use(Enitties);

/** All services is ready, now we handle http connection */
App.ready(() =>
  Bluebird.all(faker(App.make$("mongo", "kryptstorm", "users"), 254))
    .then(() => {
      console.log(`Insert ${number} users.`);
      process.exit(0);
    })
    .catch(err => {
      console.log(err.message);
      process.exit(0);
    })
);
