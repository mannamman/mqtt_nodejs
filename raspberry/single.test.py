# 이 파일은 계속 돌아가야함, 센서값을 바탕으로 status toTx2에 값을보내
# 상태 값을 번경시킴
# 라즈베리파이는 relay module.py와 single.py가 같이 실행되고 있어야함
import RPi.GPIO as GPIO
import time
import spidev
import paho.mqtt.publish as publish

GPIO.setmode(GPIO.BCM)
spi = spidev.SpiDev()
spi.open(0,0)
spi.max_speed_hz = 50000

brokerIP = '192.168.0.117'
D = 300
allow_gap = 80
location_gap = 0
SIZE = 2
MinBound = 340
MaxBound = 745
#base v1
result = list()
StopFlag = False
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
    if(abs(v1-v2)>allow_gap and hasPeople == True):#down
        status = 1
    if((abs(v1-v2)<allow_gap and hasPeople == True)and not(v3>=MaxBound or v3<=MinBound)):#stop
        status = 0
    elif(hasPeople == False):#up
        status = 2
    result.append(status)
    if(len(result)>2):#만약 길이가3보다크다면
        result.pop(0)
    if(flag != status and sum(result)/SIZE==status):
        flag = status
        SendMsg(flag)
def SendMsg(payload):
    msgs = [
        {
            'topic' : '/motor',
            'payload' : payload,
            'qos' : 0
        }
    ]
    print('sned msg!!!!!!',msgs)
    publish.multiple(msgs,hostname=brokerIP)

sensor1 = sensor()
sensor2 = sensor()
sensor3 = sensor()
try:
    hasPeople = False
    status = 0 #1 down 0 stop 2 up
    while True:
        #고쳤음 잘 보자3->2, 2->3
        v1 = read_spi_adc(0)
        v2 = read_spi_adc(1)
        v3 = read_spi_adc(2)
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
