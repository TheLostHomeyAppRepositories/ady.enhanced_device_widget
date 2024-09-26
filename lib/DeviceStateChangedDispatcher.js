'use strict';

class DeviceStateChangeDispatcher
{

    constructor(app)
    {
        this.api = app.api;
        this.deviceManager = app.deviceManager;
        this.app = app;
        this.lastValues = new Map();
        this._init();
    }

    async _init()
    // eslint-disable-next-line no-empty-function
    {
    }

    async registerDeviceCapability(device, capabilityId)
    {
        if (!device || !capabilityId)
        {
            return;
        }

        // Check if the device is an object or a string
        if (typeof device === 'string')
        {
            // Get the device object
            device = await this.deviceManager.getDeviceById(device);
        }

        if (!device)
        {
            return;
        }

        const capability = `${device.id}_${capabilityId}`;
        try
        {
            if (this.lastValues.has(capability))
            {
                return;
            }
            this.lastValues.set(capability, null);
            await device.makeCapabilityInstance(capabilityId, (value) => this._handleStateChange(device, value, capabilityId));
        }
        catch (e)
        {
			this.error('Error registering capability listener', e);
		}
    }

    _handleStateChange(device, value, capabilityID)
    {
        const deviceId = device.id;
		const lastValue = this.lastValues.get(`${deviceId}_${capabilityID}`);
        // eslint-disable-next-line eqeqeq
        if (lastValue == value)
        {
            return;
        }

		this.lastValues.set(`${deviceId}_${capabilityID}`, value);
		this.app.homey.api.realtime('updateWidget', { deviceId, capabilityID, value });
    }

    destroy()
    {
        // TODO: implement
    }

}

module.exports = DeviceStateChangeDispatcher;
