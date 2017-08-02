/** Ensure you only run this file on development mode */
if (process.env.NODE_ENV !== "development") {
  console.log(`Cannot run this file at env: ${process.env.NODE_ENV}`);
  process.exit(0);
}

/** External modules */
import Seneca from "seneca";
import Config from "config";

/** Kryptstorm plugins */
import KryptstormServices from "./plugins/kryptstorm-services";
import KryptstormEnitties from "./plugins/kryptstorm-entities";

const TestApp = fn =>
  Seneca({
    log: "test"
  })
    .test(fn)
    .use("mongo-store", Config.get("mongo"))
    .use("entity")
    .use(KryptstormServices)
    .use(KryptstormEnitties);

/** Export test to other file can use it to init test app */
export default TestApp;
