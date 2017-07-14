/** External modules */
import Seneca from "seneca";
import Config from "config";

/** Kryptstorm plugins */
import Services from "./plugins/kryptstorm-services";
import Https from "./plugins/kryptstorm-https";

/** Kryptstorm service */
import KryptstormUser from "./services/kryptstorm-user";

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
/** Kryptstorm Http */
App.use(Https, { isDebug: Config.get("api.isDebug") });

/** Register kryptstorm service */
/** Kryptstorm User */
App.use(KryptstormUser);

/** All services is ready, now we handle http connection */
App.ready(() =>
  App.Services$
    .actAsync("http:run")
    .then(({ server }) =>
      server.listen(process.env.PORT || 9999, () =>
        console.log("Server is ready to handle connection")
      )
    )
    .catch(error => console.log(error.message))
);
