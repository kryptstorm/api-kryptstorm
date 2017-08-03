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

/** Init test app */
const app = TestApp();

app.use(KryptstormService);
app.add("services:test", function(args, done) {
  return done(null, { data$: { services: "test", param: args.param } });
});

describe("Kryptstorm Service", function() {
  const payload = { param: "param" };
  const _basic = (done, { errorCode$ = "ERROR_NONE", data$, errors$ }) => {
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
  before(done => app.ready(() => done()));

  it("Service - use pattern as a string, payload as an object", function(done) {
    app
      .asyncAct$("services:test", payload)
      .then(_basic.bind(null, done))
      .catch(done);
  });

  it("Service - use pattern as an object, payload as an object", function(
    done
  ) {
    app
      .asyncAct$({ services: "test" }, payload)
      .then(_basic.bind(null, done))
      .catch(done);
  });
});
