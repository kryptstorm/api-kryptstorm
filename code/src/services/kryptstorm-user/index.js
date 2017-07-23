/** System modules */
import Querystring from "querystring";

/** External modules */
import Bluebird from "bluebird";
import Bcrypt from "bcrypt";
import _ from "lodash";
import Validator from "validator";

/** Internal modules */
import ValidationRules, {
  PUBLICK_FIELDS,
  STATUS_NEW,
  STATUS_ACTIVE,
  STATUS_LOCKED,
  STATUS_DELETED,
  VALIDATION_TYPE_NEW,
  getValidationToken,
  getValidationExpired
} from "./validate";

/** Routes */
export const routes = {
  "post::/users": "users:create",
  "get::/users": "users:find_all",
  "get::/users/:id": "users:find_by_id",
  "put::/users/:id": "users:update_by_id",
  "delete::/users/:id": "users:delete_by_id"
};

export default function Users() {
  /** Register http options */
  if (this.has("init:Http")) {
    /** Register routes */
    _.assign(this.options().Https, { routes });
  }

  this.add("init:Users", function initUsers(args, reply) {
    return reply();
  });

  this.add("users:create", function usersCreate(args, reply) {
    let { attributes = {} } = args;

    /** This is a stupid action if you allow user create new user without attributes */
    if (_.isEmpty(attributes)) {
      reply(null, {
        errorCode$: "INVALID_ATTRIBUTES",
        message$: "You cannot create user with empty attributes."
      });
    }

    /** First, validate - that will remove all undefined on validation schema */
    return (ValidationRules.onCreate(attributes)
        /** Two, save data */
        .then(cleanAttributes => {
          /** Defined save fields */
          let _fields$ = [...PUBLICK_FIELDS];
          /** Defined return fields */
          let _query = { fields$: PUBLICK_FIELDS };

          /** Username and email should be convert to lowercase */
          cleanAttributes.username = _.toLower(cleanAttributes.username);
          cleanAttributes.email = _.toLower(cleanAttributes.email);

          /** Password must be encrypt */
          cleanAttributes.password = Bcrypt.hashSync(
            cleanAttributes.password,
            12
          );
          _fields$.push("password");

          /**
				 * On scenario create user, only allow STATUS_NEW and STATUS_ACTIVE
				 * If the status is another value, reset it to STATUS_NEW
				 */
          if (
            !_.includes([STATUS_NEW, STATUS_ACTIVE], cleanAttributes.status)
          ) {
            cleanAttributes.status = STATUS_NEW;
          }
          /** User is new, generate validation field */
          if (cleanAttributes.status === STATUS_NEW) {
            cleanAttributes.validation = {
              type: VALIDATION_TYPE_NEW,
              code: getValidationToken(),
              expiredAt: getValidationExpired()
            };
            /** Add validation to save fields */
            _fields$.push("validation");
          }
          /** Assign createdAt */
          cleanAttributes.createdAt = new Date();

          /**
				 * Defined function will return all fields will be saved
				 * @see https://github.com/senecajs/seneca-mongo-store/blob/v1.1.0/mongo-store.js#L188
				 */
          cleanAttributes.fields$ = () => _fields$;

          /** Create new instance */
          let _user = this.make$("mongo", "kryptstorm", "users");
          /** Set attributes */
          _.assign(_user, cleanAttributes);

          /** Save user */
          return _user
            .asyncSave$(_query)
            .then(row => reply(null, { data$: row }));
        })
        .catch(err =>
          reply(null, { errorCode$: "SYSTEM_ERROR", errors$: err })
        ) );
  });

  this.add("users:find_all", function usersFindAll(args, reply) {
    let { query = {}, sort = {}, limit, skip } = args;
    /** Build query */
    let _query = { fields$: PUBLICK_FIELDS };
    /** Only allow query public field */
    _.assign(_query, _.pick(query, PUBLICK_FIELDS));
    /** Sort */
    _query.sort$ = _.pick(sort, PUBLICK_FIELDS);
    /** Pagination */
    _.assign(_query, { limit$: limit, skip$: skip });

    /** Some field need to convert a type before query */
    if (!_.isUndefined(_query.status)) _query.status = Number(_query.status);

    /** Load data */
    return this.make$("mongo", "kryptstorm", "users")
      .asyncList$(_query)
      .then(rows => reply(null, { data$: rows }))
      .catch(err => reply(null, { errorCode$: "SYSTEM_ERROR", errors$: err }));
  });

  this.add("users:find_by_id", function usersFindById(args, reply) {
    let { params = {} } = args;
    /** If id is not exist */
    if (!params.id) {
      return reply(null, {
        errorCode$: "DATA_NOT_FOUND",
        message$: "User is not found. May be this user has been deleted."
      });
    }

    /** If id is not valid mongoID */
    if (!Validator.isMongoId(params.id)) {
      reply(null, {
        errorCode$: "INVALID_PARAMS",
        message$: `The user with id (${String(
          params.id
        )}) you provided does not exist.`
      });
    }

    /** Build query */
    let _query = { fields$: PUBLICK_FIELDS, id: params.id };

    /** Load data */
    return this.make$("mongo", "kryptstorm", "users")
      .asyncLoad$(_query)
      .then(row => {
        /** User with id is not found. */
        if (_.isEmpty(row)) {
          return reply(null, {
            errorCode$: "DATA_NOT_FOUND",
            message$: `User (with id ${params.id}) is not found. May be this user has been deleted.`
          });
        }
        return reply(null, { data$: row });
      })
      .catch(err => reply(null, { errorCode$: "SYSTEM_ERROR", errors$: err }));
  });

  this.add("users:update_by_id", function usersFindById(args, reply) {
    let { params = {}, attributes = {} } = args;

    /** This is a stupid action if you allow user update a user without attributes */
    if (_.isEmpty(attributes)) {
      reply(null, {
        errorCode$: "INVALID_ATTRIBUTES",
        message$: "You cannot update user with empty attributes."
      });
    }

    /** If id is not exist */
    if (!params.id) {
      return reply(null, {
        errorCode$: "DATA_NOT_FOUND",
        message$: "User is not found. May be this user has been deleted."
      });
    }

    /** If id is not valid mongoID */
    if (!Validator.isMongoId(params.id)) {
      reply(null, {
        errorCode$: "INVALID_PARAMS",
        message$: `The user with id (${String(
          params.id
        )}) you provided does not exist.`
      });
    }

    /** Build query */
    let _query = { fields$: PUBLICK_FIELDS, id: params.id };

    /**
		 * Load data
		 * and you want row is entity instead of array of attributes
		 */
    return this.make$("mongo", "kryptstorm", "users")
      .asyncLoad$(_query, true)
      .then(user => {
        /** User with id is not found. */
        if (!user || !user.id) {
          return reply(null, {
            errorCode$: "DATA_NOT_FOUND",
            message$: `User (with id ${params.id}) is not found. May be this user has been deleted.`
          });
        }

        return (
          /** First, validate */
          ValidationRules.onUpdate(attributes)
            /** Two, save data */
            .then(cleanAttributes => {
              /** Defined save fields */
              let _fields$ = [...PUBLICK_FIELDS];
              /** Defined return fields */
              let _query = { fields$: PUBLICK_FIELDS };

              /**
							 * On scenario update user, only allow STATUS_ACTIVE, STATUS_LOCKED and STATUS_DELETED
							 * If the status is another value, reset it to STATUS_LOCKED
							 */
              if (
                !_.includes(
                  [STATUS_ACTIVE, STATUS_LOCKED, STATUS_DELETED],
                  cleanAttributes.status
                )
              ) {
                cleanAttributes.status = STATUS_ACTIVE;
              }
              /** Assign updatedAt */
              cleanAttributes.updatedAt = new Date();

              /**
							 * Defined function will return save fields
							 * @see https://github.com/senecajs/seneca-mongo-store/blob/v1.1.0/mongo-store.js#L188
							 */
              cleanAttributes.fields$ = () => _fields$;

              /** Set attributes */
              _.assign(user, cleanAttributes);

              /** Save user */
              return user
                .asyncSave$(_query)
                .then(row => reply(null, { data$: row }));
            })
        );
      })
      .catch(err => reply(null, { errorCode$: "SYSTEM_ERROR", errors$: err }));
  });

  this.add("users:delete_by_id", function usersFindById(args, reply) {
    let { params = {} } = args;

    /** If id is not exist */
    if (!params.id) {
      return reply(null, {
        errorCode$: "DATA_NOT_FOUND",
        message$: "User is not found. May be this user has been deleted."
      });
    }

    /** If id is not valid mongoID */
    if (!Validator.isMongoId(params.id)) {
      reply(null, {
        errorCode$: "INVALID_PARAMS",
        message$: `The user with id (${String(
          params.id
        )}) you provided does not exist.`
      });
    }

    /** Build query */
    let _query = { fields$: PUBLICK_FIELDS, id: params.id };

    /** Remove user */
    return this.make$("mongo", "kryptstorm", "users")
      .asyncRemove$(_query)
      .then(row => reply(null, { data$: row }))
      .catch(err => reply(null, { errorCode$: "SYSTEM_ERROR", errors$: err }));
  });

  return { name: "Users" };
}
