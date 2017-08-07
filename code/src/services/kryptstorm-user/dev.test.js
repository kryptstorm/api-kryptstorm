/** Ensure you only run this file on development mode */
if (process.env.NODE_ENV !== "development") {
  console.log(
    `Cannot run development prepare file at env: ${process.env.NODE_ENV}`
  );
  process.exit(0);
}
/** External modules */
import Bluebird from "bluebird";
import { expect } from "chai";
import _ from "lodash";

/** Internal modules */
import TestApp from "../../dev";
import { faker } from "./dev";
import KryptstormUser from ".";
import { PUBLICK_FIELDS, STATUS_NEW } from "./validation";

const insertNumber = 5;
const testCollection = ["mongo", "test_kryptstorm", "users"];
const testCollectionName = testCollection[1] + "_" + testCollection[2];

/** Begin test */
describe("KryptstormUsers - Basic", function() {
  /** Init test app */
  const app = TestApp();
  /** Register KryptstormUser to test */
  app.use(KryptstormUser);

  let UserCollection, userId;

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
          db
            .collection(testCollectionName)
            .removeMany()
            .then(() =>
              Bluebird.all(faker(UserCollection, insertNumber)).then(() =>
                done()
              )
            )
        )
        .catch(done);
    })
  );

  it("Create user", function(done) {
    const attributes = faker(null, 1)[0];

    app
      .asyncAct$("users:create", { attributes })
      .then(({ errorCode$ = "ERROR_NONE", data$ }) => {
        /** Error is ERROR_NONE */
        expect(errorCode$).to.be.equal("ERROR_NONE");
        /** Data must be array of item */
        expect(data$).to.be.exist;
        expect(data$).to.be.an("object");
        /** Dont return field - what is not on PUBLICK_FIELDS */
        expect(_.size(_.omit(data$, PUBLICK_FIELDS))).to.be.equal(0);
        expect(data$.id).to.be.exist;

        return app.asyncAct$("users:find_by_id", { params: { id: data$.id } });
      })
      .then(({ data$ }) => {
        /** Ensure user is created with right info */
        expect(_.toLower(attributes.username)).is.equal(data$.username);
        expect(_.toLower(attributes.email)).is.equal(data$.email);
        expect(attributes.firstName).is.equal(data$.firstName);
        expect(attributes.lastName).is.equal(data$.lastName);
        done(null);
      })
      .catch(done);
  });

  it("Find all users", function(done) {
    app
      .asyncAct$("users:find_all")
      .then(({ errorCode$ = "ERROR_NONE", data$ }) => {
        /** Error is ERROR_NONE */
        expect(errorCode$).to.be.equal("ERROR_NONE");
        /** Data must be array of item */
        expect(data$).to.be.an("array");
        expect(data$[0]).to.be.exist;
        expect(data$[0]).to.be.an("object");
        /** Dont return field - what is not on PUBLICK_FIELDS */
        expect(_.size(_.omit(data$[0], PUBLICK_FIELDS))).to.be.equal(0);
        /** Ensure id is exist */
        expect(data$[0].id).to.be.exist;
        /** Set userId */
        userId = data$[0].id;
        /** Finish test */
        done(null);
      })
      .catch(done);
  });

  it("Find a user by id", function(done) {
    app
      .asyncAct$("users:find_by_id", { params: { id: userId } })
      .then(({ errorCode$ = "ERROR_NONE", data$ }) => {
        /** Error is ERROR_NONE */
        expect(errorCode$).to.be.equal("ERROR_NONE");
        /** Data must be attributes object of item */
        expect(data$).to.be.exist;
        expect(data$).to.be.an("object");
        /** Dont return field - what is not on PUBLICK_FIELDS */
        expect(_.size(_.omit(data$, PUBLICK_FIELDS))).to.be.equal(0);
        /** Ensure id is exist */
        expect(data$.id).to.be.exist;
        /** Finish test */
        done(null);
      })
      .catch(done);
  });

  /**
	 * 1. Query data with id to store data before update
	 * 2. Update user and get return result
	 * 3. Query data again with id to store data after update
	 * 
	 * The test case must is made sure unallow update field on #1, #2, #3 is not updated
	 */
  it("Update a user by id", function(done) {
    const attributes = faker(null, 1)[0];
    let beforeUpdateData, returnData;

    app
      .asyncAct$("users:find_by_id", { params: { id: userId } })
      .then(({ data$ }) => {
        beforeUpdateData = data$;

        return app.asyncAct$("users:update_by_id", {
          params: { id: userId },
          attributes
        });
      })
      .then(({ errorCode$ = "ERROR_NONE", data$ }) => {
        returnData = data$;

        /** Error is ERROR_NONE */
        expect(errorCode$).to.be.equal("ERROR_NONE");
        /** Data must be array of item */
        expect(data$).to.be.exist;
        expect(data$).to.be.an("object");
        /** Dont return field - what is not on PUBLICK_FIELDS */
        expect(_.size(_.omit(data$, PUBLICK_FIELDS))).to.be.equal(0);
        expect(data$.id).to.be.exist;
        expect(data$.id).to.equal(userId);

        return app.asyncAct$("users:find_by_id", { params: { id: data$.id } });
      })
      .then(({ data$ }) => {
        expect(beforeUpdateData.usename).is.equal(returnData.usename);
        expect(returnData.usename).is.equal(data$.usename);

        /** Update public fields is successful */
        expect(attributes.firstName).is.equal(returnData.firstName);
        expect(attributes.lastName).is.equal(returnData.lastName);

        done(null);
      })
      .catch(done);
  });

  it("Delete user by id", function(done) {
    app
      .asyncAct$("users:delete_by_id", { params: { id: userId } })
      .then(({ errorCode$ = "ERROR_NONE", data$ }) => {
        /** Error is ERROR_NONE */
        expect(errorCode$).to.be.equal("ERROR_NONE");
        /** Data must be array of item */
        expect(data$).to.be.exist;
        expect(data$).to.be.an("object");
        /** Dont return field - what is not on PUBLICK_FIELDS */
        expect(_.size(_.omit(data$, PUBLICK_FIELDS))).to.be.equal(0);
        expect(data$.id).to.be.exist;
        expect(data$.id).to.equal(userId);

        return app.asyncAct$("users:find_by_id", { params: { id: data$.id } });
      })
      .then(({ errorCode$ = "ERROR_NONE", data$ }) => {
        /** Creation is successful */
        expect(errorCode$).is.equal("DATA_NOT_FOUND");
        expect(data$).to.be.not.exist;
        done(null);
      })
      .catch(done);
  });

  /** Clear all test data after test is finish */
  after(done => {
    UserCollection.make$()
      .asyncNative$()
      /** Delete all document by node-mongo-native */
      .then(db => db.collection(testCollectionName).removeMany())
      /**
			 * @see https://developer.mozilla.org/vi/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
			 * First params is "this" - we use null
			 * Second param is "error" - we dont have error, so set it to null
			 */
      .then(done.bind(null, null))
      .catch(done);
  });
});
