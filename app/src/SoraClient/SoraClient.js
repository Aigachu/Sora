/**
 * Discord Client class include.
 * Sora's mainframe depends on Discord.js, created by hydrabolt.
 * https://discord.js.org/#/
 */
const DiscordClient = require(rootdir + 'node_modules/discord.js/src/client/Client');

/**
 * @ref {K4Kheops} - https://bitbucket.org/K4Kheops/
 * -- If you see mention of {Sawako} anywhere, it's because of him. ;)
 * -- Let's take a moment to thank him for heavy inspiration of his object-oriented design in javascript.
 * -- *clap* *clap* *clap*
 * -- OK back to coding!
 *
 * Sora's Discord Client class.
 * Used to customize all of Discord Client functions and properties.
 */
class SoraClient extends DiscordClient {

  /**
   * Class constructor
   */
  constructor() {

    super();

    // Get Sora's configuration details.
    // A real discord account must be created for the bot to run.
    // Put the credentials of the newly created account into `config.js` found at the same level as this file.
    this.config = require(rootdir + 'config.js');

    // Sora commands.
    this.commands = require(soraspace + 'Commands.js').commands;

    // Sora commands.
    this.pmcommands = require(soraspace + 'PMCommands.js').pmcommands;

    // Sora Helper Functions
    this.helpers = require(soraspace + 'Helpers.js');

    // Sora Writer Script
    this.writer = require(soraspace + 'Writer.js');

    // Initiate Sora's Cooldown handling
    this.cooldowns = [];

    // Initiate Sora's Denyflag handling
    this.denyflags = [];

    /*********** Command Specific Variables **************/

    // Initiate the jquiz object.
    this.jquiz = {};

    /**
     * === Events Callbacks ===
     */

    // Event: When Sawako connects to Discord.
    this.on('ready', function() {

      // Assign the client to a variable.
      var sora = this;

      // Logs connection event in console.
      console.log("\nSora: I am now properly linked to the Discord infrastructure. Enjoy!");

      /* === On-Boot Tasks === */
      // Loads and modifies the command configuration file.
      sora.writer.loadCommConf(sora, function() {
        // Sora commands configurations.
        sora.commands_configs = require(commands_configuration_path);

        sora.writer.loadServConf(sora, function() {
        // Sora servers configurations.
          sora.servers_configs = require(servers_configuration_path);
        });
      });

      // Loads and modifies the pmcommand configuration file.
      sora.writer.loadPMCommConf(sora, function() {
        // Sora commands configurations.
        sora.pmcommands_configs = require(pmcommands_configuration_path);
      });


      /**
       * Event that fires when Sora receives a message.
       * @param  {Object} msg)
       * @todo : add example msg object reference to Wiki.
       */
      sora.on("message", function (msg) {

        sora.processCommand(msg);

      });

    });

    // Event: When Sora disconnects from Discord.
    this.on('disconnected', function() {

      // Assign to client to a variable.
      var sora = this;

      // Logs disconnection event in console.
      console.log("Sora: I have been disconnected from the Discord infrastructure, which means I'm going to disappear soon. ;_; See you soon though!");

    });
  }

  /**
   * SoraClient Class Methods
   */

  /**
   * [login description]
   * @return {[type]} [description]
   */
  soraLogin() {
    // Assign to client to a variable.
    var sora = this;

    sora.login(sora.config.apptoken);
  }

  /**
   * [processCommand description]
   * @return {[type]} [description]
   */
  processCommand(msg) {

    // Only hop in here and treat commands if this isn't Sora's own message!
    if(msg.author.id !== this.user.id) {
      var command = {};

      if(command = this.verifyIfMsgIsCommand(msg)) {

        // Initialize the parameters variable as an array with all words in the message seperate by a space.
        var params = msg.content.split(" ");

        // Remove the first two elements of the array, which in the case that this is a command, are the following:
        // params[0] = $sora.
        // params[1] = command_key.
        params.splice(0, 2);

        // Now, the params array only contains the parameters of the command.

        if(command.type == "command") {
          // Run Command if it passed approval.
          if(this.authCommand(msg, command.key)) {
            this.commands[command.key].fn(this, params, msg);
          }
        } else {
          // Run PMCommand if it passed approval.
          if(this.authPMCommand(msg, command.key)) {
            this.pmcommands[command.key].fn(this, params, msg);
          }
        }

      }

      // LOL
      if(this.THIRDEYE !== undefined && !this.verifyIfMsgIsCommand(msg)) {
        this.thirdeye(this, msg, this.THIRDEYE);
      }
    }

  }

