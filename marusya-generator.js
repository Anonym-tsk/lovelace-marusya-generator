class MarusyaGeneratorCard extends HTMLElement {
    constructor() {
        super();

        this._hass = {};
        this._config = {};
        this._url = '';
        this._yaUrl = '';
    }

    set hass(hass) {
        this._hass = hass;
        this._url = hass.hassUrl();
        this._yaUrl = `${this._url}api/yandex_smart_home/v1.0/user/devices`;
        if (!this.$wrapper) {
            this._render();
        }
    }

    _render() {
        const card = document.createElement('ha-card');
        const style = document.createElement('style');
        card.header = this._config.title || '';
        style.textContent = '.json {width: 90%; height: 10em;}';
        card.innerHTML = `<div class="wrapper">
<p><input type="text" class="token" placeholder="API Token"/></p>
<p><textarea class="json"></textarea></p>
<p><button class="generate">Generate</button></p>
<p><button class="copy">Copy</button></p>
</div>`;
        card.appendChild(style);
        this.appendChild(card);

        this.$wrapper = card.querySelector('.wrapper');
        this.$button = card.querySelector('.generate');
        this.$copy = card.querySelector('.copy');
        this.$json = card.querySelector('.json');
        this.$token = card.querySelector('.token');

        this.$button.addEventListener('click', async () => {
            const devices = await this._fetchDevices();
            const result = this._patchDevices(devices);
            console.warn('devices', result);

            this.$json.value = JSON.stringify(result);
        });

        this.$copy.addEventListener('click', () => {
            navigator.clipboard.writeText(this.$json.value);
        });
    }

    async _fetchDevices() {
        const responce = await fetch(this._yaUrl, {
            method: 'GET',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.$token.value}`
            },
        });
        const json = await responce.json();
        return json.payload.devices;
    }

    _patchDevices(devices) {
        return devices.map((device) => {
            const newCaps = [];
            for (const cap of device.capabilities) {
                switch (cap.type) {
                    case 'devices.capabilities.on_off':
                        cap.hooks = {
                            on: {
                                url: `${this._url}api/services/homeassistant/turn_on`,
                                method: 'POST',
                                json: {entity_id: device.id},
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${this.$token.value}`
                                }
                            },
                            off: {
                                url: `${this._url}api/services/homeassistant/turn_off`,
                                method: 'POST',
                                json: {entity_id: device.id},
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${this.$token.value}`
                                }
                            },
                            state: {
                                url: `${this._url}api/states/${device.id}`,
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${this.$token.value}`
                                }
                            },
                        };

                        newCaps.push(cap);
                        break;
                }
            }

            device.capabilities = newCaps;
            return device;
        }).filter((device) => device.capabilities.length > 0);
    }

    getCardSize() {
        return 3;
    }

    setConfig(config) {
        this._config.title = config.title;
    }
}

customElements.define('marusya-generator-card', MarusyaGeneratorCard);

