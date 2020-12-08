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
def stop():
    global status
    if(status=='1'):
        down()
    elif(status=='2'):
        up()
    else:
        #만약 정지에서 바뀐다면 한번만 신호를 주면 돼 pass
        pass
def on_message(client, userdata, msg):
    global status
    msg = msg.payload.decode("utf-8")
    print('msg : ',msg,'status : ',status)
    #0 stop, 1 down, 2 up
    #time delay consider
    #모든상황은 stop -> move
    if(msg=='1'):
        stop()
        time.sleep(1)
        down()
        status = msg
    elif(msg=='2'):
        stop()
        time.sleep(1)
        up()
        status = msg
    else:
        stop()
        time.sleep(1)
        status = msg

client = mqtt.Client()
client.on_connect = on_connect
client.on_disconnect = on_disconnect
client.on_subscribe = on_subscribe
client.on_message = on_message

client.connect(HOST, 1883)

client.subscribe('/motor', 0)
client.loop_forever()

#13, 18, 15, 22, 3, 5

