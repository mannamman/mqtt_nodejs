import RPi.GPIO as GPIO
import time
import spidev

GPIO.setmode(GPIO.BCM)
spi = spidev.SpiDev()
spi.open(0,0)
spi.max_speed_hz = 50000


#base v1

def read_spi_adc(adcChannel):
    adcValue = 0
    buff = spi.xfer2([1,(8+adcChannel)<<4,0])
    adcValue = ((buff[1]&3)<<8)+buff[2]
    #adcValue = 27.726 * pow(adcValue,-1.2045)
    return adcValue

try:
    while True:
        v1 = read_spi_adc(0)
        v2 = read_spi_adc(1)
        #v3 = read_spi_adc(2)
        print(v1,v2)
        #print("v1 : {}, v2 : {}".format(v1,v2))
        #print(v2,v3)
        time.sleep(0.5)
finally:
    GPIO.cleanup()
    spi.close()
