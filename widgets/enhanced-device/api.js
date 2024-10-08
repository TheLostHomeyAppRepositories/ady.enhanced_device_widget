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
			return homey.app.getCapabilities(query.deviceId, query.register);
		}

		if (query.deviceImage)
		{
			return homey.app.getDeviceImageURI(query.deviceImage);
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
		return homey.app.setSomething(body);
	},

	async deleteSomething({ homey, params })
	{
		return homey.app.deleteSomething(params.id);
	},
};
