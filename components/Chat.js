var React = require('react');
var ReactDOM = require('react-dom');
var Messages = require('./Messages');
var Channels = require('./Channels');
var Users = require('./Users');

var Modal = require('react-modal');
const modalStyle = {
  content : {
    top                   : '50%',
    left                  : '50%',
    right                 : 'auto',
    bottom                : 'auto',
    marginRight           : '-50%',
    transform             : 'translate(-50%, -50%)'
  }
};
const DEFAULT_CHANNEL = "general";

var Chat = React.createClass({
  getInitialState: function() {

    return {
      name: null,
      channels: {},
      messages: {},
      users: {},
      currentChannel: null
    }
  },

  componentWillMount: function() {
    this.chatRooms = {};
  },

  componentDidUpdate: function() {
    $("#message-list").scrollTop($("#message-list")[0].scrollHeight);
  },

  sendMessage: function(event){
    var text = event.target.value;
    if(event.keyCode == 13 && text !== "") {
      var message = {
        name: this.state.name,
        text: text,
        channel: this.state.currentChannel,
      }

      $.post('/messages/', message).success(function(){
        $('#msg-input').val("");
      });
    }
  },

  createChannel: function(channelName) {
    if (!(channelName in this.state.channels)) {
      // Add new channel, if it doesn't exist yet
      var messages = this.state.messages;
      var channels = this.state.channels;
      channels[channelName] = {unreadCount:0};
      messages[channelName] = []
      this.setState({ 
        channels: channels,
        messages: messages
      });

      this.joinChannel(channelName);
      // Subscribe to new message events 
      this.chatRooms[channelName] = this.pusher.subscribe("presence-" +channelName)
      this.chatRooms[channelName].bind('new_message', function(message) {
        var messages = this.state.messages;
        var channels = this.state.channels;

        messages[channelName].push(message);
        if (channelName != this.state.currentChannel) {
          channels[channelName].unreadCount++;
        }

        this.setState({messages: messages, channels: channels});
      }, this);

      //Populate online users
      this.chatRooms[channelName].bind('pusher:subscription_succeeded', function(data) {
        var users = this.state.users;
        users[channelName] = Object.keys(data.members)
        this.setState({users: users});
      }, this);

      //Handle 'member joined channel' events
      this.chatRooms[channelName].bind('pusher:member_added', function(user) {
        var users = this.state.users;
        users[channelName] = users[channelName].concat(user.id)
        this.setState({users: users});
      }, this);

      //Handle 'member left channel' events
      this.chatRooms[channelName].bind('pusher:member_removed', function(user) {
        var users = this.state.users;
        i = users[channelName].indexOf(user.id)
        users[channelName].splice(i,1);
        this.setState({users: users});
      }, this);

    }
  },

  joinChannel: function(channelName) {
    // Reset unread count
    var channels = this.state.channels;
    channels[channelName].unreadCount = 0

    this.setState({currentChannel: channelName, channels: channels});
  },

  enterName: function(event){
    var newName = $('#new-name').val().trim(); 
    if (newName == "") {
      randomId = Math.floor((Math.random() * 99) + 1);
      newName = "anonymous" + randomId;
    }

    $.ajax({
      type: 'POST',
      url: "/setname/",
      data: { name: newName },
      async: false,
    });

    this.pusher = new Pusher(PUSHER_CHAT_APP_KEY, { authEndpoint: '/pusher/auth/' });
    this.setState({ name: newName })
    this.createChannel(DEFAULT_CHANNEL);
    
  },

  onEnter: function(event) {
    if (event.nativeEvent.keyCode != 13) return;
    this.enterName();
  },

  render: function() {
    return (
        <div>
            <Modal 
              isOpen={!this.state.name}
              style={modalStyle}>
              <h2 className="text-center">Enter a Twitter ID</h2>
                <div>
                  <input id="new-name" type="text" onKeyPress={this.onEnter}/>
                  <button className="btn" onClick={this.enterName}>Join</button>
                </div>
            </Modal>

            <div className="header">
                <div className="team-menu"><img className="connection_icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAABmFBMVEUAAAD////////////////////////////////////2+/LR5bKw1Hmfy1KUxz2VyD2izVKz1nnS5rP////A3JuOw0qKwkCNxD+QxT6Sxj6Txz6SxUnC3Jv1+fGXx2GDvkCGwECIwUCLwj+PxD6PxT+JwUCFwECZyGD2+vGSxWF9vEGAvkGDv0CMwz+Wx2GPw2F4ukJ7u0J+vUGBvkGHwUB8u0KSxGG31pp0uEN3uUJ5u0KFv0CCv0B6u0K415p5uU1yt0N/vUF1uEN8u0zG3bFttURwtkR5ukLH3rGWxnlqtERutUR2uUOZx3l6uVZos0VvtkRxt0Nzt0N8ulVisUVlskVns0VzuENmskVfsEVps0VztlZer0VhsEVjsUVstER1t1aOwXhcrkZdr0VgsEaQwnm/2a9YrUZbrka/2rDz+PFhr09XrEZksE6pzplUq0ZVrEZarUaqzpl0tWJRq0dWrEZ1tmJztWJOqUdSq0dxtGJMqEdNqUdQqkdytWKmzJhXrFBKqEdZrU+716+GvXhjr1dIp0hkr1dYtVOVAAAAFHRSTlMAV8/v/wCH+x/n////////////9kvBHZAAAAG7SURBVHgBvdOxjtNAEIDhGe/MZO3sxVaiIJkiSNdQUPJOeQlqXoCCIg/EU9BQHRKg5CT7ErzrHTa+aBOqaxC/tdLK+2kbj+H/hoWhlCmQr0HeyYxyM8mvkWHKoAfBS6cBWEeYugAzf4QGp1SV8DvU/ZjBdN7iud6hdnOTdl+TuALyrUPEwfdu3nc1ipr9AwdIFZPysJylRDfa6cZL2rfgMd9QjO8R0Y+/u7sa4LHZz4wN/MXEyw1hbK1VZdV7PZ1OyufzktsxXADCW5EkXq06Paan02Uoo3kHmAEzJ8HBN6v5qlkqaxTmCdAzQK8Noi6rXwCrJyutepUMAARnXS++3cvm2xvftR0PzAyQAXtwdNChifvFHppBdR003IDCIg6JDOse4DX8WIdo1TwfpaUgqWC9c4eqqg5HF20QZdAMmDlasdHWkrKR03J0A4iIXRTrpba29laiY8YMyOyMKYkXroyROZZuwVTyztAFJPmZKBGq+FxFVBr5BHr7ubd3GICfAM+88qDHHYe/BmbbIAaGKU/Fz10emDxyHxBhgJTg+DGP3O3QbltMBkd92F2H9sWxB772wo9z2z8FfwDHWbdKLDfq1AAAAABJRU5ErkJggg=="/>  {this.state.name} </div>
                <div className="channel-menu">
                    <span className="channel-menu_name">
                        <span className="channel-menu_prefix">#</span> 
                        {this.state.currentChannel}
                    </span>
                </div>
            </div>
            <div className="main">
                <div className="listings">
                  <Channels 
                    channels={this.state.channels} 
                    currentChannel={this.state.currentChannel}
                    createChannel={this.createChannel} 
                    joinChannel={this.joinChannel}/>
                  <div className="listings_direct-messages"></div>
                </div>
                <div className="online-users">
                  <Users users={this.state.users[this.state.currentChannel]}/>
                </div>
                <div className="message-history">
                  <Messages messages={this.state.messages[this.state.currentChannel]}/>
                </div>
            </div>
            <div className="footer">
                <div className="user-menu">
                    <p className="disclaimer">This demo is not created by, affiliated with, or supported by Slack Technologies, Inc.</p>
                </div>
                <div className="input-box">
                    <input id="msg-input" type="text" className="input-box_text" onKeyDown={this.sendMessage}/>
                </div>
            </div>
        </div>
    );
  }

});

ReactDOM.render(<Chat />, document.getElementById('app'));

module.exports = Chat;