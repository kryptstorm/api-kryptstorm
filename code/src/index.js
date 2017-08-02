/** External modules */
import Seneca from "seneca";
import Config from "config";
import _ from "lodash";

/** Kryptstorm plugins */
import KryptstormServices from "./plugins/kryptstorm-services";
import KryptstormEnitties from "./plugins/kryptstorm-entities";
import KryptstormHttps from "./plugins/kryptstorm-https";

/** Kryptstorm modules */
import KryptstormUser from "./services/kryptstorm-user";
import KryptstormAuth from "./services/kryptstorm-auth";

/** Http routes */
import routes from "./routes";

/** Init Seneca */
const App = Seneca({
  debug: { undead: Config.get("api.isDebug") }
});

/**
 * Register seneca plugins
 * Tts a bit tedious to type in “seneca-“ all the time, 
 * so you are allowed to abbreviate plugin names by dropping the “seneca-“ prefix
 * @see http://senecajs.org/docs/tutorials/how-to-write-a-plugin.html
 */
/** Mongo store */
App.use("mongo-store", Config.get("mongo"));
/** Entity interface */
App.use("entity");

/** Register kryptstorm Plugin */
/** Kryptstorm Service */
App.use(KryptstormServices);
/** Kryptstorm Entities */
App.use(KryptstormEnitties, {
  queryConfig: { limit$: Config.get("api.limitRow") }
});
/** Kryptstorm Http */
App.use(KryptstormHttps, {
  isDebug: Config.get("api.isDebug"),
  routes
});

/** Register kryptstorm service */
/** Kryptstorm User */
App.use(KryptstormUser);
/** Kryptstorm auth */
App.use(KryptstormAuth);

/** Export Kryptstorm app */
export default App;
