'use strict';

const normalize = require('./normalize');
const EventHandler = require('./EventHandler');

class DeviceManager
{

	constructor(app)
	{
		this.api = app.api;
		this.app = app;

		this.onAdd = new EventHandler('Device.add');
		this.onRemove = new EventHandler('Device.remove');
		this.onUpdate = new EventHandler('Device.update');

		this.setEnabledDevices((app.settings || {}).devices);
	}

	getDeviceId(device)
	{
		if (!device) return undefined;
		if (device)
		{
			if (typeof device === 'string')
			{
				if (this.deviceIds && this.deviceIds.has(device)) { return device; }
				if (this.deviceNames && this.deviceNames.has(device)) { return this.deviceNames.get(device); }
				if (this.deviceTopics && this.deviceTopics.has(normalize(device))) { return this.deviceTopics.get(normalize(device)); }
			}
			else if (typeof device === 'object')
			{
				if (device.id) { return device.id; }
				if (device.name)
				{
					if (this.deviceNames && this.deviceNames.has(device.name)) { return this.deviceNames.get(device.name); }
					if (this.deviceTopics && this.deviceTopics.has(normalize(device.name))) { return this.deviceTopics.get(normalize(device.name)); }
				}
			}
		}

		return undefined;
	}

	getDeviceName(device)
	{
		// from device info
		if (typeof device === 'object' && device.name)
		{
			return normalize(device.name);
		}

		// from mapping
		if (!this.deviceIds)
		{
			return undefined;
		}

		const id = this.getDeviceId(device);
		return this.deviceIds.get(id);
	}

	getDeviceTopic(device)
	{
		if (!this.deviceTopicIds) return undefined;
		const id = this.getDeviceId(device);
		return this.deviceTopicIds.get(id);
	}

	async getDeviceById(deviceId)
	{
		if (deviceId)
		{
			const device = await this.api.devices.getDevice({ id: deviceId });
			return device;
		}
		return undefined;
	}

	// TODO: optimize
	async getDeviceByName(device)
	{
		const id = this.getDeviceId(device);
		return this.getDeviceById(id);
	}

	// TODO: optimize
	async getDeviceByTopic(device)
	{
		const id = this.getDeviceId(device);
		return this.getDeviceById(id);
	}

	async getDevice(device)
	{
		const id = this.getDeviceId(device);
		return this.getDeviceById(id);
	}

	isRegistered(device)
	{
		if (!this.deviceIds) return false;
		const id = this.getDeviceId(device);
		return id && this.deviceIds.has(id);
	}

	async checkAPIConnection()
	{
		const wasConnected = this.api.devices.isConnected();
		if (!wasConnected)
		{
			try
			{
				await this.api.devices.connect();
			}
			catch (error)
			{
				this.app.updateLog('Error connecting to API');
			}
		}

		return wasConnected;
	}

	async register()
	{
		if (!this.api.devices.isConnected())
		{
			try
			{
				await this.api.devices.connect();
			}
			catch (e)
			{
				this.app.error('Error connecting to devices', e);
			}
		}

		// Subscribe to realtime events and set all devices global
		this.api.devices.on('device.create', async (device) => { this._addDevice(device); });
		this.api.devices.on('device.delete', async (device) => { this._removeDevice(device); });
		this.api.devices.on('device.update', async (device) => { this._updateDevice(device); });

		this.api.zones.on('zones.create', async (zone) => { this._addZone(zone); });
		this.api.zones.on('zones.delete', async (zone) => { this._removeZone(zone); });
		this.api.zones.on('zones.update', async (zone) => { this._updateZone(zone); });

		try
		{
			this.devices = await this.api.devices.getDevices();
		}
		catch (e)
		{
			this.app.error('Error getting devices', e);
		}

		try
		{
			this.zones = await this.api.zones.getZones();
		}
		catch (e)
		{
			this.app.error('Error getting zones', e);
		}

		if (this.devices)
		{
			const devices = Object.values(this.devices);
			for (const device of devices)
			{
				// inject zone
				if (this.zones && device.zone)
				{
					device.zone = this.zones[device.zone];
				}

				// register
				try
				{
					await this.registerDevice(device);
				}
				catch (e)
				{
					this.app.error('Error registering device', e);
				}
			}
		}
	}

