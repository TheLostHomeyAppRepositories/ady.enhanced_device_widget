/* jslint node: true */

'use strict';

if (process.env.DEBUG === '1')
{
	// eslint-disable-next-line node/no-unsupported-features/node-builtins, global-require
	require('inspector').open(9229, '0.0.0.0', true);
}

const Homey = require('homey');
const { HomeyAPI } = require('homey-api');
const DeviceManager = require('./lib/DeviceManager');
const DeviceDispatcher = require('./lib/DeviceStateChangedDispatcher');

class MyApp extends Homey.App
{

	/**
	 * onInit is called when the app is initialized.
	 */
	async onInit()
	{
		this.api = await HomeyAPI.createAppAPI({ homey: this.homey });
		this.deviceManager = new DeviceManager(this);

		await this.deviceManager.register();

		this.deviceDispather = new DeviceDispatcher(this);

		const widget = this.homey.dashboards.getWidget('enhanced-device');

		widget.registerSettingAutocompleteListener('devices', async (query, settings) =>
		{
			const devices = await this.getHomeyDevices({});
			return devices;
		});

		this.log('MyApp has been initialized');
	}

	async getDeviceImageURI(deviceId)
	{
		if (this.deviceManager)
		{
			try
			{
				const device = await this.getDeviceById(deviceId);
				if (!device)
				{
					// Device not found
					return null;
				}

				// Retrieve the cloudUrl
				const image = await this.homey.images.createImage();
				// @ts-ignore
				const url = image.cloudUrl.split('/api/')[0];
				await image.unregister();
				return device.iconObj?.url && url ? `${url}${device.iconObj.url}` : null;
			}
			catch (e)
			{
				this.error('Error getting device image', e);
			}
		}

		return null;
	}

	async getHomeyDevices({ type = '', ids = null })
	{
		if (this.deviceManager)
		{
			try
			{
				let devices = {};
				if (this.deviceManager && this.deviceManager.devices)
				{
					devices = this.deviceManager.devices;
				}
				else
				{
					const api = await HomeyAPI.forCurrentHomey(this.homey);
					devices = await api.devices.getDevices();
				}

				// Sort the devices by name
				devices = Object.values(devices).sort((a, b) => a.name.localeCompare(b.name));

				if (type || ids)
				{
					// Filter the object on type or id
					const filteredDevices = [];
					// Turn the devices object into an array, filter on type or id and turn it back into an object
					const deviceArray = Object.values(devices);
					for (const device of deviceArray)
					{
						device.IconPath = device.iconObj?.url && this.cloudUrl ? `${this.cloudUrl}${device.iconObj.url}` : null;

						const capabilities = await this.deviceManager.getCapabilities(device);
						const capabilitiesArray = Object.values(capabilities);
						for (const capability of capabilitiesArray)
						{
							if ((type && capability.type === type) || (ids && this.id.findIndex((id) => capability.id === id) >= 0))
							{
								filteredDevices.push(device);
								break;
							}
						}
					}

					// return the filtered devices as an object
					devices = {};
					for (const device of filteredDevices)
					{
						devices[device.id] = device;
					}
				}

				return devices;
			}
			catch (e)
			{
				this.error('Error getting devices', e);
			}
		}
		return [];
	}

	async getCapabilities(deviceId, register)
	{
		if (this.deviceManager)
		{
			const capabilities = await this.deviceManager.getCapabilities(deviceId);
			if (register)
			{
				// For each capability, register the capability with registerDeviceCapability
				const capabilitiesArray = Object.values(capabilities);
				for (const capability of capabilitiesArray)
				{
					try
					{
						capability.IconPath = capability.iconObj?.url && this.cloudUrl ? `${this.cloudUrl}${capability.iconObj.url}` : null;
						await this.deviceDispather.registerDeviceCapability(deviceId, capability.id);
					}
					catch (e)
					{
						this.error('Error registering capability', e);
					}
				}
			}
			return capabilities;
		}
		return [];
	}

	async setCapability(deviceId, capabilityId, value)
	{
		if (this.deviceManager)
		{
			try
			{
				const device = await this.getDeviceById(deviceId);
				if (!device)
				{
					// Device not found
					return;
				}

				// Find the capability that is defined in the configuration
				const capability = await this.getCapabilityById(device, capabilityId);
				if (!capability)
				{
					// Capability not found
					return;
				}

				await device.setCapabilityValue(capabilityId, value);
			}
			catch (e)
			{
				this.error('Error setting capability', e);
			}
		}
	}

	async getDeviceById(id)
	{
		if (this.deviceManager)
		{
			try
			{
				if (this.deviceManager.devices)
				{
					return await this.deviceManager.getDeviceById(id);
				}
			}
			catch (e)
			{
			}
		}
		return undefined;
	}

	async getCapabilityById(device, capabilityId)
	{
		if (this.deviceManager && device)
		{
			try
			{
				return this.deviceManager.getCapability(device, capabilityId);
			}
			catch (e)
			{
			}
		}
		return undefined;
	}

}
module.exports = MyApp;
