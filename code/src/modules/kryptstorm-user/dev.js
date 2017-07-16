/**
 * Run this file will do all thing to make your development is ready
 * Don't run this file if you aren't in development mode
 */
import App from "../../";

if (process.env.NODE_ENV !== "development") {
  console.log(
    `Cannot run development prepare file at env: ${process.env.NODE_ENV}`
  );
  process.exit(0);
}

/** All services is ready, now we handle http connection */
App.ready(() => {
  console.log("ready");
  process.exit(0);
});
