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

describe("Basic", function() {
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

describe("Using Hooks", function() {
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
      return done(null, { data$: { before: "global", param: args.param } });
    });
    app.add("services:test", function(args, done) {
      return done(null, { data$: { services: "test", param: args.param } });
    });
    app.add("services:test, global:after", function(args, done) {
      return done(null, { data$: { after: "global", param: args.param } });
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
        expect(data$.before).to.be.equal("global");
        expect(data$.after).to.be.equal("global");
        expect(data$.param).to.be.equal(payload.param);
        return done();
      })
      .catch(done);
  });
});
