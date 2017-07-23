/** External modules */
import Bluebird from "bluebird";
import { expect } from "chai";
import _ from "lodash";

/** Internal modules */
import TestApp from "../../dev";
import KryptstormUser from "../../modules/kryptstorm-user";
import { faker } from "../../modules/kryptstorm-user/dev";
import { STATUS_ACTIVE } from "../../modules/kryptstorm-user/validate";
import KryptstormAuth from ".";

/** Init test app */
const app = TestApp();
const insertNumber = 1;

/** Register KryptstormUser to test */
app.use(KryptstormUser);
app.use(KryptstormAuth);

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
                { status: STATUS_ACTIVE },
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

  it("Authentication - by username", function(done) {
    let _user = _.pick(user, ["username", "password"]);
    app
      .asyncAct$("auth:authenticated", { attributes: user })
      .then(({ errorCode$ = "ERROR_NONE", data$ }) => {
        /** Error is ERROR_NONE */
        expect(errorCode$).to.be.equal("ERROR_NONE");
        /** Data must be array of item */
        expect(data$).to.be.exist;
        expect(data$).to.be.an("object");
        expect(data$.token).to.be.exist;
        expect(data$.renewToken).to.be.exist;
        return done();
      })
      .catch(done);
  });

  it("Authentication - by email", function(done) {
    let _user = { username: user.email, password: user.password };
    app
      .asyncAct$("auth:authenticated", { attributes: _user })
      .then(({ errorCode$ = "ERROR_NONE", data$ }) => {
        /** Error is ERROR_NONE */
        expect(errorCode$).to.be.equal("ERROR_NONE");
        /** Data must be array of item */
        expect(data$).to.be.exist;
        expect(data$).to.be.an("object");
        expect(data$.token).to.be.exist;
        expect(data$.renewToken).to.be.exist;

        _.assign(user, data$);
        return done();
      })
      .catch(done);
  });

  it("Verification - by token", function(done) {
    app
      .asyncAct$("auth:verify", { attributes: { token: user.token } })
      .then(({ errorCode$ = "ERROR_NONE", data$ }) => {
        /** Error is ERROR_NONE */
        expect(errorCode$).to.be.equal("ERROR_NONE");
        /** Data must be array of item */
        expect(data$).to.be.exist;
        expect(data$).to.be.an("object");
        expect(data$.id).to.be.exist;
        return done();
      })
      .catch(done);
  });

  it("Verification - by renew token", function(done) {
    app
      .asyncAct$("auth:verify", { attributes: { token: user.renewToken } })
      .then(({ errorCode$ = "ERROR_NONE", data$ }) => {
        /** Error is ERROR_NONE */
        expect(errorCode$).to.be.equal("ERROR_NONE");
        /** Data must be array of item */
        expect(data$).to.be.exist;
        expect(data$).to.be.an("object");
        expect(data$.id).to.be.exist;
        return done();
      })
      .catch(done);
  });
});
