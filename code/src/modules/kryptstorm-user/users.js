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
    /** First, register entity for this service */
    actAsync("entities:add", { name: "users" })
      /** Then register routes for this plugin */
      .then(result => actAsync("http:save_routes", { routes }))
      .then(result => reply())
      .catch(reply);
  });

  this.add("users:find_all", function usersFindAll(args, reply) {
    this.Entities$.users$
      .list$({})
      .then(result => reply(null, { data$: result }))
      .catch(reply);
  });

  return { name: "Users" };
}
