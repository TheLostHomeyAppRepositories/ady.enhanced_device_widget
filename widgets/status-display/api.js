'use strict';

module.exports = {
	async getSomething({ homey, query })
	{
		if (query.lastStatus)
		{
			let lastStatus = homey.settings.get(query.lastStatus);
			if (!lastStatus)
			{
				lastStatus = { title: '', status: '', backColour: '#FFFFFF', textColour: '#000000' };
			}
			return lastStatus;
		}

		return 'Hello from App';
	},

	async addSomething({ homey, body })
	{
		// access the post body and perform some action on it.

	},

	async updateSomething({ homey, params, body })
	{
		if (body.lastStatus)
		{
			homey.settings.set(body.widgetId, body.lastStatus);
		}
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
