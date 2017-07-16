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

const faker = (number = 254) => {
  let result = [],
    usernames = [],
		emails = [];
		
  while (number > 0) {
		
	}
};

/** All services is ready, now we handle http connection */
App.ready(() =>
  App.Services$.actAsync("entities:run").then(() => {
    const Users = App.Entity$.users;
    Users.username = "kryptstorm";
    Users.email = "admin@kryptstorm.com";
    Users.status = 1;
    Users.asyncSave$({ returnFields: ["id", "username"] }, false).then(rows => {
      console.log(rows);
      process.exit(0);
    });
  })
);
