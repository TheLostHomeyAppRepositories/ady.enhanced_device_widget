/* jslint node: true */

'use strict';

if (process.env.DEBUG === '1') {
	// eslint-disable-next-line node/no-unsupported-features/node-builtins, global-require
	require('inspector').open(9229, '0.0.0.0', true);
}

const Homey = require('homey');
const { HomeyAPI } = require('homey-api');
const DeviceManager = require('./lib/DeviceManager');
const DeviceDispatcher = require('./lib/DeviceStateChangedDispatcher');

class MyApp extends Homey.App {

	/**
	 * onInit is called when the app is initialized.
	 */
	async onInit() {
		this.api = await HomeyAPI.createAppAPI({ homey: this.homey });
		this.deviceManager = new DeviceManager(this);

		await this.deviceManager.register();

		this.deviceDispather = new DeviceDispatcher(this);

		const widget = this.homey.dashboards.getWidget('enhanced-device');

		widget.registerSettingAutocompleteListener('devices', async (query, settings) => {
			const devices = await this.getHomeyDevices({});
			return devices;
		});

		this.log('MyApp has been initialized');
	}

	async getHomeyDevices({ type = '', ids = null }) {
		if (this.deviceManager) {
			try {
				let devices = {};
				if (this.deviceManager && this.deviceManager.devices) {
					devices = this.deviceManager.devices;
				}
				else {
					const api = await HomeyAPI.forCurrentHomey(this.homey);
					devices = await api.devices.getDevices();
				}

				// Sort the devices by name
				devices = Object.values(devices).sort((a, b) => a.name.localeCompare(b.name));

				if (type || ids) {
					// Filter the object on type or id
					const filteredDevices = [];
					// Turn the devices object into an array, filter on type or id and turn it back into an object
					const deviceArray = Object.values(devices);
					for (const device of deviceArray) {
						const capabilities = await this.deviceManager.getCapabilities(device);
						const capabilitiesArray = Object.values(capabilities);
						for (const capability of capabilitiesArray) {
							if ((type && capability.type === type) || (ids && this.id.findIndex((id) => capability.id === id) >= 0)) {
								filteredDevices.push(device);
								break;
							}
						}
					}

					// return the filtered devices as an object
					devices = {};
					for (const device of filteredDevices) {
						devices[device.id] = device;
					}

					return devices;
				}

				return devices;
			}
			catch (e) {
				this.error('Error getting devices', e);
			}
		}
		return [];
	}

	async getCapabilities(deviceId, register) {
		if (this.deviceManager) {
			const capabilities = await this.deviceManager.getCapabilities(deviceId);
			if (register) {
				// For each capability, register the capability with registerDeviceCapability
				const capabilitiesArray = Object.values(capabilities);
				for (const capability of capabilitiesArray) {
					try {
						await this.deviceDispather.registerDeviceCapability(deviceId, capability.id);
					}
					catch (e) {
						this.error('Error registering capability', e);
					}
				}
			}
			return capabilities;
		}
		return [];
	}

}
module.exports = MyApp;