  /**
   * [isCommand description]
   * @param  {[type]} command [description]
   * @param  {[type]} param   [description]
   * @param  {[type]} value   [description]
   * @return {[type]}         [description]
   */
  verifyIfMsgIsCommand(msg) {

    var command = {};

    // First, check if the message is a private message
    // We don't want regular commands to be triggered in PMs with Sora.
    // PMCommands will be a different entity entirely.
    if(!msg.channel.isPrivate) {

      // Get commands configuration properties.
      var commands_configuration = require(commands_configuration_path);

      // Get all defined commands in the `Commands.js` file.
      var commands = this.commands;

      command.type = "command";

    } else {

      // Get commands configuration properties.
      var commands_configuration = require(pmcommands_configuration_path);

      // Get all defined commands in the `Commands.js` file.
      var commands = this.pmcommands;

      command.type = "pmcommand";

    }

    // Divide text into distinct parameters.
    var split = msg.content.split(" ");

    // Check if it contains the command syntax.
    if(split[0] == this.config.prefix && split[1]) {

      // Supposed Key
      var key = split[1].toLowerCase();

      // Check if the second word in the message is a command key.
      if(key in commands) {
        command.key = key;
        return command;
      }
    }

    return false;
  };

  /**
   * [authCommand description]
   * @param  {[type]} command [description]
   * @param  {[type]} param   [description]
   * @param  {[type]} value   [description]
   * @return {[type]}         [description]
   */
  authCommand(msg, key) {

    // Get commands configuration properties.
    // Within the function, you are now in tools.js, so you need to add a dot to indicate a return to the other directory.
    var commands_configuration = require(commands_configuration_path);

    // Get servers configuration properties.
    // Within the function, you are now in tools.js, so you need to add a dot to indicate a return to the other directory.
    var servers_configuration = require(servers_configuration_path);

    // Load the command's configurations.
    var command_validation_obj = commands_configuration[key];

    // Check if the command is overriden in the current server.
    if(servers_configuration[msg.channel.guild.id]['override_all_commands'] || servers_configuration[msg.channel.guild.id]['commands'][key]['override']) {
      command_validation_obj = servers_configuration[msg.channel.guild.id]['commands'][key];
    }

    // If the message author is a God, Sora will not verify anything. Auto-Auth.
    if(!(msg.author.id in this.config.gods)) {

      // Check OP Level for Admins
      if(command_validation_obj.oplevel === 1) {
        if(!(msg.author.id in this.config.admins)) {
          return false;
        }
      }

      // Check Allowed Channels
      if(command_validation_obj.allowed_channels !== 'all') {
        if(!(msg.channel.id in command_validation_obj.allowed_channels)) {
          return false;
        }
      }

      // Check Excluded Channels
      if(command_validation_obj.excluded_channels !== 'none') {
        if((msg.channel.id in command_validation_obj.excluded_channels)) {
          return false;
        }
      }

      // Check Cooldown (if any)
      if(command_validation_obj.cooldown !== 'none') {
       if(this.cooldowns[key]) {

        if(!this.cooldowns['announce_cd_' + key]) {

          this.sendMessage(msg.channel, "Hmm. The `" + key + "` command seems to be on cooldown.\nThe cooldown time is **" + command_validation_obj.cooldown + "** seconds. It will be available shortly.", function(error, message) {
            // Delete the cooldown warning after five seconds.
            setTimeout(function(){ this.deleteMessage(message); }, 1000 * 5);
          });

          this.cooldowns['announce_cd_' + key] = true;

          if(typeof this.commands[key] !== 'undefined') {
            setTimeout(function(){ this.cooldowns['announce_cd_' + key] = false; /* console.log("Removed cooldown for " + key); */ }, 1000 * command_validation_obj.cooldown);
          } else {
            setTimeout(function(){ this.cooldowns['announce_cd_' + key] = false; /* console.log("Removed cooldown for " + key); */ }, 1000 * 15);
          }
        }

        this.deleteMessage(msg);

        return false;

       } else {

        this.cooldowns[key] = true;

          if(typeof commands[key] !== 'undefined') {
            setTimeout(function(){ this.cooldowns[key] = false; console.log("Removed cooldown for " + key); }, 1000 * command_validation_obj.cooldown);
          } else {
            setTimeout(function(){ this.cooldowns[key] = false; console.log("Removed cooldown for " + key); }, 1000 * 15);
          }

       }
      }
    }

    return true;

  };

