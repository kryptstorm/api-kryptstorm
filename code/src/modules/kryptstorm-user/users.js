/** External modules */
import Bluebird from "bluebird";
import _ from "lodash";

export default function Users() {
  /** Routes config */
  const routes = {
    "get:/users": "users:find_all"
  };
  const { actAsync } = this.Services$;

  this.add("init:Users", function initUsers(args, reply) {
    actAsync("http:save_routes", { routes })
      /**
			 * Your are in promise chain, so just write .then(() => reply()) will throw warning
			 * Warning: a promise was created in a handler at xxx/xxx/xxx.js but was not returned from it, see http://goo.gl/rRqMUw
			 * @see http://goo.gl/rRqMUw
			 * 
			 * So, do a trick to resolve this problem
			 * Resolve a result from reply();
			 */
      .then(() => Bluebird.resolve(reply()))
      .catch(reply);
  });

  this.add("users:find_all", function usersFindAll(args, reply) {
    this.Enities$
      .fixMake$("mongo", "kryptstorm", "users")
      .asyncList$({ fields$: ["id", "username"] })
      .then(rows => reply(null, { data$: rows }))
      .catch(reply);
  });

  return { name: "Users" };
}
