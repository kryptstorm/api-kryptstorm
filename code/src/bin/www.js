import App from "..";

/** All services is ready, now we handle http connection */
App.ready(() =>
  App.asyncAct$("http:run")
    .then(({ data$: server }) =>
      server.listen(process.env.PORT || 9999, () =>
        console.log("Server is ready to handle connection")
      )
    )
    .catch(error => console.log(error.message))
);
