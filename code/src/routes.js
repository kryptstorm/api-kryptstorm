export default {
  "/users": {
    post: "users:create",
    get: "users:find_all"
  },
  "/users/:id": {
    get: "users:find_by_id",
    put: "users:update_by_id",
    delete: "users:delete_by_id"
  },
  "/auth": {
    post: "auth:authenticated"
  },
  "/auth/verify": {
    post: "auth:verify"
  }
};
