/** External modules */
import Seneca from "seneca";
import Config from "config";
import _ from "lodash";

/** Kryptstorm plugins */
import Services from "./plugins/kryptstorm-services";
import Enitties from "./plugins/kryptstorm-entities";
import Https from "./plugins/kryptstorm-https";

/** Kryptstorm modules */
import KryptstormUser from "./services/kryptstorm-user";
import KryptstormAuth from "./services/kryptstorm-auth";

/** Init Seneca */
const options = {
  default_plugins: { transport: false },
  debug: { undead: Config.get("api.isDebug") }
};
const App = Seneca(options);

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
App.use(Services);
/** Kryptstorm Entities */
App.use(Enitties, { queryConfig: { limit$: Config.get("api.limitRow") } });
/** Kryptstorm Http */
App.use(Https, {
  isDebug: Config.get("api.isDebug")
});

/** Register kryptstorm service */
/** Kryptstorm User */
App.use(KryptstormUser);
/** Kryptstorm auth */
App.use(KryptstormAuth);

/** Export Kryptstorm app */
export default App;
