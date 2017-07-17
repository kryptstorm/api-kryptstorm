/** External modules */
import Bluebird from "bluebird";
import _ from "lodash";
import Validator from "validator";

/** Internal modules */
import { PUBLICK_FIELDS } from "./validate";

export default function Users() {
  /** Routes config */
  const routes = {
    "get::/users": "users:find_all",
    "get::/users/:id": "users:find_by_id"
  };
  const { actAsync } = this.Services$;
  const User = this.Enities$.fixMake$("mongo", "kryptstorm", "users");

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
    let { query = {}, sort = {}, limit, skip } = args;

    /** Build query */
    let _query = { fields$: PUBLICK_FIELDS };
    /** Only allow query public field */
    _.assign(_query, _.pick(query, PUBLICK_FIELDS));
    /** Sort */
    _query.sort$ = sort;
    /** Pagination */
    _.assign(_query, { limit$: limit, skip$: limit });

    /** Load data */
    User.asyncList$(_query)
      .then(rows => reply(null, { data$: rows }))
      .catch(reply);
  });

  this.add("users:find_by_id", function usersFindById(args, reply) {
    let { params = {} } = args;
    /** If id is not exist */
    if (!params.id) {
      return reply(null, {
        errorCode$: "DATA_NOT_FOUND",
        message$: "User not found. May be this user has been deleted."
      });
    }

    /** If id is not valid mongoID */
    if (!Validator.isMongoId(params.id)) {
      reply(null, {
        errorCode$: "INVALID_PARAMS",
        message$: "The user with id you provided does not exist."
      });
    }

    /** Build query */
    let _query = { fields$: PUBLICK_FIELDS, id: params.id };

    /** Load data */
    User.asyncLoad$(_query)
      .then(rows => reply(null, { data$: rows }))
      .catch(reply);
  });

  return { name: "Users" };
}
