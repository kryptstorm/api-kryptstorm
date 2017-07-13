/** External modules */
import Seneca from 'seneca';
import Config from 'config';

/** Seneca plugins */
import Services from './plugins/kryptstorm-services';
import Https from './plugins/kryptstorm-https';

/** Register seneca plugins */
const options = {
	default_plugins: { transport: false },
	debug: { undead: Config.get('api.isDebug') }
};
const App = Seneca(options);

/** Register plugins */
App.use(Services)
App.use(Https, { isDebug: Config.get('api.isDebug') });

App.ready(() => App.Services$
	.actAsync('http:run')
	.then(({ server }) => server.listen(9999, () => console.log('Https is ready.')))
	.catch(error => console.log(error.message))
);
