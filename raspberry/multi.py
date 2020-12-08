import time
import paho.mqtt.client as mqtt


HOST = '192.168.219.170'
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("connected OK")
    else:
        print("Bad connection Returned code=", rc)


def on_disconnect(client, userdata, flags, rc=0):
    print(str(rc))


def on_subscribe(client, userdata, mid, granted_qos):
    print("subscribed: " + str(mid) + " " + str(granted_qos))

def on_message(client, userdata, msg):
    msg = msg.payload.decode("utf-8")
    #0 stop, 1 down, 2 up
    print('main',msg)
def on_message_test(client,userdata,msg):
    msg = msg.payload.decode("utf-8")
    print('test',msg)
    #이곳에 자석센서가 닫힌게 감지되면 stop하면될듯
client = mqtt.Client()
client.message_callback_add('/motor/test', on_message_test)
client.on_connect = on_connect
client.on_disconnect = on_disconnect
client.on_subscribe = on_subscribe
client.on_message = on_message

client.connect(HOST, 1883)

client.subscribe('/motor/#', 0)
client.loop_forever()

#13, 18, 15, 22, 3, 5