  /**
   * [authCommand description]
   * @param  {[type]} command [description]
   * @param  {[type]} param   [description]
   * @param  {[type]} value   [description]
   * @return {[type]}         [description]
   */
  authPMCommand(msg, key) {

    // Get commands configuration properties.
    // Within the function, you are now in tools.js, so you need to add a dot to indicate a return to the other directory.
    var pmcommands_configuration = require(pmcommands_configuration_path);

    // Load the pmcommand's configurations.
    var pmcommand_validation_obj = pmcommands_configuration[key];

    // If the message author is a God, Sora will not verify anything. Auto-Auth.
    if(!(msg.author.id in this.config.gods)) {
      // Check OP Level
      if(pmcommand_validation_obj.oplevel === 2) {
        return false;
      }

      if(pmcommand_validation_obj.oplevel === 1) {
        if(!(msg.author.id in this.config.admins)) {
          return false;
        }
      }

      // Check Cooldown (if any)
      if(pmcommand_validation_obj.cooldown !== 'none') {
       if(this.cooldowns[key]) {

        if(!this.cooldowns['announce_cd_' + key]) {

          this.sendMessage(msg.channel, "Hmm. The `" + key + "` pmcommand seems to be on cooldown.\nThe cooldown time is **" + pmcommand_validation_obj.cooldown + "** seconds. It will be available shortly.", function(error, message) {
            // Delete the cooldown warning after five seconds.
            setTimeout(function(){ this.deleteMessage(message); }, 1000 * 5);
          });

          this.cooldowns['announce_cd_' + key] = true;

          if(typeof this.pmcommands[key] !== 'undefined') {
            setTimeout(function(){ this.cooldowns['announce_cd_' + key] = false; /* console.log("Removed cooldown for " + key); */ }, 1000 * pmcommand_validation_obj.cooldown);
          } else {
            setTimeout(function(){ this.cooldowns['announce_cd_' + key] = false; /* console.log("Removed cooldown for " + key); */ }, 1000 * 15);
          }
        }

        this.deleteMessage(msg);

        return false;

       } else {

        this.cooldowns[key] = true;

          if(typeof pmcommands[key] !== 'undefined') {
            setTimeout(function(){ this.cooldowns[key] = false; console.log("Removed cooldown for " + key); }, 1000 * pmcommand_validation_obj.cooldown);
          } else {
            setTimeout(function(){ this.cooldowns[key] = false; console.log("Removed cooldown for " + key); }, 1000 * 15);
          }

       }
      }
    }

    // console.log("Sora: This command will not be authorized at this time.");
    return true;
  };

  /**
   * [thirdeye description]
   * @return {[type]} [description]
   */
  thirdeye(bot, msg, link) {
    var message = "";

    if(msg.channel.id == link.this_world['id']) {

      message += "**" + msg.author.name + "**";

      message += "  _{" + link.this_dimension.name + "}_\n";

      message += msg.content;

      bot.sendMessage(link.their_world, message);

    }

    if(msg.channel.id == link.their_world['id']) {

      message += "**" + msg.author.name + "**";

      message += "  _{" + link.their_dimension.name + "}_\n";

      message += msg.content;

      bot.sendMessage(link.this_world, message);
    }
  }
}

/**
 * SawakoClient class exports.
 */
module.exports = SoraClient;
