import App from "..";

/** All services is ready, now we handle http connection */
App.ready(() =>
  App.Services$
    .actAsync("entities:run")
    .then(() => App.Services$.actAsync("http:run"))
    .then(({ server }) =>
      server.listen(process.env.PORT || 9999, () =>
        console.log("Server is ready to handle connection")
      )
    )
    .catch(error => console.log(error.message))
);
