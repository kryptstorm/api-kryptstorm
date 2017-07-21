/** External modules */
import Seneca from "seneca";
import _ from "lodash";
import { expect } from "chai";
import Faker from "faker";
import Config from "config";

/** Kryptstorm plugins */
import Services from "../../plugins/kryptstorm-services";
import Enitties from "../../plugins/kryptstorm-entities";

/** Internal modules */
import KryptstormUser from ".";

/** Ensure you only run this file on development mode */
if (process.env.NODE_ENV !== "development") {
  console.log(
    `Cannot run development prepare file at env: ${process.env.NODE_ENV}`
  );
  process.exit(0);
}

const TestApp = fn =>
  Seneca({
    log: "test"
  })
    .test(fn)
    .use("mongo-store", Config.get("mongo"))
    .use("entity")
    .use(Services)
    .use(Enitties)
    .use(KryptstormUser);

const app = TestApp();

describe("Kryptstorm Users", function() {
  before(done => {
    return app.ready(() => {
      app
        .make$("mongo", "kryptstorm", "users")
        .asyncNative$()
        .then(db => {
          console.log(db.collection("kryptstorm_users"));
          return done();
        })
        .catch(done);
    });
  });

  it("Find all users", function(done) {
    console.log("---------------");
    return done();
  });
});
