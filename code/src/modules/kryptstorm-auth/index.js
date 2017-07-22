/** Routes */
export const routes = {
  "post::/auth": "auth:authenticated"
};

export const notAuthenticatednRoutes = ["post::/auth"];
export const notAuthorizedRoutes = [];

export default function Auth() {
  /** Register notAuthenticatednRoutes and notAuthorizedRoutes to http modules if it's exist */
  if (this.has("init:Http")) {
    _.assign(this.options().Https, {
      notAuthenticatednRoutes: [
        ...this.options().HttpsnotAuthenticatednRoutes,
        ...notAuthenticatednRoutes
      ],
      notAuthorizedRoutes: [
        ...this.options().notAuthorizedRoutes,
        ...notAuthorizedRoutes
      ]
    });
  }

  this.add("init:Auth", function initAuth(args, reply) {
    return reply();
  });

  this.add("auth:authenticated", function authAuthorization(args, reply) {});
  this.add("auth:verify", function authVerify(args, reply) {});

  return { name: "Auth" };
}
