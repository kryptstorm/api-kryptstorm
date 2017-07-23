/** External modules */
import Bluebird from "bluebird";
import { expect } from "chai";
import _ from "lodash";

/** Internal modules */
import TestApp from "../../dev";
import { faker } from "../../modules/kryptstorm-user/dev";

/** Init test app */
const app = TestApp();
const insertNumber = 1;

/** Begin test */
describe("Kryptstorm Auth", function() {
  let UserCollection,
    user = { password: "123456" };

  /**
	 * Prepare before run all unit test
	 * After before function, app is ready to call action
	 */
  before(done =>
    app.ready(() => {
      UserCollection = app.make$("mongo", "kryptstorm", "users");

      return UserCollection.asyncNative$()
        .then(db =>
          /** Delete all document by node-mongo-native */
          db.collection("kryptstorm_users").removeMany().then(() =>
            Bluebird.all(
              faker(
                app.make$("mongo", "kryptstorm", "users"),
                insertNumber,
                {},
                { fields$: ["username", "email"] }
              )
            ).then(rows => {
              _.assign(user, rows[0]);
              return done();
            })
          )
        )
        .catch(done);
    })
  );

  it("Authentication", function(done) {
    return done();
  });
});
