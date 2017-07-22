/** Ensure you only run this file on development mode */
if (process.env.NODE_ENV !== "development") {
  console.log(
    `Cannot run development prepare file at env: ${process.env.NODE_ENV}`
  );
  process.exit(0);
}

/** External modules */
import Bluebird from "bluebird";

/** Internal modules */
import TestApp, { faker } from "./dev";

const insertNumber = 254;
/** Create test app */
const app = TestApp();

/** All services is ready, now we handle http connection */
app.ready(() => {
  return app
    .make$("mongo", "kryptstorm", "users")
    .asyncNative$()
    .then(db =>
      /** Delete all document by node-mongo-native */
      db.collection("kryptstorm_users").removeMany().then(() =>
        Bluebird.all(
          faker(app.make$("mongo", "kryptstorm", "users"), insertNumber)
        ).then(() => {
          console.log(`Insert ${insertNumber} users.`);
          process.exit(0);
        })
      )
    )
    .catch(err => {
      console.log(err.message);
      process.exit(0);
    });
});
