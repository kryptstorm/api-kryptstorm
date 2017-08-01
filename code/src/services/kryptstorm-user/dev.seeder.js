/** Ensure you only run this file on development mode */
if (process.env.NODE_ENV !== "development") {
  console.log(`Cannot run this file at env: ${process.env.NODE_ENV}`);
  process.exit(0);
}

/** External modules */
import Bluebird from "bluebird";

/** Internal modules */
import TestApp from "../../dev";
import { faker } from "./dev";
import KryptstormUser from ".";

const insertNumber = 254;
/** Create test app */
const app = TestApp();
app.use(KryptstormUser);

/** All services is ready, now we handle http connection */
app.ready(() => {
  const { collection } = app.options().Users;
  const collectionName = collection[1] + "_" + collection[2];
  return app.make$
    .apply(null, collection)
    .asyncNative$()
    .then(db =>
      /** Delete all document by node-mongo-native */
      db.collection(collectionName).removeMany().then(() =>
        Bluebird.all(
          faker(app.make$.apply(null, collection), insertNumber)
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
