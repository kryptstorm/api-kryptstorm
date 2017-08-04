/** External modules */
import Seneca from "seneca";
import { expect } from "chai";
import _ from "lodash";

/** Internal modules */
import KryptstormService from ".";

const TestApp = fn =>
  Seneca({
    log: "test"
  }).test(fn);

describe("KryptstormServices - Basic", function() {
  /** Init test app */
  const app = TestApp();
  const payload = { param: "param" };
  const _basic = (done, { errorCode$ = "ERROR_NONE", data$ }) => {
    /** Error is ERROR_NONE */
    expect(errorCode$).to.be.equal("ERROR_NONE");
    /** Data must be array of item */
    expect(data$).to.be.exist;
    expect(data$).to.be.an("object");
    expect(data$.param).to.be.equal(payload.param);
    return done();
  };

  /**
	 * Prepare before run all unit test
	 * After before function, app is ready to call action
	 */
  before(done => {
    app.use(KryptstormService);
    app.add("services:test", function(args, done) {
      return done(null, { data$: { services: "test", param: args.param } });
    });
    app.ready(() => done());
  });

  it("Use pattern as a string, payload as an object", function(done) {
    app
      .asyncAct$("services:test", payload)
      .then(_basic.bind(null, done))
      .catch(done);
  });

  it("Use pattern as an object, payload as an object", function(done) {
    app
      .asyncAct$({ services: "test" }, payload)
      .then(_basic.bind(null, done))
      .catch(done);
  });
});

describe("KryptstormServices - Using global hooks", function() {
  /** Init test app */
  const app = TestApp();
  const payload = { param: "param" };

  /**
	 * Prepare before run all unit test
	 * After before function, app is ready to call action
	 */
  before(done => {
    app.use(KryptstormService, {
      beforeHooks: {
        global: ["services:test, global:before"]
      },
      afterHooks: {
        global: ["services:test, global:after"]
      }
    });

    /** Register service */
    app.add("services:test, global:before", function(args, done) {
      return done(null, { data$: { "global-hook-before": args.param } });
    });
    app.add("services:test", function(args, done) {
      return done(null, { data$: { test: args.param } });
    });
    app.add("services:test, global:after", function(args, done) {
      return done(null, { data$: { "global-hook-after": args.param } });
    });

    app.ready(() => done());
  });

  it("Global hooks", function(done) {
    app
      .asyncAct$("services:test", payload)
      .then(({ errorCode$ = "ERROR_NONE", data$ }) => {
        /** Error is ERROR_NONE */
        expect(errorCode$).to.be.equal("ERROR_NONE");
        /** Data must be array of item */
        expect(data$).to.be.exist;
        expect(data$).to.be.an("object");
        expect(data$["global-hook-before"]).to.be.equal(payload.param);
        expect(data$.test).to.be.equal(payload.param);
        expect(data$["global-hook-after"]).to.be.equal(payload.param);
        return done();
      })
      .catch(done);
  });
});

describe("KryptstormServices - Using both global and local hooks", function() {
  /** Init test app */
  const app = TestApp();
  const payload = { param: "param" };

  /**
	 * Prepare before run all unit test
	 * After before function, app is ready to call action
	 */
  before(done => {
    app.use(KryptstormService, {
      beforeHooks: {
        global: ["services:test, global:before"],
        "services:test": ["services:test, local:before"]
      },
      afterHooks: {
        global: ["services:test, global:after"],
        "services:test": ["services:test, local:after"]
      }
    });

    /** Register service */
    app.add("services:test, global:before", function(args, done) {
      return done(null, { data$: { "global-hook-before": args.param } });
    });
    app.add("services:test, local:before", function(args, done) {
      return done(null, { data$: { "local-hook-before": args.param } });
    });
    app.add("services:test", function(args, done) {
      return done(null, { data$: { test: args.param } });
    });
    app.add("services:test, local:after", function(args, done) {
      return done(null, { data$: { "local-hook-after": args.param } });
    });
    app.add("services:test, global:after", function(args, done) {
      return done(null, { data$: { "global-hook-after": args.param } });
    });

    app.ready(() => done());
  });

  it("Global hooks", function(done) {
    app
      .asyncAct$("services:test", payload)
      .then(({ errorCode$ = "ERROR_NONE", data$ }) => {
        /** Error is ERROR_NONE */
        expect(errorCode$).to.be.equal("ERROR_NONE");
        /** Data must be array of item */
        expect(data$).to.be.exist;
        expect(data$).to.be.an("object");
        expect(data$["global-hook-before"]).to.be.equal(payload.param);
        expect(data$["local-hook-before"]).to.be.equal(payload.param);
        expect(data$.test).to.be.equal(payload.param);
        expect(data$["local-hook-after"]).to.be.equal(payload.param);
        expect(data$["global-hook-after"]).to.be.equal(payload.param);
        return done();
      })
      .catch(done);
  });
});
