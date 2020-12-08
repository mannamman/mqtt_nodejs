import RPi.GPIO as GPIO
import time
import spidev
import paho.mqtt.publish as publish

GPIO.setmode(GPIO.BCM)
spi = spidev.SpiDev()
spi.open(0,0)
spi.max_speed_hz = 50000

brokerIP = '192.168.0.117'
D = 600
allow_gap = 80
location_gap = 30
SIZE = 2
#base v1
result = list()
flag = -1
class sensor:
    def __init__(self):
        self.arr = list()
    def append(self, x):
        self.arr.append(x)
    def get_avg(self):
        return sum(self.arr)/SIZE
    def pop(self):
        self.arr.pop(0)

def read_spi_adc(adcChannel):
    adcValue = 0
    buff = spi.xfer2([1,(8+adcChannel)<<4,0])
    adcValue = ((buff[1]&3)<<8)+buff[2]
    return adcValue

def determin(v1,v2,v3):
    global status
    global result
    global flag
    print("v1.avg : {}, v2.avg : {} v3.avg : {}, result : {}, flag : {}, status : {}".format(v1,v2,v3,result,flag,status))
    #if -> first and is or
    #1->down, 2->up, 0->stop
    if(abs(v1-v2)>allow_gap or abs(v1-v3)>allow_gap and hasPeople == True):#down
        status = 1
    if(abs(v1-v3)<allow_gap and abs(v1-v2)<allow_gap and hasPeople == True):#stop
        status = 0
    elif(hasPeople == False):#up
        status = 2
    result.append(status)
    if(len(result)>2):#만약 길이가3보다크다면
        result.pop(0)
    if(flag != status and sum(result)/SIZE==status):
        flag = status
        msgs = [
            {
            'topic' : '/status/toTx2',
            'payload' : flag,
            'qos' : 0
        }
        ]
        print(msgs)
        publish.multiple(msgs,hostname=brokerIP)
    #if(flag != status and sum(result)/SIZE==status):
    #    flag = status
    #    msgs = [
    #        {
    #        'topic' : '/test',
    #        'payload' : flag,
    #        'qos' : 0
    #    }
    #    ]
    #    publish.multiple(msgs,hostname=brokerIP)
    #send_msg()


sensor1 = sensor()
sensor2 = sensor()
sensor3 = sensor()
try:
    hasPeople = False
    status = 0 #1 down 0 stop 2 up
    while True:
        v1 = read_spi_adc(0)
        v2 = read_spi_adc(1)
        v3 = read_spi_adc(2)
        v2 = v2 + location_gap
        v3 = v3 + location_gap
        if(len(sensor1.arr)==SIZE):
            if(sensor1.get_avg()>D):
                hasPeople = True
            else:
                hasPeople = False
            determin(sensor1.get_avg(),sensor2.get_avg(),sensor3.get_avg())
            sensor1.pop()
            sensor2.pop()
            sensor3.pop()
        else:
            sensor1.append(v1)
            sensor2.append(v2)
            sensor3.append(v3)
        time.sleep(0.5)
finally:
    GPIO.cleanup()
    spi.close()
