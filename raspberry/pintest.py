import time
import RPi.GPIO as GPIO
GPIO.setwarnings(False)
GPIO.setmode(GPIO.BOARD)

pin = 5
GPIO.setup(pin, GPIO.OUT,initial=GPIO.HIGH)

try : 
    while(True):
        GPIO.output(pin,GPIO.LOW)
        print('low')
        time.sleep(2)
        GPIO.output(pin,GPIO.HIGH)
        print('high')
        time.sleep(1)
except KeyboardInterrupt:
        pass
finally:
    GPIO.cleanup()
#13, 18, 15, 22
