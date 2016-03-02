from flask import Flask, render_template, request, session
import cgi
import datetime
import time
import json

app = Flask(__name__)

#Settings
app.config['DEBUG']=True
app.config['PUSHER_CHAT_APP_ID'] = '184631'
app.config['PUSHER_CHAT_APP_KEY'] = '3fe85fe35cd498e2c431'
app.config['PUSHER_CHAT_APP_SECRET'] = '69c7f1b17de8afb9eed2'
app.config['SECRET_KEY'] = '\xfd{H\xe5<\x95\xf9\xe3\x96.5\xd1\x01O<!\xd5\xa2\xa0\x9fR"\xa1\xa8'

#Pusher
import pusher

pusher_client = pusher.Pusher(
  app_id=app.config['PUSHER_CHAT_APP_ID'],
  key=app.config['PUSHER_CHAT_APP_KEY'],
  secret=app.config['PUSHER_CHAT_APP_SECRET'],
  ssl=True
)

@app.route('/')
def index():
  return render_template('index.html')

@app.route("/setname/", methods=['POST'])
def set_name():
  session['name'] = request.form['name']

  return "great success!"

@app.route("/pusher/auth/", methods=['POST'])
def pusher_authentication():

  auth = pusher_client.authenticate(
    channel=request.form['channel_name'],
    socket_id=request.form['socket_id'],
    custom_data={
      'user_id': session['name'],
    }
  )
  return json.dumps(auth)

@app.route('/messages/', methods=['POST'])
def new_message():
  name = request.form['name']
  text = cgi.escape(request.form['text'])
  channel = request.form['channel']

  now = datetime.datetime.now()
  timestamp = time.mktime(now.timetuple()) * 1000
  pusher_client.trigger("presence-" + channel, 'new_message', {
    'text': text,
    'name': name,
    'time': timestamp
  })
  return "Succesful"

if __name__ == '__main__':
    app.run()