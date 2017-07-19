/** External modules */
import Bluebird from "bluebird";
import Bcrypt from "bcrypt";
import _ from "lodash";
import Validator from "validator";

/** Internal modules */
import Validate, {
  PUBLICK_FIELDS,
  STATUS_NEW,
  VALIDATION_TYPE_NONE,
  getToken,
  getExpired
} from "./validate";

export default function Users() {
  /** Routes config */
  const routes = {
    "post::/users": "users:create",
    "get::/users": "users:find_all",
    "get::/users/:id": "users:find_by_id"
  };
  const { actAsync } = this.Services$;
  const User = this.Enities$.makeWithAsync$("mongo", "kryptstorm", "users");

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

  this.add("users:create", function usersCreate(args, reply) {
    let { attributes = {} } = args;

    if (_.isEmpty(attributes)) {
      reply(null, {
        errorCode$: "INVALID_ATTRIBUTES",
        message$: "You cannot create user with empty attributes."
      });
    }

    /** First, validate - that will remove all undefined on validation schema */
    Validate.onDefault(attributes)
      /** Two, save data */
      .then(cleanAttributes => {
        /** Defined save fields */
        let _fields$ = [...PUBLICK_FIELDS];
        /** Defined return fields */
        let _query = { fields$: PUBLICK_FIELDS };

        /** Password must be encrypt */
        cleanAttributes.password = Bcrypt.hashSync(
          cleanAttributes.password,
          12
        );

        /**
				 * On scenario create user, only allow STATUS_NEW and STATUS_ACTIVE
				 * If the status is another value, reset it to STATUS_NEW
				 */
        if (!_.includes([STATUS_NEW, STATUS_ACTIVE], cleanAttributes.status)) {
          cleanAttributes.status = STATUS_NEW;
        }
        /** User is new, generate validation field */
        if (cleanAttributes.status === STATUS_NEW) {
          cleanAttributes.validation = {
            type: VALIDATION_TYPE_NONE,
            code: getToken(),
            expiredAt: getExpired()
          };
          /** Add validation to save fields */
          _fields$.push("validation");
        }
        /**
				 * Defined function will return save fields
				 * @see https://github.com/senecajs/seneca-mongo-store/blob/v1.1.0/mongo-store.js#L188
				 */
        cleanAttributes.fields$ = () => _fields$;

        /** Create new instance */
        let _user = User.makeWithAsync$();
        /** Set attributes */
        _.assign(_user, cleanAttributes);

        /** Save user */
        return _user
          .asyncSave$(_query)
          .then(row => reply(null, { data$: row }))
          .catch(err => reply(null, { errors$: err }));
      })
      .catch(err => reply(null, { errors$: err }));
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
    return User.asyncList$(_query)
      .then(rows => reply(null, { data$: rows }))
      .catch(err => reply(null, { errors$: err }));
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
    return User.asyncLoad$(_query)
      .then(rows => reply(null, { data$: rows }))
      .catch(err => reply(null, { errors$: err }));
  });

  return { name: "Users" };
}
