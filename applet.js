
const Applet = imports.ui.applet;
const Gio = imports.gi.Gio;
const Mainloop = imports.mainloop;

function MyApplet(metadata, orientation, panel_height, instance_id) {
  this._init(metadata, orientation, panel_height, instance_id);
}

MyApplet.prototype = {
  __proto__: Applet.TextIconApplet.prototype,

  _init: function(_, orientation, panel_height, instance_id) {
    Applet.TextIconApplet.prototype._init.call(this, orientation, panel_height, instance_id);

    this.set_applet_label("Fetching data...");

    // Initialize previous byte counts for network speed calculation
    this.previousRxBytes = 0;
    this.previousTxBytes = 0;

    // Start the update loop
    this._update();
  },

  _update: function() {
    try {
      let memoryUsage = this._getMemoryUsage();
      let networkSpeed = this._getNetworkSpeed();

      // Update the applet label with memory and network data
      this.set_applet_label(`${memoryUsage} - ${networkSpeed}`);
    } catch (e) {
      global.logError(`Error updating applet: ${e}`);
      this.set_applet_label("Error fetching data");
    }

    // Update every second
    Mainloop.timeout_add_seconds(1, () => this._update());
  },

  _getMemoryUsage: function() {
    let meminfoFile = Gio.File.new_for_path("/proc/meminfo");
    let [success, contents] = meminfoFile.load_contents(null);

    if (success) {
      let lines = contents.toString().split("\n");
      let totalMem = parseInt(lines[0].match(/\d+/)[0]);
      let availableMem = parseInt(lines[2].match(/\d+/)[0]);
      let usedMem = totalMem - availableMem;
      let usagePercentage = (usedMem / totalMem) * 100;

      return `${usagePercentage.toFixed(1)}%`;
    } else {
      return "N/A";
    }
  },

  _getNetworkSpeed: function() {
    let netdevFile = Gio.File.new_for_path("/proc/net/dev");
    let [success, contents] = netdevFile.load_contents(null);

    if (success) {
      let lines = contents.toString().split("\n").slice(2); // Skip the headers
      let totalRxBytes = 0;
      let totalTxBytes = 0;

      lines.forEach(line => {
        let data = line.trim().split(/\s+/);
        if (data.length > 9) {
          totalRxBytes += parseInt(data[1]); // Received bytes
          totalTxBytes += parseInt(data[9]); // Transmitted bytes
        }
      });

      let downloadSpeed = (totalRxBytes - this.previousRxBytes) / 1024; // In KB/s
      //let uploadSpeed = (totalTxBytes - this.previousTxBytes) / 1024; // In KB/s

      this.previousRxBytes = totalRxBytes;
      this.previousTxBytes = totalTxBytes;

      return `${downloadSpeed.toFixed(1)} KB/s`;
    } else {
      return "N/A";
    }
  }
};

function main(metadata, orientation, panel_height, instance_id) {
  return new MyApplet(metadata, orientation, panel_height, instance_id);
}
