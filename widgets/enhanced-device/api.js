'use strict';

module.exports = {
	async getSomething({ homey, query })
	{
		// you can access query parameters like "/?foo=bar" through `query.foo`

		// you can access the App instance through homey.app
		// const result = await homey.app.getSomething();
		// return result;

		// perform other logic like mapping result data
		if (query.deviceId)
		{
			return homey.app.getCapabilities(query.deviceId, query.disabledCapabilities ? JSON.parse(query.disabledCapabilities) : null);
		}

		if (query.deviceImage)
		{
			return homey.app.getDeviceImageURI(query.deviceImage);
		}

		if (query.disabledCapabilities)
		{
			let disabledCapabilities = homey.settings.get(query.disabledCapabilities);
			if (!disabledCapabilities)
			{
				disabledCapabilities = {};
			}
			return disabledCapabilities;
		}

		return 'Hello from App';
	},

	async addSomething({ homey, body })
	{
		// access the post body and perform some action on it.
		if (body.deviceId)
		{
			homey.app.setCapability(body.deviceId, body.capabilityId, body.value);
		}
	},

	async updateSomething({ homey, params, body })
	{
		if (params.widgetInstanceId)
		{
			homey.settings.set(params.widgetInstanceId, body.capabilityDisabled);
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