	async unregister()
	{
		this.app.log('unregister');
	}

	async registerDevice(device)
	{
		if (typeof device === 'object')
		{
			if (!device.id)
			{
				return;
			}

			const deviceName = (device.name || '').trim();
			if (!deviceName)
			{
				return;
			}

			if (this.isRegistered(device))
			{
				return;
			}

			this.deviceIds = this.deviceIds || new Map(); // id => name
			this.deviceNames = this.deviceNames || new Map(); // name => id
			this.deviceTopicIds = this.deviceTopicIds || new Map(); // id => topic
			this.deviceTopics = this.deviceTopics || new Map(); // topic => id

			const deviceTopic = normalize(deviceName);

			this.deviceIds.set(device.id, deviceName);
			this.deviceNames.set(deviceName, device.id);

			if (deviceTopic)
			{
				this.deviceTopicIds.set(device.id, deviceTopic);
				this.deviceTopics.set(deviceTopic, device.id);
			}
		}
	}

	async _addDevice(device)
	{
		if (device && device.id)
		{
			this.devices = this.devices || {};
			this.devices[device.id] = device;

			try
			{
				await this.registerDevice(device);
				await this.onAdd.emit(device);
			}
			catch (e)
			{
				this.app.error('Error adding device', e);
			}
		}
	}

	async _removeDevice(id)
	{
		const deviceName = this.getDeviceName(id);
		const deviceTopic = this.getDeviceTopic(id);

		if (this.deviceIds) this.deviceIds.delete(id.id);
		if (this.deviceTopicIds) this.deviceTopicIds.delete(id.id);
		if (deviceName && this.deviceNames) this.deviceNames.delete(deviceName);
		if (deviceTopic && this.deviceTopics) this.deviceTopics.delete(deviceTopic);
		if (this.devices) delete this.devices[id.id];

		try
		{
			await this.onRemove.emit(id);
		}
		catch (e)
		{
			this.app.error('Error removing device', e);
		}
	}

	async _updateDevice(id)
	{
		await this.onUpdate.emit(id);
	}

	async _addZone(id)
	{
		if (id)
		{
			this.zones = this.zones || {};
			const zone = await this.api.zones.getZone({ id });
			if (zone)
			{
				this.zones[id] = zone;
			}
		}
	}

	async _removeZone(id)
	{
		// eslint-disable-next-line no-prototype-builtins
		if (id && this.zones && this.zones.hasOwnProperty(id))
		{
			delete this.zones[id];
		}
	}

	async _updateZone(id)
	{
		await this._addZone(id);
	}

	async getCapabilities(deviceId)
	{
		const deviceObj = await this.getDevice(deviceId);
		if (!deviceObj)
		{
			return undefined;
		}

		if (deviceObj.capabilitiesObj)
		{
			return deviceObj.capabilitiesObj;
		}

		if (deviceObj.capabilities)
		{
			return deviceObj.getCapabilities();
		}

		return undefined;
	}

	async getCapability(device, capabilityId)
	{
		const capabilities = await this.getCapabilities(device);
		return capabilities ? capabilities[capabilityId] : undefined;
	}

	computeChanges(devicesIn)
	{
		const changes = {
			enabled: [],
			disabled: [],
			untouched: [],
		};
		if (devicesIn)
		{
			const devices = Object.values(devicesIn);

			for (const device of devices)
			{
				const enabled = device !== false;
				if (enabled !== this.isDeviceEnabled(device.id))
				{
					if (enabled)
					{
						changes.enabled.push(device.id);
					}
					else
					{
						changes.disabled.push(device.id);
					}
				}
				else
				{
					changes.untouched.push(device.id);
				}
			}
		}
		return changes;
	}

	setEnabledDevices(devices)
	{
		this._enabledDevices = devices;
	}

	isDeviceEnabled(device)
	{
		const enabledDevices = this._enabledDevices;
		if (!enabledDevices) return true;
		const deviceId = typeof device === 'object' ? device.id : device;
		if (!deviceId) return false;
		// eslint-disable-next-line no-prototype-builtins
		return enabledDevices.hasOwnProperty(deviceId) ? enabledDevices[deviceId] : true;
	}

}

module.exports = DeviceManager;
