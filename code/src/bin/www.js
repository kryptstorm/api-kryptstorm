import App from "..";

/** All services is ready, now we handle http connection */
App.ready(() => {
  const server = App.export("Https/server");
  server.listen(process.env.PORT || 9999, () =>
    console.log("Server is ready to handle connection")
  );
});
