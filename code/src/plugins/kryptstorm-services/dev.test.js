/** External modules */
import Seneca from "seneca";
import { expect } from "chai";

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
  /**
	 * Prepare before run all unit test
	 * After before function, app is ready to call action
	 */
  before(done => app.ready(() => done()));

  it("Basic", function(done) {
    const payload = { param: "param" };
    app
      .asyncAct$("services:test", payload)
      .then(({ errorCode$ = "ERROR_NONE", data$ }) => {
        /** Error is ERROR_NONE */
        expect(errorCode$).to.be.equal("ERROR_NONE");
        /** Data must be array of item */
        expect(data$).to.be.exist;
        expect(data$).to.be.an("object");
        expect(data$.param).to.be.equal(payload.param);
        return done();
      })
      .catch(done);
  });
});
