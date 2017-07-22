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
import TestApp, { faker } from "./dev";
import KryptstormUser from ".";
import { PUBLICK_FIELDS } from "./validate";

/** Init test app */
const app = TestApp();
const insertNumber = 5;

/** Register KryptstormUser to test */
app.use(KryptstormUser);

/** Begin test */
describe("Kryptstorm Users", function() {
  let UserCollection, userId;

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
          db
            .collection("kryptstorm_users")
            .removeMany()
            .then(() =>
              Bluebird.all(
                faker(app.make$("mongo", "kryptstorm", "users"), insertNumber)
              ).then(() => done())
            )
        )
        .catch(done);
    })
  );

  it("Find all users", function(done) {
    app
      .asyncAct$("users:find_all")
      .then(({ errorCode$ = "ERROR_NONE", data$ }) => {
        /** Error is ERROR_NONE */
        expect(errorCode$).to.be.equal("ERROR_NONE");
        /** Data must be array of item */
        expect(data$).to.be.an("array");
        expect(data$.length).to.be.equal(insertNumber);
        expect(data$[0]).to.be.exist;
        expect(data$[0]).to.be.an("object");
        /** Dont return field - what is not on PUBLICK_FIELDS */
        expect(_.size(_.omit(data$[0], PUBLICK_FIELDS))).to.be.equal(0);
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
        /** Data must be array of item */
        expect(data$).to.be.exist;
        expect(data$).to.be.an("object");
        /** Dont return field - what is not on PUBLICK_FIELDS */
        expect(_.size(_.omit(data$, PUBLICK_FIELDS))).to.be.equal(0);
        expect(data$.id).to.be.exist;
        /** Finish test */
        done(null);
      })
      .catch(done);
  });

  it("Update a user by id", function(done) {
    const attributes = faker(null, 1)[0];
    let beforeUpdateData, data;

    app
      .asyncAct$("users:find_by_id", { params: { id: userId } })
      .then(({ data$: beforeUpdateData$ }) => {
        beforeUpdateData = beforeUpdateData$;

        return app.asyncAct$("users:update_by_id", {
          params: { id: userId },
          attributes
        });
      })
      .then(({ errorCode$ = "ERROR_NONE", data$ }) => {
        data = data$;

        /** Error is ERROR_NONE */
        expect(errorCode$).to.be.equal("ERROR_NONE");
        /** Data must be array of item */
        expect(data$).to.be.exist;
        expect(data$).to.be.an("object");
        /** Dont return field - what is not on PUBLICK_FIELDS */
        expect(_.size(_.omit(data$, PUBLICK_FIELDS))).to.be.equal(0);
        expect(data$.id).to.be.exist;

        return app.asyncAct$("users:find_by_id", { params: { id: userId } });
      })
      .then(({ data$: afterUpdateData$ }) => {
        expect(_.size(beforeUpdateData)).is.equal(_.size(data));
        expect(_.size(data)).is.equal(_.size(afterUpdateData$));

        expect(beforeUpdateData.usename).is.equal(data.usename);
        expect(data.usename).is.equal(afterUpdateData$.usename);

        /** Update field is successful */
        expect(attributes.status).is.equal(attributes.status);
        done(null);
      })
      .catch(done);
  });
});
