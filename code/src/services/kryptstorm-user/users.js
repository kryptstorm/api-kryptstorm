/** External modules */
import _ from "lodash";

export default function Users() {
  /** Routes config */
  const routes = {
    "get:/users": "users:find_all"
  };
  /** Model config */
  let User;

  this.add("init:Users", function initUsers(args, reply) {
    const { actAsync } = this.Services$;
    /** Defined mongo schema */
    User = this.make$("users");
    /** Register routes for this plugin */
    actAsync("http:save_routes", { routes })
      .then(result => reply())
      .catch(reply);
  });

  this.add("users:find_all", function usersFindAll(args, reply) {
    return reply(null, { data$: User.list$({}) });
  });

  this.add("users:create", function usersCreate(args, reply) {});

  return { name: "Users" };
}
