'use strict';

module.exports = {
	async getSomething({ homey, query })
	{
		// you can access query parameters like "/?foo=bar" through `query.foo`

		// you can access the App instance through homey.app
		// const result = await homey.app.getSomething();
		// return result;

		// perform other logic like mapping result data

		return 'Hello from App';
	},

	async addSomething({ homey, body })
	{
		// access the post body and perform some action on it.
	},

	async updateSomething({ homey, params, body })
	{
		return null;
	},

	async deleteSomething({ homey, params })
	{
		return homey.app.deleteSomething(params.id);
	},

	async simSettings({ homey, query })
	{
		return homey.app.getSimSettings();
	},

};
