import time
import RPi.GPIO as GPIO
import paho.mqtt.client as mqtt


GPIO.setwarnings(False)
GPIO.setmode(GPIO.BOARD)
delay = 0.2
pins = [3,5]
GPIO.setup(pins, GPIO.OUT,initial=GPIO.HIGH)
HOST = '192.168.0.117'
status = '5'
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("connected OK")
    else:
        print("Bad connection Returned code=", rc)


def on_disconnect(client, userdata, flags, rc=0):
    print(str(rc))


def on_subscribe(client, userdata, mid, granted_qos):
    print("subscribed: " + str(mid) + " " + str(granted_qos))

def up():
    GPIO.output(5,GPIO.LOW)
    time.sleep(delay)
    GPIO.output(5,GPIO.HIGH)
def down():
    GPIO.output(3,GPIO.LOW)
    time.sleep(delay)
    GPIO.output(3,GPIO.HIGH)
def on_message(client, userdata, msg):
    msg = msg.payload.decode("utf-8")
    print(msg)
    #0 stop, 1 down, 2 up
    if(msg=='1'):
        down()
    elif(msg=='2'):
        up()
client = mqtt.Client()
client.on_connect = on_connect
client.on_disconnect = on_disconnect
client.on_subscribe = on_subscribe
client.on_message = on_message

client.connect(HOST, 1883)

client.subscribe('/motor', 0)
client.loop_forever()

#13, 18, 15, 22, 3, 5

