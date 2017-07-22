import _ from "lodash";
/** Routes */
export const routes = {
  "post::/auth": "auth:authenticated"
};

export const notAuthenticatednRoutes = ["post::/auth"];
export const notAuthorizedRoutes = [];

export default function Auth() {
  const _notAuthenticatednRoutes = _.uniq([
    ...this.options().Https.notAuthenticatednRoutes,
    ...notAuthenticatednRoutes
  ]);
  const _notAuthorizedRoutes = _.uniq([
    ...this.options().Https.notAuthorizedRoutes,
    ...notAuthorizedRoutes
  ]);

  /** Register notAuthenticatednRoutes and notAuthorizedRoutes to http modules if it's exist */
  if (this.has("init:Http")) {
    _.assign(this.options().Https, {
      notAuthenticatednRoutes: _notAuthenticatednRoutes,
      notAuthorizedRoutes: _notAuthorizedRoutes
    });
  }

  this.add("init:Auth", function initAuth(args, reply) {
    return reply();
  });

  this.add("auth:authenticated", function authAuthorization(args, reply) {});
  this.add("auth:verify", function authVerify(args, reply) {});

  return { name: "Auth" };
}
