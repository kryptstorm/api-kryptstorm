/** External modules */
import Bluebird from "bluebird";
import { expect } from "chai";
import _ from "lodash";

/** Internal modules */
import TestApp from "../../dev";
import KryptstormUser from "../../services/kryptstorm-user";
import { faker } from "../../services/kryptstorm-user/dev";
import { STATUS_ACTIVE } from "../../services/kryptstorm-user/validation";
import KryptstormAuth from ".";

const insertNumber = 1;
const testCollection = ["mongo", "test_kryptstorm", "users"];
const testCollectionName = testCollection[1] + "_" + testCollection[2];

describe("KryptstormAuth - Basic", function() {
  /** Init test app */
  const app = TestApp();
  /** Register KryptstormUser to test */
  app.use(KryptstormUser, { collection: testCollection });
  app.use(KryptstormAuth);

  let UserCollection,
    user = { password: "123456" };

  /**
	 * Prepare before run all unit test
	 * After before function, app is ready to call action
	 */
  before(done =>
    app.ready(() => {
      UserCollection = app.make$.apply(null, testCollection);

      return UserCollection.asyncNative$()
        .then(db =>
          /** Delete all document by node-mongo-native */
          db.collection(testCollectionName).remove().then(() =>
            Bluebird.all(
              faker(
                UserCollection,
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
        expect(data$.accessToken).to.be.exist;
        expect(data$.refreshToken).to.be.exist;
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
        expect(data$.accessToken).to.be.exist;
        expect(data$.refreshToken).to.be.exist;

        _.assign(user, data$);
        return done();
      })
      .catch(done);
  });

  it("Verification - by access token", function(done) {
    app
      .asyncAct$("auth:verify", { accessToken: user.accessToken })
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

  it("Verification - by refresh token", function(done) {
    app
      .asyncAct$("auth:verify", { accessToken: user.refreshToken })
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

  it("Verification - use refresh token to reset access token", function(done) {
    app
      .asyncAct$("auth:verify", {
        accessToken: user.accessToken + "1",
        refreshToken: user.refreshToken
      })
      .then(({ errorCode$ = "ERROR_NONE", data$ }) => {
        /** Error is ERROR_NONE */
        expect(errorCode$).to.be.equal("ERROR_NONE");
        /** Data must be array of item */
        expect(data$).to.be.exist;
        expect(data$).to.be.an("object");
        expect(data$.accessToken).to.be.exist;
        expect(data$.refreshToken).to.be.exist;
        expect(data$.id).to.be.exist;
        return done();
      })
      .catch(done);
  });

  /** Clear all test data after test is finish */
  after(done => {
    UserCollection.make$()
      .asyncNative$()
      /** Delete all document by node-mongo-native */
      .then(db => db.collection(testCollectionName).remove())
      /**
			 * @see https://developer.mozilla.org/vi/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
			 * First params is "this" - we use null
			 * Second param is "error" - we dont have error, so set it to null
			 */
      .then(done.bind(null, null))
      .catch(done);
  });
});
