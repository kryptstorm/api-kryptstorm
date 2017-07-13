module.exports = {
	api: {
		info: {
			version: require('../package.json').version,
			name: require('../package.json').name,
			author: require('../package.json').author.name,
		},
		isDebug: true,
		httpVerbs: ['get', 'post', 'put', 'delete']
	},
}